import "server-only";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { createAddressSummary, maskPhone } from "@/lib/crm/presentation";
import { db } from "@/server/db";
import {
  bookings,
  customers,
  integrationEvents,
  leads,
} from "@/server/db/schema";

import { deliverIntegrationEvent } from "./outbox";
import type {
  FollowUpCandidate,
  PendingAutomationEvent,
  ReminderCandidate,
  ScheduledScanDelivery,
  ScheduledScanStore,
} from "./scheduled-scan-service";

export {
  runScheduledScan,
  SCHEDULED_SCAN_DEFAULTS,
  type ScheduledScanOptions,
  type ScheduledScanSummary,
} from "./scheduled-scan-service";

interface FollowUpRow {
  lead_id: string;
  public_number: string;
  category: string;
  service_type: string;
  display_name: string;
  phone: string;
  address: string;
  created_at: Date | string;
}

interface ReminderRow extends Omit<FollowUpRow, "created_at"> {
  booking_id: string;
  starts_at: Date | string;
}

export const databaseScheduledScanStore: ScheduledScanStore = {
  async findLeadsWithoutBooking(createdBefore, limit) {
    const result = await db.execute(sql`
      select
        lead.id as lead_id,
        lead.public_number,
        lead.category,
        lead.service_type,
        lead.created_at,
        customer.display_name,
        customer.phone,
        customer.address
      from ${leads} as lead
      inner join ${customers} as customer
        on customer.id = lead.customer_id
      where lead.is_seed = false
        and lead.status = 'new'
        and lead.created_at <= ${createdBefore}
        and (lead.expires_at is null or lead.expires_at > ${createdBefore})
        and not exists (
          select 1
          from ${bookings} as booking
          where booking.lead_id = lead.id
        )
        and not exists (
          select 1
          from ${integrationEvents} as event
          where event.event_type = 'lead.followup_due'
            and event.entity_type = 'lead'
            and event.entity_id = lead.id
        )
      order by lead.created_at asc
      limit ${limit}
    `);

    return getResultRows<FollowUpRow>(result).map(
      (row): FollowUpCandidate => ({
        leadId: row.lead_id,
        publicNumber: row.public_number,
        category: row.category,
        serviceType: row.service_type,
        customerName: row.display_name,
        maskedPhone: maskPhone(row.phone),
        addressSummary: createAddressSummary(row.address),
        createdAt: new Date(row.created_at),
      }),
    );
  },

  async findBookingsStartingSoon(now, startsBefore, limit) {
    const result = await db.execute(sql`
      select
        booking.id as booking_id,
        booking.starts_at,
        lead.id as lead_id,
        lead.public_number,
        lead.category,
        lead.service_type,
        customer.display_name,
        customer.phone,
        customer.address
      from ${bookings} as booking
      inner join ${leads} as lead
        on lead.id = booking.lead_id
      inner join ${customers} as customer
        on customer.id = lead.customer_id
      where lead.is_seed = false
        and booking.status in ('pending', 'confirmed')
        and booking.starts_at > ${now}
        and booking.starts_at <= ${startsBefore}
        and not exists (
          select 1
          from ${integrationEvents} as event
          where event.event_type = 'booking.reminder_due'
            and event.entity_type = 'lead'
            and event.entity_id = lead.id
        )
      order by booking.starts_at asc
      limit ${limit}
    `);

    return getResultRows<ReminderRow>(result).map(
      (row): ReminderCandidate => ({
        leadId: row.lead_id,
        bookingId: row.booking_id,
        publicNumber: row.public_number,
        category: row.category,
        serviceType: row.service_type,
        customerName: row.display_name,
        maskedPhone: maskPhone(row.phone),
        addressSummary: createAddressSummary(row.address),
        startsAt: new Date(row.starts_at),
      }),
    );
  },

  async createEventIfMissing(event: PendingAutomationEvent, now: Date) {
    const result = await db.execute(sql`
      insert into ${integrationEvents} (
        id,
        event_type,
        entity_type,
        entity_id,
        payload,
        delivery_status,
        created_at
      )
      values (
        ${randomUUID()},
        ${event.eventType},
        ${event.entityType},
        ${event.entityId},
        ${JSON.stringify(event.payload)}::jsonb,
        'pending',
        ${now}
      )
      on conflict (event_type, entity_type, entity_id) do nothing
      returning id
    `);

    const [row] = getResultRows<{ id: string }>(result);
    return row?.id ?? null;
  },
};

export const outboxScheduledScanDelivery: ScheduledScanDelivery = {
  deliver: deliverIntegrationEvent,
};

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
