import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  chatFields,
  storedChatDataSchema,
  type ChatCollectedData,
  type ChatField,
  type ChatOption,
  type ChatResponse,
  type ChatStep,
} from "../../lib/chat/contracts";
import {
  categoryLabels,
  type CrmCategory,
} from "../../lib/crm/constants";
import { normalizePhone } from "../../lib/request/schema";

const CHAT_CATEGORIES = [
  "appliance_repair",
  "plumbing",
  "air_conditioning",
] as const;

const nameSchema = z
  .string()
  .trim()
  .min(2, "Укажите имя")
  .max(60, "Имя должно быть не длиннее 60 символов");
const phoneSchema = z
  .string()
  .trim()
  .max(30, "Телефон слишком длинный")
  .transform(normalizePhone)
  .refine(
    (value) => /^\+7000\d{7}$/.test(value),
    "Используйте безопасный тестовый номер вида +7 000 000 1042",
  );
const areaSchema = z
  .string()
  .trim()
  .min(2, "Укажите район или общий адрес")
  .max(120, "Адрес должен быть не длиннее 120 символов")
  .refine(
    (value) =>
      !/(?:(?:кв(?:артира)?|дом|будинок)|\b\d{1,4}[/-]\d{1,4}\b)/iu.test(
        value,
      ),
    "Не указывайте номер дома или квартиры — достаточно района",
  );
const timeSchema = z
  .string()
  .trim()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Укажите время в формате ЧЧ:ММ");

export interface StoredChatConversation {
  id: string;
  currentStep: ChatStep;
  collectedData: ChatCollectedData;
  status: "active" | "completed" | "abandoned" | "human_required";
}

export interface ChatService {
  id: string;
  category: CrmCategory;
  name: string;
}

export interface ChatSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface CompleteChatLeadData {
  problemDescription: string;
  category: CrmCategory;
  serviceId: string;
  serviceType: string;
  demoName: string;
  phone: string;
  area: string;
  preferredDate: string;
  preferredTime: string;
}

export interface ChatWorkflowStore {
  startConversation(input: {
    conversationId: string;
    currentStep: ChatStep;
    data: ChatCollectedData;
    customerMessage: string;
    assistantMessage: string;
    action: ChatResponse["action"];
    status?: "active" | "human_required";
    now: Date;
  }): Promise<void>;
  loadConversation(id: string): Promise<StoredChatConversation | null>;
  listServices(category: CrmCategory): Promise<ChatService[]>;
  listAvailableSlots(category: CrmCategory, now: Date): Promise<ChatSlot[]>;
  saveTurn(input: {
    conversationId: string;
    expectedStep: ChatStep;
    nextStep: ChatStep;
    data: ChatCollectedData;
    customerMessage: string;
    assistantMessage: string;
    status?: "active" | "human_required";
    now: Date;
  }): Promise<boolean>;
  createLeadTurn(input: {
    conversationId: string;
    expectedStep: "preferred_time";
    data: CompleteChatLeadData;
    customerMessage: string;
    hasSlots: boolean;
    now: Date;
  }): Promise<{
    leadId: string;
    publicNumber: string;
    assistantMessage: string;
  } | null>;
  createBookingTurn(input: {
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
    now: Date;
  }): Promise<{ bookingId: string } | null>;
}

export interface ChatStartGuidance {
  collectedData?: Partial<ChatCollectedData>;
  assistantReply?: string;
}

export interface ChatTurnGuidance {
  assistantReply?: string;
}

export interface ChatExtractionHints {
  problemDescription: string | null;
  category: CrmCategory | null;
  serviceType: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  preferredDate: string | null;
}

export async function startChatWorkflow(
  store: ChatWorkflowStore,
  problemDescription: string,
  now = new Date(),
  guidance: ChatStartGuidance = {},
): Promise<ChatResponse> {
  const conversationId = randomUUID();
  const data: ChatCollectedData = {
    problemDescription,
    ...guidance.collectedData,
  };
  const next = await determineNextPrompt(store, data);
  const reply =
    next.action === "ask_question"
      ? naturalQuestion(next.reply, guidance.assistantReply)
      : next.reply;

  await store.startConversation({
    conversationId,
    currentStep: next.step,
    data,
    customerMessage: problemDescription,
    assistantMessage: reply,
    action: next.action,
    now,
  });

  return response(
    conversationId,
    reply,
    next.action,
    data,
    next.options,
  );
}

