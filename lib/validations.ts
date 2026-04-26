import { z } from "zod";

export const ocrModelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.string().min(1, "Provider is required"),
  modelId: z.string().min(1, "Model ID is required"),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  maxOutputTokens: z.number().int().min(1).optional().default(4096),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

export type OcrModelPayload = z.infer<typeof ocrModelSchema>;
