import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, lte, sql } from "drizzle-orm";

import type {
  ChatCollectedData,
  ChatStep,
} from "../../lib/chat/contracts";
import type { CrmCategory } from "../../lib/crm/constants";
import { db } from "../db";
import {
  availabilitySlots,
  bookings,
  conversations,
  customers,
  leads,
  messages,
  services,
} from "../db/schema";
import type {
  ChatSlot,
  ChatWorkflowStore,
  StoredChatConversation,
} from "./workflow";

export const databaseChatStore: ChatWorkflowStore = {
  async startConversation(input) {
    await db.batch([
      db.insert(conversations).values({
        id: input.conversationId,
        leadId: null,
        currentStep: input.currentStep,
        collectedData: { ...input.data },
        status: input.status ?? "active",
        createdAt: input.now,
        updatedAt: input.now,
      }),
      db.insert(messages).values([
        {
          id: randomUUID(),
          conversationId: input.conversationId,
          sender: "customer",
          content: input.customerMessage,
          metadata: { field: "problemDescription" },
          createdAt: input.now,
        },
        {
          id: randomUUID(),
          conversationId: input.conversationId,
          sender: "assistant",
          content: input.assistantMessage,
          metadata: { action: input.action, deterministic: true },
          createdAt: new Date(input.now.getTime() + 1),
        },
      ]),
    ]);
  },

  async loadConversation(id) {
    const [row] = await db
      .select({
        id: conversations.id,
        currentStep: conversations.currentStep,
        collectedData: conversations.collectedData,
        status: conversations.status,
      })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!row || !isChatStep(row.currentStep)) {
      return null;
    }

    return {
      id: row.id,
      currentStep: row.currentStep,
      collectedData: row.collectedData as ChatCollectedData,
      status: row.status,
    } satisfies StoredChatConversation;
  },

  async listServices(category) {
    return db
      .select({
        id: services.id,
        category: services.category,
        name: services.name,
      })
      .from(services)
      .where(
        and(eq(services.category, category), eq(services.isActive, true)),
      )
      .orderBy(asc(services.name));
  },

  async listAvailableSlots(category, now) {
    return listDatabaseSlots(category, now);
  },

  async saveTurn(input) {
    const status = input.status ?? "active";
    const result = await db.execute(sql`
      with locked_conversation as (
        select id, lead_id
        from ${conversations}
        where id = ${input.conversationId}
          and status = 'active'
          and current_step = ${input.expectedStep}
        for update
      ),
      updated_conversation as (
        update ${conversations} as conversation
        set
          current_step = ${input.nextStep},
          collected_data = ${JSON.stringify(input.data)}::jsonb,
          status = ${status},
          updated_at = ${input.now}
        from locked_conversation
        where conversation.id = locked_conversation.id
        returning conversation.id, conversation.lead_id
      ),
      updated_lead as (
        update ${leads} as lead
        set
          status = 'human_required',
          updated_at = ${input.now}
        from updated_conversation
        where ${status} = 'human_required'
          and lead.id = updated_conversation.lead_id
        returning lead.id
      ),
      customer_message as (
        insert into ${messages} (
          id,
          conversation_id,
          sender,
          content,
          metadata,
          created_at
        )
        select
          ${randomUUID()},
          updated_conversation.id,
          'customer',
          ${input.customerMessage},
          ${JSON.stringify({ deterministic: true })}::jsonb,
          ${input.now}
        from updated_conversation
        returning id
      ),
      assistant_message as (
        insert into ${messages} (
          id,
          conversation_id,
          sender,
          content,
          metadata,
          created_at
        )
        select
          ${randomUUID()},
          updated_conversation.id,
          'assistant',
          ${input.assistantMessage},
          ${JSON.stringify({ deterministic: true })}::jsonb,
          ${new Date(input.now.getTime() + 1)}
        from updated_conversation
        returning id
      )
      select id from updated_conversation
    `);

    return getResultRows(result).length === 1;
  },

  async createLeadTurn(input) {
    const customerId = randomUUID();
    const leadId = randomUUID();
    const customerMessageId = randomUUID();
    const assistantMessageId = randomUUID();
    const expiresAt = new Date(input.now.getTime() + 48 * 60 * 60 * 1000);
    const leadStatus = input.hasSlots
      ? "waiting_booking"
      : "human_required";
    const conversationStatus = input.hasSlots
      ? "active"
      : "human_required";
    const assistantPrefix = "Данные собраны. Заявка ";
    const assistantSuffix = input.hasSlots
      ? " создана. Выберите свободное время."
      : " создана, но свободных слотов сейчас нет. Заявка передана человеку.";

    const result = await db.execute(sql`
      with locked_conversation as (
        select id
        from ${conversations}
        where id = ${input.conversationId}
          and status = 'active'
          and current_step = ${input.expectedStep}
          and lead_id is null
        for update
      ),
      selected_service as (
        select service.id, service.name, service.price_from, service.price_to
        from ${services} as service
        inner join locked_conversation on true
        where service.id = ${input.data.serviceId}
          and service.category = ${input.data.category}
          and service.is_active = true
      ),
      upserted_customer as (
        insert into ${customers} (
          id,
          display_name,
          phone,
          email,
          address,
          is_demo,
          is_seed,
          expires_at,
          created_at,
          updated_at
        )
        select
          ${customerId},
          ${withDemoPrefix(input.data.demoName)},
          ${input.data.phone},
          null,
          ${withDemoPrefix(input.data.area)},
          true,
          false,
          ${expiresAt},
          ${input.now},
          ${input.now}
        from locked_conversation
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
          id,
          public_number,
          customer_id,
          category,
          service_type,
          problem_description,
          status,
          priority,
          source,
          preferred_date,
          preferred_time,
          estimated_price_from,
          estimated_price_to,
          is_seed,
          expires_at,
          created_at,
          updated_at
        )
        select
          ${leadId},
          'FF-' || nextval('lead_public_number_sequence')::text,
          upserted_customer.id,
          ${input.data.category},
          selected_service.name,
          ${withDemoPrefix(input.data.problemDescription)},
          ${leadStatus},
          'normal',
          'ai_chat',
          ${input.data.preferredDate}::date,
          ${input.data.preferredTime}::time,
          selected_service.price_from,
          selected_service.price_to,
          false,
          ${expiresAt},
          ${input.now},
          ${input.now}
        from upserted_customer
        inner join selected_service on true
        returning id, public_number
      ),
      updated_conversation as (
        update ${conversations} as conversation
        set
          lead_id = created_lead.id,
          current_step = 'slot',
          collected_data = (
            ${JSON.stringify(input.data)}::jsonb
            || jsonb_build_object(
              'leadId', created_lead.id,
              'publicNumber', created_lead.public_number
            )
          ),
          status = ${conversationStatus},
          updated_at = ${input.now}
        from created_lead
        where conversation.id = ${input.conversationId}
        returning conversation.id
      ),
      customer_message as (
        insert into ${messages} (
          id,
          conversation_id,
          sender,
          content,
          metadata,
          created_at
        )
        select
          ${customerMessageId},
          updated_conversation.id,
          'customer',
          ${input.customerMessage},
          ${JSON.stringify({ field: "preferredTime", deterministic: true })}::jsonb,
          ${input.now}
        from updated_conversation
        returning id
      ),
      assistant_message as (
        insert into ${messages} (
          id,
          conversation_id,
          sender,
          content,
          metadata,
          created_at
        )
        select
          ${assistantMessageId},
          updated_conversation.id,
          'assistant',
          ${assistantPrefix} || created_lead.public_number || ${assistantSuffix},
          ${JSON.stringify({
            action: input.hasSlots ? "show_slots" : "handoff_to_human",
            deterministic: true,
          })}::jsonb,
          ${new Date(input.now.getTime() + 1)}
        from updated_conversation
        inner join created_lead on true
        returning content
      )
      select
        created_lead.id as lead_id,
        created_lead.public_number,
        assistant_message.content as assistant_message
      from created_lead
      inner join assistant_message on true
    `);

    const [row] = getResultRows<{
      lead_id: string;
      public_number: string;
      assistant_message: string;
    }>(result);

    return row
      ? {
          leadId: row.lead_id,
          publicNumber: row.public_number,
          assistantMessage: row.assistant_message,
        }
      : null;
  },

  async createBookingTurn(input) {
    const bookingId = randomUUID();
    const result = await db.execute(sql`
      with locked_conversation as (
        select conversation.id, conversation.lead_id, lead.category
        from ${conversations} as conversation
        inner join ${leads} as lead on lead.id = conversation.lead_id
        where conversation.id = ${input.conversationId}
          and conversation.status = 'active'
          and conversation.current_step = ${input.expectedStep}
          and conversation.lead_id = ${input.data.leadId}
          and lead.status = 'waiting_booking'
        for update of conversation, lead
      ),
      claimed_slot as (
        update ${availabilitySlots} as slot
        set status = 'booked'
        from locked_conversation
        where slot.id = ${input.slotId}
          and slot.status = 'available'
          and slot.starts_at > ${input.now}
          and slot.category = locked_conversation.category
        returning slot.id, slot.starts_at, slot.ends_at
      ),
      created_booking as (
        insert into ${bookings} (
          id,
          lead_id,
          slot_id,
          starts_at,
          ends_at,
          status,
          created_at,
          updated_at
        )
        select
          ${bookingId},
          locked_conversation.lead_id,
          claimed_slot.id,
          claimed_slot.starts_at,
          claimed_slot.ends_at,
          'confirmed',
          ${input.now},
          ${input.now}
        from claimed_slot
        inner join locked_conversation on true
        returning id, lead_id
      ),
      updated_lead as (
        update ${leads} as lead
        set status = 'booked', updated_at = ${input.now}
        from created_booking
        where lead.id = created_booking.lead_id
        returning lead.id
      ),
      updated_conversation as (
        update ${conversations} as conversation
        set
          current_step = 'complete',
          collected_data = (
            ${JSON.stringify(input.data)}::jsonb
            || jsonb_build_object(
              'slotId', ${input.slotId}::text,
              'bookingId', created_booking.id
            )
          ),
          status = 'completed',
          updated_at = ${input.now}
        from created_booking
        inner join updated_lead on true
        where conversation.id = ${input.conversationId}
        returning conversation.id
      ),
      customer_message as (
        insert into ${messages} (
          id,
          conversation_id,
          sender,
          content,
          metadata,
          created_at
        )
        select
          ${randomUUID()},
          updated_conversation.id,
          'customer',
          ${input.customerMessage},
          ${JSON.stringify({ field: "slotId", deterministic: true })}::jsonb,
          ${input.now}
        from updated_conversation
        returning id
      ),
      assistant_message as (
        insert into ${messages} (
          id,
          conversation_id,
          sender,
          content,
          metadata,
          created_at
        )
        select
          ${randomUUID()},
          updated_conversation.id,
          'assistant',
          ${input.assistantMessage},
          ${JSON.stringify({ action: "complete", deterministic: true })}::jsonb,
          ${new Date(input.now.getTime() + 1)}
        from updated_conversation
        returning id
      )
      select created_booking.id as booking_id
      from created_booking
      inner join updated_conversation on true
    `);

    const [row] = getResultRows<{ booking_id: string }>(result);
    return row ? { bookingId: row.booking_id } : null;
  },
};

async function listDatabaseSlots(
  category: CrmCategory,
  now: Date,
): Promise<ChatSlot[]> {
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
    .orderBy(asc(availabilitySlots.startsAt));

  return rows.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
  }));
}

function isChatStep(value: string): value is ChatStep {
  return [
    "category",
    "service",
    "name",
    "phone",
    "area",
    "preferred_date",
    "preferred_time",
    "slot",
    "complete",
  ].includes(value);
}

function withDemoPrefix(value: string) {
  return value.startsWith("[ДЕМО]") ? value : `[ДЕМО] ${value}`;
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