export async function continueChatWorkflow(
  store: ChatWorkflowStore,
  conversationId: string,
  message: string,
  now = new Date(),
  guidance: ChatTurnGuidance = {},
): Promise<ChatResponse> {
  const conversation = await store.loadConversation(conversationId);

  if (!conversation) {
    return response(
      conversationId,
      "Диалог не найден. Начните новый чат.",
      "handoff_to_human",
      {},
    );
  }

  const parsedData = storedChatDataSchema.safeParse(
    conversation.collectedData,
  );

  if (!parsedData.success) {
    return response(
      conversationId,
      "Состояние диалога повреждено. Начните новый чат.",
      "handoff_to_human",
      {},
    );
  }

  const data = parsedData.data;

  if (conversation.status === "completed") {
    return response(
      conversationId,
      `Заявка ${data.publicNumber ?? ""} уже создана и забронирована.`,
      "complete",
      data,
    );
  }

  if (conversation.status !== "active") {
    return response(
      conversationId,
      "Диалог передан человеку. Начните новый чат, чтобы создать другую заявку.",
      "handoff_to_human",
      data,
    );
  }

  switch (conversation.currentStep) {
    case "category":
      return handleCategory(store, conversation, data, message, now);
    case "service":
      return handleService(
        store,
        conversation,
        data,
        message,
        now,
        guidance.assistantReply,
      );
    case "name":
      return handleTextStep(
        store,
        conversation,
        data,
        message,
        now,
        nameSchema,
        "demoName",
        "phone",
        naturalQuestion(
          "Укажите безопасный телефон, например +7 000 000 1042.",
          guidance.assistantReply,
        ),
      );
    case "phone":
      return handleTextStep(
        store,
        conversation,
        data,
        message,
        now,
        phoneSchema,
        "phone",
        "area",
        naturalQuestion(
          "Укажите район или общий адрес без номера дома и квартиры.",
          guidance.assistantReply,
        ),
      );
    case "area":
      return handleTextStep(
        store,
        conversation,
        data,
        message,
        now,
        areaSchema,
        "area",
        "preferred_date",
        naturalQuestion(
          "На какую дату нужен выезд?",
          guidance.assistantReply,
        ),
      );
    case "preferred_date":
      return handlePreferredDate(
        store,
        conversation,
        data,
        message,
        now,
        guidance.assistantReply,
      );
    case "preferred_time":
      return handlePreferredTime(store, conversation, data, message, now);
    case "slot":
      return handleSlot(store, conversation, data, message, now);
    case "complete":
      return response(
        conversationId,
        `Заявка ${data.publicNumber ?? ""} уже создана и забронирована.`,
        "complete",
        data,
      );
  }
}

async function handleCategory(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
) {
  const parsed = z.enum(CHAT_CATEGORIES).safeParse(message);

  if (!parsed.success) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      "Выберите категорию кнопкой ниже.",
      "show_categories",
      categoryOptions(),
      now,
    );
  }

  const nextData = { ...data, category: parsed.data };
  const services = await store.listServices(parsed.data);
  const reply =
    services.length > 0
      ? "Выберите тип услуги или техники."
      : "Для этой категории сейчас нет активных услуг.";
  const action = services.length > 0 ? "show_services" : "handoff_to_human";
  const nextStep = services.length > 0 ? "service" : "category";

  await store.saveTurn({
    conversationId: conversation.id,
    expectedStep: "category",
    nextStep,
    data: nextData,
    customerMessage: categoryLabels[parsed.data],
    assistantMessage: reply,
    status: services.length > 0 ? "active" : "human_required",
    now,
  });

  return response(
    conversation.id,
    reply,
    action,
    nextData,
    serviceOptions(services),
  );
}

