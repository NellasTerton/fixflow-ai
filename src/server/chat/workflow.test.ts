import { describe, expect, it } from "vitest";

import type {
  ChatCollectedData,
  ChatStep,
} from "../../lib/chat/contracts";
import type { CrmCategory } from "../../lib/crm/constants";
import {
  continueChatWorkflow,
  isExpectedStepAnswer,
  startChatWorkflow,
  type ChatService,
  type ChatSlot,
  type ChatWorkflowStore,
  type CompleteChatLeadData,
  type StoredChatConversation,
} from "./workflow";

const NOW = new Date("2026-07-30T08:00:00.000Z");

const scenarios = [
  {
    category: "appliance_repair",
    service: {
      id: "10000000-0000-4000-8000-000000000001",
      category: "appliance_repair",
      name: "Ремонт стиральной машины",
    },
    problem: "Демонстрационная стиральная машина не сливает воду.",
    phone: "+380 00 000 2001",
  },
  {
    category: "plumbing",
    service: {
      id: "10000000-0000-4000-8000-000000000005",
      category: "plumbing",
      name: "Устранение протечки",
    },
    problem: "В демонстрационной ванной появилась условная протечка.",
    phone: "+380 00 000 2002",
  },
  {
    category: "air_conditioning",
    service: {
      id: "10000000-0000-4000-8000-000000000009",
      category: "air_conditioning",
      name: "Диагностика кондиционера",
    },
    problem: "Демонстрационный кондиционер показывает тестовую ошибку.",
    phone: "+380 00 000 2003",
  },
] as const;

describe.each(scenarios)(
  "deterministic chat: $category",
  ({ category, service, problem, phone }) => {
    it("completes the full lead and booking scenario without repeated questions", async () => {
      const store = new InMemoryChatStore(
        [service],
        [
          {
            id: slotId(category),
            category,
            startsAt: "2026-08-01T12:00:00.000Z",
            endsAt: "2026-08-01T13:00:00.000Z",
          },
        ],
      );

      const start = await startChatWorkflow(store, problem, NOW);
      expect(start.action).toBe("show_categories");
      expect(start.missingFields).not.toContain("problemDescription");

      const categoryResponse = await continueChatWorkflow(
        store,
        start.conversationId,
        category,
        NOW,
      );
      expect(categoryResponse.action).toBe("show_services");
      expect(categoryResponse.missingFields).not.toContain("category");

      const serviceResponse = await continueChatWorkflow(
        store,
        start.conversationId,
        service.id,
        NOW,
      );
      expect(serviceResponse.action).toBe("ask_question");
      expect(serviceResponse.missingFields).not.toContain("serviceType");

      const answers = [
        "Клиент Демонстрационный",
        phone,
        "Демо-район Северный",
        "2026-08-01",
        "12:00",
      ];
      const expectedRemovedFields = [
        "demoName",
        "phone",
        "area",
        "preferredDate",
        "preferredTime",
      ] as const;

      let response = serviceResponse;
      for (const [index, answer] of answers.entries()) {
        response = await continueChatWorkflow(
          store,
          start.conversationId,
          answer,
          NOW,
        );
        expect(response.missingFields).not.toContain(
          expectedRemovedFields[index],
        );
      }

      expect(response.action).toBe("show_slots");
      expect(response.options).toHaveLength(1);
      expect(response.collectedData.publicNumber).toMatch(/^FF-\d+$/);
      expect(store.leads[0]).toMatchObject({
        category,
        source: "ai_chat",
        status: "waiting_booking",
      });

      const completed = await continueChatWorkflow(
        store,
        start.conversationId,
        response.options[0]!.value,
        NOW,
      );

      expect(completed.action).toBe("complete");
      expect(completed.missingFields).toEqual([]);
      expect(completed.collectedData.bookingId).toBeDefined();
      expect(store.leads[0]?.status).toBe("booked");
      expect(store.bookings).toHaveLength(1);
      expect(store.messages).toHaveLength(18);

      const stored = await store.loadConversation(start.conversationId);
      expect(stored).toMatchObject({
        currentStep: "complete",
        status: "completed",
      });
    });
  },
);

describe("validated LLM guidance", () => {
  it("starts from the first field that remains missing", async () => {
    const service = scenarios[0].service;
    const store = new InMemoryChatStore(
      [service],
      [
        {
          id: slotId("appliance_repair"),
          category: "appliance_repair",
          startsAt: "2026-08-01T12:00:00.000Z",
          endsAt: "2026-08-01T13:00:00.000Z",
        },
      ],
    );

    const result = await startChatWorkflow(
      store,
      scenarios[0].problem,
      NOW,
      {
        collectedData: {
          category: "appliance_repair",
          serviceId: service.id,
          serviceType: service.name,
          demoName: "Клиент Извлечённый",
          phone: "+380000002010",
          area: "Демо-район Извлечённый",
          preferredDate: "2026-08-01",
        },
        assistantReply:
          "В какое демонстрационное время вам было бы удобнее принять мастера?",
      },
    );

    expect(result.action).toBe("ask_question");
    expect(result.reply).toContain("время");
    expect(result.missingFields).toEqual(["preferredTime"]);

    const conversation = await store.loadConversation(
      result.conversationId,
    );
    expect(conversation?.currentStep).toBe("preferred_time");
  });
});

class InMemoryChatStore implements ChatWorkflowStore {
  conversations = new Map<string, StoredChatConversation>();
  messages: Array<{ sender: string; content: string }> = [];
  leads: Array<{
    id: string;
    category: CrmCategory;
    source: "ai_chat";
    status: "waiting_booking" | "booked";
  }> = [];
  bookings: Array<{ id: string; leadId: string; slotId: string }> = [];
  private publicNumber = 3000;

