import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getWorld } from "workflow/runtime";
import { stopHook } from "@/app/workflows/ocr/hooks";

import { getDb, jobs } from "@/db";

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

    if (!job.workflowRunId) {
      return NextResponse.json(
        { error: "No active workflow run associated with this job" },
        { status: 400 }
      );
    }

    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json(
        { error: `Cannot stop a job that is already '${job.status}'` },
        { status: 409 }
      );
    }

    // Cancel the workflow run via World SDK event
    const world = await getWorld();
    await world.events.create(job.workflowRunId, { eventType: "run_cancelled" });

    // Also trigger the modern stopHook to gracefully halt the DurableAgent tool loop
    try {
      await stopHook.resume(`stop:${job.workflowRunId}`, { reason: "User requested stop" });
    } catch (err: any) {
      // HookNotFoundError is expected if the workflow is already finishing or the hook was never registered in this run
      if (err?.name === "HookNotFoundError" || err?.message?.includes("Hook not found")) {
        console.debug("[stop] Stop hook not found (workflow may already be finishing) — skipping");
      } else {
        console.error("[stop] Failed to resume stop hook:", err);
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
