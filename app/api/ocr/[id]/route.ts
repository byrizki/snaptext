/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

import { getDb, jobResults, jobs } from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view"); // e.g., 'demo'

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getDb();

  // Determine whether the param is a Vercel workflow run ID or a DB job UUID.
  const isWorkflowRunId = id.startsWith("wrun_");

  let job = await db.query.jobs.findFirst({
    where: isWorkflowRunId
      ? eq(jobs.workflowRunId, id)
      : eq(jobs.id, id),
  });

  // If looking up by jobId failed (shouldn't happen), try workflowRunId as fallback.
  if (!job && !isWorkflowRunId) {
    job = await db.query.jobs.findFirst({
      where: eq(jobs.workflowRunId, id),
    });
  }

  let status = "unknown";

  try {
    // If we have a job, use its workflowRunId, otherwise assume the param itself is the runId.
    const run = getRun(job?.workflowRunId ?? id);
    status = await run.status;
  } catch (error: any) {
    // If the workflow run is not found (e.g., deleted or expired), fallback to the DB status
    if (error.name === "WorkflowRunNotFoundError" || error.message?.includes("not found")) {
      status = job?.status ?? "unknown";
    } else {
      console.error("Workflow status error:", error);
    }
  }

  // If the DB says completed, trust the DB (in case workflow status is purged)
  if (job?.status === "completed") {
    status = "completed";
  } else if (job?.status === "failed") {
    status = "failed";
  }

  const result = job
    ? await db.query.jobResults.findFirst({
        where: eq(jobResults.jobId, job.id),
      })
    : null;

  if (status === "failed" || status === "cancelled") {
    return NextResponse.json({
      id: job?.id || id,
      runId: job?.workflowRunId || id,
      status,
      filename: job?.filename ?? null,
      error: job?.error || "Workflow did not complete successfully.",
    });
  }

  return NextResponse.json({
    id: job?.id || id,
    runId: job?.workflowRunId || id,
    status,
    filename: job?.filename,
    totalPages: job?.totalPages ?? 0,
    pdfUrl: job?.pdfBlobUrl,
    createdAt: job?.createdAt,
    updatedAt: job?.updatedAt,
    hasSchema: !!job?.jsonSchema,
    data: result?.mergedData ?? null,
    error: job?.error ?? null,
  });
}
