import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { head, BlobNotFoundError } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb, jobs } from "@/db";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { validateApiKey } from "@/lib/api-key";
import { resolveModel } from "@/lib/model-resolution";

export const CreateUploadUrlRequest = z.object({
  filename: z.string().describe("Original name of the file to be uploaded"),
  fileSize: z.number().int().positive().max(20 * 1024 * 1024).describe("File size in bytes (max 20MB)"),
  fileHash: z.string().describe("SHA-256 hash of the file payload"),
  ocrModelId: z.string().nullable().optional().describe("OCR Model Name (e.g., 'Flux', 'Spark', 'Zenith'), Model ID (e.g., 'google/gemini-3.1-flash-lite-preview'), or model UUID")
});

export const CreateUploadUrlResponse = z.object({
  token: z.string().optional().describe("Ephemeral client upload token for storage"),
  pathname: z.string().optional().describe("Storage pathname destination"),
  uploadUrl: z.url().optional().describe("Direct storage upload target URL"),
  deduplicated: z.boolean().optional().describe("Indicates if an identical job is already processing"),
  jobId: z.uuid().optional().describe("UUID of the existing job if deduplicated"),
  runId: z.string().optional().describe("Workflow execution run ID if deduplicated"),
  pdfUrl: z.url().optional().describe("Source URL of the existing job if deduplicated")
});

export const maxDuration = 30;

/**
 * Generate Upload Token
 * @description Generates a secure client token to upload PDF binaries directly to secure storage.
 * @body CreateUploadUrlRequest
 * @response CreateUploadUrlResponse
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
    const parsed = CreateUploadUrlRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { filename, fileSize, fileHash, ocrModelId } = parsed.data;

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

    if (fileSize > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds the 20MB limit." },
        { status: 400 }
      );
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

    // Deduplication check
    const db = getDb();
    const [activeJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.fileHash, fileHash))
      .limit(1);

    if (
      activeJob &&
      (activeJob.status === "pending" || activeJob.status === "running")
    ) {
      return NextResponse.json({
        deduplicated: true,
        jobId: activeJob.id,
        runId: activeJob.workflowRunId ?? "",
        pdfUrl: activeJob.pdfBlobUrl,
      });
    }

    const basePathname = `uploads/${fileHash}.pdf`;
    let blobExists = false;

    try {
      await head(basePathname);
      blobExists = true;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        blobExists = false;
      } else {
        console.error("[upload-url v1] head() error:", err);
      }
    }

    const token = await generateClientTokenFromReadWriteToken({
      pathname: basePathname,
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: 20 * 1024 * 1024,
      addRandomSuffix: !blobExists,
      allowOverwrite: blobExists,
      validUntil: Date.now() + 30 * 60 * 1000,
    });

    return NextResponse.json({
      token,
      pathname: basePathname,
      uploadUrl: `https://blob.vercel-storage.com/${basePathname}`,
    });
  } catch (err) {
    console.error("[upload-url v1] Exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
