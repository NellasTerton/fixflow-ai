import { describe, expect, it } from "vitest";

import type {
  DemoAvailabilitySlotSeed,
  DemoCustomerSeed,
  DemoLeadSeed,
  DemoServiceSeed,
  DemoTaskSeed,
} from "./data";
import { applyDemoSeed, type DemoSeedStore } from "./seed";

function createMemoryStore() {
  const records = {
    services: new Map<string, DemoServiceSeed>(),
    customers: new Map<string, DemoCustomerSeed>(),
    leads: new Map<string, DemoLeadSeed>(),
    availabilitySlots: new Map<string, DemoAvailabilitySlotSeed>(),
    tasks: new Map<string, DemoTaskSeed>(),
  };

  const upsert = <T extends { id?: string }>(
    target: Map<string, T>,
    values: T[],
  ) => {
    for (const value of values) {
      if (!value.id) {
        throw new Error("Seed records must have deterministic ids");
      }

      target.set(value.id, value);
    }
  };

  const store: DemoSeedStore = {
    async clearBookings() {
      // The in-memory store never tracks bookings, so there is nothing to
      // clear — the drizzle store is where this actually deletes rows.
    },
    async upsertServices(values) {
      upsert(records.services, values);
    },
    async upsertCustomers(values) {
      upsert(records.customers, values);
    },
    async upsertLeads(values) {
      upsert(records.leads, values);
    },
    async upsertAvailabilitySlots(values) {
      upsert(records.availabilitySlots, values);
    },
    async upsertTasks(values) {
      upsert(records.tasks, values);
    },
  };

  return { records, store };
}

describe("FixFlow Service demo seed", () => {
  it("creates the requested safe demo dataset", async () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const { records, store } = createMemoryStore();

    const counts = await applyDemoSeed(store, now);

    expect(counts).toEqual({
      services: 16,
      customers: 12,
      leads: 18,
      availabilitySlots: 20,
      tasks: 6,
    });

    const allRecords = [
      ...records.services.values(),
      ...records.customers.values(),
      ...records.leads.values(),
      ...records.availabilitySlots.values(),
      ...records.tasks.values(),
    ];

    expect(allRecords.every((record) => record.isSeed === true)).toBe(true);

    // The seed reads as a real dispatcher's board, so the safety property is
    // no longer "every field is labelled fake" — it is that no row can ever
    // reach a real person. +7 000 is not an assignable operator code.
    expect(
      [...records.customers.values()].every(
        (customer) =>
          customer.isDemo === true &&
          customer.phone.startsWith("+7 000 000 ") &&
          (!customer.email || customer.email.endsWith("@example.com")),
      ),
    ).toBe(true);

    expect(new Set([...records.leads.values()].map((lead) => lead.status))).toEqual(
      new Set(["new", "booked", "in_progress", "completed", "cancelled"]),
    );

    // A completed lead shows the invoiced amount, not an open estimate.
    expect(
      [...records.leads.values()]
        .filter((lead) => lead.status === "completed")
        .every((lead) => lead.estimatedPriceFrom === lead.estimatedPriceTo),
    ).toBe(true);

    const latestAllowedSlot = new Date(now);
    latestAllowedSlot.setUTCDate(latestAllowedSlot.getUTCDate() + 14);

    expect(
      [...records.availabilitySlots.values()].every(
        (slot) =>
          slot.status === "available" &&
          slot.startsAt! > now &&
          slot.endsAt! <= latestAllowedSlot,
      ),
    ).toBe(true);
  });

  it("is idempotent when applied repeatedly", async () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const { records, store } = createMemoryStore();

    await applyDemoSeed(store, now);
    const idsAfterFirstRun = Object.values(records).map((collection) => [
      ...collection.keys(),
    ]);

    await applyDemoSeed(store, now);
    const idsAfterSecondRun = Object.values(records).map((collection) => [
      ...collection.keys(),
    ]);

    expect(idsAfterSecondRun).toEqual(idsAfterFirstRun);
    expect(Object.values(records).map((collection) => collection.size)).toEqual([
      16, 12, 18, 20, 6,
    ]);
  });
});
