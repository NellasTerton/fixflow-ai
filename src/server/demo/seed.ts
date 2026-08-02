import { eq, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";
import {
  availabilitySlots,
  bookings,
  customers,
  leads,
  services,
  tasks,
} from "../db/schema";
import {
  createDemoSeedData,
  type DemoAvailabilitySlotSeed,
  type DemoCustomerSeed,
  type DemoLeadSeed,
  type DemoServiceSeed,
  type DemoTaskSeed,
} from "./data";

export interface DemoSeedStore {
  // Bookings are runtime artifacts (created by the chat/booking flow), not
  // seed rows. Re-seeding resets every slot back to "available", so any
  // booking left behind would point at a now-free slot and collide with the
  // unique constraint on slot_id the next time that slot is booked. Clearing
  // bookings first keeps the demo in a consistently bookable state.
  clearBookings(): Promise<void>;
  upsertServices(records: DemoServiceSeed[]): Promise<void>;
  upsertCustomers(records: DemoCustomerSeed[]): Promise<void>;
  upsertLeads(records: DemoLeadSeed[]): Promise<void>;
  upsertAvailabilitySlots(
    records: DemoAvailabilitySlotSeed[],
  ): Promise<void>;
  upsertTasks(records: DemoTaskSeed[]): Promise<void>;
}

export interface ResettableDemoSeedStore extends DemoSeedStore {
  clearSeedData(): Promise<void>;
}

export interface DemoSeedCounts {
  services: number;
  customers: number;
  leads: number;
  availabilitySlots: number;
  tasks: number;
}

const excluded = (columnName: string) =>
  sql.raw(`excluded."${columnName}"`);

export function createDrizzleDemoSeedStore(
  database: NeonHttpDatabase<typeof schema>,
): ResettableDemoSeedStore {
  return {
    async clearBookings() {
      await database.delete(bookings);
    },
    async upsertServices(records) {
      await database
        .insert(services)
        .values(records)
        .onConflictDoUpdate({
          target: services.id,
          set: {
            category: excluded("category"),
            name: excluded("name"),
            description: excluded("description"),
            priceFrom: excluded("price_from"),
            priceTo: excluded("price_to"),
            durationMinutes: excluded("duration_minutes"),
            isActive: excluded("is_active"),
            isSeed: excluded("is_seed"),
            updatedAt: excluded("updated_at"),
          },
        });
    },
    async upsertCustomers(records) {
      await database
        .insert(customers)
        .values(records)
        .onConflictDoUpdate({
          target: customers.id,
          set: {
            displayName: excluded("display_name"),
            phone: excluded("phone"),
            email: excluded("email"),
            address: excluded("address"),
            isDemo: excluded("is_demo"),
            isSeed: excluded("is_seed"),
            expiresAt: excluded("expires_at"),
            updatedAt: excluded("updated_at"),
          },
        });
    },
    async upsertLeads(records) {
      await database
        .insert(leads)
        .values(records)
        .onConflictDoUpdate({
          target: leads.id,
          set: {
            publicNumber: excluded("public_number"),
            customerId: excluded("customer_id"),
            category: excluded("category"),
            serviceType: excluded("service_type"),
            problemDescription: excluded("problem_description"),
            status: excluded("status"),
            priority: excluded("priority"),
            source: excluded("source"),
            preferredDate: excluded("preferred_date"),
            preferredTime: excluded("preferred_time"),
            estimatedPriceFrom: excluded("estimated_price_from"),
            estimatedPriceTo: excluded("estimated_price_to"),
            isSeed: excluded("is_seed"),
            expiresAt: excluded("expires_at"),
            updatedAt: excluded("updated_at"),
          },
        });
    },
    async upsertAvailabilitySlots(records) {
      await database
        .insert(availabilitySlots)
        .values(records)
        .onConflictDoUpdate({
          target: availabilitySlots.id,
          set: {
            category: excluded("category"),
            startsAt: excluded("starts_at"),
            endsAt: excluded("ends_at"),
            status: excluded("status"),
            isSeed: excluded("is_seed"),
          },
        });
    },
    async upsertTasks(records) {
      await database
        .insert(tasks)
        .values(records)
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            leadId: excluded("lead_id"),
            title: excluded("title"),
            description: excluded("description"),
            status: excluded("status"),
            source: excluded("source"),
            isSeed: excluded("is_seed"),
            completedAt: excluded("completed_at"),
          },
        });
    },
    async clearSeedData() {
      // Bookings reference both leads and availability slots, so they must go
      // first or those deletes fail on the foreign keys (this is what made
      // demo:reset error out before).
      await database.delete(bookings);
      await database.delete(tasks).where(eq(tasks.isSeed, true));
      await database.delete(leads).where(eq(leads.isSeed, true));
      await database
        .delete(availabilitySlots)
        .where(eq(availabilitySlots.isSeed, true));
      await database.delete(customers).where(eq(customers.isSeed, true));
      await database.delete(services).where(eq(services.isSeed, true));
    },
  };
}

export async function applyDemoSeed(
  store: DemoSeedStore,
  now = new Date(),
): Promise<DemoSeedCounts> {
  const data = createDemoSeedData(now);

  // Clear runtime bookings before slots are reset to "available" so freed
  // slots never keep a stale booking (see DemoSeedStore.clearBookings).
  await store.clearBookings();
  await store.upsertServices(data.services);
  await store.upsertCustomers(data.customers);
  await store.upsertLeads(data.leads);
  await store.upsertAvailabilitySlots(data.availabilitySlots);
  await store.upsertTasks(data.tasks);

  return {
    services: data.services.length,
    customers: data.customers.length,
    leads: data.leads.length,
    availabilitySlots: data.availabilitySlots.length,
    tasks: data.tasks.length,
  };
}

export async function resetDemoSeed(
  store: ResettableDemoSeedStore,
  now = new Date(),
) {
  await store.clearSeedData();
  return applyDemoSeed(store, now);
}
