import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, jobs, ocrModels } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const offset = (page - 1) * limit;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const [userJobs, [{ count }]] = await Promise.all([
    db
      .select({
        id: jobs.id,
        filename: jobs.filename,
        fileSize: jobs.fileSize,
        status: jobs.status,
        totalPages: jobs.totalPages,
        pdfBlobUrl: jobs.pdfBlobUrl,
        ocrModelId: jobs.ocrModelId,
        modelName: ocrModels.name,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
      .where(eq(jobs.userId, session.user.id))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(jobs)
      .where(eq(jobs.userId, session.user.id))
  ]);

  const jobsWithDuration = userJobs.map((job) => {
    const isTerminal = job.status === "completed" || job.status === "failed";
    const duration =
      isTerminal && job.updatedAt && job.createdAt
        ? new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()
        : null;
    return { ...job, duration };
  });

  return NextResponse.json({
    jobs: jobsWithDuration,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  });
}

