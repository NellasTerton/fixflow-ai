import { describe, expect, it } from "vitest";

import { chunkKnowledgeText } from "./chunker";
import { createEmbedding } from "./embedding";

describe("knowledge preparation", () => {
  it("creates roughly 700-1000 character chunks with overlap", () => {
    const text = Array.from(
      { length: 90 },
      (_, index) => `Предложение ${index} описывает демонстрационную услугу.`,
    ).join(" ");
    const chunks = chunkKnowledgeText(text);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.slice(0, -1).every((chunk) => chunk.content.length >= 700))
      .toBe(true);
    expect(chunks.every((chunk) => chunk.content.length <= 1000)).toBe(true);

    const tail = chunks[0]!.content.slice(-60);
    expect(chunks[1]!.content).toContain(tail.trim().slice(-30));
  });

  it("creates normalized 1536-dimensional embeddings", () => {
    const embedding = createEmbedding("Сколько стоит устранить протечку?");
    const norm = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0),
    );

    expect(embedding).toHaveLength(1536);
    expect(norm).toBeCloseTo(1, 6);
  });
});
