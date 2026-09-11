import "server-only";

import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, gt, lte, sql } from "drizzle-orm";

import type { CrmCategory } from "../../lib/crm/constants";
import {
  createAddressSummary,
  maskPhone,
  redactPublicText,
} from "../../lib/crm/presentation";
import { normalizePhone, RUSSIAN_PHONE_PATTERN } from "../../lib/request/schema";
import { db } from "../db";
import {
  availabilitySlots,
  bookings,
  conversations,
  customers,
  integrationEvents,
  leads,
  services,
} from "../db/schema";
import { deliverIntegrationEvent } from "../integrations/outbox";
import { matchServiceByName } from "./service-matching";

const CHAT_CATEGORIES = [
  "appliance_repair",
  "plumbing",
  "air_conditioning",
] as const;

export const CHECK_AVAILABILITY_TOOL: Anthropic.Tool = {
  name: "check_availability",
  description:
    "Возвращает реальные свободные слоты мастера на ближайшие 14 дней для категории. Вызывай перед тем, как предлагать клиенту конкретное время — никогда не придумывай время сам.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [...CHAT_CATEGORIES],
        description: "Категория: appliance_repair, plumbing или air_conditioning",
      },
    },
    required: ["category"],
  },
};

export const CREATE_LEAD_TOOL: Anthropic.Tool = {
  name: "create_lead",
  description:
    "Создаёт заявку в системе компании. Вызывай только когда известны ВСЕ поля: категория, конкретная услуга, имя клиента, телефон, район и описание проблемы. Не вызывай, пока чего-то не хватает — сначала уточни. После вызова заявка существует независимо от того, будет ли забронирован конкретный слот (можно вызвать check_availability и book_slot следом, либо просто подтвердить клиенту, что оператор перезвонит).",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [...CHAT_CATEGORIES],
        description: "Категория проблемы",
      },
      service_name: {
        type: "string",
        description:
          "Название услуги как оно есть в прайсе компании, максимально близко к каталогу (например «Замена смесителя», «Диагностика кондиционера»)",
      },
      customer_name: { type: "string", description: "Имя клиента" },
      phone: { type: "string", description: "Номер телефона клиента" },
      area: {
        type: "string",
        description: "Район или общая часть адреса, без номера дома и квартиры",
      },
      problem_description: {
        type: "string",
        description: "Описание проблемы своими словами клиента",
      },
    },
    required: [
      "category",
      "service_name",
      "customer_name",
      "phone",
      "area",
      "problem_description",
    ],
  },
};

export const BOOK_SLOT_TOOL: Anthropic.Tool = {
  name: "book_slot",
  description:
    "Бронирует конкретный слот из тех, что вернул check_availability, для уже созданной заявки. Вызывай только после успешного create_lead и только с slot_id, который реально пришёл из check_availability.",
  input_schema: {
    type: "object",
    properties: {
      lead_id: {
        type: "string",
        description:
          "Значение lead_id, которое вернул create_lead (внутренний id, НЕ номер заявки вида FF-1234, который ты называешь клиенту)",
      },
      slot_id: { type: "string", description: "id слота из check_availability" },
    },
    required: ["lead_id", "slot_id"],
  },
};

export const CHAT_TOOLS: Anthropic.Tool[] = [
  CHECK_AVAILABILITY_TOOL,
  CREATE_LEAD_TOOL,
  BOOK_SLOT_TOOL,
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

async function resolveLeadIdByPublicNumber(
  publicNumber: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.publicNumber, publicNumber))
    .limit(1);
  return row?.id ?? null;
}

function isChatCategory(value: unknown): value is CrmCategory {
  return (
    typeof value === "string" &&
    (CHAT_CATEGORIES as readonly string[]).includes(value)
  );
}

export async function checkAvailability(input: unknown) {
  const category = isRecord(input) ? input.category : null;

  if (!isChatCategory(category)) {
    return { error: "Некорректная категория." };
  }

  const now = new Date();
  const until = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: availabilitySlots.id,
      startsAt: availabilitySlots.startsAt,
      endsAt: availabilitySlots.endsAt,
    })
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.category, category),
        eq(availabilitySlots.status, "available"),
        gt(availabilitySlots.startsAt, now),
        lte(availabilitySlots.startsAt, until),
      ),
    )
    .orderBy(availabilitySlots.startsAt)
    .limit(10);

  if (rows.length === 0) {
    return {
      slots: [],
      note: "Свободных слотов на ближайшие 14 дней нет — предложи клиенту оставить заявку, оператор перезвонит и согласует время отдельно.",
    };
  }

  return {
    slots: rows.map((slot) => ({
      slot_id: slot.id,
      label: formatSlot(slot.startsAt),
    })),
  };
}

