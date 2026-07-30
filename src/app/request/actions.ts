"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createPublicRequestSchema } from "@/lib/request/schema";
import {
  createPublicRequest,
  createRateLimitKey,
  PublicRequestRateLimitError,
  PublicRequestServiceError,
} from "@/server/requests/repository";

export interface RequestFormState {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export async function submitPublicRequest(
  _previousState: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const parsed = createPublicRequestSchema().safeParse({
    demoName: formData.get("demoName"),
    phone: formData.get("phone"),
    category: formData.get("category"),
    serviceId: formData.get("serviceId"),
    problemDescription: formData.get("problemDescription"),
    area: formData.get("area"),
    preferredDate: formData.get("preferredDate"),
    idempotencyKey: formData.get("idempotencyKey"),
    company: formData.get("company") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Проверьте выделенные поля",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";
  const rateLimitKey = createRateLimitKey(ip, userAgent);

  let created: Awaited<ReturnType<typeof createPublicRequest>>;

  try {
    created = await createPublicRequest(parsed.data, rateLimitKey);
  } catch (error) {
    if (
      error instanceof PublicRequestRateLimitError ||
      error instanceof PublicRequestServiceError
    ) {
      return { status: "error", message: error.message };
    }

    console.error("Public request creation failed");
    return {
      status: "error",
      message: "Не удалось создать заявку. Попробуйте ещё раз.",
    };
  }

  redirect(`/request/success?lead=${encodeURIComponent(created.leadId)}`);
}
