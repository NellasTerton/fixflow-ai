CREATE TYPE "public"."ai_run_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('started', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available', 'held', 'booked', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'completed', 'abandoned', 'human_required');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lead_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('seed', 'website_form', 'ai_chat');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'qualifying', 'waiting_booking', 'booked', 'in_progress', 'completed', 'cancelled', 'human_required');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('customer', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('appliance_repair', 'plumbing', 'air_conditioning', 'common');--> statement-breakpoint
CREATE TYPE "public"."task_source" AS ENUM('system', 'manual', 'automation');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"operation" text NOT NULL,
	"model" text NOT NULL,
	"input_summary" text NOT NULL,
	"parsed_output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retrieved_chunks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" "ai_run_status" NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_runs_duration_nonnegative" CHECK ("ai_runs"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_event_id" uuid,
	"platform" text NOT NULL,
	"workflow_name" text NOT NULL,
	"action" text NOT NULL,
	"status" "automation_status" NOT NULL,
	"external_run_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "service_category" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "availability_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_slots_period_valid" CHECK ("availability_slots"."ends_at" > "availability_slots"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_period_valid" CHECK ("bookings"."ends_at" > "bookings"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"current_step" text NOT NULL,
	"collected_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_expiry_after_creation" CHECK ("customers"."expires_at" is null or "customers"."expires_at" > "customers"."created_at")
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"category" "service_category" NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_chunks_index_nonnegative" CHECK ("document_chunks"."chunk_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" "service_category" NOT NULL,
	"content" text NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"delivery_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"http_status" integer,
	"delivered_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_events_http_status_valid" CHECK ("integration_events"."http_status" is null or ("integration_events"."http_status" >= 100 and "integration_events"."http_status" <= 599)),
	CONSTRAINT "integration_events_delivery_after_creation" CHECK ("integration_events"."delivered_at" is null or "integration_events"."delivered_at" >= "integration_events"."created_at")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"category" "service_category" NOT NULL,
	"service_type" text NOT NULL,
	"problem_description" text NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"priority" "lead_priority" DEFAULT 'normal' NOT NULL,
	"source" "lead_source" NOT NULL,
	"preferred_date" date,
	"preferred_time" time,
	"estimated_price_from" integer,
	"estimated_price_to" integer,
	"is_seed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_estimated_price_from_nonnegative" CHECK ("leads"."estimated_price_from" is null or "leads"."estimated_price_from" >= 0),
	CONSTRAINT "leads_estimated_price_to_nonnegative" CHECK ("leads"."estimated_price_to" is null or "leads"."estimated_price_to" >= 0),
	CONSTRAINT "leads_estimated_price_range_valid" CHECK ("leads"."estimated_price_from" is null or "leads"."estimated_price_to" is null or "leads"."estimated_price_to" >= "leads"."estimated_price_from"),
	CONSTRAINT "leads_expiry_after_creation" CHECK ("leads"."expires_at" is null or "leads"."expires_at" > "leads"."created_at")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender" "message_sender" NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "service_category" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_from" integer NOT NULL,
	"price_to" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_price_from_nonnegative" CHECK ("services"."price_from" >= 0),
	CONSTRAINT "services_price_to_nonnegative" CHECK ("services"."price_to" >= 0),
	CONSTRAINT "services_price_range_valid" CHECK ("services"."price_to" >= "services"."price_from"),
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"source" "task_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "tasks_completion_after_creation" CHECK ("tasks"."completed_at" is null or "tasks"."completed_at" >= "tasks"."created_at")
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_integration_event_id_integration_events_id_fk" FOREIGN KEY ("integration_event_id") REFERENCES "public"."integration_events"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_availability_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ai_runs_conversation_id_idx" ON "ai_runs" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_runs_operation_created_at_idx" ON "ai_runs" USING btree ("operation","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_status_created_at_idx" ON "ai_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "automation_logs_integration_event_id_idx" ON "automation_logs" USING btree ("integration_event_id");--> statement-breakpoint
CREATE INDEX "automation_logs_platform_created_at_idx" ON "automation_logs" USING btree ("platform","created_at");--> statement-breakpoint
CREATE INDEX "automation_logs_status_created_at_idx" ON "automation_logs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_slots_category_period_unique" ON "availability_slots" USING btree ("category","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "availability_slots_lookup_idx" ON "availability_slots" USING btree ("category","status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_lead_id_unique" ON "bookings" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_id_unique" ON "bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "bookings_status_starts_at_idx" ON "bookings" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "conversations_lead_id_idx" ON "conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "conversations_status_updated_at_idx" ON "conversations" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_unique" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_expires_at_idx" ON "customers" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_chunks_document_index_unique" ON "document_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "document_chunks_category_idx" ON "document_chunks" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_category_title_unique" ON "documents" USING btree ("category","title");--> statement-breakpoint
CREATE INDEX "documents_status_category_idx" ON "documents" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "integration_events_delivery_idx" ON "integration_events" USING btree ("delivery_status","created_at");--> statement-breakpoint
CREATE INDEX "integration_events_entity_idx" ON "integration_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_public_number_unique" ON "leads" USING btree ("public_number");--> statement-breakpoint
CREATE INDEX "leads_customer_id_idx" ON "leads" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "leads_status_created_at_idx" ON "leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "leads_category_status_idx" ON "leads" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "leads_expires_at_idx" ON "leads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "services_category_name_unique" ON "services" USING btree ("category","name");--> statement-breakpoint
CREATE INDEX "services_active_category_idx" ON "services" USING btree ("is_active","category");--> statement-breakpoint
CREATE INDEX "tasks_lead_id_idx" ON "tasks" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "tasks_status_created_at_idx" ON "tasks" USING btree ("status","created_at");