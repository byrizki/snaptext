import { eq } from "drizzle-orm";
import { getRun } from "workflow/api";

import { getDb, jobs } from "@/db";

type Job = typeof jobs.$inferSelect;

const FAILED_WORKFLOW_STATUSES = new Set([
  "failed",
  "cancelled",
  "canceled",
  "terminated",
  "errored",
]);

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "WorkflowRunNotFoundError" ||
    error.message.toLowerCase().includes("not found")
  );
}

function isActiveJobStatus(status: string): boolean {
  return status === "pending" || status === "running";
}

/**
 * Reconcile DB job state with the workflow runtime.
 * If a workflow crashes, is cancelled, or terminates outside the workflow catch block,
 * the DB can remain stuck at running. Persist terminal runtime failures back to jobs.
 */
export async function reconcileOcrJobStatus(job: Job): Promise<string> {
  if (!isActiveJobStatus(job.status)) return job.status;
  if (!job.workflowRunId) return job.status;

  let workflowStatus: string;
  try {
    workflowStatus = await getRun(job.workflowRunId).status;
  } catch (error) {
    if (isNotFoundError(error)) return job.status;
    console.error("[ocr job status] Workflow status lookup error:", error);
    return job.status;
  }

  if (FAILED_WORKFLOW_STATUSES.has(workflowStatus)) {
    const errorMessage = `Workflow ${workflowStatus} before completing.`;
    await getDb()
      .update(jobs)
      .set({ status: "failed", error: job.error || errorMessage, updatedAt: new Date() })
      .where(eq(jobs.id, job.id));
    return "failed";
  }

  return workflowStatus;
}
