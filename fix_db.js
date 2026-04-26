import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    await sql`ALTER TABLE "job_pages" DROP COLUMN IF EXISTS "gemma_prompt_tokens"`;
    await sql`ALTER TABLE "job_pages" DROP COLUMN IF EXISTS "gemma_completion_tokens"`;
    await sql`ALTER TABLE "job_pages" DROP COLUMN IF EXISTS "gemma_total_tokens"`;

    await sql`ALTER TABLE "job_results" DROP COLUMN IF EXISTS "gemma_prompt_tokens"`;
    await sql`ALTER TABLE "job_results" DROP COLUMN IF EXISTS "gemma_completion_tokens"`;
    await sql`ALTER TABLE "job_results" DROP COLUMN IF EXISTS "gemma_total_tokens"`;

    await sql`ALTER TABLE "job_pages" ADD COLUMN IF NOT EXISTS "second_model_input" integer`;
    await sql`ALTER TABLE "job_pages" ADD COLUMN IF NOT EXISTS "second_model_output" integer`;

    await sql`ALTER TABLE "job_results" ADD COLUMN IF NOT EXISTS "second_model_input" integer`;
    await sql`ALTER TABLE "job_results" ADD COLUMN IF NOT EXISTS "second_model_output" integer`;

    console.log('Database schema successfully updated.');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await sql.end();
  }
}

main();
