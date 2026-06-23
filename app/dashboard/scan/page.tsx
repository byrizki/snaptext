"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardScanPanel } from "@/components/dashboard/dashboard-scan-panel";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";

export default function DashboardScanPage() {
  const router = useRouter();
  const { status, runId, startOcr, uploadProgress, uploadPhase } = useOcrPipeline();
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  useEffect(() => {
    if (runId && (status === "scanning" || status === "completed")) {
      router.push(`/dashboard/scan/${runId}`);
    }
  }, [runId, status, router]);

  return (
    <DashboardPageShell
      eyebrow="New scan"
      title="Upload a document"
      description="Choose a model, add an optional schema, and start extraction from one mobile-friendly workspace."
    >
      <DashboardScanPanel
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        onFileSelect={(file, schema) => startOcr(file, selectedModelId, schema)}
        status={status}
        uploadProgress={uploadProgress}
        uploadPhase={uploadPhase}
      />
    </DashboardPageShell>
  );
}
