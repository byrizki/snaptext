ALTER TABLE "ocr_models" ADD COLUMN "priority" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "rotation_mode" text DEFAULT 'round-robin' NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "repair_model_id" text;