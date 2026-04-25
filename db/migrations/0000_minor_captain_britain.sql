CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "job_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"page_blob_url" text,
	"toon_output" text,
	"parsed_data" jsonb,
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"finish_reason" text,
	"log" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"merged_data" jsonb,
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"finish_reason" text,
	"raw_response" text,
	"log" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_results_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"pdf_blob_url" text NOT NULL,
	"workflow_run_id" text,
	"total_pages" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_pages" ADD CONSTRAINT "job_pages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_results" ADD CONSTRAINT "job_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_pages_job_id_idx" ON "job_pages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_pages_job_page_idx" ON "job_pages" USING btree ("job_id","page_number");--> statement-breakpoint
CREATE INDEX "job_results_job_id_idx" ON "job_results" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");