import "server-only";

import { eq } from "drizzle-orm";

import { automationEnvSchema } from "@/env/schema";
import { db } from "@/server/db";
import { integrationEvents } from "@/server/db/schema";

import {
  integrationEventTypeSchema,
  type AutomationWebhookEnvelope,
} from "./contracts";
import { postAutomationWebhook } from "./webhook-client";

export async function deliverIntegrationEvent(eventId: string): Promise<void> {
  try {
    const [event] = await db
      .select({
        id: integrationEvents.id,
        eventType: integrationEvents.eventType,
        entityType: integrationEvents.entityType,
        entityId: integrationEvents.entityId,
        payload: integrationEvents.payload,
        deliveryStatus: integrationEvents.deliveryStatus,
        createdAt: integrationEvents.createdAt,
      })
      .from(integrationEvents)
      .where(eq(integrationEvents.id, eventId))
      .limit(1);

    if (!event || event.deliveryStatus === "delivered") {
      return;
    }

    const parsedType = integrationEventTypeSchema.safeParse(event.eventType);
    const parsedEnv = automationEnvSchema.safeParse({
      AUTOMATION_WEBHOOK_URL: process.env.AUTOMATION_WEBHOOK_URL,
      AUTOMATION_WEBHOOK_SECRET: process.env.AUTOMATION_WEBHOOK_SECRET,
      AUTOMATION_CALLBACK_SECRET: process.env.AUTOMATION_CALLBACK_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });

    if (!parsedType.success || !parsedEnv.success) {
      await markFailed(event.id, null, "Make webhook is not configured");
      return;
    }

    const telegramMessage =
      typeof event.payload.telegramMessage === "string"
        ? event.payload.telegramMessage
        : `FixFlow AI: ${event.eventType}`;
    const envelope: AutomationWebhookEnvelope = {
      version: "1.0",
      eventId: event.id,
      eventType: parsedType.data,
      entityType: event.entityType,
      entityId: event.entityId,
      occurredAt: event.createdAt.toISOString(),
      callbackUrl: new URL(
        "/api/integrations/make/callback",
        parsedEnv.data.NEXT_PUBLIC_APP_URL,
      ).toString(),
      urgency:
        event.eventType === "handoff.required" ? "urgent" : "normal",
      telegramMessage,
      payload: event.payload,
    };
    const result = await postAutomationWebhook({
      url: parsedEnv.data.AUTOMATION_WEBHOOK_URL,
      secret: parsedEnv.data.AUTOMATION_WEBHOOK_SECRET,
      envelope,
    });

    if (result.ok) {
      await db
        .update(integrationEvents)
        .set({
          deliveryStatus: "delivered",
          httpStatus: result.httpStatus,
          deliveredAt: new Date(),
          lastError: null,
        })
        .where(eq(integrationEvents.id, event.id));
      return;
    }

    await markFailed(event.id, result.httpStatus, result.error);
  } catch {
    // Delivery is deliberately best-effort: business writes are already committed.
  }
}

async function markFailed(
  eventId: string,
  httpStatus: number | null,
  error: string | null,
) {
  await db
    .update(integrationEvents)
    .set({
      deliveryStatus: "failed",
      httpStatus,
      deliveredAt: null,
      lastError: error ?? "Make webhook delivery failed",
    })
    .where(eq(integrationEvents.id, eventId));
}
