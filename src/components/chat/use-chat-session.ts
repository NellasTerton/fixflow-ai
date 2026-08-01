"use client";

import { useRef, useState } from "react";

import type { ChatResponse } from "@/lib/chat/contracts";

export interface TranscriptMessage {
  id: number;
  sender: "assistant" | "customer";
  content: string;
}

export const chatGreeting =
  "Здравствуйте! Опишите, что случилось — подберу услугу и запишу мастера на удобное время.";

/**
 * Owns one conversation with the dispatcher: transcript, pending state and
 * the start/continue endpoint switch. Shared by the full chat page and the
 * compact widget on the landing page so both behave identically.
 */
export function useChatSession() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([
    { id: 1, sender: "assistant", content: chatGreeting },
  ]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextMessageId = useRef(2);

  const isFinished =
    result?.action === "complete" || result?.action === "handoff_to_human";
  const showOptions =
    result !== null &&
    ["show_categories", "show_services", "show_slots"].includes(result.action) &&
    result.options.length > 0;

  function appendMessage(
    sender: TranscriptMessage["sender"],
    content: string,
  ) {
    const id = nextMessageId.current++;
    setMessages((current) => [...current, { id, sender, content }]);
  }

  async function sendMessage(
    submittedValue: string,
    displayValue = submittedValue,
  ) {
    const normalized = submittedValue.trim();

    if (!normalized || pending || isFinished) {
      return;
    }

    setPending(true);
    setError(null);
    appendMessage("customer", displayValue);

    try {
      const response = await fetch(
        conversationId ? "/api/chat/message" : "/api/chat/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            conversationId
              ? { conversationId, message: normalized }
              : { message: normalized },
          ),
        },
      );
      const body = (await response.json()) as ChatResponse | { error?: string };

      if (!response.ok || !("conversationId" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Не удалось отправить сообщение",
        );
      }

      setConversationId(body.conversationId);
      setResult(body);
      appendMessage("assistant", body.reply);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось отправить сообщение",
      );
    } finally {
      setPending(false);
    }
  }

  return {
    conversationId,
    result,
    messages,
    pending,
    error,
    isFinished,
    showOptions,
    sendMessage,
  };
}
