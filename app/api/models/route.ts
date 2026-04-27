import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const db = getDb();
  const models = await db.query.ocrModels.findMany({
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });

  // Return public info only
  return NextResponse.json(models.map(m => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
  })));
}
