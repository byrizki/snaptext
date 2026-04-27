/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

import { getDb, jobPages, jobResults, jobs, ocrModels } from "@/db";

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
  let workflowResult = null;

  const ocrModel = job?.ocrModelId 
    ? await db.query.ocrModels.findFirst({ where: eq(ocrModels.id, job.ocrModelId) })
    : null;

  try {
    // If we have a job, use its workflowRunId, otherwise assume the param itself is the runId.
    const run = getRun(job?.workflowRunId ?? id);
    status = await run.status;
    workflowResult = await run.returnValue;
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

  const pages = job
    ? await db.query.jobPages.findMany({
        where: eq(jobPages.jobId, job.id),
        orderBy: (t, { asc }) => [asc(t.pageNumber)],
      })
    : [];

  const result = job
    ? await db.query.jobResults.findFirst({
        where: eq(jobResults.jobId, job.id),
      })
    : null;

  if (status === "failed" || status === "cancelled") {
    return NextResponse.json({
      runId: id,
      status,
      error: job?.error || "Workflow did not complete successfully.",
    });
  }

  if (view === "demo") {
    const safeJob = job ? {
      pdfBlobUrl: job.pdfBlobUrl,
      totalPages: job.totalPages,
      filename: job.filename,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    } : undefined;

    const safePages = pages.map(p => ({
      pageNumber: p.pageNumber,
      toonOutput: p.toonOutput,
      parsedData: p.parsedData,
    }));

    const safeResult = result ? {
      mergedData: result.mergedData,
    } : undefined;

    return NextResponse.json({
      runId: id,
      status,
      job: safeJob,
      pages: safePages,
      result: safeResult,
      hasSchema: !!job?.jsonSchema,
    });
  }

  return NextResponse.json({
    runId: id,
    status,
    job,
    pages,
    result,
    workflowResult,
    modelName: ocrModel?.name,
    hasSchema: !!job?.jsonSchema,
  });
}
