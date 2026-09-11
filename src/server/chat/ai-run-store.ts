import "server-only";

import { redactPublicText } from "../../lib/crm/presentation";
import { db } from "../db";
import { aiRuns } from "../db/schema";

/**
 * Internal trace for /workspace/ai-runs — one row per chat turn. Much
 * simpler than the old FSM+RAG-era shape (no separate rag_answer operation,
 * no retrieved-chunk list): there's one agent loop per turn, so one row
 * naming which tools it called is the whole story.
 */
export async function saveChatAgentRun(input: {
  conversationId: string;
  model: string;
  messageChars: number;
  toolsCalled: string[];
  reply: string;
  durationMs: number;
  status: "success" | "error";
  error: string | null;
}) {
  await db.insert(aiRuns).values({
    conversationId: input.conversationId,
    operation: "chat_agent_turn",
    model: input.model,
    inputSummary: `message_chars=${input.messageChars}; tools=${
      input.toolsCalled.join(",") || "none"
    }`,
    parsedOutput: {
      reply: redactPublicText(input.reply),
      action: input.toolsCalled.at(-1) ?? null,
    },
    durationMs: input.durationMs,
    status: input.status,
    error: input.error,
  });
}
