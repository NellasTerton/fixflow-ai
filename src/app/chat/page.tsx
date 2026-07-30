import type { Metadata } from "next";

import { ChatClient } from "@/components/chat/chat-client";

export const metadata: Metadata = {
  title: "Клиентский чат | FixFlow AI",
  description:
    "Гибридный демонстрационный чат FixFlow с LLM и детерминированным fallback.",
};

export default function ChatPage() {
  return <ChatClient />;
}