async function handleService(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
  assistantReply?: string,
) {
  if (!data.category) {
    return response(
      conversation.id,
      "Выберите категорию.",
      "show_categories",
      data,
      categoryOptions(),
    );
  }

  const services = await store.listServices(data.category);
  const selected = services.find((service) => service.id === message);

  if (!selected) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      "Выберите доступную услугу кнопкой ниже.",
      "show_services",
      serviceOptions(services),
      now,
    );
  }

  const nextData = {
    ...data,
    serviceId: selected.id,
    serviceType: selected.name,
  };
  const reply = naturalQuestion(
    "Как к вам обращаться? Используйте вымышленное имя.",
    assistantReply,
  );

  await store.saveTurn({
    conversationId: conversation.id,
    expectedStep: "service",
    nextStep: "name",
    data: nextData,
    customerMessage: selected.name,
    assistantMessage: reply,
    now,
  });

  return response(conversation.id, reply, "ask_question", nextData);
}

async function handleTextStep<T extends string>(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
  schema: z.ZodType<T>,
  field: "demoName" | "phone" | "area",
  nextStep: ChatStep,
  reply: string,
) {
  const parsed = schema.safeParse(message);

  if (!parsed.success) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      parsed.error.issues[0]?.message ?? "Проверьте ответ.",
      "ask_question",
      [],
      now,
    );
  }

  const nextData = { ...data, [field]: parsed.data };

  await store.saveTurn({
    conversationId: conversation.id,
    expectedStep: conversation.currentStep,
    nextStep,
    data: nextData,
    customerMessage: parsed.data,
    assistantMessage: reply,
    now,
  });

  return response(conversation.id, reply, "ask_question", nextData);
}

async function handlePreferredDate(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
  assistantReply?: string,
) {
  const parsed = preferredDateSchema(now).safeParse(message);

  if (!parsed.success) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      parsed.error.issues[0]?.message ?? "Проверьте дату.",
      "ask_question",
      [],
      now,
    );
  }

  const nextData = { ...data, preferredDate: parsed.data };
  const reply = naturalQuestion(
    "Какое время было бы удобнее? Укажите его в формате ЧЧ:ММ.",
    assistantReply,
  );

  await store.saveTurn({
    conversationId: conversation.id,
    expectedStep: "preferred_date",
    nextStep: "preferred_time",
    data: nextData,
    customerMessage: parsed.data,
    assistantMessage: reply,
    now,
  });

  return response(conversation.id, reply, "ask_question", nextData);
}

async function handlePreferredTime(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
) {
  const parsedTime = timeSchema.safeParse(message);

  if (!parsedTime.success) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      parsedTime.error.issues[0]?.message ?? "Проверьте время.",
      "ask_question",
      [],
      now,
    );
  }

  const completeData = completeLeadDataSchema.safeParse({
    ...data,
    preferredTime: parsedTime.data,
  });

  if (!completeData.success) {
    return response(
      conversation.id,
      "Не удалось собрать данные заявки. Начните новый чат.",
      "handoff_to_human",
      data,
    );
  }

  const slots = sortSlotsByPreference(
    await store.listAvailableSlots(completeData.data.category, now),
    completeData.data.preferredDate,
    completeData.data.preferredTime,
  );
  const created = await store.createLeadTurn({
    conversationId: conversation.id,
    expectedStep: "preferred_time",
    data: completeData.data,
    customerMessage: parsedTime.data,
    hasSlots: slots.length > 0,
    now,
  });

  if (!created) {
    return response(
      conversation.id,
      "Состояние диалога уже изменилось. Обновите страницу.",
      "handoff_to_human",
      data,
    );
  }

  const nextData = {
    ...completeData.data,
    leadId: created.leadId,
    publicNumber: created.publicNumber,
  };

  return response(
    conversation.id,
    created.assistantMessage,
    slots.length > 0 ? "show_slots" : "handoff_to_human",
    nextData,
    slotOptions(slots),
  );
}

