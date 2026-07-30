import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const serviceCategoryValues = [
  "appliance_repair",
  "plumbing",
  "air_conditioning",
  "common",
] as const;

export const leadStatusValues = [
  "new",
  "qualifying",
  "waiting_booking",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "human_required",
] as const;

export const leadPriorityValues = ["low", "normal", "high", "urgent"] as const;
export const leadSourceValues = ["seed", "website_form", "ai_chat"] as const;
export const availabilityStatusValues = [
  "available",
  "held",
  "booked",
  "unavailable",
] as const;
export const bookingStatusValues = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;
export const taskStatusValues = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const taskSourceValues = ["system", "manual", "automation"] as const;
export const conversationStatusValues = [
  "active",
  "completed",
  "abandoned",
  "human_required",
] as const;
export const messageSenderValues = ["customer", "assistant", "system"] as const;
export const documentStatusValues = ["draft", "published", "archived"] as const;
export const aiRunStatusValues = ["success", "error"] as const;
export const deliveryStatusValues = [
  "pending",
  "delivered",
  "failed",
] as const;
export const automationStatusValues = [
  "started",
  "success",
  "failed",
] as const;

export const serviceCategoryEnum = pgEnum(
  "service_category",
  serviceCategoryValues,
);
export const leadStatusEnum = pgEnum("lead_status", leadStatusValues);
export const leadPriorityEnum = pgEnum("lead_priority", leadPriorityValues);
export const leadSourceEnum = pgEnum("lead_source", leadSourceValues);
export const availabilityStatusEnum = pgEnum(
  "availability_status",
  availabilityStatusValues,
);
export const bookingStatusEnum = pgEnum("booking_status", bookingStatusValues);
export const taskStatusEnum = pgEnum("task_status", taskStatusValues);
export const taskSourceEnum = pgEnum("task_source", taskSourceValues);
export const conversationStatusEnum = pgEnum(
  "conversation_status",
  conversationStatusValues,
);
export const messageSenderEnum = pgEnum("message_sender", messageSenderValues);
export const documentStatusEnum = pgEnum(
  "document_status",
  documentStatusValues,
);
export const aiRunStatusEnum = pgEnum("ai_run_status", aiRunStatusValues);
export const deliveryStatusEnum = pgEnum(
  "delivery_status",
  deliveryStatusValues,
);
export const automationStatusEnum = pgEnum(
  "automation_status",
  automationStatusValues,
);

