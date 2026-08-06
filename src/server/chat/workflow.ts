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
import type { CrmCategory } from "../../lib/crm/constants";
import {
  normalizePhone,
  RUSSIAN_PHONE_PATTERN,
} from "../../lib/request/schema";
import { determineKnowledgeCategory } from "../rag/category";

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
    (value) => RUSSIAN_PHONE_PATTERN.test(value),
    "Укажите номер телефона в формате +7 985 123 45 67",
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
  // Absent for an operator-callback lead — the customer chose not to pick
  // an exact time themselves, and `leads.preferred_date`/`preferred_time`
  // are nullable columns for exactly this case.
  preferredDate?: string;
  preferredTime?: string;
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
    // "fulfillment" is the operator-callback path — the lead is created
    // right there, with no date/time collected at all.
    expectedStep: "preferred_time" | "fulfillment";
    data: CompleteChatLeadData;
    customerMessage: string;
    hasSlots: boolean;
    // Caller-computed instead of a hardcoded "Выберите свободное время" —
    // there are no buttons, so this is the actual next question in prose
    // (the nearest real slot proposal, already resolved by the caller from
    // the same availability data used to set hasSlots).
    assistantSuffix: string;
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
}

/**
 * LLM-proposed category/service for the *current* turn's free text, used
 * only as a fallback candidate when the step's own deterministic matcher
 * (classifyCategory / matchServiceByName against the raw message) can't
 * resolve it — e.g. "течёт труба под мойкой" doesn't literally contain
 * "Устранение протечки". The candidate still goes through the same
 * deterministic catalog re-validation as any other input; this only widens
 * what gets tried, it never lets the LLM's output through unchecked.
 */
export interface ChatTurnGuidance {
  category?: CrmCategory | null;
  serviceType?: string | null;
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
  const next = await resolvePendingPrompt(store, data);
  // When the LLM has already resolved the service from the free-text problem,
  // the first reply acknowledges it by its validated catalog name so the
  // customer sees the request was understood — the name comes from the
  // catalog, not from LLM free-phrasing, so it is safe to echo.
  const reply =
    next.step === "name" && data.serviceId && data.serviceType
      ? `Понятно — оформляю «${data.serviceType}». ${next.reply}`
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
      return handleCategory(
        store,
        conversation,
        data,
        message,
        now,
        guidance.category,
      );
    case "service":
      return handleService(
        store,
        conversation,
        data,
        message,
        now,
        guidance.serviceType,
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
        "Укажите номер телефона, например +7 985 123 45 67.",
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
        "Укажите район или общий адрес без номера дома и квартиры.",
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
        "fulfillment",
        FULFILLMENT_QUESTION,
      );
    case "fulfillment":
      return handleFulfillmentChoice(store, conversation, data, message, now);
    case "preferred_date":
      return handlePreferredDate(store, conversation, data, message, now);
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
  llmCategory?: CrmCategory | null,
) {
  const parsed = z.enum(CHAT_CATEGORIES).safeParse(message);
  const category =
    (parsed.success ? parsed.data : null) ??
    classifyCategory(message) ??
    (llmCategory && (CHAT_CATEGORIES as readonly string[]).includes(llmCategory)
      ? (llmCategory as (typeof CHAT_CATEGORIES)[number])
      : null);

  if (!category) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      "Не поняла направление. Это бытовая техника, сантехника или кондиционер?",
      "ask_question",
      [],
      now,
    );
  }

  const nextData = { ...data, category };
  const services = await store.listServices(category);
  const reply =
    services.length > 0
      ? `Какая нужна услуга: ${services.map((service) => service.name).join(", ")}? Можно своими словами.`
      : "Для этой категории сейчас нет активных услуг.";
  const nextStep = services.length > 0 ? "service" : "category";

  await store.saveTurn({
    conversationId: conversation.id,
    expectedStep: "category",
    nextStep,
    data: nextData,
    customerMessage: message,
    assistantMessage: reply,
    status: services.length > 0 ? "active" : "human_required",
    now,
  });

  return response(
    conversation.id,
    reply,
    services.length > 0 ? "ask_question" : "handoff_to_human",
    nextData,
  );
}

/**
 * Deterministic free-text fallback for category — reuses the same
 * keyword-regex classifier the RAG layer already relies on
 * (determineKnowledgeCategory), rather than requiring a button click. It
 * always returns *some* category (defaulting to "common"), so anything
 * outside the three bookable ones is treated as unclassified here.
 */
