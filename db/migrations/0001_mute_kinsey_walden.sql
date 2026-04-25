CREATE TYPE "public"."ocr_model_tier" AS ENUM('nano', 'flash', 'pro', 'ultra');--> statement-breakpoint
CREATE TABLE "ocr_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tier" "ocr_model_tier" DEFAULT 'flash' NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"temperature" real DEFAULT 0.3 NOT NULL,
	"max_output_tokens" integer DEFAULT 4096 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "file_hash" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "ocr_model_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_ocr_model_id_ocr_models_id_fk" FOREIGN KEY ("ocr_model_id") REFERENCES "public"."ocr_models"("id") ON DELETE set null ON UPDATE no action;