import { NextResponse } from "next/server";
import { start } from "workflow/api";

import { getDb, jobs } from "@/db";
import { eq } from "drizzle-orm";
import { ocrWorkflow } from "@/app/workflows/ocr";
import { auth } from "@/lib/auth";
import { reconcileOcrJobStatus } from "@/lib/ocr-job-status";
import { headers } from "next/headers";

export const maxDuration = 60;

/**
 * Create an OCR job after the client has uploaded the PDF directly to
 * Vercel Blob Storage.
 *
 * Request body (JSON):
 *   - pdfUrl:       string        – public blob URL returned after client upload
 *   - filename:     string        – original filename
 *   - fileSize:     number        – size in bytes
 *   - fileHash:     string        – SHA-256 hex (client-computed)
 *   - ocrModelId?:  string | null
 *   - jsonSchema?:  string | null
 */
export async function POST(request: Request): Promise<NextResponse> {
	const body = await request.json();
	const { pdfUrl, filename, fileSize, fileHash, ocrModelId, jsonSchema } =
		body as {
			pdfUrl?: string;
			filename?: string;
			fileSize?: number;
			fileHash?: string;
			ocrModelId?: string | null;
			jsonSchema?: string | null;
		};

	if (!pdfUrl || !filename || !fileSize || !fileHash) {
		return NextResponse.json(
			{
				error: "Missing required fields: pdfUrl, filename, fileSize, fileHash",
			},
			{ status: 400 },
		);
	}

	const session = await auth.api.getSession({ headers: await headers() });
	const userId = session?.user?.id ?? null;

	const db = getDb();

	// Dedup: file already has an active job
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
				deduplicated: true,
			});
		}
	}

	// Reuse existing blob URL for previously-uploaded identical files
	const pdfBlobUrl = activeJob?.pdfBlobUrl ?? pdfUrl;

	const [job] = await db
		.insert(jobs)
		.values({
			filename,
			fileSize,
			fileHash,
			pdfBlobUrl,
			userId,
			ocrModelId: ocrModelId || null,
			jsonSchema: jsonSchema || null,
			status: "pending",
		})
		.returning({ id: jobs.id });

	const run = await start(ocrWorkflow, [job.id, pdfBlobUrl, userId]);

	await db
		.update(jobs)
		.set({ workflowRunId: run.runId })
		.where(eq(jobs.id, job.id));

	return NextResponse.json({
		jobId: job.id,
		runId: run.runId,
		pdfUrl: pdfBlobUrl,
	});
}
