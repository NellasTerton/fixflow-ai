import { NextResponse } from "next/server";

import { listPublicLeads } from "@/server/crm/queries";
import { publicCrmFiltersSchema } from "@/server/crm/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicCrmFiltersSchema.safeParse({
    category: url.searchParams.get("category") || undefined,
    status: url.searchParams.get("status") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    source: url.searchParams.get("source") || undefined,
    search: url.searchParams.get("search") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные параметры фильтра" },
      { status: 400 },
    );
  }

  try {
    const result = await listPublicLeads(parsed.data);

    return NextResponse.json(
      { leads: result, refreshedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Public CRM leads query failed");

    return NextResponse.json(
      { error: "Не удалось обновить список заявок" },
      { status: 503 },
    );
  }
}
