CREATE SEQUENCE "public"."lead_public_number_sequence" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1042 CACHE 1;--> statement-breakpoint
CREATE TABLE "form_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_rate_limits_request_count_positive" CHECK ("form_rate_limits"."request_count" > 0),
	CONSTRAINT "form_rate_limits_expiry_after_window" CHECK ("form_rate_limits"."expires_at" > "form_rate_limits"."window_started_at")
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_submissions_expiry_after_creation" CHECK ("form_submissions"."expires_at" > "form_submissions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "form_rate_limits_expires_at_idx" ON "form_rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "form_submissions_idempotency_key_unique" ON "form_submissions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "form_submissions_lead_id_unique" ON "form_submissions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "form_submissions_expires_at_idx" ON "form_submissions" USING btree ("expires_at");