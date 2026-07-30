import { describe, expect, it } from "vitest";

import type { BookingRequestInput } from "../../lib/request/schema";
import {
  bookAvailabilitySlot,
  type BookingStore,
} from "./booking-service";

class ConcurrentMemoryBookingStore implements BookingStore {
  private claimedSlots = new Set<string>();

  async claimSlotAtomic(
    input: BookingRequestInput,
    bookingId: string,
    now: Date,
  ) {
    await Promise.resolve();

    if (this.claimedSlots.has(input.slotId)) {
      return null;
    }

    this.claimedSlots.add(input.slotId);

    return {
      bookingId,
      startsAt: new Date(now.getTime() + 60_000).toISOString(),
      endsAt: new Date(now.getTime() + 3_660_000).toISOString(),
    };
  }
}

describe("concurrent slot booking", () => {
  it("allows exactly one booking for the same slot", async () => {
    const store = new ConcurrentMemoryBookingStore();
    const input = {
      leadId: "30000000-0000-4000-8000-000000000001",
      slotId: "40000000-0000-4000-8000-000000000001",
    };

    const results = await Promise.all([
      bookAvailabilitySlot(store, input),
      bookAvailabilitySlot(store, input),
    ]);

    expect(results.filter((result) => result.status === "booked")).toHaveLength(
      1,
    );
    expect(
      results.filter((result) => result.status === "unavailable"),
    ).toHaveLength(1);
  });
});