async function handleSlot(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
) {
  if (!data.category || !data.leadId || !data.publicNumber) {
    return response(
      conversation.id,
      "Заявка не найдена. Начните новый чат.",
      "handoff_to_human",
      data,
    );
  }

  const slots = sortSlotsByPreference(
    await store.listAvailableSlots(data.category, now),
    data.preferredDate,
    data.preferredTime,
  );
  const selected = slots.find((slot) => slot.id === message);

  if (!selected) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      slots.length > 0
        ? "Этот слот уже занят. Выберите другое свободное время."
        : "Свободных слотов больше нет. Заявка передана человеку.",
      slots.length > 0 ? "show_slots" : "handoff_to_human",
      slotOptions(slots),
      now,
      slots.length > 0 ? "active" : "human_required",
    );
  }

  const assistantMessage = `Готово. Заявка ${data.publicNumber} создана, время ${formatSlot(selected)} забронировано.`;
  const booked = await store.createBookingTurn({
    conversationId: conversation.id,
    expectedStep: "slot",
    data: {
      ...data,
      category: data.category,
      leadId: data.leadId,
      publicNumber: data.publicNumber,
    },
    slotId: selected.id,
    customerMessage: formatSlot(selected),
    assistantMessage,
    now,
  });

  if (!booked) {
    const refreshedSlots = await store.listAvailableSlots(data.category, now);
    return persistRetry(
      store,
      conversation,
      data,
      message,
      "Этот слот только что заняли. Выберите другое свободное время.",
      refreshedSlots.length > 0 ? "show_slots" : "handoff_to_human",
      slotOptions(refreshedSlots),
      now,
      refreshedSlots.length > 0 ? "active" : "human_required",
    );
  }

  const nextData = {
    ...data,
    slotId: selected.id,
    bookingId: booked.bookingId,
  };

  return response(
    conversation.id,
    assistantMessage,
    "complete",
    nextData,
  );
}

async function persistRetry(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  customerMessage: string,
  assistantMessage: string,
  action: ChatResponse["action"],
  options: ChatOption[],
  now: Date,
  status: "active" | "human_required" = "active",
) {
  await store.saveTurn({
    conversationId: conversation.id,
    expectedStep: conversation.currentStep,
    nextStep: conversation.currentStep,
    data,
    customerMessage,
    assistantMessage,
    status,
    now,
  });

  return response(
    conversation.id,
    assistantMessage,
    action,
    data,
    options,
  );
}

/**
 * True when the raw message already satisfies the field the FSM is waiting
 * for on this step. Used to keep a plain answer (e.g. "Северный район" while
 * collecting the address) from being reclassified as a knowledge question
 * just because it contains a topic word the RAG heuristic also looks for.
 */
export function isExpectedStepAnswer(
  step: ChatStep,
  message: string,
  now = new Date(),
): boolean {
  switch (step) {
    case "name":
      return nameSchema.safeParse(message).success;
    case "phone":
      return phoneSchema.safeParse(message).success;
    case "area":
      return areaSchema.safeParse(message).success;
    case "preferred_date":
      return preferredDateSchema(now).safeParse(message).success;
    case "preferred_time":
      return timeSchema.safeParse(message).success;
    default:
      return false;
  }
}

export async function validateChatExtraction(
  store: ChatWorkflowStore,
  originalProblem: string,
  hints: ChatExtractionHints,
  now = new Date(),
): Promise<ChatCollectedData> {
  const problem = z
    .string()
    .trim()
    .min(10)
    .max(1000)
    .safeParse(hints.problemDescription);
  const data: ChatCollectedData = {
    problemDescription: problem.success
      ? problem.data
      : originalProblem,
  };
  const category = z.enum(CHAT_CATEGORIES).safeParse(hints.category);

  if (category.success) {
    data.category = category.data;
    const availableServices = await store.listServices(category.data);
    const requestedService = normalizeText(hints.serviceType ?? "");
    const matches = availableServices.filter((service) => {
      const candidate = normalizeText(service.name);
      return (
        requestedService.length > 2 &&
        (candidate.includes(requestedService) ||
          requestedService.includes(candidate))
      );
    });

    if (matches.length === 1) {
      data.serviceId = matches[0]!.id;
      data.serviceType = matches[0]!.name;
    }
  }

  const name = nameSchema.safeParse(hints.name);
  if (name.success) {
    data.demoName = name.data;
  }

  const phone = phoneSchema.safeParse(hints.phone);
  if (phone.success) {
    data.phone = phone.data;
  }

  const area = areaSchema.safeParse(hints.address);
  if (area.success) {
    data.area = area.data;
  }

  const date = preferredDateSchema(now).safeParse(hints.preferredDate);
  if (date.success) {
    data.preferredDate = date.data;
  }

  return data;
}

