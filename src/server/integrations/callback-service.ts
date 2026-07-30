import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  automationLogs,
  integrationEvents,
} from "@/server/db/schema";

import type { MakeCallback } from "./contracts";

export type MakeCallbackResult = "created" | "updated" | "event_not_found";

export async function recordMakeCallback(
  callback: MakeCallback,
): Promise<MakeCallbackResult> {
  const [event] = await db
    .select({ id: integrationEvents.id })
    .from(integrationEvents)
    .where(eq(integrationEvents.id, callback.eventId))
    .limit(1);

  if (!event) {
    return "event_not_found";
  }

  const result = await db.execute(sql`
    insert into ${automationLogs} (
      integration_event_id,
      platform,
      workflow_name,
      action,
      status,
      external_run_id,
      details,
      created_at
    )
    values (
      ${callback.eventId},
      ${callback.platform},
      ${callback.workflowName},
      ${callback.action},
      ${callback.status},
      ${callback.externalRunId ?? null},
      ${JSON.stringify(callback.details)}::jsonb,
      now()
    )
    on conflict (
      integration_event_id,
      platform,
      workflow_name,
      action
    )
    do update set
      status = excluded.status,
      external_run_id = excluded.external_run_id,
      details = excluded.details
    returning (xmax = 0) as inserted
  `);

  const [row] = getResultRows<{ inserted: boolean }>(result);
  return row?.inserted ? "created" : "updated";
}

function getResultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows as T[];
  }

  return [];
}
