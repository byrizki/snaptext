import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

import { getDb, jobs } from "@/db";
import { stopHook } from "@/app/workflows/ocr/hooks";

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId in request body" },
        { status: 400 }
      );
    }

    const db = getDb();

    const job = await db.query.jobs.findFirst({
      where: jobId.startsWith("wrun_")
        ? eq(jobs.workflowRunId, jobId)
        : eq(jobs.id, jobId),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json(
        { error: `Cannot stop a job that is already '${job.status}'` },
        { status: 409 }
      );
    }

    try {
      await stopHook.resume(`ocr-stop:${job.id}`, { reason: "Job stopped by user" });
    } catch (err: any) {
      if (
        !err?.name?.includes("NotFound") &&
        !err?.message?.includes("not found")
      ) {
        console.error("[stop] Failed to resume stop hook:", err);
      }

      if (job.workflowRunId) {
        try {
          const run = getRun(job.workflowRunId);
          await run.cancel();
        } catch (cancelErr: any) {
          if (
            !cancelErr?.name?.includes("NotFound") &&
            !cancelErr?.message?.includes("not found")
          ) {
            console.error("[stop] Failed to cancel workflow run:", cancelErr);
          }
        }
      }
    }

    // Mark the DB record as failed immediately so the UI reflects the change
    await db
      .update(jobs)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(jobs.id, job.id));

    return NextResponse.json({
      jobId: job.id,
      runId: job.workflowRunId,
      status: "cancelled",
    });
  } catch (error) {
    console.error("Failed to stop OCR job:", error);
    return NextResponse.json(
      { error: "Failed to stop OCR workflow" },
      { status: 500 }
    );
  }
}
