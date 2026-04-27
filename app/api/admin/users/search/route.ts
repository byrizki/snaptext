import { NextResponse } from "next/server";
import { getDb, user } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ilike, or } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const db = getDb();
    const results = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(or(ilike(user.email, `%${query}%`), ilike(user.name, `%${query}%`)))
      .limit(10);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("User search failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
