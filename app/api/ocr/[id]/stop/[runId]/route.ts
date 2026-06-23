/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

import { getDb, jobs } from "@/db";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { runId } = await params;

  if (!runId) {
    return NextResponse.json({ error: "Missing runId" }, { status: 400 });
  }

  const db = getDb();

  const isWorkflowRunId = runId.startsWith("wrun_");

  const job = await db.query.jobs.findFirst({
    where: isWorkflowRunId
      ? eq(jobs.workflowRunId, runId)
      : eq(jobs.id, runId),
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json(
      { error: "Job is already finished and cannot be stopped" },
      { status: 409 },
    );
  }

  const workflowRunId = job.workflowRunId;

  if (workflowRunId) {
    try {
      const run = getRun(workflowRunId);
      await run.cancel();
    } catch (err: any) {
      // If the run is not found or already finished, proceed to mark DB as failed
      if (
        !err?.name?.includes("NotFound") &&
        !err?.message?.includes("not found")
      ) {
        console.error("[stop] Failed to cancel workflow run:", err);
      }
    }


  }

  await db
    .update(jobs)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(jobs.id, job.id));

  return NextResponse.json({ success: true, jobId: job.id });
}