function classifyCategory(message: string): CrmCategory | null {
  const category = determineKnowledgeCategory(message);
  return (CHAT_CATEGORIES as readonly string[]).includes(category)
    ? (category as (typeof CHAT_CATEGORIES)[number])
    : null;
}

async function handleService(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
  llmServiceType?: string | null,
) {
  if (!data.category) {
    return response(
      conversation.id,
      "Уточните, пожалуйста, направление: бытовая техника, сантехника или кондиционер?",
      "ask_question",
      data,
    );
  }

  const services = await store.listServices(data.category);
  const selected =
    services.find((service) => service.id === message) ??
    matchServiceByName(services, message) ??
    (llmServiceType ? matchServiceByName(services, llmServiceType) : null);

  if (!selected) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      `Не поняла услугу. Доступно: ${services.map((service) => service.name).join(", ")}. Опишите проблему ещё раз своими словами.`,
      "ask_question",
      [],
      now,
    );
  }

  const nextData = {
    ...data,
    serviceId: selected.id,
    serviceType: selected.name,
  };
  const reply = "Как к вам обращаться?";

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

const FULFILLMENT_QUESTION =
  "Готовы сразу назвать дату и время визита, или вам удобнее, если оператор перезвонит и всё согласует?";
const SELF_SERVICE_PATTERN = /сам|дату|время|назнач|выбер/iu;
const CALLBACK_PATTERN = /операт|перезвон|позвон|звонок|человек/iu;

/**
 * The one branch point after area: pick a time yourself (the existing
 * preferred_date → preferred_time → propose/confirm pipeline, unchanged) or
 * ask for a callback instead of managing scheduling. Neither path is forced
 * on every customer, matching how a real dispatcher would offer both.
 */
async function handleFulfillmentChoice(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
) {
  const trimmed = message.trim();

  if (CALLBACK_PATTERN.test(trimmed)) {
    return requestOperatorCallback(store, conversation, data, message, now);
  }

  if (SELF_SERVICE_PATTERN.test(trimmed)) {
    const nextData = { ...data, fulfillmentChoice: "self_service" as const };
    const reply = "На какую дату нужен выезд?";

    await store.saveTurn({
      conversationId: conversation.id,
      expectedStep: "fulfillment",
      nextStep: "preferred_date",
      data: nextData,
      customerMessage: message,
      assistantMessage: reply,
      now,
    });

    return response(conversation.id, reply, "ask_question", nextData);
  }

  return persistRetry(
    store,
    conversation,
    data,
    message,
    `Не поняла — назвать дату и время самостоятельно, или пусть перезвонит оператор? ${FULFILLMENT_QUESTION}`,
    "ask_question",
    [],
    now,
  );
}

