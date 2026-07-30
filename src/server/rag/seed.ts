import { createHash } from "node:crypto";

import type { CrmCategory } from "../../lib/crm/constants";
import { chunkKnowledgeText } from "./chunker";
import { createEmbedding, getEmbeddingModel } from "./embedding";

export interface KnowledgeDocumentInput {
  title: string;
  category: CrmCategory;
  source: string;
  content: string;
}

export interface KnowledgeSeedStore {
  replaceDocument(input: {
    title: string;
    category: CrmCategory;
    content: string;
    source: string;
    contentHash: string;
    chunks: Array<{
      index: number;
      content: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    }>;
  }): Promise<void>;
}

export async function applyKnowledgeSeed(
  store: KnowledgeSeedStore,
  inputs: KnowledgeDocumentInput[],
) {
  let chunkCount = 0;

  for (const input of inputs) {
    const contentHash = createHash("sha256")
      .update(input.content)
      .digest("hex");
    const chunks = chunkKnowledgeText(input.content).map((chunk) => ({
      ...chunk,
      embedding: createEmbedding(chunk.content),
      metadata: {
        source: input.source,
        title: input.title,
        contentHash,
        embeddingModel: getEmbeddingModel(),
        demo: true,
      },
    }));

    await store.replaceDocument({
      ...input,
      contentHash,
      chunks,
    });
    chunkCount += chunks.length;
  }

  return { documents: inputs.length, chunks: chunkCount };
}