export async function createLead(
  conversationId: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  if (!isRecord(input)) {
    return { error: "Некорректные данные." };
  }

  const {
    category,
    service_name: serviceName,
    customer_name: customerName,
    phone,
    area,
    problem_description: problemDescription,
  } = input;

  if (
    !isChatCategory(category) ||
    typeof serviceName !== "string" ||
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof phone !== "string" ||
    typeof area !== "string" ||
    !area.trim() ||
    typeof problemDescription !== "string" ||
    !problemDescription.trim()
  ) {
    return {
      error:
        "Не хватает или некорректны данные для заявки. Уточни у клиента недостающее и вызови инструмент снова.",
    };
  }

  const normalizedPhone = normalizePhone(phone);
  if (!RUSSIAN_PHONE_PATTERN.test(normalizedPhone)) {
    return {
      error:
        "Номер телефона не похож на настоящий. Уточни у клиента номер ещё раз.",
    };
  }

  const availableServices = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.category, category), eq(services.isActive, true)));
  const service = matchServiceByName(availableServices, serviceName);
  if (!service) {
    return {
      error:
        "Не удалось однозначно сопоставить услугу с прайсом компании. Уточни у клиента детали или предложи ближайшую по смыслу услугу из прайса и вызови инструмент снова с точным названием.",
    };
  }

  const [existing] = await db
    .select({ leadId: conversations.leadId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (existing?.leadId) {
    return {
      error:
        "Для этого диалога заявка уже создана — не создавай вторую. Если нужно, продолжай с check_availability/book_slot для существующей заявки.",
    };
  }

  const customerId = randomUUID();
  const leadId = randomUUID();
  const leadEventId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const result = await db.execute(sql`
    with upserted_customer as (
      insert into ${customers} (
        id, display_name, phone, email, address, is_demo, is_seed, expires_at, created_at, updated_at
      )
      values (
        ${customerId}, ${customerName.trim()}, ${normalizedPhone}, null, ${area.trim()},
        true, false, ${expiresAt}, ${now}, ${now}
      )
      on conflict (phone) do update
      set
        display_name = excluded.display_name,
        address = excluded.address,
        is_demo = true,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
      returning id
    ),
    created_lead as (
      insert into ${leads} (
        id, public_number, customer_id, category, service_type, problem_description,
        status, priority, needs_operator, source, is_seed, expires_at, created_at, updated_at
      )
      select
        ${leadId},
        'FF-' || nextval('lead_public_number_sequence')::text,
        upserted_customer.id,
        ${category},
        ${service.name},
        ${problemDescription.trim()},
        'new',
        'normal',
        true,
        'ai_chat',
        false,
        ${expiresAt},
        ${now},
        ${now}
      from upserted_customer
      returning id, public_number
    ),
    updated_conversation as (
      update ${conversations} as conversation
      set
        lead_id = created_lead.id,
        collected_data = collected_data || jsonb_build_object('publicNumber', created_lead.public_number),
        updated_at = ${now}
      from created_lead
      where conversation.id = ${conversationId} and conversation.lead_id is null
      returning conversation.id
    ),
    created_lead_event as (
      insert into ${integrationEvents} (
        id, event_type, entity_type, entity_id, payload, delivery_status, created_at
      )
      select
        ${leadEventId},
        'lead.created',
        'lead',
        created_lead.id,
        jsonb_build_object(
          'publicNumber', created_lead.public_number,
          'category', ${category}::text,
          'serviceType', ${service.name}::text,
          'priority', 'normal',
          'source', 'ai_chat',
          'customerName', ${customerName.trim()}::text,
          'maskedPhone', ${maskPhone(normalizedPhone)}::text,
          'addressSummary', ${createAddressSummary(area.trim())}::text,
          'problemDescription',
            ${redactPublicText(problemDescription.trim(), normalizedPhone, area.trim())}::text,
          'telegramMessage',
            '🆕 Новая chat-заявка ' || created_lead.public_number
            || E'\nКатегория: ' || ${category}::text
            || E'\nУслуга: ' || ${service.name}::text
            || E'\nКлиент: ' || ${customerName.trim()}::text
            || E'\nТелефон: ' || ${maskPhone(normalizedPhone)}::text
        ),
        'pending',
        ${now}
      from created_lead
      inner join updated_conversation on true
      returning id
    )
    select created_lead.id as lead_id, created_lead.public_number
    from created_lead
    inner join updated_conversation on true
    left join created_lead_event on true
  `);

  const [row] = getResultRows<{ lead_id: string; public_number: string }>(
    result,
  );

  if (!row) {
    return {
      error:
        "Не удалось создать заявку — конфликт состояния диалога. Сообщи клиенту, что возникла техническая проблема, и предложи оставить заявку через оператора.",
    };
  }

  const [eventRow] = await db
    .select({ id: integrationEvents.id })
    .from(integrationEvents)
    .where(eq(integrationEvents.entityId, row.lead_id))
    .limit(1);
  if (eventRow) {
    await deliverIntegrationEvent(eventRow.id);
  }

  return {
    lead_id: row.lead_id,
    public_number: row.public_number,
    service_name: service.name,
  };
}

export async function bookSlot(
  input: unknown,
): Promise<Record<string, unknown>> {
  if (!isRecord(input)) {
    return { error: "Некорректные данные." };
  }

  const { lead_id: rawLeadId, slot_id: slotId } = input;
  if (typeof rawLeadId !== "string" || typeof slotId !== "string") {
    return { error: "Не хватает lead_id или slot_id." };
  }

  // The model sometimes passes the customer-facing public_number (e.g.
  // "FF-1075", the salient identifier in the conversation) instead of the
  // internal lead_id create_lead returned — a natural mix-up, not a
  // hallucination, so the tool resolves either rather than erroring on a
  // Postgres uuid-cast failure.
  const leadId = UUID_PATTERN.test(rawLeadId)
    ? rawLeadId
    : await resolveLeadIdByPublicNumber(rawLeadId);

  if (!leadId) {
    return {
      error:
        "lead_id не найден. Используй именно lead_id, который вернул create_lead, а не номер заявки.",
    };
  }

  const now = new Date();
  const bookingId = randomUUID();
  const eventId = randomUUID();

  const result = await db.execute(sql`
    with locked_lead as (
      select id, category, public_number
      from ${leads}
      where id = ${leadId} and status = 'new'
      for update
    ),
    claimed_slot as (
      update ${availabilitySlots} as slot
      set status = 'booked'
      from locked_lead
      where slot.id = ${slotId}
        and slot.status = 'available'
        and slot.starts_at > ${now}
        and slot.category = locked_lead.category
      returning slot.id, slot.starts_at, slot.ends_at
    ),
    created_booking as (
      insert into ${bookings} (id, lead_id, slot_id, starts_at, ends_at, status, created_at, updated_at)
      select ${bookingId}, locked_lead.id, claimed_slot.id, claimed_slot.starts_at, claimed_slot.ends_at, 'confirmed', ${now}, ${now}
      from claimed_slot
      inner join locked_lead on true
      returning id, lead_id
    ),
    updated_lead as (
      update ${leads} as lead
      set status = 'booked', needs_operator = false, updated_at = ${now}
      from created_booking
      where lead.id = created_booking.lead_id
      returning lead.id, lead.public_number
    ),
    created_event as (
      insert into ${integrationEvents} (id, event_type, entity_type, entity_id, payload, delivery_status, created_at)
      select
        ${eventId}, 'booking.created', 'lead', created_booking.lead_id,
        jsonb_build_object(
          'bookingId', created_booking.id,
          'leadId', created_booking.lead_id,
          'publicNumber', updated_lead.public_number,
          'startsAt', claimed_slot.starts_at,
          'endsAt', claimed_slot.ends_at,
          'telegramMessage',
            '📅 Новое бронирование для ' || updated_lead.public_number
            || E'\nНачало (UTC): ' || claimed_slot.starts_at::text
        ),
        'pending', ${now}
      from created_booking
      inner join claimed_slot on true
      inner join updated_lead on true
      returning id
    )
    select created_booking.id as booking_id, claimed_slot.starts_at as starts_at, created_event.id as event_id
    from created_booking
    inner join claimed_slot on true
    inner join updated_lead on true
    left join created_event on true
  `);

  const [row] = getResultRows<{
    booking_id: string;
    starts_at: string;
    event_id: string | null;
  }>(result);

  if (!row) {
    const fresh = await checkAvailability({
      category: await categoryForLead(leadId),
    });
    return {
      error: "Этот слот только что заняли.",
      ...fresh,
    };
  }

  if (row.event_id) {
    await deliverIntegrationEvent(row.event_id);
  }

  return { booking_id: row.booking_id, starts_at: row.starts_at };
}

async function categoryForLead(leadId: string): Promise<CrmCategory> {
  const [row] = await db
    .select({ category: leads.category })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return row?.category ?? "appliance_repair";
}

function formatSlot(startsAt: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(startsAt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResultRows<T = Record<string, unknown>>(result: unknown): T[] {
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
