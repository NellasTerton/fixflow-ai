import "server-only";

import { randomUUID } from "node:crypto";

import type {
  ChatCollectedData,
  ChatField,
  ChatOption,
  ChatResponse,
  ChatStep,
} from "../../lib/chat/contracts";
import { createAnthropicProvider } from "../llm/anthropic-provider";
import { saveChatAiRun, saveRagAiRun } from "../llm/ai-run-store";
import type {
  LlmAnalysisResult,
  LlmStructuredOutput,
} from "../llm/contracts";
import {
  runLlmAnalysis,
  unconfiguredLlmResult,
} from "../llm/runner";
import { answerWithRag } from "../rag/answer";
import { retrieveKnowledge } from "../rag/retrieval";
import type { RagAnswer } from "../rag/types";
import { databaseChatStore } from "./store";
import {
  continueChatWorkflow,
  isExpectedStepAnswer,
  resolvePendingPrompt,
  startChatWorkflow,
  validateChatExtraction,
} from "./workflow";

const SYSTEM_PROMPT = `You are the constrained language layer for FixFlow Service, an AI dispatcher for a field-service company in Moscow (appliance repair, plumbing, air conditioning).
Return only one JSON object with exactly this shape:
{
  "reply": "one short natural Russian question",
  "intent": "service_request | information_request | human_handoff | other",
  "category": "appliance_repair | plumbing | air_conditioning | common | null",
  "confidence": 0.0,
  "extractedData": {
    "problemDescription": "string or null",
    "serviceType": "string or null",
    "name": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "preferredDate": "YYYY-MM-DD or null"
  },
  "proposedAction": "ask_question | show_categories | show_services | show_slots | create_lead | create_booking | handoff_to_human | complete"
}

Service catalog — "serviceType" MUST be copied verbatim from this list, matched
to the category you picked. Understand the customer's own words (e.g. "кран
течёт" → "Замена смесителя", "кондиционер шумит" → "Диагностика кондиционера",
"поставить стиралку" → "Установка бытовой техники") and map them to the closest
line. If the request fits no specific line, spans several jobs at once, or you
are not confident, use "Выезд и диагностика" for that category — never leave
serviceType null for a real service_request, and never invent a name outside
this list.
- appliance_repair: "Ремонт стиральной машины", "Ремонт посудомоечной машины", "Ремонт холодильника", "Ремонт духового шкафа", "Установка бытовой техники", "Выезд и диагностика"
- plumbing: "Устранение протечки", "Замена смесителя", "Прочистка засора", "Установка унитаза", "Выезд и диагностика"
- air_conditioning: "Установка кондиционера", "Заправка кондиционера", "Чистка кондиционера", "Диагностика кондиционера", "Выезд и диагностика"

Classify and extract only what the user explicitly said, except for serviceType,
which you always resolve to a catalog line as described above. Never invent other
values. Never claim that a lead or booking was created. Never request or invoke
tools. Never give database instructions. The server independently validates every
field and independently decides whether any proposed action is allowed.
RAG context is currently empty; do not add factual service advice without it.`;

export async function startChatWithLlm(
  message: string,
): Promise<ChatResponse> {
  const result = await analyze({
    currentStep: "start",
    missingFields: [
      "problemDescription",
      "category",
      "serviceType",
      "demoName",
      "phone",
      "area",
      "preferredDate",
      "preferredTime",
    ],
    message,
  });
  const provider = createAnthropicProvider();

  if (provider && isKnowledgeQuestion(message, result)) {
    const answer = await answerWithRag({
      question: message,
      modelCategory:
        usableClassification(result)?.category ?? null,
      provider,
      retrieve: retrieveKnowledge,
    });
    const response = await startKnowledgeConversation(message, answer);

    await safelySaveRun({
      conversationId: response.conversationId,
      operation: "chat_start_analysis",
      inputSummary: `step=start; message_chars=${message.length}; knowledge_intent=true`,
      result,
    });
    await safelySaveRagRun(response.conversationId, message, answer);
    return response;
  }

  // Use the classification for routing even when the model self-reported low
  // confidence. On short or slang inputs ("не работает кондей") the model
  // still gets category + service right but scores itself ~0.6, and the 0.7
  // gate was throwing that away — dropping the customer onto the category
  // button wall. The deterministic catalog match in validateChatExtraction is
  // the real safety net: a bad guess simply fails to match and falls back to
  // buttons, no worse than before.
  const classification = usableClassification(result);
  const canUseOutput = classification?.intent === "service_request";
  const collectedData = canUseOutput
    ? await validateChatExtraction(
        databaseChatStore,
        message,
        {
          ...classification.extractedData,
          category: classification.category,
        },
      )
    : undefined;
  const response = await startChatWorkflow(
    databaseChatStore,
    message,
    new Date(),
    { collectedData },
  );

  await safelySaveRun({
    conversationId: response.conversationId,
    operation: "chat_start_analysis",
    inputSummary: `step=start; message_chars=${message.length}; rag_chunks=0`,
    result,
  });

  return response;
}

