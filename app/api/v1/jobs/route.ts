import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, jobs } from "@/db";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { validateApiKey } from "@/lib/api-key";
import { ocrWorkflow } from "@/app/workflows/ocr";
import { resolveModel } from "@/lib/model-resolution";
import { reconcileOcrJobStatus } from "@/lib/ocr-job-status";

export const maxDuration = 60;

export const CreateJobRequest = z.object({
  pdfUrl: z.url().describe("The direct public URL or secure storage URL of the PDF document to extract."),
  filename: z.string().describe("The original name of the PDF file (e.g., document.pdf)."),
  fileSize: z.number().int().positive().describe("The total size of the PDF file in bytes."),
  fileHash: z.string().describe("A unique SHA-256 hash of the PDF file. This is used to automatically prevent duplicate processing runs."),
  ocrModelId: z.string().nullable().optional().describe("Specify the OCR model using a friendly name (e.g., 'Flux', 'Spark', 'Zenith'), a provider model ID (e.g., 'google/gemini-3.1-flash-lite-preview'), or a model UUID."),
  jsonSchema: z.union([z.string(), z.record(z.string(), z.any())]).nullable().optional().describe("An optional JSON Schema to enforce custom structured layout or schema extraction during OCR processing.")
});

export const JobSubmissionResponse = z.object({
  jobId: z.uuid().describe("The unique UUID of the newly created OCR job."),
  runId: z.string().describe("The underlying execution run ID of the OCR workflow."),
  pdfUrl: z.url().describe("The verified public or secure storage URL of the processed PDF."),
  status: z.string().describe("The current processing status of the job (typically starting as 'pending')."),
  deduplicated: z.boolean().optional().describe("True if an identical file was already being processed and this request reused that active job.")
});

export const ListJobsParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20).describe("The maximum number of jobs to return in a single page (between 1 and 100)."),
  offset: z.coerce.number().int().min(0).optional().default(0).describe("The number of jobs to skip for paginating through results.")
});

export const JobListItem = z.object({
  id: z.uuid(),
  runId: z.string().nullable(),
  status: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  pdfUrl: z.string(),
  totalPages: z.number().nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const JobListResponse = z.array(JobListItem);

/**
 * Submit OCR Job
 * @description Initiates a new structured document extraction job. Accepts a direct URL or a pre-uploaded storage URL.
 * @body CreateJobRequest
 * @response JobSubmissionResponse
 * @auth ApiKeyAuth
 * @openapi
 */
export async function POST(request: Request): Promise<NextResponse> {
  const authContext = await validateApiKey(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = authContext;

  try {
    const body = await request.json();
    const parsed = CreateJobRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { pdfUrl, filename, fileSize, fileHash, ocrModelId, jsonSchema } = parsed.data;

    let resolvedModelId: string | null = null;
    if (ocrModelId) {
      const model = await resolveModel(ocrModelId);
      if (!model) {
        return NextResponse.json(
          { error: `Invalid OCR model: '${ocrModelId}'. Use a valid model name, ID, or UUID.` },
          { status: 400 }
        );
      }
      resolvedModelId = model.id;
    }

    // Quota validation
    try {
      await checkQuota(userId, resolvedModelId, role);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return NextResponse.json({ error: err.message }, { status: 429 });
      }
      throw err;
    }

    const db = getDb();

    // Deduplication check
    const [activeJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.fileHash, fileHash))
      .limit(1);

    if (activeJob && (activeJob.status === "pending" || activeJob.status === "running")) {
      const reconciledStatus = await reconcileOcrJobStatus(activeJob);
      if (reconciledStatus === "pending" || reconciledStatus === "running") {
        return NextResponse.json({
          jobId: activeJob.id,
          runId: activeJob.workflowRunId ?? "",
          pdfUrl: activeJob.pdfBlobUrl,
          status: reconciledStatus,
          deduplicated: true,
        });
      }
    }

    // Stringify JSON schema if object was passed
    const schemaString =
      jsonSchema && typeof jsonSchema === "object"
        ? JSON.stringify(jsonSchema)
        : jsonSchema;

    const [job] = await db
      .insert(jobs)
      .values({
        filename,
        fileSize,
        fileHash,
        pdfBlobUrl: pdfUrl,
        userId,
        ocrModelId: resolvedModelId,
        jsonSchema: schemaString || null,
        status: "pending",
      })
      .returning({ id: jobs.id });

    // Start Inngest/Workflow run
    const run = await start(ocrWorkflow, [job.id, pdfUrl, userId]);

    await db
      .update(jobs)
      .set({ workflowRunId: run.runId })
      .where(eq(jobs.id, job.id));

    return NextResponse.json({
      jobId: job.id,
      runId: run.runId,
      pdfUrl,
      status: "pending",
    });
  } catch (err) {
    console.error("[jobs v1] POST Exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * List Jobs
 * @description Retrieve a paginated list of recent document extraction jobs submitted by the user.
 * @queryParams ListJobsParams
 * @response JobListResponse
 * @auth ApiKeyAuth
 * @openapi
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authContext = await validateApiKey(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = authContext;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

    const db = getDb();
    const userJobs = await db
      .select({
        id: jobs.id,
        runId: jobs.workflowRunId,
        status: jobs.status,
        filename: jobs.filename,
        fileSize: jobs.fileSize,
        pdfUrl: jobs.pdfBlobUrl,
        totalPages: jobs.totalPages,
        error: jobs.error,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(userJobs);
  } catch (err) {
    console.error("[jobs v1] GET Exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

