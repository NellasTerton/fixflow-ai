import "server-only";

import { randomUUID } from "node:crypto";

import type { ChatResponse } from "../../lib/chat/contracts";
import { runAgentTurn } from "./agent";
import {
  appendTurn,
  loadConversationForTurn,
  startConversation,
} from "./store";

export async function startChat(message: string): Promise<ChatResponse> {
  const conversationId = randomUUID();
  const now = new Date();
  await startConversation(conversationId, now);

  const result = await runAgentTurn(conversationId, message, [], null);
  await appendTurn(conversationId, message, result.reply, now);

  return {
    conversationId,
    reply: result.reply,
    leadId: result.leadId,
    publicNumber: result.publicNumber,
    bookingId: result.bookingId,
  };
}

export async function continueChat(
  conversationId: string,
  message: string,
): Promise<ChatResponse> {
  const conversation = await loadConversationForTurn(conversationId);

  if (!conversation) {
    return {
      conversationId,
      reply: "Диалог не найден. Начните новый чат.",
    };
  }

  if (conversation.status !== "active") {
    return {
      conversationId,
      reply: "Диалог передан человеку. Начните новый чат, чтобы создать другую заявку.",
      leadId: conversation.leadId ?? undefined,
      publicNumber: conversation.publicNumber ?? undefined,
    };
  }

  const activeLead = conversation.publicNumber
    ? { publicNumber: conversation.publicNumber }
    : null;
  const result = await runAgentTurn(
    conversationId,
    message,
    conversation.history,
    activeLead,
  );
  await appendTurn(conversationId, message, result.reply, new Date());

  return {
    conversationId,
    reply: result.reply,
    leadId: result.leadId ?? conversation.leadId ?? undefined,
    publicNumber: result.publicNumber ?? conversation.publicNumber ?? undefined,
    bookingId: result.bookingId,
  };
}