export async function continueChatWithLlm(
  conversationId: string,
  message: string,
): Promise<ChatResponse> {
  const conversation =
    await databaseChatStore.loadConversation(conversationId);

  if (!conversation) {
    return continueChatWorkflow(
      databaseChatStore,
      conversationId,
      message,
    );
  }

  const missingFields = getMissingFieldNames(conversation.collectedData);
  const result = await analyze({
    currentStep: conversation.currentStep,
    missingFields,
    message,
  });

  const provider = createAnthropicProvider();
  const expectsPlainAnswer = isExpectedStepAnswer(
    conversation.currentStep,
    message,
  );

  if (provider && !expectsPlainAnswer && isKnowledgeQuestion(message, result)) {
    const answer = await answerWithRag({
      question: message,
      modelCategory:
        usableClassification(result)?.category ?? null,
      provider,
      retrieve: retrieveKnowledge,
    });
    // A RAG aside must not leave the customer on a bare paragraph with no
    // way to continue: re-derive whatever the FSM still needs from the
    // already-collected data and attach its real prompt/options, the same
    // way a normal step reply would. "slot"/"complete" already have every
    // field set (a lead/booking exists), so resolvePendingPrompt's
    // presence-checks would incorrectly fall through to re-asking for
    // preferred_time — those two keep today's bare-answer behavior.
    const pending =
      answer.status === "success" && canReattachPendingPrompt(conversation.currentStep)
        ? await resolvePendingPrompt(databaseChatStore, conversation.collectedData)
        : null;
    const combined = pending
      ? combineWithPendingPrompt(answer.reply, pending)
      : null;
    const saved = await databaseChatStore.saveTurn({
      conversationId,
      expectedStep: conversation.currentStep,
      nextStep: conversation.currentStep,
      data: conversation.collectedData,
      customerMessage: message,
      assistantMessage: combined?.reply ?? answer.reply,
      status:
        answer.action === "handoff_to_human" ? "human_required" : "active",
      now: new Date(),
    });
    const response = saved
      ? knowledgeResponse(
          conversationId,
          conversation.collectedData,
          answer,
          combined ?? undefined,
        )
      : await continueChatWorkflow(
          databaseChatStore,
          conversationId,
          message,
        );

    await safelySaveRun({
      conversationId,
      operation: "chat_turn_analysis",
      inputSummary: `step=${conversation.currentStep}; message_chars=${message.length}; knowledge_intent=true`,
      result,
    });
    await safelySaveRagRun(conversationId, message, answer);
    return response;
  }

  const response = await continueChatWorkflow(
    databaseChatStore,
    conversationId,
    message,
    new Date(),
  );

  await safelySaveRun({
    conversationId,
    operation: "chat_turn_analysis",
    inputSummary: `step=${conversation.currentStep}; message_chars=${message.length}; missing_fields=${missingFields.join(",") || "none"}; rag_chunks=0`,
    result,
  });

  return response;
}

