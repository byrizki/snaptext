/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, ocrModels } from "@/db";
import { getModelId, getProviderPrefixedModelId } from "@/lib/provider-mapping";

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
    const data = await request.json();
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
