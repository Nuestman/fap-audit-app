CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"job_title" text,
	"organisation" text,
	"phone" text,
	"avatar_data" "bytea",
	"avatar_mime_type" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
