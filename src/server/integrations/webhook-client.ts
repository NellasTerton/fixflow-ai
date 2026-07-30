import { createHmac } from "node:crypto";

import type { AutomationWebhookEnvelope } from "./contracts";

export interface AutomationWebhookResult {
  ok: boolean;
  httpStatus: number | null;
  error: string | null;
}

interface PostAutomationWebhookInput {
  url: string;
  secret: string;
  envelope: AutomationWebhookEnvelope;
  fetchImpl?: typeof fetch;
}

export async function postAutomationWebhook({
  url,
  secret,
  envelope,
  fetchImpl = fetch,
}: PostAutomationWebhookInput): Promise<AutomationWebhookResult> {
  const body = JSON.stringify(envelope);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-make-apikey": secret,
        "x-fixflow-event-id": envelope.eventId,
        "x-fixflow-signature": `sha256=${signature}`,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });

    return response.ok
      ? { ok: true, httpStatus: response.status, error: null }
      : {
          ok: false,
          httpStatus: response.status,
          error: `Make webhook returned HTTP ${response.status}`,
        };
  } catch (error) {
    return {
      ok: false,
      httpStatus: null,
      error: safeDeliveryError(error),
    };
  }
}

function safeDeliveryError(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "Make webhook request timed out";
  }

  return "Make webhook request failed";
}
