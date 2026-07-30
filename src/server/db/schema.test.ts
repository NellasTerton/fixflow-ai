import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  aiRuns,
  availabilitySlots,
  automationLogs,
  bookings,
  conversations,
  customers,
  documentChunks,
  documents,
  fixFlowTables,
  formRateLimits,
  formSubmissions,
  integrationEvents,
  leads,
  leadPriorityEnum,
  leadPriorityValues,
  leadSourceEnum,
  leadSourceValues,
  leadStatusEnum,
  leadStatusValues,
  messages,
  serviceCategoryEnum,
  serviceCategoryValues,
  services,
  tasks,
} from "./schema";

describe("FixFlow database schema", () => {
  it("declares every required table", () => {
    const tableNames = fixFlowTables.map((table) => getTableConfig(table).name);

    expect(tableNames).toEqual([
      "app_meta",
      "services",
      "customers",
      "leads",
      "form_submissions",
      "form_rate_limits",
      "availability_slots",
      "bookings",
      "tasks",
      "conversations",
      "messages",
      "documents",
      "document_chunks",
      "ai_runs",
      "integration_events",
      "automation_logs",
    ]);
  });

  it("uses the requested category, lead status, priority, and source values", () => {
    expect(serviceCategoryEnum.enumValues).toEqual(serviceCategoryValues);
    expect(leadStatusEnum.enumValues).toEqual(leadStatusValues);
    expect(leadPriorityEnum.enumValues).toEqual(leadPriorityValues);
    expect(leadSourceEnum.enumValues).toEqual(leadSourceValues);
  });

  it("stores every instant as a timezone-aware timestamp", () => {
    const timestampColumns = [
      services.createdAt,
      services.updatedAt,
      customers.expiresAt,
      customers.createdAt,
      customers.updatedAt,
      leads.expiresAt,
      leads.createdAt,
      leads.updatedAt,
      formSubmissions.expiresAt,
      formSubmissions.createdAt,
      formRateLimits.windowStartedAt,
      formRateLimits.expiresAt,
      formRateLimits.createdAt,
      formRateLimits.updatedAt,
      availabilitySlots.startsAt,
      availabilitySlots.endsAt,
      availabilitySlots.createdAt,
      bookings.startsAt,
      bookings.endsAt,
      bookings.createdAt,
      bookings.updatedAt,
      tasks.createdAt,
      tasks.completedAt,
      conversations.createdAt,
      conversations.updatedAt,
      messages.createdAt,
      documents.createdAt,
      documents.updatedAt,
      documentChunks.createdAt,
      aiRuns.createdAt,
      integrationEvents.deliveredAt,
      integrationEvents.createdAt,
      automationLogs.createdAt,
    ];

    expect(
      timestampColumns.every(
        (column) => column.getSQLType() === "timestamp with time zone",
      ),
    ).toBe(true);
  });

  it("adds foreign keys with explicit safe delete behavior", () => {
    const expectedActions = new Map([
      ["leads", ["restrict"]],
      ["form_submissions", ["cascade", "cascade"]],
      ["bookings", ["restrict", "restrict"]],
      ["tasks", ["set null"]],
      ["conversations", ["set null"]],
      ["messages", ["cascade"]],
      ["document_chunks", ["cascade"]],
      ["ai_runs", ["set null"]],
      ["automation_logs", ["set null"]],
    ]);

    for (const table of fixFlowTables) {
      const config = getTableConfig(table);
      const expected = expectedActions.get(config.name);

      if (expected) {
        expect(config.foreignKeys.map((key) => key.onDelete)).toEqual(expected);
      }
    }
  });

  it("protects identifiers and one-to-one booking assignments with unique indexes", () => {
    const uniqueIndexNames = [services, customers, leads, bookings, documents]
      .flatMap((table) => getTableConfig(table).indexes)
      .filter((item) => item.config.unique)
      .map((item) => item.config.name);

    expect(uniqueIndexNames).toEqual(
      expect.arrayContaining([
        "services_category_name_unique",
        "customers_phone_unique",
        "leads_public_number_unique",
        "bookings_lead_id_unique",
        "bookings_slot_id_unique",
        "documents_category_title_unique",
      ]),
    );
  });

  it("adds database checks for ranges and chronological order", () => {
    const checkNames = fixFlowTables.flatMap((table) =>
      getTableConfig(table).checks.map((item) => item.name),
    );

    expect(checkNames).toEqual(
      expect.arrayContaining([
        "services_price_range_valid",
        "services_duration_positive",
        "leads_estimated_price_range_valid",
        "availability_slots_period_valid",
        "bookings_period_valid",
        "document_chunks_index_nonnegative",
        "ai_runs_duration_nonnegative",
        "integration_events_http_status_valid",
      ]),
    );
  });
});
