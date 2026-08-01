import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";

import {
  createAddressSummary,
  redactPublicText,
  maskPhone,
  stripDemoTag,
} from "../../lib/crm/presentation";
import type {
  PublicAiRun,
  PublicAutomationLog,
  PublicCrmFilters,
  PublicDocument,
  PublicIntegrationEvent,
  PublicLead,
  PublicLeadDetail,
} from "../../lib/crm/types";
import { db } from "../db";
import {
  aiRuns,
  automationLogs,
  bookings,
  conversations,
  customers,
  documents,
  integrationEvents,
  leads,
  messages,
  services,
} from "../db/schema";

/**
 * Seed leads carry a long expiresAt only for the optional `demo:reset`
 * cleanup script and must stay visible regardless of it. User-submitted
 * leads (website form, chat) are meant to age out of the public board once
 * their 48h TTL passes — this was written on every insert but never
 * enforced on read until now.
 */
function notExpiredCondition(now: Date) {
  return or(eq(leads.isSeed, true), isNull(leads.expiresAt), gt(leads.expiresAt, now));
}

interface LeadRow {
  id: string;
  publicNumber: string;
  customerName: string;
  phone: string;
  address: string;
  category: PublicLead["category"];
  serviceType: string;
  problemDescription: string;
  status: PublicLead["status"];
  priority: PublicLead["priority"];
  needsOperator: boolean;
  source: PublicLead["source"];
  preferredDate: string | null;
  preferredTime: string | null;
  bookingStartsAt: Date | null;
  bookingEndsAt: Date | null;
  estimatedPriceFrom: number | null;
  estimatedPriceTo: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const leadSelection = {
  id: leads.id,
  publicNumber: leads.publicNumber,
  customerName: customers.displayName,
  phone: customers.phone,
  address: customers.address,
  category: leads.category,
  serviceType: leads.serviceType,
  problemDescription: leads.problemDescription,
  status: leads.status,
  priority: leads.priority,
  needsOperator: leads.needsOperator,
  source: leads.source,
  preferredDate: leads.preferredDate,
  preferredTime: leads.preferredTime,
  bookingStartsAt: bookings.startsAt,
  bookingEndsAt: bookings.endsAt,
  estimatedPriceFrom: leads.estimatedPriceFrom,
  estimatedPriceTo: leads.estimatedPriceTo,
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
};

function toPublicLead(row: LeadRow): PublicLead {
  return {
    id: row.id,
    publicNumber: row.publicNumber,
    customerName: stripDemoTag(row.customerName),
    maskedPhone: maskPhone(row.phone),
    addressSummary: createAddressSummary(row.address),
    category: row.category,
    serviceType: row.serviceType,
    problemDescription: stripDemoTag(
      redactPublicText(row.problemDescription, row.phone, row.address),
    ),
    status: row.status,
    priority: row.priority,
    needsOperator: row.needsOperator,
    source: row.source,
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
    bookingStartsAt: row.bookingStartsAt?.toISOString() ?? null,
    bookingEndsAt: row.bookingEndsAt?.toISOString() ?? null,
    estimatedPriceFrom: row.estimatedPriceFrom,
    estimatedPriceTo: row.estimatedPriceTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPublicLeads(
  filters: PublicCrmFilters = {},
): Promise<PublicLead[]> {
  const conditions: SQL[] = [eq(customers.isDemo, true)];
  const notExpired = notExpiredCondition(new Date());

  if (notExpired) {
    conditions.push(notExpired);
  }

  if (filters.category) {
    conditions.push(eq(leads.category, filters.category));
  }
  if (filters.status) {
    conditions.push(eq(leads.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(leads.priority, filters.priority));
  }
  if (filters.source) {
    conditions.push(eq(leads.source, filters.source));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    const searchCondition = or(
      ilike(leads.publicNumber, pattern),
      ilike(customers.displayName, pattern),
      ilike(leads.problemDescription, pattern),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const rows = await db
    .select(leadSelection)
    .from(leads)
    .innerJoin(customers, eq(leads.customerId, customers.id))
    .leftJoin(bookings, eq(bookings.leadId, leads.id))
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt), asc(leads.publicNumber));

  return rows.map(toPublicLead);
}

export async function getPublicLeadDetail(
  id: string,
): Promise<PublicLeadDetail | null> {
  const notExpired = notExpiredCondition(new Date());
  const [row] = await db
    .select(leadSelection)
    .from(leads)
    .innerJoin(customers, eq(leads.customerId, customers.id))
    .leftJoin(bookings, eq(bookings.leadId, leads.id))
    .where(
      and(
        eq(leads.id, id),
        eq(customers.isDemo, true),
        ...(notExpired ? [notExpired] : []),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [messageRows, aiRunRows, eventRows, automationRows] =
    await Promise.all([
      db
        .select({
          id: messages.id,
          sender: messages.sender,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(
          conversations,
          eq(messages.conversationId, conversations.id),
        )
        .where(eq(conversations.leadId, id))
        .orderBy(asc(messages.createdAt)),
      db
        .select({
          id: aiRuns.id,
          operation: aiRuns.operation,
          model: aiRuns.model,
          inputSummary: aiRuns.inputSummary,
          parsedOutput: aiRuns.parsedOutput,
          retrievedChunks: aiRuns.retrievedChunks,
          durationMs: aiRuns.durationMs,
          status: aiRuns.status,
          error: aiRuns.error,
          createdAt: aiRuns.createdAt,
        })
        .from(aiRuns)
        .innerJoin(
          conversations,
          eq(aiRuns.conversationId, conversations.id),
        )
        .where(eq(conversations.leadId, id))
        .orderBy(desc(aiRuns.createdAt)),
      db
        .select({
          id: integrationEvents.id,
          eventType: integrationEvents.eventType,
          deliveryStatus: integrationEvents.deliveryStatus,
          httpStatus: integrationEvents.httpStatus,
          deliveredAt: integrationEvents.deliveredAt,
          createdAt: integrationEvents.createdAt,
        })
        .from(integrationEvents)
        .where(
          and(
            eq(integrationEvents.entityType, "lead"),
            eq(integrationEvents.entityId, id),
          ),
        )
        .orderBy(desc(integrationEvents.createdAt)),
      db
        .select({
          id: automationLogs.id,
          eventType: integrationEvents.eventType,
          platform: automationLogs.platform,
          workflowName: automationLogs.workflowName,
          action: automationLogs.action,
          status: automationLogs.status,
          externalRunId: automationLogs.externalRunId,
          details: automationLogs.details,
          createdAt: automationLogs.createdAt,
        })
        .from(automationLogs)
        .innerJoin(
          integrationEvents,
          eq(automationLogs.integrationEventId, integrationEvents.id),
        )
        .where(
          and(
            eq(integrationEvents.entityType, "lead"),
            eq(integrationEvents.entityId, id),
          ),
        )
        .orderBy(desc(automationLogs.createdAt)),
    ]);

  return {
    ...toPublicLead(row),
    messages: messageRows.map((message) => ({
      id: message.id,
      sender: message.sender,
      content: redactPublicText(message.content, row.phone, row.address),
      createdAt: message.createdAt.toISOString(),
    })),
    aiRuns: aiRunRows.map((run) => ({
      id: run.id,
      leadPublicNumber: row.publicNumber,
      operation: run.operation,
      model: run.model,
      inputSummary: redactPublicText(
        run.inputSummary,
        row.phone,
        row.address,
      ),
      ...toPublicAiExplanation(
        run.inputSummary,
        run.parsedOutput,
        run.retrievedChunks,
      ),
      durationMs: run.durationMs,
      status: run.status,
      error: run.error
        ? redactPublicText(run.error, row.phone, row.address)
        : null,
      createdAt: run.createdAt.toISOString(),
    })),
    integrationEvents: eventRows.map(toPublicIntegrationEvent),
    automationLogs: automationRows.map(toPublicAutomationLog),
  };
}

export interface PublicServicePrice {
  id: string;
  category: PublicLead["category"];
  name: string;
  priceFrom: number;
  priceTo: number;
}

/** Price list shown on the landing page, read from the same rows the chat quotes from. */
export async function listPublicServiceOptionsWithPrices(): Promise<
  PublicServicePrice[]
> {
  return db
    .select({
      id: services.id,
      category: services.category,
      name: services.name,
      priceFrom: services.priceFrom,
      priceTo: services.priceTo,
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.category), asc(services.priceFrom));
}

export async function listPublicDocuments(): Promise<PublicDocument[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      content: documents.content,
      status: documents.status,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.isDemo, true))
    .orderBy(desc(documents.updatedAt));

  return rows.map((document) => ({
    id: document.id,
    title: document.title,
    category: document.category,
    contentPreview: redactPublicText(document.content).slice(0, 360),
    status: document.status,
    updatedAt: document.updatedAt.toISOString(),
  }));
}

export async function listPublicAiRuns(): Promise<PublicAiRun[]> {
  const rows = await db
    .select({
      id: aiRuns.id,
      leadPublicNumber: leads.publicNumber,
      operation: aiRuns.operation,
      model: aiRuns.model,
      inputSummary: aiRuns.inputSummary,
      parsedOutput: aiRuns.parsedOutput,
      retrievedChunks: aiRuns.retrievedChunks,
      durationMs: aiRuns.durationMs,
      status: aiRuns.status,
      error: aiRuns.error,
      createdAt: aiRuns.createdAt,
      phone: customers.phone,
      address: customers.address,
    })
    .from(aiRuns)
    .leftJoin(conversations, eq(aiRuns.conversationId, conversations.id))
    .leftJoin(leads, eq(conversations.leadId, leads.id))
    .leftJoin(customers, eq(leads.customerId, customers.id))
    .where(or(isNull(customers.id), eq(customers.isDemo, true)))
    .orderBy(desc(aiRuns.createdAt));

  return rows.map((run) => ({
    id: run.id,
    leadPublicNumber: run.leadPublicNumber,
    operation: run.operation,
    model: run.model,
    inputSummary: redactPublicText(
      run.inputSummary,
      run.phone ?? undefined,
      run.address ?? undefined,
    ),
    ...toPublicAiExplanation(
      run.inputSummary,
      run.parsedOutput,
      run.retrievedChunks,
    ),
    durationMs: run.durationMs,
    status: run.status,
    error: run.error
      ? redactPublicText(
          run.error,
          run.phone ?? undefined,
          run.address ?? undefined,
        )
      : null,
    createdAt: run.createdAt.toISOString(),
  }));
}

function toPublicAiExplanation(
  inputSummary: string,
  parsedOutput: Record<string, unknown>,
  retrievedChunks: unknown[],
): Pick<
  PublicAiRun,
  "question" | "reply" | "action" | "retrievedChunks"
> {
  const question = inputSummary.startsWith("question=")
    ? redactPublicText(inputSummary.slice("question=".length))
    : null;
  const reply =
    typeof parsedOutput.reply === "string"
      ? redactPublicText(parsedOutput.reply)
      : null;
  const action =
    typeof parsedOutput.action === "string"
      ? parsedOutput.action
      : typeof parsedOutput.proposedAction === "string"
        ? parsedOutput.proposedAction
        : null;

  return {
    question,
    reply,
    action,
    retrievedChunks: retrievedChunks.flatMap((value) => {
      if (!value || typeof value !== "object") {
        return [];
      }

      const chunk = value as Record<string, unknown>;
      if (
        typeof chunk.title !== "string" ||
        typeof chunk.source !== "string" ||
        typeof chunk.content !== "string" ||
        typeof chunk.similarity !== "number"
      ) {
        return [];
      }

      return [{
        title: chunk.title,
        source: chunk.source,
        content: redactPublicText(chunk.content),
        similarity: chunk.similarity,
      }];
    }),
  };
}

export async function listPublicIntegrationEvents(): Promise<
  PublicIntegrationEvent[]
> {
  const rows = await db
    .select({
      id: integrationEvents.id,
      eventType: integrationEvents.eventType,
      deliveryStatus: integrationEvents.deliveryStatus,
      httpStatus: integrationEvents.httpStatus,
      deliveredAt: integrationEvents.deliveredAt,
      createdAt: integrationEvents.createdAt,
    })
    .from(integrationEvents)
    .leftJoin(
      leads,
      and(
        eq(integrationEvents.entityType, "lead"),
        eq(integrationEvents.entityId, leads.id),
      ),
    )
    .leftJoin(customers, eq(leads.customerId, customers.id))
    .leftJoin(
      conversations,
      and(
        eq(integrationEvents.entityType, "conversation"),
        eq(integrationEvents.entityId, conversations.id),
      ),
    )
    .where(or(eq(customers.isDemo, true), isNotNull(conversations.id)))
    .orderBy(desc(integrationEvents.createdAt));

  return rows.map(toPublicIntegrationEvent);
}

export async function listPublicAutomationLogs(): Promise<
  PublicAutomationLog[]
> {
  const rows = await db
    .select({
      id: automationLogs.id,
      eventType: integrationEvents.eventType,
      platform: automationLogs.platform,
      workflowName: automationLogs.workflowName,
      action: automationLogs.action,
      status: automationLogs.status,
      externalRunId: automationLogs.externalRunId,
      details: automationLogs.details,
      createdAt: automationLogs.createdAt,
    })
    .from(automationLogs)
    .innerJoin(
      integrationEvents,
      eq(automationLogs.integrationEventId, integrationEvents.id),
    )
    .leftJoin(
      leads,
      and(
        eq(integrationEvents.entityType, "lead"),
        eq(integrationEvents.entityId, leads.id),
      ),
    )
    .leftJoin(customers, eq(leads.customerId, customers.id))
    .leftJoin(
      conversations,
      and(
        eq(integrationEvents.entityType, "conversation"),
        eq(integrationEvents.entityId, conversations.id),
      ),
    )
    .where(or(eq(customers.isDemo, true), isNotNull(conversations.id)))
    .orderBy(desc(automationLogs.createdAt));

  return rows.map(toPublicAutomationLog);
}

function toPublicIntegrationEvent(row: {
  id: string;
  eventType: string;
  deliveryStatus: PublicIntegrationEvent["deliveryStatus"];
  httpStatus: number | null;
  deliveredAt: Date | null;
  createdAt: Date;
}): PublicIntegrationEvent {
  return {
    id: row.id,
    eventType: row.eventType,
    deliveryStatus: row.deliveryStatus,
    httpStatus: row.httpStatus,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPublicAutomationLog(row: {
  id: string;
  eventType: string | null;
  platform: string;
  workflowName: string;
  action: string;
  status: PublicAutomationLog["status"];
  externalRunId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
}): PublicAutomationLog {
  return {
    id: row.id,
    eventType: row.eventType,
    platform: row.platform,
    workflowName: row.workflowName,
    action: row.action,
    status: row.status,
    externalRunId: row.externalRunId,
    details: sanitizeAutomationDetails(row.details),
    createdAt: row.createdAt.toISOString(),
  };
}

function sanitizeAutomationDetails(
  details: Record<string, unknown>,
): PublicAutomationLog["details"] {
  const allowedKeys = new Set([
    "telegramStatus",
    "route",
    "messageId",
    "delivery",
  ]);

  return Object.fromEntries(
    Object.entries(details).flatMap(([key, value]) => {
      if (
        !allowedKeys.has(key) ||
        (typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean" &&
          value !== null)
      ) {
        return [];
      }

      return [[key, value]];
    }),
  );
}
