import "server-only";

import { randomUUID } from "node:crypto";

import type {
  ChatCollectedData,
  ChatField,
  ChatResponse,
} from "../../lib/chat/contracts";
import { createAnthropicProvider } from "../llm/anthropic-provider";
import { saveChatAiRun, saveRagAiRun } from "../llm/ai-run-store";
import type { LlmAnalysisResult } from "../llm/contracts";
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
Classify and extract only what the user explicitly said. Never invent values.
Never claim that a lead or booking was created. Never request or invoke tools.
Never give database instructions. The server independently validates every field
and independently decides whether any proposed action is allowed.
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
        result.status === "success" ? result.output.category : null,
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

  const canUseOutput =
    result.status === "success" &&
    result.output.intent === "service_request";
  const collectedData = canUseOutput
    ? await validateChatExtraction(
        databaseChatStore,
        message,
        {
          ...result.output.extractedData,
          category: result.output.category,
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
        result.status === "success" ? result.output.category : null,
      provider,
      retrieve: retrieveKnowledge,
    });
    const saved = await databaseChatStore.saveTurn({
      conversationId,
      expectedStep: conversation.currentStep,
      nextStep: conversation.currentStep,
      data: conversation.collectedData,
      customerMessage: message,
      assistantMessage: answer.reply,
      status:
        answer.action === "handoff_to_human" ? "human_required" : "active",
      now: new Date(),
    });
    const response = saved
      ? knowledgeResponse(conversationId, conversation.collectedData, answer)
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

  await databaseChatStore.startConversation({
    conversationId,
    currentStep: "category",
    data,
    customerMessage: question,
    assistantMessage: answer.reply,
    action: answer.action,
    status:
      answer.action === "handoff_to_human" ? "human_required" : "active",
    now: new Date(),
  });

  return knowledgeResponse(conversationId, data, answer);
}

function knowledgeResponse(
  conversationId: string,
  collectedData: ChatCollectedData,
  answer: RagAnswer,
): ChatResponse {
  return {
    conversationId,
    reply: answer.reply,
    action: answer.action,
    missingFields: getMissingFieldNames(collectedData),
    collectedData,
    options: [],
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
