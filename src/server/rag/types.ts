import type { CrmCategory } from "../../lib/crm/constants";

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = "fixflow-local-hash-v1";
export const RAG_MAX_RESULTS = 5;
export const RAG_MIN_SIMILARITY = 0.18;

export interface KnowledgeSource {
  chunkId: string;
  documentId: string;
  title: string;
  source: string;
  category: CrmCategory;
  content: string;
  similarity: number;
}

export interface RagAnswer {
  reply: string;
  action: "ask_question" | "handoff_to_human";
  category: CrmCategory;
  sources: KnowledgeSource[];
  model: string;
  durationMs: number;
  status: "success" | "error";
  error: string | null;
}
