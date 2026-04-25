import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, jobs } from "@/db";

export async function GET() {
  try {
    const db = getDb();
    const history = await db.query.jobs.findMany({
      orderBy: [desc(jobs.createdAt)],
      limit: 10,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch OCR history:", error);
    return NextResponse.json(
      { error: "Failed to fetch OCR history" },
      { status: 500 }
    );
  }
}
