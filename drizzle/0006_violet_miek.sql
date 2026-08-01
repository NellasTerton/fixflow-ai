-- Collapse the lead pipeline from eight stages to five.
--
-- `qualifying` and `waiting_booking` both meant "not scheduled yet", so they
-- fold into `new`. `human_required` was never a stage at all — it described a
-- lead that needs a person — so it becomes the `needs_operator` flag and the
-- lead returns to `new`.
--
-- The column has to be added and backfilled BEFORE the enum is replaced,
-- otherwise the cast back to lead_status hits rows holding values the new
-- type no longer defines.
ALTER TABLE "leads" ADD COLUMN "needs_operator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "leads" SET "needs_operator" = true WHERE "status" = 'human_required';--> statement-breakpoint

ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'::text;--> statement-breakpoint
UPDATE "leads"
  SET "status" = 'new'
  WHERE "status" IN ('qualifying', 'waiting_booking', 'human_required');--> statement-breakpoint

DROP TYPE "public"."lead_status";--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'booked', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status";--> statement-breakpoint
CREATE INDEX "leads_needs_operator_idx" ON "leads" USING btree ("needs_operator");
