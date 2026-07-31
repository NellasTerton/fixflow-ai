import { z } from "zod";

export const integrationEventTypes = [
  "lead.created",
  "booking.created",
  "handoff.required",
  "lead.followup_due",
  "booking.reminder_due",
] as const;

export const scheduledEventTypes = [
  "lead.followup_due",
  "booking.reminder_due",
] as const;

export type ScheduledEventType = (typeof scheduledEventTypes)[number];

export const integrationEventTypeSchema = z.enum(integrationEventTypes);

const callbackDetailValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const makeCallbackSchema = z.object({
  eventId: z.uuid(),
  platform: z.literal("make"),
  workflowName: z.string().trim().min(1).max(120),
  action: z.string().trim().min(1).max(120),
  status: z.enum(["success", "failed"]),
  externalRunId: z.string().trim().min(1).max(200).nullable().optional(),
  details: z
    .record(z.string().max(64), callbackDetailValueSchema)
    .default({}),
});

export type MakeCallback = z.infer<typeof makeCallbackSchema>;

export interface AutomationWebhookEnvelope {
  version: "1.0";
  eventId: string;
  eventType: z.infer<typeof integrationEventTypeSchema>;
  entityType: string;
  entityId: string;
  occurredAt: string;
  callbackUrl: string;
  urgency: "normal" | "urgent";
  telegramMessage: string;
  payload: Record<string, unknown>;
}
