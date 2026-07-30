import { randomUUID } from "node:crypto";

import type { BookingRequestInput } from "../../lib/request/schema";

export interface BookedSlot {
  bookingId: string;
  startsAt: string;
  endsAt: string;
}

export interface BookingStore {
  claimSlotAtomic(
    input: BookingRequestInput,
    bookingId: string,
    now: Date,
  ): Promise<BookedSlot | null>;
}

export type BookingResult =
  | ({ status: "booked" } & BookedSlot)
  | { status: "unavailable" };

export async function bookAvailabilitySlot(
  store: BookingStore,
  input: BookingRequestInput,
  now = new Date(),
): Promise<BookingResult> {
  const booking = await store.claimSlotAtomic(input, randomUUID(), now);

  return booking
    ? { status: "booked", ...booking }
    : { status: "unavailable" };
}
