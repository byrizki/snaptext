import { z } from "zod";

export const ocrModelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.string().min(1, "Provider is required"),
  modelId: z.string().min(1, "Model ID is required"),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  maxOutputTokens: z.number().int().min(1).optional().default(4096),
  priority: z.number().int().min(1).optional().default(1),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  inputPrice: z.number().min(0).optional().default(0),
  outputPrice: z.number().min(0).optional().default(0),
  isEnabled: z.boolean().optional().default(true),
});

export type OcrModelPayload = z.infer<typeof ocrModelSchema>;
