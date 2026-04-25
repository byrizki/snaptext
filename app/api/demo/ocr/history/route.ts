import { count, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, jobs } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const offset = (page - 1) * limit;

    const db = getDb();
    
    const [history, countResult] = await Promise.all([
      db.query.jobs.findMany({
        orderBy: [desc(jobs.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: count() }).from(jobs)
    ]);

    const total = countResult[0].count;

    return NextResponse.json({
      data: history,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Failed to fetch OCR history:", error);
    return NextResponse.json(
      { error: "Failed to fetch OCR history" },
      { status: 500 }
    );
  }
}