async function determineNextPrompt(
  store: ChatWorkflowStore,
  data: ChatCollectedData,
): Promise<{
  step: ChatStep;
  action: ChatResponse["action"];
  reply: string;
  options: ChatOption[];
}> {
  if (!data.category) {
    return {
      step: "category",
      action: "show_categories",
      reply:
        "К какому направлению относится проблема? Выберите один вариант.",
      options: categoryOptions(),
    };
  }

  if (!data.serviceId || !data.serviceType) {
    const availableServices = await store.listServices(data.category);
    return {
      step: "service",
      action: "show_services",
      reply: "Выберите тип услуги или техники.",
      options: serviceOptions(availableServices),
    };
  }

  if (!data.demoName) {
    return askPrompt(
      "name",
      "Как к вам обращаться? Используйте вымышленное имя.",
    );
  }

  if (!data.phone) {
    return askPrompt(
      "phone",
      "Укажите безопасный телефон, например +7 000 000 1042.",
    );
  }

  if (!data.area) {
    return askPrompt(
      "area",
      "Укажите район или общий адрес без номера дома и квартиры.",
    );
  }

  if (!data.preferredDate) {
    return askPrompt("preferred_date", "На какую дату нужен выезд?");
  }

  return askPrompt(
    "preferred_time",
    "Какое время было бы удобнее? Укажите его в формате ЧЧ:ММ.",
  );
}

function askPrompt(step: ChatStep, reply: string) {
  return {
    step,
    action: "ask_question" as const,
    reply,
    options: [] as ChatOption[],
  };
}

function naturalQuestion(fallback: string, proposed?: string) {
  const value = proposed?.trim();

  if (
    !value ||
    value.length > 500 ||
    !value.includes("?") ||
    /https?:\/\/|www\./iu.test(value)
  ) {
    return fallback;
  }

  return value;
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU").replace(/\s+/gu, " ");
}

function response(
  conversationId: string,
  reply: string,
  action: ChatResponse["action"],
  collectedData: ChatCollectedData,
  options: ChatOption[] = [],
): ChatResponse {
  return {
    conversationId,
    reply,
    action,
    missingFields: getMissingFields(collectedData),
    collectedData,
    options,
  };
}

function getMissingFields(data: ChatCollectedData): ChatField[] {
  return chatFields.filter((field) => {
    if (field === "serviceType") {
      return !data.serviceId || !data.serviceType;
    }

    return !data[field];
  });
}

function categoryOptions(): ChatOption[] {
  return CHAT_CATEGORIES.map((category) => ({
    value: category,
    label: categoryLabels[category],
  }));
}

function serviceOptions(services: ChatService[]): ChatOption[] {
  return services.map((service) => ({
    value: service.id,
    label: service.name,
  }));
}

function slotOptions(slots: ChatSlot[]): ChatOption[] {
  return slots.map((slot) => ({
    value: slot.id,
    label: formatSlot(slot),
  }));
}

function formatSlot(slot: ChatSlot) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(slot.startsAt));
}

function preferredDateSchema(now: Date) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const lastAllowed = new Date(today);
  lastAllowed.setUTCDate(lastAllowed.getUTCDate() + 14);

  return z
    .string()
    .date("Укажите корректную дату")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return date >= today && date <= lastAllowed;
    }, "Выберите дату в пределах следующих 14 дней");
}

function sortSlotsByPreference(
  slots: ChatSlot[],
  preferredDate?: string,
  preferredTime?: string,
) {
  if (!preferredDate || !preferredTime) {
    return slots;
  }

  const preferred = new Date(
    `${preferredDate}T${preferredTime}:00.000Z`,
  ).getTime();

  return [...slots].sort(
    (left, right) =>
      Math.abs(new Date(left.startsAt).getTime() - preferred) -
      Math.abs(new Date(right.startsAt).getTime() - preferred),
  );
}

const completeLeadDataSchema = z.object({
  problemDescription: z.string().min(10).max(1000),
  category: z.enum(CHAT_CATEGORIES),
  serviceId: z.uuid(),
  serviceType: z.string().min(1).max(160),
  demoName: z.string().min(2).max(60),
  phone: z.string().regex(/^\+7000\d{7}$/),
  area: z.string().min(2).max(120),
  preferredDate: z.string().date(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
});
