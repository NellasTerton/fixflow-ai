import { makeCallbackSchema } from "@/server/integrations/contracts";
import { recordMakeCallback } from "@/server/integrations/callback-service";
import { matchesAutomationSecret } from "@/server/integrations/secrets";

const MAX_CALLBACK_BODY_SIZE = 32_000;

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("x-fixflow-callback-secret"))) {
    return Response.json({ status: "error", message: "Unauthorized" }, {
      status: 401,
    });
  }

  const body = await request.text();

  if (body.length > MAX_CALLBACK_BODY_SIZE) {
    return Response.json({ status: "error", message: "Payload too large" }, {
      status: 413,
    });
  }

  let json: unknown;

  try {
    json = JSON.parse(body);
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON" }, {
      status: 400,
    });
  }

  const parsed = makeCallbackSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ status: "error", message: "Invalid callback" }, {
      status: 400,
    });
  }

  const result = await recordMakeCallback(parsed.data);

  if (result === "event_not_found") {
    return Response.json({ status: "error", message: "Event not found" }, {
      status: 404,
    });
  }

  return Response.json({
    status: "ok",
    duplicate: result === "updated",
  });
}

function isAuthorized(candidate: string | null): boolean {
  return matchesAutomationSecret(
    candidate,
    process.env.AUTOMATION_CALLBACK_SECRET,
  );
}
