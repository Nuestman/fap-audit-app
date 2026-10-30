CREATE TYPE "public"."fap_staff_model" AS ENUM('global', 'site_assigned');--> statement-breakpoint
CREATE TYPE "public"."pin_status" AS ENUM('active', 'expired', 'unknown');--> statement-breakpoint
CREATE TABLE "app_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"fap_staff_model" "fap_staff_model" DEFAULT 'global' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditor" ADD COLUMN "organization" text;--> statement-breakpoint
ALTER TABLE "auditor" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "auditor" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "auditor" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "auditor" ADD COLUMN "employee_number" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "organization" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "employee_number" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "qualification" text;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "pin_status" "pin_status" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "pin_expires_on" date;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD COLUMN "site_id" integer;--> statement-breakpoint
ALTER TABLE "fap_staff" ADD CONSTRAINT "fap_staff_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "app_config" ("id", "fap_staff_model") VALUES (1, 'global') ON CONFLICT ("id") DO NOTHING;