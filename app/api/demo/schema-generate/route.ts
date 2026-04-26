import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";

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

    // Use Gemini 1.5 Flash natively since it supports PDFs
    const model = google("gemini-1.5-flash");


    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      system: `Analyze the provided document and determine all the structured data points it contains.
Create a comprehensive JSON Schema (draft-07) representing the document's structure.
- Extract scalars like dates, names, totals.
- Extract nested objects for things like vendor details.
- Extract arrays of objects for line items.
Do not invent fields that do not exist in the document. Do not include $schema.
Ensure the returned object strictly follows JSON Schema structure.`,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Generate a JSON schema for this document." },
            { type: "file", data: fileBuffer, mimeType: "application/pdf" } as never
          ]
        }
      ],
      schema: z.object({
        type: z.literal("object"),

        properties: z.record(z.string(), z.any()),
        required: z.array(z.string()).optional()
      }),
    });

    return NextResponse.json({ schema: object });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Schema generation failed:", error);
    return NextResponse.json({ error: error.message || "Schema generation failed." }, { status: 500 });
  }
}
