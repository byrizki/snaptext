/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, ocrModels } from "@/db";
import { getProviderPrefixedModelId } from "@/lib/provider-mapping";
import { ocrModelSchema } from "@/lib/validations";
import { z } from "zod";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rawData = await request.json();
    const data = ocrModelSchema.parse(rawData);
    const db = getDb();
    
    const [model] = await db.update(ocrModels).set({
      name: data.name,
      provider: data.provider,
      modelId: getProviderPrefixedModelId(data.provider, data.modelId),
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens,
      priority: data.priority ?? 1,
      config: data.config,
      inputPrice: data.inputPrice ?? 0,
      outputPrice: data.outputPrice ?? 0,
      isEnabled: data.isEnabled ?? true,
      updatedAt: new Date(),
    }).where(eq(ocrModels.id, id)).returning();
    
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(model);
  } catch (error: any) {
    console.error("Failed to update model", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    
    const [deleted] = await db.delete(ocrModels).where(eq(ocrModels.id, id)).returning();
    
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete model", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
