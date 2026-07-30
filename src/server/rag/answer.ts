import type { CrmCategory } from "../../lib/crm/constants";
import type { LlmProvider } from "../llm/contracts";
import { runLlmAnalysis } from "../llm/runner";
import { determineKnowledgeCategory } from "./category";
import { isRagAnswerGrounded } from "./safety";
import type { KnowledgeSource, RagAnswer } from "./types";

const RAG_SYSTEM_PROMPT = `You answer for FixFlow AI using retrieval context only.
Return only one JSON object matching the requested schema.
Rules:
- Use no factual knowledge outside RAG_CONTEXT.
- Prices, warranty and service area may only come from RAG_CONTEXT.
- Never make a final diagnosis and never promise an exact price.
- Cite useful sources as [1], [2] in reply.
- If context is missing or insufficient, proposedAction must be handoff_to_human.
- Otherwise proposedAction must be ask_question.
- Do not create leads, bookings or database records.
- Reply in Russian and explicitly distinguish an approximate range from a final price.`;

export type KnowledgeRetriever = (
  question: string,
  category: CrmCategory,
) => Promise<KnowledgeSource[]>;

export async function answerWithRag(input: {
  question: string;
  modelCategory?: CrmCategory | null;
  provider: LlmProvider;
  retrieve: KnowledgeRetriever;
}): Promise<RagAnswer> {
  const startedAt = performance.now();
  const category = determineKnowledgeCategory(
    input.question,
    input.modelCategory,
  );
  const sources = await input.retrieve(input.question, category);

  if (sources.length === 0) {
    return handoff(
      category,
      sources,
      input.provider.model,
      elapsed(startedAt),
      "insufficient_sources",
    );
  }

  const result = await runLlmAnalysis(
    input.provider,
    {
      systemPrompt: RAG_SYSTEM_PROMPT,
      userPrompt: JSON.stringify({
        question: input.question,
        category,
        RAG_CONTEXT: sources.map((source, index) => ({
          citation: index + 1,
          title: source.title,
          source: source.source,
          content: source.content,
          similarity: source.similarity,
        })),
        outputSchema: {
          reply: "string",
          intent: "information_request",
          category,
          confidence: 0.9,
          extractedData: {
            problemDescription: null,
            serviceType: null,
            name: null,
            phone: null,
            address: null,
            preferredDate: null,
          },
          proposedAction: "ask_question | handoff_to_human",
        },
      }),
    },
    { confidenceThreshold: 0.7, timeoutMs: 12_000 },
  );

  if (
    result.status !== "success" ||
    result.output.intent !== "information_request" ||
    result.output.proposedAction === "handoff_to_human" ||
    !isRagAnswerGrounded(input.question, result.output.reply, sources)
  ) {
    return handoff(
      category,
      sources,
      result.model,
      elapsed(startedAt),
      result.status === "error" ? result.error : "ungrounded_answer",
    );
  }

  return {
    reply: result.output.reply,
    action: "ask_question",
    category,
    sources,
    model: result.model,
    durationMs: elapsed(startedAt),
    status: "success",
    error: null,
  };
}

function handoff(
  category: CrmCategory,
  sources: KnowledgeSource[],
  model: string,
  durationMs: number,
  error: string,
): RagAnswer {
  return {
    reply:
      "В базе знаний недостаточно надёжных данных для ответа. Передаю вопрос человеку и не буду придумывать детали.",
    action: "handoff_to_human",
    category,
    sources,
    model,
    durationMs,
    status: "error",
    error,
  };
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
