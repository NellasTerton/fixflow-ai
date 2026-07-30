import "server-only";

import { and, asc, eq, gt, lte, sql } from "drizzle-orm";

import type { CrmCategory } from "../../lib/crm/constants";
import { db } from "../db";
import {
  availabilitySlots,
  bookings,
  customers,
  leads,
} from "../db/schema";
import type { BookingStore } from "./booking-service";

export {
  bookAvailabilitySlot,
  type BookedSlot,
  type BookingResult,
  type BookingStore,
} from "./booking-service";

export interface PublicAvailabilitySlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export async function listAvailableSlots(
  category: CrmCategory,
  now = new Date(),
): Promise<PublicAvailabilitySlot[]> {
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

export const databaseBookingStore: BookingStore = {
  async claimSlotAtomic(input, bookingId, now) {
    try {
      const result = await db.execute(sql`
        with candidate_lead as (
          select lead.id, lead.category
          from ${leads} as lead
          inner join ${customers} as customer
            on customer.id = lead.customer_id
          where lead.id = ${input.leadId}
            and customer.is_demo = true
            and lead.status in ('new', 'qualifying', 'waiting_booking')
            and (lead.expires_at is null or lead.expires_at > ${now})
        ),
        claimed_slot as (
          update ${availabilitySlots} as slot
          set status = 'booked'
          where slot.id = ${input.slotId}
            and slot.status = 'available'
            and slot.starts_at > ${now}
            and slot.category = (
              select candidate_lead.category from candidate_lead
            )
          returning slot.starts_at, slot.ends_at
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
            candidate_lead.id,
            ${input.slotId},
            claimed_slot.starts_at,
            claimed_slot.ends_at,
            'confirmed',
            ${now},
            ${now}
          from claimed_slot
          cross join candidate_lead
          returning id, starts_at, ends_at
        ),
        updated_lead as (
          update ${leads} as lead
          set status = 'booked', updated_at = ${now}
          where lead.id = ${input.leadId}
            and exists (select 1 from created_booking)
          returning lead.id
        )
        select
          created_booking.id as booking_id,
          created_booking.starts_at,
          created_booking.ends_at
        from created_booking
        inner join updated_lead on true
      `);

      const [row] = getResultRows<{
        booking_id: string;
        starts_at: Date | string;
        ends_at: Date | string;
      }>(result);

      if (!row) {
        return null;
      }

      return {
        bookingId: row.booking_id,
        startsAt: new Date(row.starts_at).toISOString(),
        endsAt: new Date(row.ends_at).toISOString(),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  },
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

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  return "cause" in error && isUniqueViolation(error.cause);
}
