import "server-only";

import {
  and,
  cosineDistance,
  desc,
  eq,
  gt,
  inArray,
  sql,
} from "drizzle-orm";

import type { CrmCategory } from "../../lib/crm/constants";
import { db } from "../db";
import { documentChunks, documents } from "../db/schema";
import { createEmbedding } from "./embedding";
import {
  RAG_MAX_RESULTS,
  RAG_MIN_SIMILARITY,
  type KnowledgeSource,
} from "./types";

export async function retrieveKnowledge(
  question: string,
  category: CrmCategory,
  options: {
    limit?: number;
    minSimilarity?: number;
  } = {},
): Promise<KnowledgeSource[]> {
  const embedding = createEmbedding(question);
  const similarity =
    sql<number>`1 - (${cosineDistance(documentChunks.embedding, embedding)})`;
  const categories =
    category === "common" ? ["common" as const] : [category, "common" as const];
  const rows = await db
    .select({
      chunkId: documentChunks.id,
      documentId: documents.id,
      title: documents.title,
      source: sql<string>`${documentChunks.metadata}->>'source'`,
      category: documentChunks.category,
      content: documentChunks.content,
      similarity,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      and(
        eq(documents.status, "published"),
        eq(documents.isDemo, true),
        inArray(documentChunks.category, categories),
        gt(similarity, options.minSimilarity ?? RAG_MIN_SIMILARITY),
      ),
    )
    .orderBy(desc(similarity))
    .limit(options.limit ?? RAG_MAX_RESULTS);

  return rows.map((row) => ({
    ...row,
    source: row.source || "knowledge/demo",
    similarity: Number(row.similarity),
  }));
}
