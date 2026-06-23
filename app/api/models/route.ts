import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const db = getDb();
  const models = await db.query.ocrModels.findMany({
    where: (m, { eq }) => eq(m.isEnabled, true),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });

  // Group / deduplicate models by name on the server side
  const uniqueModelsMap = new Map<string, { id: string; name: string; provider: string }>();
  for (const m of models) {
    if (!uniqueModelsMap.has(m.name)) {
      uniqueModelsMap.set(m.name, {
        id: m.id,
        name: m.name,
        provider: m.provider,
      });
    }
  }

  const result = Array.from(uniqueModelsMap.values());

  return NextResponse.json(result);
}
