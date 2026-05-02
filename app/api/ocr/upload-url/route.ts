import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { head, BlobNotFoundError } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { getDb, jobs } from "@/db";
import { checkQuota, QuotaExceededError } from "@/lib/quota";
import { auth } from "@/lib/auth";

export const maxDuration = 30;

/**
 * Generate a client token that allows the browser to upload a PDF directly
 * to Vercel Blob Storage without proxying through the server.
 *
 * Naming strategy:
 *   - Blob with this hash already exists → overwrite (fixed pathname)
 *   - New unique upload → add random suffix to avoid path collisions
 *
 * Request body (JSON):
 *   - filename:     string          – original PDF filename
 *   - fileSize:     number          – file size in bytes
 *   - fileHash:     string          – SHA-256 hex digest (computed client-side)
 *   - ocrModelId?:  string | null   – optional OCR model UUID
 *
 * Response:
 *   - token:    string  – ephemeral client token (30 min validity)
 *   - pathname: string  – blob pathname the token authorizes
 *
 * Errors:
 *   400 – missing/invalid fields
 *   409 – identical file already being processed (no upload needed)
 *   429 – quota exceeded
 */
export async function POST(request: Request): Promise<NextResponse> {
	const body = await request.json();
	const { filename, fileSize, fileHash, ocrModelId } = body as {
		filename?: string;
		fileSize?: number;
		fileHash?: string;
		ocrModelId?: string | null;
	};

	if (!filename || !fileSize || !fileHash) {
		return NextResponse.json(
			{ error: "Missing required fields: filename, fileSize, fileHash" },
			{ status: 400 },
		);
	}

	if (fileSize > 20 * 1024 * 1024) {
		return NextResponse.json(
			{ error: "File size exceeds the 20MB limit." },
			{ status: 400 },
		);
	}

	const session = await auth.api.getSession({ headers: await headers() });
	const userId = session?.user?.id ?? null;
	const userRole = session?.user?.role ?? null;

	// Reserve a quota slot up-front so the main POST /api/ocr can skip check
	try {
		await checkQuota(userId, ocrModelId, userRole);
	} catch (err) {
		if (err instanceof QuotaExceededError) {
			return NextResponse.json({ error: err.message }, { status: 429 });
		}
		throw err;
	}

	// Dedup check: if an identical file has an active job, tell the client
	// to skip the upload entirely and just use the existing job info.
	if (fileHash) {
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
	}

	// Determine naming strategy based on whether this hash already exists in blob.
	// If blob exists → overwrite same pathname (no garbage accumulation).
	// If new → random suffix to avoid collisions with unrelated uploads.
	const basePathname = `uploads/${fileHash}.pdf`;
	let blobExists = false;

	try {
		await head(basePathname);
		blobExists = true;
	} catch (err) {
		if (err instanceof BlobNotFoundError) {
			blobExists = false;
		} else {
			// Unexpected error — log but default to new-upload behaviour
			console.error("[upload-url] head() error:", err);
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

	// The pathname the token actually authorises — when addRandomSuffix=true
	// the SDK appends a suffix, but the returned pathname doesn't reflect
	// that; the client learns the final URL from the put() result.
	return NextResponse.json({
		token,
		pathname: basePathname,
	});
}
