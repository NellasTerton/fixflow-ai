import { NextResponse } from "next/server";

import { chatStartRequestSchema } from "@/lib/chat/contracts";
import { startChat } from "@/server/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = chatStartRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Некорректное первое сообщение",
      },
      { status: 400 },
    );
  }

  try {
    const result = await startChat(parsed.data.message);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Chat start failed", safeErrorCode(error));
    return NextResponse.json(
      { error: "Не удалось начать чат. Попробуйте ещё раз." },
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
