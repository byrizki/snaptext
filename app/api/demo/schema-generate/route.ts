import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { getDb, jobs, adminSettings } from "@/db";
import { eq, count, gte } from "drizzle-orm";
import { createHash } from "crypto";
import { schemaGenWorkflow } from "@/app/workflows/schema-gen";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send a PDF as multipart/form-data field named 'file'." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileHash = createHash("sha256").update(Buffer.from(fileBuffer)).digest("hex");
    const db = getDb();

    // Global daily scan limit checking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [settings] = await db.select().from(adminSettings).limit(1);
    const dailyLimit = settings ? settings.dailyScanLimit : 20;

    const [result] = await db.select({ value: count() }).from(jobs).where(gte(jobs.createdAt, today));
    const currentCount = result ? Number(result.value) : 0;

    if (currentCount >= dailyLimit) {
      return NextResponse.json(
        { error: `Global daily scan limit of ${dailyLimit} reached. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const [activeJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.fileHash, fileHash))
      .limit(1);

    if (activeJob && (activeJob.status === "pending" || activeJob.status === "running")) {
      return NextResponse.json({
        jobId: activeJob.id,
        runId: activeJob.workflowRunId ?? "",
        pdfUrl: activeJob.pdfBlobUrl,
        deduplicated: true,
      });
    }

    let pdfBlobUrl = "";
    if (activeJob) {
      pdfBlobUrl = activeJob.pdfBlobUrl;
    } else {
      const uploadResult = await put(
        `uploads/${fileHash}.pdf`,
        fileBuffer,
        { access: "public", contentType: "application/pdf" }
      );
      pdfBlobUrl = uploadResult.url;
    }

    const [job] = await db
      .insert(jobs)
      .values({
        filename: file.name,
        fileSize: file.size,
        fileHash,
        pdfBlobUrl,
        status: "pending",
      })
      .returning({ id: jobs.id });

    const run = await start(schemaGenWorkflow, [job.id, pdfBlobUrl]);

    await db
      .update(jobs)
      .set({ workflowRunId: run.runId })
      .where(eq(jobs.id, job.id));

    return NextResponse.json({
      jobId: job.id,
      runId: run.runId,
      pdfUrl: pdfBlobUrl,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Schema generation failed:", error);
    return NextResponse.json({ error: error.message || "Schema generation failed." }, { status: 500 });
  }
}
