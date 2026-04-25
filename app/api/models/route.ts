import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const db = getDb();
  const models = await db.query.ocrModels.findMany({
    orderBy: (m, { asc }) => [asc(m.name)],
  });
  
  // Return public info only
  return NextResponse.json(models.map(m => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
  })));
}
