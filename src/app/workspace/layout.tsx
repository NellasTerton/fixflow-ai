import type { Metadata } from "next";
import { headers } from "next/headers";
import { Bot, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { WorkspaceNav } from "@/components/crm/workspace-nav";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3001";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: "FixFlow AI — рабочее пространство",
    description:
      "Заявки, база знаний, AI runs и автоматизации FixFlow AI — AI-диспетчера и операционной системы для выездных сервисных компаний.",
    openGraph: {
      title: "FixFlow AI",
      description: "Рабочее пространство FixFlow AI",
      images: [{ url: imageUrl, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "FixFlow AI",
      description: "Рабочее пространство FixFlow AI",
      images: [imageUrl],
    },
  };
}

export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f3f4ee]">
      <header className="border-b border-white/10 bg-[#071a1f] text-white">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4 py-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#bbf451] text-[#071a1f]">
                <Bot className="size-5" aria-hidden="true" />
              </span>
              <span>
                FixFlow AI
                <span className="ml-2 hidden text-xs font-normal text-white/40 sm:inline">
                  Рабочее пространство
                </span>
              </span>
            </Link>
            <WorkspaceNav />
          </div>
        </div>
      </header>

      <div className="border-b border-[#315b2d]/15 bg-[#e8f5ce]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-2 px-4 py-2.5 text-center text-xs font-semibold text-[#315b2d] sm:px-6 sm:text-sm lg:px-8">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Вы находитесь в тестовом рабочем пространстве FixFlow Service.
          Данные вымышлены.
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {children}
      </main>
    </div>
  );
}
