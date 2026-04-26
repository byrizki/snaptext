import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE jobs ADD COLUMN json_schema TEXT;`;
  console.log("Migration done");
  process.exit(0);
}

main().catch(console.error);
