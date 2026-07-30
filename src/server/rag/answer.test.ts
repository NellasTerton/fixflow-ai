import { describe, expect, it } from "vitest";

import { createMockLlmProvider } from "../llm/mock-provider";
import { answerWithRag } from "./answer";
import { determineKnowledgeCategory } from "./category";
import { filterRelevantSources } from "./relevance";
import type { KnowledgeSource } from "./types";

describe("RAG answers", () => {
  it("determines the correct service category", () => {
    expect(determineKnowledgeCategory("Сколько стоит устранить протечку?"))
      .toBe("plumbing");
    expect(determineKnowledgeCategory("Нужно почистить кондиционер"))
      .toBe("air_conditioning");
    expect(determineKnowledgeCategory("Не охлаждает холодильник"))
      .toBe("appliance_repair");
  });

  it("uses a common document together with a selected category", async () => {
    const source = makeSource({
      category: "common",
      title: "Гарантийные правила",
      content:
        "Пожизненной гарантии нет. Гарантия на выполненную работу — до 90 дней.",
    });
    let requestedCategory = "";
    const answer = await answerWithRag({
      question: "Вы даёте пожизненную гарантию?",
      modelCategory: "plumbing",
      provider: provider(
        "Нет, пожизненной гарантии нет. Срок — до 90 дней [1].",
      ),
      retrieve: async (_question, category) => {
        requestedCategory = category;
        return [source];
      },
    });

    expect(requestedCategory).toBe("plumbing");
    expect(answer.sources[0]?.category).toBe("common");
    expect(answer.action).toBe("ask_question");
  });

  it("hands off when no sources are found", async () => {
    const answer = await answerWithRag({
      question: "Вы ремонтируете автомобили?",
      provider: provider("Да."),
      retrieve: async () => [],
    });

    expect(answer.action).toBe("handoff_to_human");
    expect(answer.error).toBe("insufficient_sources");
  });

  it("filters low-relevance results", () => {
    const filtered = filterRelevantSources(
      [
        makeSource({ similarity: 0.12 }),
        makeSource({ similarity: 0.42, title: "Подходящий документ" }),
      ],
      0.18,
      5,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("Подходящий документ");
  });

  it("rejects an invented price", async () => {
    const answer = await answerWithRag({
      question: "Сколько стоит устранить протечку?",
      provider: provider("Услуга стоит 9 999 ₴ [1]."),
      retrieve: async () => [
        makeSource({
          category: "plumbing",
          content: "Устранение протечки стоит ориентировочно 900–1 800 ₴.",
        }),
      ],
    });

    expect(answer.action).toBe("handoff_to_human");
    expect(answer.error).toBe("ungrounded_answer");
  });

  it("honors a model handoff but the server remains authoritative", async () => {
    const answer = await answerWithRag({
      question: "Можно ли починить неизвестное оборудование?",
      provider: provider(
        "В источниках недостаточно данных.",
        "handoff_to_human",
      ),
      retrieve: async () => [makeSource()],
    });

    expect(answer.action).toBe("handoff_to_human");
  });
});

function provider(
  reply: string,
  proposedAction: "ask_question" | "handoff_to_human" = "ask_question",
) {
  return createMockLlmProvider({
    response: JSON.stringify({
      reply,
      intent: "information_request",
      category: "plumbing",
      confidence: 0.94,
      extractedData: {
        problemDescription: null,
        serviceType: null,
        name: null,
        phone: null,
        address: null,
        preferredDate: null,
      },
      proposedAction,
    }),
  });
}

function makeSource(
  overrides: Partial<KnowledgeSource> = {},
): KnowledgeSource {
  return {
    chunkId: "chunk-1",
    documentId: "document-1",
    title: "Демонстрационный источник",
    source: "knowledge/demo/source.md",
    category: "common",
    content: "Демонстрационные данные вымышленной компании.",
    similarity: 0.81,
    ...overrides,
  };
}
