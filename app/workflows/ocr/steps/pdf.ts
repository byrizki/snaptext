/* eslint-disable @typescript-eslint/no-explicit-any */
import { put } from "@vercel/blob";
import { definePDFJSModule, getDocumentProxy } from "unpdf";
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
          .map((b: number) => b.toString(16).padStart(2, "0"))
          .join("");
      };
    }

    if (!(Promise as any).withResolvers) {
      (Promise as any).withResolvers = function <T>() {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
    }

    if (!(Map.prototype as any).getOrInsertComputed) {
      (Map.prototype as any).getOrInsertComputed = function <K, V>(
        key: K,
        callbackFn: (key: K) => V
      ): V {
        if (!this.has(key)) {
          this.set(key, callbackFn(key));
        }
        return this.get(key);
      };
    }

    await definePDFJSModule(() => import("pdfjs-dist"));

    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();
    const pdfData = new Uint8Array(pdfBuffer.slice(0));

    const pdf = await getDocumentProxy(pdfData, {
      verbosity: 0,
    });

    const totalPages = pdf.numPages;
    const pages: Array<{ pageNumber: number; pageBlobUrl: string }> = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const rawImageBuffer = await renderPdfPageWithForms(pdf, pageNumber, 2.0);

      const imageBuffer = await grayscaleImage(Buffer.from(rawImageBuffer));

      const blobKey = fileHash
        ? `pages/${String(pageNumber).padStart(3, "0")}-${fileHash}.png`
        : `pages/${String(pageNumber).padStart(3, "0")}-${Date.now()}.png`;

      const { url: pageBlobUrl } = await put(
        blobKey,
        imageBuffer,
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 0,
          contentType: "image/png",
        },
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



async function renderPdfPageWithForms(
  pdf: Awaited<ReturnType<typeof getDocumentProxy>>,
  pageNumber: number,
  scale: number
): Promise<Buffer> {
  const [{ createCanvas, DOMMatrix, ImageData, Path2D }, { AnnotationMode }] = await Promise.all([
    import("@napi-rs/canvas"),
    import("pdfjs-dist"),
  ]);

  Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const canvasContext = canvas.getContext("2d");

  await page.render({
    canvas: canvas as any,
    canvasContext: canvasContext as any,
    viewport,
    intent: "print",
    annotationMode: AnnotationMode.ENABLE_STORAGE,
  }).promise;

  return Buffer.from(await canvas.encode("png"));
}
