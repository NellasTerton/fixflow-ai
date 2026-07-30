import { describe, expect, it } from "vitest";

import {
  applyKnowledgeSeed,
  type KnowledgeSeedStore,
} from "./seed";

describe("knowledge seed", () => {
  it("is idempotent when run repeatedly", async () => {
    const records = new Map<string, number>();
    const store: KnowledgeSeedStore = {
      async replaceDocument(input) {
        records.set(
          `${input.category}:${input.title}`,
          input.chunks.length,
        );
      },
    };
    const documents = [{
      title: "FAQ",
      category: "common" as const,
      source: "knowledge/demo/faq.txt",
      content:
        "Демонстрационные данные вымышленной компании. ".repeat(40),
    }];

    const first = await applyKnowledgeSeed(store, documents);
    const second = await applyKnowledgeSeed(store, documents);

    expect(second).toEqual(first);
    expect(records.size).toBe(1);
    expect([...records.values()][0]).toBe(first.chunks);
  });
});