async function requestOperatorCallback(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
) {
  const completeData = completeLeadDataSchema.safeParse({
    ...data,
    fulfillmentChoice: "callback",
  });

  if (!completeData.success) {
    return response(
      conversation.id,
      "Не удалось собрать данные заявки. Начните новый чат.",
      "handoff_to_human",
      data,
    );
  }

  // Reuses the exact mechanism today's "no real slots available" fallback
  // already relies on: hasSlots: false sets needs_operator = true and
  // conversation status = human_required, which is precisely what an
  // operator-callback request needs. No new SQL.
  const created = await store.createLeadTurn({
    conversationId: conversation.id,
    expectedStep: "fulfillment",
    data: completeData.data,
    customerMessage: message,
    hasSlots: false,
    assistantSuffix:
      " создана. Оператор перезвонит вам в ближайшее время, чтобы согласовать выезд.",
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
    "handoff_to_human",
    nextData,
  );
}

async function handlePreferredDate(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  message: string,
  now: Date,
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
  const reply = "Какое время было бы удобнее? Укажите его в формате ЧЧ:ММ.";

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
  const nearest = slots[0];

  // A lead already exists here when the customer declined the first
  // proposal (handleSlot sends them back to preferred_date) — this is a
  // re-propose against the newly stated time, not a fresh booking, so it
  // must not call createLeadTurn again: that write is guarded to fire
  // exactly once per conversation (lead_id is null) and would correctly
  // refuse a second attempt.
  if (data.leadId && data.publicNumber) {
    // completeLeadDataSchema doesn't declare leadId/publicNumber, so parsing
    // through it silently drops them — merge them back onto the result
    // instead of losing the already-created lead.
    const nextData = {
      ...completeData.data,
      leadId: data.leadId,
      publicNumber: data.publicNumber,
    };
    const reply = nearest
      ? `Ближайшее свободное время — ${formatSlot(nearest)}. Подходит?`
      : "Свободных слотов на эту дату нет. Заявка передана человеку.";

    await store.saveTurn({
      conversationId: conversation.id,
      expectedStep: "preferred_time",
      nextStep: "slot",
      data: nextData,
      customerMessage: parsedTime.data,
      assistantMessage: reply,
      status: nearest ? "active" : "human_required",
      now,
    });

    return response(
      conversation.id,
      reply,
      nearest ? "ask_question" : "handoff_to_human",
      nextData,
    );
  }

  // No button grid — propose the single closest real slot in prose and let
  // handleSlot read a plain yes/no reply, the same way a human dispatcher
  // would offer one time rather than reading out the whole schedule.
  const assistantSuffix = nearest
    ? ` создана. Ближайшее свободное время — ${formatSlot(nearest)}. Подходит?`
    : " создана, но свободных слотов сейчас нет. Заявка передана человеку.";
  const created = await store.createLeadTurn({
    conversationId: conversation.id,
    expectedStep: "preferred_time",
    data: completeData.data,
    customerMessage: parsedTime.data,
    hasSlots: slots.length > 0,
    assistantSuffix,
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
    slots.length > 0 ? "ask_question" : "handoff_to_human",
    nextData,
  );
}

const AFFIRMATIVE_PATTERN =
  /^(?:да|ок|окей|хорошо|подходит|устраивает|давайте|го|запиш|бронир)/iu;
const NEGATIVE_PATTERN = /^(?:нет|неа|не\s|друг|перенес|отмен)/iu;

/**
 * The "slot" step is a propose/confirm exchange, not a button grid: the
 * previous step already proposed the single closest real slot in prose
 * (see handlePreferredTime). A plain "да" books it; "нет" hands the
 * customer back to re-stating a preferred date so the normal
 * preferred_date → preferred_time pipeline re-proposes fresh, instead of
 * trying to parse an arbitrary new date out of a free-form decline.
 */
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

  if (slots.length === 0) {
    return persistRetry(
      store,
      conversation,
      data,
      message,
      "Свободных слотов больше нет. Заявка передана человеку.",
      "handoff_to_human",
      [],
      now,
      "human_required",
    );
  }

  const nearest = slots[0]!;
  const trimmed = message.trim();

  if (AFFIRMATIVE_PATTERN.test(trimmed)) {
    return confirmSlot(store, conversation, data, nearest, message, now);
  }

  if (NEGATIVE_PATTERN.test(trimmed)) {
    const reply = "Хорошо, на какую дату вам удобнее?";

    await store.saveTurn({
      conversationId: conversation.id,
      expectedStep: "slot",
      nextStep: "preferred_date",
      data,
      customerMessage: message,
      assistantMessage: reply,
      now,
    });

    return response(conversation.id, reply, "ask_question", data);
  }

  return persistRetry(
    store,
    conversation,
    data,
    message,
    `Не поняла ответ. Ближайшее свободное время — ${formatSlot(nearest)}. Подходит? Напишите «да», либо «нет», чтобы назвать другую дату.`,
    "ask_question",
    [],
    now,
  );
}

async function confirmSlot(
  store: ChatWorkflowStore,
  conversation: StoredChatConversation,
  data: ChatCollectedData,
  slot: ChatSlot,
  message: string,
  now: Date,
) {
  // Guarded by handleSlot's own check just before calling this, but the
  // narrower fields are asserted again here for the type going into
  // createBookingTurn.
  if (!data.category || !data.leadId || !data.publicNumber) {
    return response(
      conversation.id,
      "Заявка не найдена. Начните новый чат.",
      "handoff_to_human",
      data,
    );
  }

  const assistantMessage = `Готово. Заявка ${data.publicNumber} создана, время ${formatSlot(slot)} забронировано.`;
  const booked = await store.createBookingTurn({
    conversationId: conversation.id,
    expectedStep: "slot",
    data: {
      ...data,
      category: data.category,
      leadId: data.leadId,
      publicNumber: data.publicNumber,
    },
    slotId: slot.id,
    customerMessage: message,
    assistantMessage,
    now,
  });

  if (!booked) {
    // Someone else took it between the proposal and this confirmation —
    // recompute and offer the next-nearest instead of a bare failure.
    const refreshed = sortSlotsByPreference(
      await store.listAvailableSlots(data.category, now),
      data.preferredDate,
      data.preferredTime,
    );

    if (refreshed.length === 0) {
      return persistRetry(
        store,
        conversation,
        data,
        message,
        "Это время только что заняли, а свободных слотов больше нет. Заявка передана человеку.",
        "handoff_to_human",
        [],
        now,
        "human_required",
      );
    }

    return persistRetry(
      store,
      conversation,
      data,
      message,
      `Это время только что заняли. Ближайшее свободное — ${formatSlot(refreshed[0]!)}. Подходит?`,
      "ask_question",
      [],
      now,
    );
  }

  const nextData = {
    ...data,
    slotId: slot.id,
    bookingId: booked.bookingId,
  };

  return response(conversation.id, assistantMessage, "complete", nextData);
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
    // name/area only validate length — a question like "какая у вас
    // гарантия?" passes that just as easily as a real name or district, and
    // would otherwise be silently stored as the field's value. phone/date/
    // time already have a real structural format a question can't satisfy,
    // so they don't need this guard.
    case "name":
      return !looksLikeQuestion(message) && nameSchema.safeParse(message).success;
    case "phone":
      return phoneSchema.safeParse(message).success;
    case "area":
      return !looksLikeQuestion(message) && areaSchema.safeParse(message).success;
    case "preferred_date":
      return preferredDateSchema(now).safeParse(message).success;
    case "preferred_time":
      return timeSchema.safeParse(message).success;
    default:
      return false;
  }
}

