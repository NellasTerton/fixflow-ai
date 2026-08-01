import type { Metadata } from "next";

import { ChatClient } from "@/components/chat/chat-client";

export const metadata: Metadata = {
  title: "Написать диспетчеру | FixFlow Service",
  description:
    "Опишите проблему — AI-диспетчер подберёт услугу, назовёт цену и запишет мастера на свободное время.",
};

export default function ChatPage() {
  return <ChatClient />;
}