export const leadPublicNumberSequence = pgSequence(
  "lead_public_number_sequence",
  {
    startWith: 1042,
    increment: 1,
  },
);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const appMeta = pgTable("app_meta", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: createdAt(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: serviceCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    priceFrom: integer("price_from").notNull(),
    priceTo: integer("price_to").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isSeed: boolean("is_seed").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("services_category_name_unique").on(
      table.category,
      table.name,
    ),
    index("services_active_category_idx").on(table.isActive, table.category),
    check("services_price_from_nonnegative", sql`${table.priceFrom} >= 0`),
    check("services_price_to_nonnegative", sql`${table.priceTo} >= 0`),
    check(
      "services_price_range_valid",
      sql`${table.priceTo} >= ${table.priceFrom}`,
    ),
    check(
      "services_duration_positive",
      sql`${table.durationMinutes} > 0`,
    ),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address").notNull(),
    isDemo: boolean("is_demo").default(true).notNull(),
    isSeed: boolean("is_seed").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("customers_phone_unique").on(table.phone),
    index("customers_expires_at_idx").on(table.expiresAt),
    check(
      "customers_expiry_after_creation",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicNumber: text("public_number").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    category: serviceCategoryEnum("category").notNull(),
    serviceType: text("service_type").notNull(),
    problemDescription: text("problem_description").notNull(),
    status: leadStatusEnum("status").default("new").notNull(),
    priority: leadPriorityEnum("priority").default("normal").notNull(),
    source: leadSourceEnum("source").notNull(),
    preferredDate: date("preferred_date"),
    preferredTime: time("preferred_time", { withTimezone: false }),
    estimatedPriceFrom: integer("estimated_price_from"),
    estimatedPriceTo: integer("estimated_price_to"),
    isSeed: boolean("is_seed").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("leads_public_number_unique").on(table.publicNumber),
    index("leads_customer_id_idx").on(table.customerId),
    index("leads_status_created_at_idx").on(table.status, table.createdAt),
    index("leads_category_status_idx").on(table.category, table.status),
    index("leads_expires_at_idx").on(table.expiresAt),
    check(
      "leads_estimated_price_from_nonnegative",
      sql`${table.estimatedPriceFrom} is null or ${table.estimatedPriceFrom} >= 0`,
    ),
    check(
      "leads_estimated_price_to_nonnegative",
      sql`${table.estimatedPriceTo} is null or ${table.estimatedPriceTo} >= 0`,
    ),
    check(
      "leads_estimated_price_range_valid",
      sql`${table.estimatedPriceFrom} is null or ${table.estimatedPriceTo} is null or ${table.estimatedPriceTo} >= ${table.estimatedPriceFrom}`,
    ),
    check(
      "leads_expiry_after_creation",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("form_submissions_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    uniqueIndex("form_submissions_lead_id_unique").on(table.leadId),
    index("form_submissions_expires_at_idx").on(table.expiresAt),
    check(
      "form_submissions_expiry_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const formRateLimits = pgTable(
  "form_rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    requestCount: integer("request_count").default(1).notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("form_rate_limits_expires_at_idx").on(table.expiresAt),
    check(
      "form_rate_limits_request_count_positive",
      sql`${table.requestCount} > 0`,
    ),
    check(
      "form_rate_limits_expiry_after_window",
      sql`${table.expiresAt} > ${table.windowStartedAt}`,
    ),
  ],
);

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: serviceCategoryEnum("category").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: availabilityStatusEnum("status").default("available").notNull(),
    isSeed: boolean("is_seed").default(false).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("availability_slots_category_period_unique").on(
      table.category,
      table.startsAt,
      table.endsAt,
    ),
    index("availability_slots_lookup_idx").on(
      table.category,
      table.status,
      table.startsAt,
    ),
    check(
      "availability_slots_period_valid",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => availabilitySlots.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").default("pending").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("bookings_lead_id_unique").on(table.leadId),
    uniqueIndex("bookings_slot_id_unique").on(table.slotId),
    index("bookings_status_starts_at_idx").on(table.status, table.startsAt),
    check("bookings_period_valid", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("pending").notNull(),
    source: taskSourceEnum("source").notNull(),
    isSeed: boolean("is_seed").default(false).notNull(),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_lead_id_idx").on(table.leadId),
    index("tasks_status_created_at_idx").on(table.status, table.createdAt),
    check(
      "tasks_completion_after_creation",
      sql`${table.completedAt} is null or ${table.completedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    currentStep: text("current_step").notNull(),
    collectedData: jsonb("collected_data")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    status: conversationStatusEnum("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("conversations_lead_id_idx").on(table.leadId),
    index("conversations_status_updated_at_idx").on(
      table.status,
      table.updatedAt,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    sender: messageSenderEnum("sender").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("messages_conversation_created_at_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    category: serviceCategoryEnum("category").notNull(),
    content: text("content").notNull(),
    status: documentStatusEnum("status").default("draft").notNull(),
    isDemo: boolean("is_demo").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("documents_category_title_unique").on(
      table.category,
      table.title,
    ),
    index("documents_status_category_idx").on(table.status, table.category),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    category: serviceCategoryEnum("category").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("document_chunks_document_index_unique").on(
      table.documentId,
      table.chunkIndex,
    ),
    index("document_chunks_category_idx").on(table.category),
    index("document_chunks_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    check(
      "document_chunks_index_nonnegative",
      sql`${table.chunkIndex} >= 0`,
    ),
  ],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").references(
      () => conversations.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),
    operation: text("operation").notNull(),
    model: text("model").notNull(),
    inputSummary: text("input_summary").notNull(),
    parsedOutput: jsonb("parsed_output")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    retrievedChunks: jsonb("retrieved_chunks")
      .$type<unknown[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    durationMs: integer("duration_ms").notNull(),
    status: aiRunStatusEnum("status").notNull(),
    error: text("error"),
    createdAt: createdAt(),
  },
  (table) => [
    index("ai_runs_conversation_id_idx").on(table.conversationId),
    index("ai_runs_operation_created_at_idx").on(
      table.operation,
      table.createdAt,
    ),
    index("ai_runs_status_created_at_idx").on(table.status, table.createdAt),
    check("ai_runs_duration_nonnegative", sql`${table.durationMs} >= 0`),
  ],
);

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    deliveryStatus: deliveryStatusEnum("delivery_status")
      .default("pending")
      .notNull(),
    httpStatus: integer("http_status"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (table) => [
    index("integration_events_delivery_idx").on(
      table.deliveryStatus,
      table.createdAt,
    ),
    index("integration_events_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    uniqueIndex("integration_events_type_entity_unique").on(
      table.eventType,
      table.entityType,
      table.entityId,
    ),
    check(
      "integration_events_http_status_valid",
      sql`${table.httpStatus} is null or (${table.httpStatus} >= 100 and ${table.httpStatus} <= 599)`,
    ),
    check(
      "integration_events_delivery_after_creation",
      sql`${table.deliveredAt} is null or ${table.deliveredAt} >= ${table.createdAt}`,
    ),
  ],
);

export const automationLogs = pgTable(
  "automation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    integrationEventId: uuid("integration_event_id").references(
      () => integrationEvents.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),
    platform: text("platform").notNull(),
    workflowName: text("workflow_name").notNull(),
    action: text("action").notNull(),
    status: automationStatusEnum("status").notNull(),
    externalRunId: text("external_run_id"),
    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("automation_logs_integration_event_id_idx").on(
      table.integrationEventId,
    ),
    index("automation_logs_platform_created_at_idx").on(
      table.platform,
      table.createdAt,
    ),
    index("automation_logs_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    uniqueIndex("automation_logs_callback_unique").on(
      table.integrationEventId,
      table.platform,
      table.workflowName,
      table.action,
    ),
  ],
);

export const fixFlowTables = [
  appMeta,
  services,
  customers,
  leads,
  formSubmissions,
  formRateLimits,
  availabilitySlots,
  bookings,
  tasks,
  conversations,
  messages,
  documents,
  documentChunks,
  aiRuns,
  integrationEvents,
  automationLogs,
] as const;
