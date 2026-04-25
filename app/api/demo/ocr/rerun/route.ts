import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";

import { getDb, jobs, jobPages, jobResults } from "@/db";
import { ocrWorkflow } from "@/app/workflows/ocr";

export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { jobId } = await request.json() as { jobId?: string };

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

    // Reset per-page OCR output fields without deleting the rows (preserves pageBlobUrl)
    // The workflow will re-run OCR on each page using the existing blob URLs.
    await db
      .update(jobPages)
      .set({ toonOutput: null, parsedData: null, promptTokens: 0, completionTokens: 0, totalTokens: 0, finishReason: null })
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
