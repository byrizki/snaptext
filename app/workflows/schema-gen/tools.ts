import { z } from "zod";

export function buildSchemaTools(
  getPageImage: (pageNumber: number) => string | undefined,
  onUpdateSchema: (schema: string) => void,
  onFinishSchema: (schema: string) => void
) {
  return {
    read_page: {
      description: "Load and view the image of a specific page number.",
      inputSchema: z.object({
        pageNumber: z.number().describe("The page number to read, starting from 1."),
      }),
      execute: async (args: { pageNumber: number }) => {
        const url = getPageImage(args.pageNumber);
        if (!url) return { error: `Page ${args.pageNumber} not found or out of bounds.` };

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to fetch image");
          const arrBuffer = await res.arrayBuffer();
          const base64 = Buffer.from(arrBuffer).toString("base64");
          return { image: `data:image/png;base64,${base64}` };
        } catch (_e) {
          return { error: `Failed to load image from URL for page ${args.pageNumber}` };
        }
      },
    },
    update_schema: {
      description: "Save the current draft of the JSON schema string.",
      inputSchema: z.object({
        schema_string: z.string().describe("The JSON Schema string."),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async ({ schema_string }: any) => {
        onUpdateSchema(schema_string);
        return "Schema draft updated.";
      },
    },
    finish_schema: {
      description: "Finalize the schema generation and end the process.",
      inputSchema: z.object({
        final_schema_string: z.string().describe("The final JSON Schema string."),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async ({ final_schema_string }: any) => {
        onFinishSchema(final_schema_string);
        return "Schema finalized.";
      },
    },
  };
}
