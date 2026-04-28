CREATE TYPE "public"."reset_period" AS ENUM('daily', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."scan_quota_type" AS ENUM('user', 'global', 'registered');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"job_page_id" uuid,
	"step_name" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"raw_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "scan_quota_type" DEFAULT 'global' NOT NULL,
	"user_id" text,
	"count" integer DEFAULT 20 NOT NULL,
	"reset_period" "reset_period" DEFAULT 'daily' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"concurrency_length" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ocr_models" ALTER COLUMN "provider" SET DEFAULT 'vercel';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "json_schema" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "ocr_models" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_job_page_id_job_pages_id_fk" FOREIGN KEY ("job_page_id") REFERENCES "public"."job_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_quotas" ADD CONSTRAINT "scan_quotas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_logs_job_id_idx" ON "llm_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "llm_logs_job_page_id_idx" ON "llm_logs" USING btree ("job_page_id");--> statement-breakpoint
CREATE INDEX "scan_quotas_type_idx" ON "scan_quotas" USING btree ("type");--> statement-breakpoint
CREATE INDEX "scan_quotas_user_id_idx" ON "scan_quotas" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pages" DROP COLUMN "prompt_tokens";--> statement-breakpoint
ALTER TABLE "job_pages" DROP COLUMN "completion_tokens";--> statement-breakpoint
ALTER TABLE "job_pages" DROP COLUMN "total_tokens";--> statement-breakpoint
ALTER TABLE "job_results" DROP COLUMN "prompt_tokens";--> statement-breakpoint
ALTER TABLE "job_results" DROP COLUMN "completion_tokens";--> statement-breakpoint
ALTER TABLE "job_results" DROP COLUMN "total_tokens";--> statement-breakpoint
ALTER TABLE "ocr_models" DROP COLUMN "tier";--> statement-breakpoint
DROP TYPE "public"."ocr_model_tier";