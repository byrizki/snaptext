/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, adminSettings } from "@/db";

export async function GET() {
  try {
    const db = getDb();
    const [settings] = await db.query.adminSettings.findMany({ limit: 1 });
    
    // Default fallback if not set
    if (!settings) {
      return NextResponse.json({ global_daily_scan_limit: "20" });
    }

    return NextResponse.json({ global_daily_scan_limit: String(settings.dailyScanLimit) });
  } catch (error: any) {
    console.error("Failed to fetch settings", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const db = getDb();

    const limit = parseInt(data.global_daily_scan_limit, 10);
    if (isNaN(limit)) {
      throw new Error("Invalid limit");
    }

    const [existing] = await db.query.adminSettings.findMany({ limit: 1 });
    if (existing) {
      await db.update(adminSettings).set({ dailyScanLimit: limit, updatedAt: new Date() });
    } else {
      await db.insert(adminSettings).values({ dailyScanLimit: limit });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
