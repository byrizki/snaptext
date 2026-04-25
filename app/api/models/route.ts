import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const db = getDb();
  const models = await db.query.ocrModels.findMany({
    orderBy: (m, { asc }) => [asc(m.tier), asc(m.name)],
  });
  
  // Return public info only
  return NextResponse.json(models.map(m => ({
    id: m.id,
    name: m.name,
    tier: m.tier,
    provider: m.provider,
  })));
}