function looksLikeQuestion(message: string): boolean {
  return message.includes("?");
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
  // Same three-tier resolution handleCategory uses for a mid-conversation
  // free-text answer: trust the LLM's own category first, but don't give up
  // on a miss — the classifier occasionally leaves category null or picks
  // "common" on an ambiguous first message even when the raw text names the
  // category outright ("установка кондиционера"), and re-asking something
  // the customer already said is exactly the "не поняла" complaint this was
  // meant to fix.
  const parsedCategory = z.enum(CHAT_CATEGORIES).safeParse(hints.category);
  const category = parsedCategory.success
    ? parsedCategory.data
    : classifyCategory(originalProblem);

  if (category) {
    data.category = category;
    const availableServices = await store.listServices(category);
    const matched = matchServiceByName(
      availableServices,
      hints.serviceType ?? "",
    );

    if (matched) {
      data.serviceId = matched.id;
      data.serviceType = matched.name;
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

/**
 * What the customer still needs to do next, derived purely from collected
 * data — independent of whatever step is literally stored as `currentStep`.
 * This is the single source of truth for "what's pending": the normal FSM
 * uses it to start a conversation, and the RAG layer (llm-orchestrator.ts)
 * reuses it to reattach a real next step after answering a knowledge
 * question, instead of leaving the customer on a bare paragraph with no way
 * to continue.
 */
export async function resolvePendingPrompt(
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
      action: "ask_question",
      reply:
        "К какому направлению это относится: бытовая техника, сантехника или кондиционеры?",
      options: [],
    };
  }

  if (!data.serviceId || !data.serviceType) {
    const availableServices = await store.listServices(data.category);
    return {
      step: "service",
      action: "ask_question",
      reply:
        availableServices.length > 0
          ? `Какая нужна услуга: ${availableServices.map((service) => service.name).join(", ")}? Можно своими словами.`
          : "Для этой категории сейчас нет активных услуг.",
      options: [],
    };
  }

  if (!data.demoName) {
    return askPrompt("name", "Как к вам обращаться?");
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

  if (!data.fulfillmentChoice) {
    return askPrompt("fulfillment", FULFILLMENT_QUESTION);
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

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU").replace(/\s+/gu, " ");
}

/**
 * Deterministic free-text service match, shared by validateChatExtraction
 * (LLM-proposed serviceType) and handleService (a customer typing the
 * service name directly instead of clicking a button) — same substring rule
 * in both places instead of two copies drifting apart.
 */
function matchServiceByName(
  services: ChatService[],
  requestedName: string,
): ChatService | null {
  const requested = normalizeText(requestedName);

  if (requested.length <= 2) {
    return null;
  }

  const matches = services.filter((service) => {
    const candidate = normalizeText(service.name);
    return candidate.includes(requested) || requested.includes(candidate);
  });

  return matches.length === 1 ? matches[0]! : null;
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
  phone: z.string().regex(RUSSIAN_PHONE_PATTERN),
  area: z.string().min(2).max(120),
  fulfillmentChoice: z.enum(["self_service", "callback"]).optional(),
  // Optional so an operator-callback lead (requestOperatorCallback) can be
  // created without them. The self-service path (handlePreferredTime)
  // always supplies a schema-validated string before parsing here, so this
  // doesn't loosen anything for that path.
  preferredDate: z.string().date().optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
