/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, ocrModels } from "@/db";
import { getModelId, getProviderPrefixedModelId } from "@/lib/provider-mapping";

const createModelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.string().min(1, "Provider is required").default("vercel"),
  modelId: z.string().min(1, "Model ID is required"),
  temperature: z.number().min(0).max(2).default(0.3),
  maxOutputTokens: z.number().int().positive().default(4096),
  config: z.record(z.string(), z.unknown()).default({}),
});

export async function GET() {
  const db = getDb();
  const models = await db.query.ocrModels.findMany({
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
  return NextResponse.json(
    models.map((x) => ({ ...x, modelId: getModelId(x.modelId) })),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = createModelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const db = getDb();

    const [model] = await db
      .insert(ocrModels)
      .values({
        name: data.name,
        provider: data.provider,
        modelId: getProviderPrefixedModelId(data.provider, data.modelId),
        temperature: data.temperature,
        maxOutputTokens: data.maxOutputTokens,
        config: data.config,
      })
      .returning();

    return NextResponse.json(model);
  } catch (error: any) {
    console.error("Failed to create model", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
