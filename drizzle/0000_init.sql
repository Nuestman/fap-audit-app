CREATE TYPE "public"."action_status" AS ENUM('open', 'in_progress', 'closed');--> statement-breakpoint
CREATE TYPE "public"."answer" AS ENUM('yes', 'no', 'na');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('draft', 'in_progress', 'final');--> statement-breakpoint
CREATE TYPE "public"."classification" AS ENUM('major_nc', 'minor_nc', 'ofi', 'obs', 'c');--> statement-breakpoint
CREATE TYPE "public"."extra_kind" AS ENUM('h1', 'h3');--> statement-breakpoint
CREATE TYPE "public"."overall_status" AS ENUM('satisfactory', 'satisfactory_with_improvements', 'unsatisfactory');--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_post_id" integer NOT NULL,
	"item_response_id" integer,
	"extra_finding_id" integer,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"caption" text,
	"data" "bytea" NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"period" text,
	"protocol_version_id" integer NOT NULL,
	"lead_auditor" text,
	"auditors" text,
	"status" "audit_status" DEFAULT 'in_progress' NOT NULL,
	"start_date" date,
	"end_date" date,
	"executive_summary" text,
	"scope_notes" text,
	"limitations" text,
	"conclusion" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_post" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"audit_date" date,
	"shift" text,
	"nurse_in_charge" text,
	"ambulance_units" text,
	"overall_status" "overall_status",
	"key_strengths" text,
	"key_risks" text,
	"recommendation" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corrective_action" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_response_id" integer,
	"extra_finding_id" integer,
	"action" text,
	"owner" text,
	"target_date" date,
	"priority" integer,
	"status" "action_status" DEFAULT 'open' NOT NULL,
	"closeout_evidence" text,
	"closed_at" date,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extra_finding" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_post_id" integer NOT NULL,
	"kind" "extra_kind" NOT NULL,
	"finding" text,
	"linked_ref" text,
	"evidence" text,
	"consequence" text,
	"interim_control" text,
	"classification" "classification",
	"original_note" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "good_practice" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_post_id" integer NOT NULL,
	"practice" text,
	"evidence" text,
	"value" text,
	"replication" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_response" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_post_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"answer" "answer",
	"evidence" text,
	"finding" text,
	"classification" "classification",
	"original_note" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"code" text NOT NULL,
	"text" text NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_section" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"row_header" text NOT NULL,
	"columns" jsonb NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_table_row" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_id" integer NOT NULL,
	"label" text NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"effective_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"central_question" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_off" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_post_id" integer NOT NULL,
	"role" text NOT NULL,
	"name" text,
	"signed_date" date,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "site_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "table_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_post_id" integer NOT NULL,
	"row_id" integer NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_item_response_id_item_response_id_fk" FOREIGN KEY ("item_response_id") REFERENCES "public"."item_response"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_extra_finding_id_extra_finding_id_fk" FOREIGN KEY ("extra_finding_id") REFERENCES "public"."extra_finding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit" ADD CONSTRAINT "audit_protocol_version_id_protocol_version_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."protocol_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_post" ADD CONSTRAINT "audit_post_audit_id_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_post" ADD CONSTRAINT "audit_post_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_item_response_id_item_response_id_fk" FOREIGN KEY ("item_response_id") REFERENCES "public"."item_response"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_extra_finding_id_extra_finding_id_fk" FOREIGN KEY ("extra_finding_id") REFERENCES "public"."extra_finding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_finding" ADD CONSTRAINT "extra_finding_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_practice" ADD CONSTRAINT "good_practice_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_response" ADD CONSTRAINT "item_response_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_response" ADD CONSTRAINT "item_response_item_id_protocol_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."protocol_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_item" ADD CONSTRAINT "protocol_item_section_id_protocol_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."protocol_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_section" ADD CONSTRAINT "protocol_section_version_id_protocol_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."protocol_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_table" ADD CONSTRAINT "protocol_table_section_id_protocol_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."protocol_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_table_row" ADD CONSTRAINT "protocol_table_row_table_id_protocol_table_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."protocol_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_off" ADD CONSTRAINT "sign_off_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_entry" ADD CONSTRAINT "table_entry_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_entry" ADD CONSTRAINT "table_entry_row_id_protocol_table_row_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."protocol_table_row"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_post_audit_site" ON "audit_post" USING btree ("audit_id","site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_response_post_item" ON "item_response" USING btree ("audit_post_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_item_section_code" ON "protocol_item" USING btree ("section_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_section_version_code" ON "protocol_section" USING btree ("version_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_table_section_code" ON "protocol_table" USING btree ("section_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "table_entry_post_row" ON "table_entry" USING btree ("audit_post_id","row_id");