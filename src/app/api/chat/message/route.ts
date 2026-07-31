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
  } catch (error) {
    // Only the database error code is logged: the failing statement carries
    // demo phone numbers and addresses that must stay out of logs.
    console.error("Deterministic chat message failed", safeErrorCode(error));
    return NextResponse.json(
      { error: "Не удалось продолжить чат. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}

function safeErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return "unknown";
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
