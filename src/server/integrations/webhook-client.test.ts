import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { AutomationWebhookEnvelope } from "./contracts";
import { postAutomationWebhook } from "./webhook-client";

const envelope: AutomationWebhookEnvelope = {
  version: "1.0",
  eventId: "10000000-0000-4000-8000-000000000001",
  eventType: "lead.created",
  entityType: "lead",
  entityId: "20000000-0000-4000-8000-000000000001",
  occurredAt: "2026-07-30T12:00:00.000Z",
  callbackUrl:
    "https://fixflow-ai-kappa.vercel.app/api/integrations/make/callback",
  urgency: "normal",
  telegramMessage: "Demo notification",
  payload: { publicNumber: "FF-1042" },
};

describe("Make webhook client", () => {
  it("signs and sends the supported event envelope", async () => {
    let calls = 0;
    let capturedRequest: RequestInit | undefined;
    const fetchImpl = (async (
      _input: RequestInfo | URL,
      request?: RequestInit,
    ) => {
      calls += 1;
      capturedRequest = request;
      return new Response("accepted", { status: 200 });
    }) as typeof fetch;

    const result = await postAutomationWebhook({
      url: "https://hook.eu1.make.com/demo",
      secret: "a-demo-secret-with-32-characters",
      envelope,
      fetchImpl,
    });

    expect(result).toEqual({ ok: true, httpStatus: 200, error: null });
    expect(calls).toBe(1);

    const body = String(capturedRequest?.body);
    const headers = capturedRequest?.headers as Record<string, string>;

    expect(JSON.parse(body)).toMatchObject({
      eventId: envelope.eventId,
      eventType: "lead.created",
    });
    expect(headers["x-fixflow-signature"]).toBe(
      `sha256=${createHmac("sha256", "a-demo-secret-with-32-characters")
        .update(body)
        .digest("hex")}`,
    );
    expect(headers["x-make-apikey"]).toBe(
      "a-demo-secret-with-32-characters",
    );
  });

  it("returns a safe failure instead of throwing on Make errors", async () => {
    const result = await postAutomationWebhook({
      url: "https://hook.eu1.make.com/demo",
      secret: "a-demo-secret-with-32-characters",
      envelope,
      fetchImpl: vi.fn(async () => new Response("failed", {
        status: 503,
      })) as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      httpStatus: 503,
      error: "Make webhook returned HTTP 503",
    });
  });

  it("never exposes the provider error or webhook URL", async () => {
    const result = await postAutomationWebhook({
      url: "https://hook.eu1.make.com/private-hook",
      secret: "a-demo-secret-with-32-characters",
      envelope,
      fetchImpl: vi.fn(async () => {
        throw new Error("request to private-hook failed with secret");
      }) as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      httpStatus: null,
      error: "Make webhook request failed",
    });
  });
});
