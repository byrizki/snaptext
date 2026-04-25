/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  try {
    const db = getDb();
    const jobs = await db.query.jobs.findMany({
      orderBy: (j, { desc }) => [desc(j.createdAt)],
      limit: 100,
    });
    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error("Failed to fetch jobs", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
