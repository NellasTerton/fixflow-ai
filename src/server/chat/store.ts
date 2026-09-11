import "server-only";

import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";

import { db } from "../db";
import { conversations, messages } from "../db/schema";
import type { ChatMessage } from "./agent";

export interface LoadedConversation {
  status: "active" | "completed" | "abandoned" | "human_required";
  leadId: string | null;
  publicNumber: string | null;
  history: ChatMessage[];
}

/**
 * `current_step`/`collected_data` are relics of the deleted FSM (both
 * columns are NOT NULL with no default worth relying on) — the new agent
 * has no steps, so this just satisfies the constraint. `lead_id` and the
 * `publicNumber` stashed in `collected_data` by tools.ts's `createLead` are
 * the only pieces of this row the new code actually reads.
 */
const PLACEHOLDER_STEP = "chat";

export async function startConversation(
  conversationId: string,
  now: Date,
): Promise<void> {
  await db.insert(conversations).values({
    id: conversationId,
    leadId: null,
    currentStep: PLACEHOLDER_STEP,
    collectedData: {},
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export async function loadConversationForTurn(
  conversationId: string,
): Promise<LoadedConversation | null> {
  const [row] = await db
    .select({
      status: conversations.status,
      leadId: conversations.leadId,
      collectedData: conversations.collectedData,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!row) {
    return null;
  }

  const historyRows = await db
    .select({ sender: messages.sender, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const publicNumber =
    typeof row.collectedData?.publicNumber === "string"
      ? row.collectedData.publicNumber
      : null;

  return {
    status: row.status,
    leadId: row.leadId,
    publicNumber,
    history: historyRows.map((message) => ({
      role: message.sender === "customer" ? "user" : "assistant",
      content: message.content,
    })),
  };
}

export async function appendTurn(
  conversationId: string,
  customerMessage: string,
  assistantMessage: string,
  now: Date,
): Promise<void> {
  await db.insert(messages).values([
    {
      id: randomUUID(),
      conversationId,
      sender: "customer",
      content: customerMessage,
      metadata: {},
      createdAt: now,
    },
    {
      id: randomUUID(),
      conversationId,
      sender: "assistant",
      content: assistantMessage,
      metadata: {},
      createdAt: new Date(now.getTime() + 1),
    },
  ]);
}
