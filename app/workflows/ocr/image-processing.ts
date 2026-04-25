import sharp from "sharp";

/**
 * Converts an image to grayscale and returns the processed PNG as a Buffer.
 *
 * Accepts either:
 * - A URL string (fetches the image first)
 * - A raw Buffer (processes directly — used when the image is already in memory)
 *
 * Grayscaling reduces colour noise and improves contrast for text-heavy documents,
 * which meaningfully boosts OCR accuracy on vision models.
 */
export async function grayscaleImage(input: string | Buffer): Promise<Buffer> {
  let inputBuffer: Buffer;

  if (typeof input === "string") {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image for pre-processing: ${response.status} ${response.statusText}`,
      );
    }
    inputBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    inputBuffer = input;
  }

  return sharp(inputBuffer)
    .grayscale()
    .png({ compressionLevel: 6 })
    .toBuffer();
}
