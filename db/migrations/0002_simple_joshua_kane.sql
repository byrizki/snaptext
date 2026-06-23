ALTER TABLE "job_pages" DROP COLUMN IF EXISTS "gemma_prompt_tokens";
ALTER TABLE "job_pages" DROP COLUMN IF EXISTS "gemma_completion_tokens";
ALTER TABLE "job_pages" DROP COLUMN IF EXISTS "gemma_total_tokens";
ALTER TABLE "job_results" DROP COLUMN IF EXISTS "gemma_prompt_tokens";
ALTER TABLE "job_results" DROP COLUMN IF EXISTS "gemma_completion_tokens";
ALTER TABLE "job_results" DROP COLUMN IF EXISTS "gemma_total_tokens";

ALTER TABLE "job_pages" ADD COLUMN "second_model_input" integer;
ALTER TABLE "job_pages" ADD COLUMN "second_model_output" integer;

ALTER TABLE "job_results" ADD COLUMN "second_model_input" integer;
ALTER TABLE "job_results" ADD COLUMN "second_model_output" integer;
