import "server-only";

import { redactPublicText } from "../../lib/crm/presentation";
import { db } from "../db";
import { aiRuns } from "../db/schema";
import type {
  LlmAnalysisResult,
  LlmStructuredOutput,
} from "./contracts";
import type { RagAnswer } from "../rag/types";

export async function saveChatAiRun(input: {
  conversationId: string;
  operation: "chat_start_analysis" | "chat_turn_analysis";
  inputSummary: string;
  result: LlmAnalysisResult;
}) {
  await db.insert(aiRuns).values({
    conversationId: input.conversationId,
    operation: input.operation,
    model: input.result.model,
    inputSummary: input.inputSummary,
    parsedOutput: sanitizeOutput(input.result.output),
    retrievedChunks: [],
    durationMs: input.result.durationMs,
    status: input.result.status,
    error: input.result.error,
  });
}

export async function saveRagAiRun(input: {
  conversationId: string;
  question: string;
  answer: RagAnswer;
}) {
  await db.insert(aiRuns).values({
    conversationId: input.conversationId,
    operation: "rag_answer",
    model: input.answer.model,
    inputSummary: `question=${redactPublicText(input.question).slice(0, 500)}`,
    parsedOutput: {
      reply: redactPublicText(input.answer.reply),
      category: input.answer.category,
      action: input.answer.action,
    },
    retrievedChunks: input.answer.sources.map((source) => ({
      chunkId: source.chunkId,
      documentId: source.documentId,
      title: source.title,
      source: source.source,
      category: source.category,
      content: redactPublicText(source.content),
      similarity: Number(source.similarity.toFixed(4)),
    })),
    durationMs: input.answer.durationMs,
    status: input.answer.status,
    error: input.answer.error,
  });
}

function sanitizeOutput(
  output: LlmStructuredOutput | null,
): Record<string, unknown> {
  if (!output) {
    return {};
  }

  return {
    reply: redactPublicText(output.reply),
    intent: output.intent,
    category: output.category,
    confidence: output.confidence,
    extractedData: {
      problemDescription: output.extractedData.problemDescription
        ? redactPublicText(output.extractedData.problemDescription)
        : null,
      serviceType: output.extractedData.serviceType,
      name: output.extractedData.name ? "[name-collected]" : null,
      phone: output.extractedData.phone ? "[phone-collected]" : null,
      address: output.extractedData.address
        ? "[address-collected]"
        : null,
      preferredDate: output.extractedData.preferredDate,
    },
    proposedAction: output.proposedAction,
  };
}
