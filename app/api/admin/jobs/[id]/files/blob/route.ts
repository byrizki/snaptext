import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getDb, jobPages, jobs } from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = getDb();

    const [job] = await db
      .select({ id: jobs.id, pdfBlobUrl: jobs.pdfBlobUrl })
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const pages = await db
      .select({ pageBlobUrl: jobPages.pageBlobUrl })
      .from(jobPages)
      .where(eq(jobPages.jobId, id));

    const pageBlobUrls = pages
      .map((page) => page.pageBlobUrl)
      .filter((url): url is string => Boolean(url));
    const pdfBlobUrl = isVercelBlobUrl(job.pdfBlobUrl) ? job.pdfBlobUrl : null;
    const blobUrls = Array.from(new Set([pdfBlobUrl, ...pageBlobUrls].filter(Boolean)));

    if (blobUrls.length === 0) {
      return NextResponse.json({
        deleted: 0,
        skippedExternalPdf: Boolean(job.pdfBlobUrl && !pdfBlobUrl),
        clearedJobRecords: 0,
        clearedPageRecords: 0,
        reason: "No stored file URLs",
      });
    }

    const [matchingJobs, matchingPages] = await Promise.all([
      pdfBlobUrl
        ? db.select({ id: jobs.id }).from(jobs).where(eq(jobs.pdfBlobUrl, pdfBlobUrl))
        : Promise.resolve([]),
      pageBlobUrls.length > 0
        ? db.select({ id: jobPages.id }).from(jobPages).where(inArray(jobPages.pageBlobUrl, pageBlobUrls))
        : Promise.resolve([]),
    ]);

    await del(blobUrls);

    if (pdfBlobUrl) {
      await db
        .update(jobs)
        .set({ pdfBlobUrl: "", updatedAt: new Date() })
        .where(eq(jobs.pdfBlobUrl, pdfBlobUrl));
    }

    if (pageBlobUrls.length > 0) {
      await db
        .update(jobPages)
        .set({ pageBlobUrl: null })
        .where(inArray(jobPages.pageBlobUrl, pageBlobUrls));
    }

    return NextResponse.json({
      deleted: blobUrls.length,
      skippedExternalPdf: Boolean(job.pdfBlobUrl && !pdfBlobUrl),
      clearedJobRecords: matchingJobs.length,
      clearedPageRecords: matchingPages.length,
    });
  } catch (error) {
    console.error("Failed to delete stored job files", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isVercelBlobUrl(url: string | null): url is string {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname;
    return hostname === "blob.vercel-storage.com" || hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
