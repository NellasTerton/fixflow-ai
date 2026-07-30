import { NextResponse } from "next/server";

import { chatMessageRequestSchema } from "@/lib/chat/contracts";
import { continueChatWithLlm } from "@/server/chat/llm-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = chatMessageRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Некорректный ответ",
      },
      { status: 400 },
    );
  }

  try {
    const result = await continueChatWithLlm(
      parsed.data.conversationId,
      parsed.data.message,
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Deterministic chat message failed");
    return NextResponse.json(
      { error: "Не удалось продолжить чат. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