async function startKnowledgeConversation(
  question: string,
  answer: RagAnswer,
): Promise<ChatResponse> {
  const conversationId = randomUUID();
  const data: ChatCollectedData = { problemDescription: question };

  // Only a genuinely answered question gets the FSM's real next prompt
  // attached — a handoff already tells the customer a human is taking over,
  // so inviting them to keep clicking through category buttons right after
  // would contradict that message.
  const pending =
    answer.status === "success"
      ? await resolvePendingPrompt(databaseChatStore, data)
      : null;
  const combined = pending
    ? combineWithPendingPrompt(answer.reply, pending)
    : null;

  await databaseChatStore.startConversation({
    conversationId,
    currentStep: pending?.step ?? "category",
    data,
    customerMessage: question,
    assistantMessage: combined?.reply ?? answer.reply,
    action: combined?.action ?? answer.action,
    status:
      answer.action === "handoff_to_human" ? "human_required" : "active",
    now: new Date(),
  });

  return knowledgeResponse(conversationId, data, answer, combined ?? undefined);
}

/**
 * Steps resolvePendingPrompt can safely re-derive from collected data alone.
 * See the comment above its call site in continueChatWithLlm.
 */
function canReattachPendingPrompt(step: ChatStep) {
  return step !== "slot" && step !== "complete";
}

function combineWithPendingPrompt(
  ragReply: string,
  pending: { action: ChatResponse["action"]; reply: string; options: ChatOption[] },
) {
  return {
    reply: `${ragReply}\n\n${pending.reply}`,
    action: pending.action,
    options: pending.options,
  };
}

function knowledgeResponse(
  conversationId: string,
  collectedData: ChatCollectedData,
  answer: RagAnswer,
  combined?: { reply: string; action: ChatResponse["action"]; options: ChatOption[] },
): ChatResponse {
  return {
    conversationId,
    reply: combined?.reply ?? answer.reply,
    action: combined?.action ?? answer.action,
    missingFields: getMissingFieldNames(collectedData),
    collectedData,
    options: combined?.options ?? [],
    sources: answer.sources.map((source) => ({
      title: source.title,
      source: source.source,
      category: source.category,
      excerpt: source.content.slice(0, 260),
      similarity: Number(source.similarity.toFixed(4)),
    })),
  };
}

async function analyze(input: {
  currentStep: string;
  missingFields: string[];
  message: string;
}) {
  const provider = createAnthropicProvider();

  if (!provider) {
    return unconfiguredLlmResult();
  }

  return runLlmAnalysis(provider, {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      currentStep: input.currentStep,
      missingFields: input.missingFields,
      userMessage: input.message,
      ragContext: [],
      instruction:
        "Extract explicit values and phrase only the next missing question. Return JSON only.",
    }),
  });
}

/**
 * The model's structured output when it is safe to route on, treating a
 * low-confidence result as usable — the deterministic layer re-validates every
 * field, so a shaky classification degrades gracefully rather than being
 * discarded. Genuinely broken results (bad JSON, timeout, wrong schema) still
 * return null and fall back to the button flow.
 */
function usableClassification(
  result: LlmAnalysisResult,
): LlmStructuredOutput | null {
  if (result.status === "success") {
    return result.output;
  }

  if (result.error === "low_confidence" && result.output) {
    return result.output;
  }

  return null;
}

function getMissingFieldNames(
  data: ChatCollectedData,
): ChatField[] {
  const fields = [
    "problemDescription",
    "category",
    "serviceType",
    "demoName",
    "phone",
    "area",
    "preferredDate",
    "preferredTime",
  ] as const;

  return fields.filter((field) => !data[field]);
}

async function safelySaveRun(
  input: Parameters<typeof saveChatAiRun>[0],
) {
  try {
    await saveChatAiRun(input);
  } catch {
    console.error("AI run persistence failed");
  }
}

async function safelySaveRagRun(
  conversationId: string,
  question: string,
  answer: RagAnswer,
) {
  try {
    await saveRagAiRun({ conversationId, question, answer });
  } catch {
    console.error("RAG run persistence failed");
  }
}

function isKnowledgeQuestion(
  message: string,
  result: LlmAnalysisResult,
) {
  if (
    result.status === "success" &&
    result.output.intent === "information_request"
  ) {
    return true;
  }

  return /(?:сколько|стоим|цен|гаран|обслужива|ремонтируете|можете ли|район|зона|правил|как запис)/iu.test(
    message,
  );
}
