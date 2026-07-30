import type { KnowledgeSource } from "./types";

export function filterRelevantSources(
  sources: KnowledgeSource[],
  minSimilarity: number,
  limit: number,
) {
  return sources
    .filter((source) => source.similarity >= minSimilarity)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);
}
