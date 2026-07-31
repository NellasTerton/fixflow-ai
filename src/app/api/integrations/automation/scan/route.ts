import { z } from "zod";

import { matchesAutomationSecret } from "@/server/integrations/secrets";
import {
  databaseScheduledScanStore,
  outboxScheduledScanDelivery,
  runScheduledScan,
} from "@/server/integrations/scheduled-scan";

export const dynamic = "force-dynamic";

const MAX_SCAN_BODY_SIZE = 2_000;

const scanRequestSchema = z.object({
  followUpAfterMinutes: z.number().int().min(5).max(1_440).optional(),
  reminderWithinMinutes: z.number().int().min(15).max(2_880).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * Called by the scheduled Make scenario. FixFlow owns no timers: it only
 * answers which delayed events are due and hands new ones to the outbox.
 */
export async function POST(request: Request) {
  if (
    !matchesAutomationSecret(
      request.headers.get("x-fixflow-automation-secret"),
      process.env.AUTOMATION_CALLBACK_SECRET,
    )
  ) {
    return Response.json({ status: "error", message: "Unauthorized" }, {
      status: 401,
    });
  }

  const body = await request.text();

  if (body.length > MAX_SCAN_BODY_SIZE) {
    return Response.json({ status: "error", message: "Payload too large" }, {
      status: 413,
    });
  }

  let json: unknown = {};

  if (body.trim().length > 0) {
    try {
      json = JSON.parse(body);
    } catch {
      return Response.json({ status: "error", message: "Invalid JSON" }, {
        status: 400,
      });
    }
  }

  const parsed = scanRequestSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ status: "error", message: "Invalid scan request" }, {
      status: 400,
    });
  }

  const summary = await runScheduledScan(
    databaseScheduledScanStore,
    outboxScheduledScanDelivery,
    parsed.data,
  );

  return Response.json({ status: "ok", ...summary }, {
    headers: { "cache-control": "no-store" },
  });
}
