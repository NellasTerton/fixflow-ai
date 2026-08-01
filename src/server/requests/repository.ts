import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import type {
  CrmCategory,
  CrmLeadStatus,
} from "../../lib/crm/constants";
import {
  createAddressSummary,
  maskPhone,
  redactPublicText,
} from "../../lib/crm/presentation";
import type { PublicRequestInput } from "../../lib/request/schema";
import { db } from "../db";
import {
  customers,
  formRateLimits,
  formSubmissions,
  integrationEvents,
  leads,
  services,
} from "../db/schema";
import { deliverIntegrationEvent } from "../integrations/outbox";

const RATE_LIMIT_MAX_REQUESTS = 5;

export interface PublicServiceOption {
  id: string;
  category: CrmCategory;
  name: string;
}

export interface CreatedPublicRequest {
  leadId: string;
  publicNumber: string;
}

export class PublicRequestRateLimitError extends Error {
  constructor() {
    super("Слишком много заявок. Попробуйте снова через 15 минут.");
    this.name = "PublicRequestRateLimitError";
  }
}

export class PublicRequestServiceError extends Error {
  constructor(message = "Выбранная услуга недоступна") {
    super(message);
    this.name = "PublicRequestServiceError";
  }
}

export function createRateLimitKey(ip: string, userAgent: string) {
  return createHash("sha256")
    .update(`${ip.trim().toLowerCase()}|${userAgent.trim().toLowerCase()}`)
    .digest("hex");
}

export async function listPublicServiceOptions(): Promise<
  PublicServiceOption[]
> {
  return db
    .select({
      id: services.id,
      category: services.category,
      name: services.name,
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(services.category, services.name);
}

export async function createPublicRequest(
  input: PublicRequestInput,
  rateLimitKey: string,
  now = new Date(),
): Promise<CreatedPublicRequest> {
  const existing = await findExistingSubmission(input.idempotencyKey);

  if (existing) {
    return existing;
  }

  await enforceRateLimit(rateLimitKey);

  const [service] = await db
    .select({
      id: services.id,
      name: services.name,
      category: services.category,
      priceFrom: services.priceFrom,
      priceTo: services.priceTo,
    })
    .from(services)
    .where(
      and(
        eq(services.id, input.serviceId),
        eq(services.category, input.category),
        eq(services.isActive, true),
      ),
    )
    .limit(1);

  if (!service) {
    throw new PublicRequestServiceError();
  }

  const customerId = randomUUID();
  const leadId = randomUUID();
  const submissionId = randomUUID();
  const eventId = randomUUID();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const displayName = input.demoName;
  const address = input.area;
  const publicNumber = await createPublicNumber();
  const problemDescription = redactPublicText(
    input.problemDescription,
    input.phone,
    address,
  );

  try {
    const [, createdLeads] = await db.batch([
      db
        .insert(customers)
        .values({
          id: customerId,
          displayName,
          phone: input.phone,
          email: null,
          address,
          isDemo: true,
          isSeed: false,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: customers.id }),
      db
        .insert(leads)
        .values({
          id: leadId,
          publicNumber,
          customerId,
          category: input.category,
          serviceType: service.name,
          problemDescription: input.problemDescription,
          status: "new" satisfies CrmLeadStatus,
          priority: "normal",
          source: "website_form",
          preferredDate: input.preferredDate,
          preferredTime: null,
          estimatedPriceFrom: service.priceFrom,
          estimatedPriceTo: service.priceTo,
          isSeed: false,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: leads.id,
          publicNumber: leads.publicNumber,
        }),
      db.insert(formSubmissions).values({
        id: submissionId,
        idempotencyKey: input.idempotencyKey,
        customerId,
        leadId,
        expiresAt,
        createdAt: now,
      }),
      db.insert(integrationEvents).values({
        id: eventId,
        eventType: "lead.created",
        entityType: "lead",
        entityId: leadId,
        payload: {
          publicNumber,
          category: input.category,
          serviceType: service.name,
          priority: "normal",
          source: "website_form",
          customerName: displayName,
          maskedPhone: maskPhone(input.phone),
          addressSummary: createAddressSummary(address),
          problemDescription,
          telegramMessage: [
            `🆕 Новая заявка ${publicNumber}`,
            `Категория: ${input.category}`,
            `Услуга: ${service.name}`,
            `Клиент: ${displayName}`,
            `Телефон: ${maskPhone(input.phone)}`,
            `Район: ${createAddressSummary(address)}`,
            `Проблема: ${problemDescription}`,
          ].join("\n"),
        },
        deliveryStatus: "pending",
        createdAt: now,
      }),
    ]);

    const createdLead = createdLeads[0];

    if (!createdLead) {
      throw new Error("Lead transaction returned no row");
    }

    await deliverIntegrationEvent(eventId);

    return {
      leadId: createdLead.id,
      publicNumber: createdLead.publicNumber,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const duplicate = await findExistingSubmission(input.idempotencyKey);

      if (duplicate) {
        return duplicate;
      }
    }

    throw error;
  }
}

async function createPublicNumber() {
  const result = await db.execute(sql`
    select 'FF-' || nextval('lead_public_number_sequence')::text as public_number
  `);
  const [row] = getResultRows<{ public_number: string }>(result);

  if (!row) {
    throw new Error("Lead number sequence returned no row");
  }

  return row.public_number;
}

async function findExistingSubmission(
  idempotencyKey: string,
): Promise<CreatedPublicRequest | null> {
  const [existing] = await db
    .select({
      leadId: formSubmissions.leadId,
      publicNumber: leads.publicNumber,
    })
    .from(formSubmissions)
    .innerJoin(leads, eq(formSubmissions.leadId, leads.id))
    .where(eq(formSubmissions.idempotencyKey, idempotencyKey))
    .limit(1);

  return existing ?? null;
}

async function enforceRateLimit(keyHash: string) {
  const result = await db.execute(sql`
    insert into ${formRateLimits} (
      key_hash,
      request_count,
      window_started_at,
      expires_at,
      created_at,
      updated_at
    )
    values (
      ${keyHash},
      1,
      now(),
      now() + interval '24 hours',
      now(),
      now()
    )
    on conflict (key_hash) do update
    set
      request_count = case
        when ${formRateLimits.windowStartedAt} <= now() - interval '15 minutes'
          then 1
        else ${formRateLimits.requestCount} + 1
      end,
      window_started_at = case
        when ${formRateLimits.windowStartedAt} <= now() - interval '15 minutes'
          then now()
        else ${formRateLimits.windowStartedAt}
      end,
      expires_at = now() + interval '24 hours',
      updated_at = now()
    returning request_count
  `);

  const [row] = getResultRows<{ request_count: number }>(result);

  if (!row || Number(row.request_count) > RATE_LIMIT_MAX_REQUESTS) {
    throw new PublicRequestRateLimitError();
  }
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

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  return "cause" in error && isUniqueViolation(error.cause);
}
