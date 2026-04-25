import { put } from "@vercel/blob";
import {
  definePDFJSModule,
  getDocumentProxy,
  renderPageAsImage,
} from "unpdf";
import { grayscaleImage } from "../image-processing";

export async function extractPdfPageImages(
  pdfUrl: string,
  jobId: string,
  fileHash: string | null
): Promise<Array<{ pageNumber: number; pageBlobUrl: string }>> {
  "use step";
  try {
    console.log(
      `[Step] extractPdfPageImages started for jobId: ${jobId} (PDF: ${pdfUrl})`
    );
    if (!(Uint8Array.prototype as any).toHex) {
      (Uint8Array.prototype as any).toHex = function () {
        return Array.from(this as Uint8Array)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      };
    }

    await definePDFJSModule(() => import("pdfjs-dist/legacy/build/pdf.mjs"));

    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();
    const pdfData = new Uint8Array(pdfBuffer.slice(0));

    const pdf = await getDocumentProxy(pdfData, {
      disableWorker: true,
      verbosity: 0,
    } as any);

    const totalPages = pdf.numPages;
    const pages: Array<{ pageNumber: number; pageBlobUrl: string }> = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const rawImageBuffer = await renderPageAsImage(pdf, pageNumber, {
        canvasImport: () => import("@napi-rs/canvas"),
        scale: 2.0,
      });

      const imageBuffer = await grayscaleImage(Buffer.from(rawImageBuffer));

      const blobKey = fileHash
        ? `pages/${String(pageNumber).padStart(3, "0")}-${fileHash}.png`
        : `pages/${String(pageNumber).padStart(3, "0")}-${Date.now()}.png`;

      const { url: pageBlobUrl } = await put(
        blobKey,
        imageBuffer,
        { access: "public", contentType: "image/png" },
      );

      pages.push({ pageNumber, pageBlobUrl });
    }

    console.log(`[Step] extractPdfPageImages finished extracting ${pages.length} pages for jobId: ${jobId}`);
    return pages;
  } catch (error) {
    console.error("🔥 Error in extractPdfPageImages step:", error);
    throw error;
  }
}
