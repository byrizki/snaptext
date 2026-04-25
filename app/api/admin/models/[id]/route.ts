/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, ocrModels } from "@/db";
import { getProviderPrefixedModelId } from "@/lib/provider-mapping";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const db = getDb();
    
    const [model] = await db.update(ocrModels).set({
      name: data.name,
      provider: data.provider,
      modelId: getProviderPrefixedModelId(data.provider, data.modelId),
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens,
      config: data.config,
      updatedAt: new Date(),
    }).where(eq(ocrModels.id, id)).returning();
    
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(model);
  } catch (error: any) {
    console.error("Failed to update model", error);
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
