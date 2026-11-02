CREATE TABLE "change_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer NOT NULL,
	"audit_id" integer,
	"audit_post_id" integer,
	"action" text NOT NULL,
	"source" text DEFAULT 'ui' NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text
);
--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_audit_id_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "change_event" ADD CONSTRAINT "change_event_audit_post_id_audit_post_id_fk" FOREIGN KEY ("audit_post_id") REFERENCES "public"."audit_post"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "change_event_entity_idx" ON "change_event" ("entity","entity_id");
--> statement-breakpoint
CREATE INDEX "change_event_occurred_idx" ON "change_event" ("occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "change_event_audit_post_idx" ON "change_event" ("audit_post_id");
