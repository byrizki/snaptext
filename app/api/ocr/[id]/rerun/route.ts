import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";

import { getDb, jobs, jobPages, jobResults, llmLogs } from "@/db";
import { ocrWorkflow } from "@/app/workflows/ocr";

export const maxDuration = 60;

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
    
    // Determine whether the param is a Vercel workflow run ID or a DB job UUID.
    const isWorkflowRunId = jobId.startsWith("wrun_");

    // Find the original job
    let originalJob = await db.query.jobs.findFirst({
      where: isWorkflowRunId
        ? eq(jobs.workflowRunId, jobId)
        : eq(jobs.id, jobId),
    });

    // Fallback if not found by primary method
    if (!originalJob && !isWorkflowRunId) {
      originalJob = await db.query.jobs.findFirst({
        where: eq(jobs.workflowRunId, jobId),
      });
    }

    if (!originalJob) {
      return NextResponse.json(
        { error: "Original job not found" },
        { status: 404 }
      );
    }

    // Use the actual job UUID for database operations
    const actualJobId = originalJob.id;

    // Only clear the merged result — keep existing page blobs so the workflow
    // can reuse the already-uploaded grayscaled images without re-rendering.
    await db.delete(jobResults).where(eq(jobResults.jobId, actualJobId)).catch(() => {});

    // Clear stale LLM logs so costs are re-accumulated on the fresh run
    await db.delete(llmLogs).where(eq(llmLogs.jobId, actualJobId)).catch(() => {});

    // Reset per-page OCR output fields without deleting the rows (preserves pageBlobUrl)
    await db
      .update(jobPages)
      .set({ toonOutput: null, parsedData: null, finishReason: null })
      .where(eq(jobPages.jobId, actualJobId))
      .catch(() => {});

    // Start the workflow with the same job ID
    const run = await start(ocrWorkflow, [actualJobId, originalJob.pdfBlobUrl]);

    // Update the existing job status
    await db
      .update(jobs)
      .set({
        status: "pending",
        workflowRunId: run.runId,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, actualJobId));

    return NextResponse.json({
      jobId: actualJobId,
      runId: run.runId,
      pdfUrl: originalJob.pdfBlobUrl,
      message: "OCR workflow restarted.",
    });
  } catch (error) {
    console.error("Failed to rerun OCR:", error);
    return NextResponse.json(
      { error: "Failed to rerun OCR workflow" },
      { status: 500 }
    );
  }
}
