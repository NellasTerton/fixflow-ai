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
      services: 12,
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
    expect(
      [...records.customers.values()].every(
        (customer) =>
          customer.isDemo === true &&
          customer.displayName.startsWith("[ДЕМО]") &&
          customer.phone.startsWith("+380 00 000 ") &&
          customer.address.includes("дом DEMO-"),
      ),
    ).toBe(true);

    expect(new Set([...records.leads.values()].map((lead) => lead.status))).toEqual(
      new Set([
        "new",
        "qualifying",
        "waiting_booking",
        "booked",
        "in_progress",
        "completed",
        "cancelled",
        "human_required",
      ]),
    );

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
      12, 12, 18, 20, 6,
    ]);
  });
});