  constructor(
    private readonly services: readonly ChatService[],
    private readonly slots: readonly (ChatSlot & {
      category: CrmCategory;
    })[],
  ) {}

  async startConversation(input: {
    conversationId: string;
    currentStep: ChatStep;
    data: ChatCollectedData;
    customerMessage: string;
    assistantMessage: string;
  }) {
    this.conversations.set(input.conversationId, {
      id: input.conversationId,
      currentStep: input.currentStep,
      collectedData: input.data,
      status: "active",
    });
    this.appendTurn(input.customerMessage, input.assistantMessage);
  }

  async loadConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async listServices(category: CrmCategory) {
    return this.services.filter((service) => service.category === category);
  }

  async listAvailableSlots(category: CrmCategory) {
    const bookedSlotIds = new Set(
      this.bookings.map((booking) => booking.slotId),
    );
    return this.slots.filter(
      (slot) =>
        slot.category === category && !bookedSlotIds.has(slot.id),
    );
  }

  async saveTurn(input: {
    conversationId: string;
    expectedStep: ChatStep;
    nextStep: ChatStep;
    data: ChatCollectedData;
    customerMessage: string;
    assistantMessage: string;
    status?: "active" | "human_required";
  }) {
    const conversation = this.conversations.get(input.conversationId);
    if (
      !conversation ||
      conversation.currentStep !== input.expectedStep ||
      conversation.status !== "active"
    ) {
      return false;
    }

    conversation.currentStep = input.nextStep;
    conversation.collectedData = input.data;
    conversation.status = input.status ?? "active";
    this.appendTurn(input.customerMessage, input.assistantMessage);
    return true;
  }

  async createLeadTurn(input: {
    conversationId: string;
    expectedStep: "preferred_time";
    data: CompleteChatLeadData;
    customerMessage: string;
    hasSlots: boolean;
  }) {
    const conversation = this.conversations.get(input.conversationId);
    if (
      !conversation ||
      conversation.currentStep !== input.expectedStep
    ) {
      return null;
    }

    const leadId = testId(5, this.leads.length + 1);
    const publicNumber = `FF-${this.publicNumber++}`;
    const assistantMessage = input.hasSlots
      ? `Данные собраны. Заявка ${publicNumber} создана. Выберите свободное время.`
      : `Данные собраны. Заявка ${publicNumber} создана, но свободных слотов сейчас нет.`;

    this.leads.push({
      id: leadId,
      category: input.data.category,
      source: "ai_chat",
      status: "waiting_booking",
    });
    conversation.currentStep = "slot";
    conversation.collectedData = {
      ...input.data,
      leadId,
      publicNumber,
    };
    this.appendTurn(input.customerMessage, assistantMessage);

    return { leadId, publicNumber, assistantMessage };
  }

  async createBookingTurn(input: {
    conversationId: string;
    expectedStep: "slot";
    data: ChatCollectedData & {
      category: CrmCategory;
      leadId: string;
      publicNumber: string;
    };
    slotId: string;
    customerMessage: string;
    assistantMessage: string;
  }) {
    const conversation = this.conversations.get(input.conversationId);
    if (
      !conversation ||
      conversation.currentStep !== input.expectedStep ||
      this.bookings.some((booking) => booking.slotId === input.slotId)
    ) {
      return null;
    }

    const bookingId = testId(6, this.bookings.length + 1);
    this.bookings.push({
      id: bookingId,
      leadId: input.data.leadId,
      slotId: input.slotId,
    });
    const lead = this.leads.find((item) => item.id === input.data.leadId);
    if (lead) {
      lead.status = "booked";
    }
    conversation.currentStep = "complete";
    conversation.status = "completed";
    conversation.collectedData = {
      ...input.data,
      slotId: input.slotId,
      bookingId,
    };
    this.appendTurn(input.customerMessage, input.assistantMessage);
    return { bookingId };
  }

  private appendTurn(customerMessage: string, assistantMessage: string) {
    this.messages.push(
      { sender: "customer", content: customerMessage },
      { sender: "assistant", content: assistantMessage },
    );
  }
}

describe("isExpectedStepAnswer", () => {
  it("accepts a plain area answer that mentions a district word", () => {
    expect(
      isExpectedStepAnswer("area", "Демо-город, Северный район"),
    ).toBe(true);
    expect(isExpectedStepAnswer("area", "Северный")).toBe(true);
  });

  it("rejects an area answer that leaks a house or apartment number", () => {
    expect(
      isExpectedStepAnswer("area", "Северный район, дом 12"),
    ).toBe(false);
  });

  it("validates the field expected by each step", () => {
    expect(isExpectedStepAnswer("name", "Демо Клиент")).toBe(true);
    expect(isExpectedStepAnswer("phone", "+380 00 000 1099")).toBe(true);
    expect(isExpectedStepAnswer("phone", "не помню номер")).toBe(false);
    expect(isExpectedStepAnswer("preferred_time", "10:00")).toBe(true);
    expect(isExpectedStepAnswer("preferred_time", "утром")).toBe(false);
    expect(
      isExpectedStepAnswer("preferred_date", "2026-08-06", NOW),
    ).toBe(true);
  });

  it("never matches steps without a plain-text field, like category or slot", () => {
    expect(isExpectedStepAnswer("category", "plumbing")).toBe(false);
    expect(isExpectedStepAnswer("slot", "any text")).toBe(false);
  });
});

function slotId(category: CrmCategory) {
  const index = {
    appliance_repair: 1,
    plumbing: 2,
    air_conditioning: 3,
    common: 4,
  }[category];
  return testId(4, index);
}

function testId(group: number, index: number) {
  return `${group}0000000-0000-4000-8000-${index
    .toString()
    .padStart(12, "0")}`;
}
