/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getWorld } from "workflow/runtime";
import { z } from "zod";

import { stopHook } from "@/app/workflows/ocr/hooks";
import { getDb, jobs } from "@/db";
import { validateApiKey } from "@/lib/api-key";

export const JobIdParam = z.object({
  id: z.string().describe("UUID of the job or wrun_ workflow execution run ID")
});

export const CancelJobResponse = z.object({
  jobId: z.uuid().describe("UUID of the job"),
  runId: z.string().describe("Underlying workflow execution run ID"),
  status: z.literal("cancelled").describe("Current status after cancellation")
});

export const maxDuration = 30;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Cancel OCR Job
 * @description Gracefully halts and aborts an active document processing workflow run.
 * @pathParams JobIdParam
 * @response CancelJobResponse
 * @auth ApiKeyAuth
 * @openapi
 */
export async function POST(

  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const authContext = await validateApiKey(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = authContext;
  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
  }

  try {
    const db = getDb();

    // Fetch the job ensuring it belongs to the authenticated user
    const [job] = await db
      .select()
      .from(jobs)
      .where(
        and(
          jobId.startsWith("wrun_")
            ? eq(jobs.workflowRunId, jobId)
            : eq(jobs.id, jobId),
          eq(jobs.userId, userId)
        )
      )
      .limit(1);

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
        { error: `Cannot cancel a job that is already '${job.status}'` },
        { status: 409 }
      );
    }

    // Cancel workflow run via World SDK event
    const world = await getWorld();
    await world.events.create(job.workflowRunId, { eventType: "run_cancelled" });

    // Gracefully stop via the modern stopHook
    try {
      await stopHook.resume(`stop:${job.workflowRunId}`, {
        reason: "Cancelled via Developer API",
      });
    } catch (err: any) {
      if (
        err?.name === "HookNotFoundError" ||
        err?.message?.includes("Hook not found")
      ) {
        console.debug(
          "[cancel v1] Stop hook not found (workflow may already be finishing) — skipping"
        );
      } else {
        console.error("[cancel v1] Failed to resume stop hook:", err);
      }
    }

    // Mark the DB record as failed immediately
    await db
      .update(jobs)
      .set({ status: "failed", error: "Cancelled via Developer API", updatedAt: new Date() })
      .where(eq(jobs.id, job.id));

    return NextResponse.json({
      jobId: job.id,
      runId: job.workflowRunId,
      status: "cancelled",
    });
  } catch (err) {
    console.error("[cancel v1] Exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
