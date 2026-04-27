import { getDb } from "../db";
import { scanQuotas } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding global quotas...");
  const db = getDb();

  // Check if global quota already exists
  const existing = await db.query.scanQuotas.findFirst({
    where: eq(scanQuotas.type, "global"),
  });

  if (!existing) {
    await db.insert(scanQuotas).values({
      type: "global",
      resetPeriod: "daily",
    });
    console.log("Global quotas seeded successfully.");
  } else {
    console.log("Global quotas already exist, skipping.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding quotas:", err);
  process.exit(1);
});
