/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, count, eq, isNotNull, or } from "drizzle-orm";
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

  const [data] = await db
    .select({
      job: jobs,
      ocrModelName: ocrModels.name,
      result: jobResults,
    })
    .from(jobs)
    .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
    .leftJoin(jobResults, eq(jobs.id, jobResults.jobId))
    .where(
      isWorkflowRunId
        ? eq(jobs.workflowRunId, id)
        : or(eq(jobs.id, id), eq(jobs.workflowRunId, id))
    )
    .limit(1);

  const job = data?.job;
  const ocrModelName = data?.ocrModelName;
  const result = data?.result;

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



  const [completedPagesRow] = job
    ? await db
        .select({ count: count() })
        .from(jobPages)
        .where(and(eq(jobPages.jobId, job.id), isNotNull(jobPages.parsedData)))
    : [{ count: 0 }];

  if (status === "failed" || status === "cancelled") {
    return NextResponse.json({
      id: job?.id || id,
      runId: job?.workflowRunId || id,
      status,
      filename: job?.filename ?? null,
      error: job?.error || "Workflow did not complete successfully.",
    });
  }

  if (result?.mergedData) {
    delete (result.mergedData as any).empty;
  }

  return NextResponse.json({
    id: job?.id || id,
    runId: job?.workflowRunId || id,
    status,
    filename: job?.filename,
    totalPages: job?.totalPages ?? 0,
    completedPages: completedPagesRow?.count ?? 0,
    pdfUrl: job?.pdfBlobUrl,
    createdAt: job?.createdAt,
    updatedAt: job?.updatedAt,
    hasSchema: !!job?.jsonSchema,
    modelName: ocrModelName ?? result?.model ?? null,
    data: result?.mergedData ?? null,
    error: job?.error ?? null,
  });
}
