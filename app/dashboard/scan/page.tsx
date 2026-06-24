"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardScanPanel } from "@/components/dashboard/dashboard-scan-panel";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";
import { useState } from "react";

export default function DashboardScanPage() {
  const router = useRouter();
  const {
    status,
    runId,
    uploadFile,
    submitScan,
    uploadProgress,
    uploadPhase,
    uploadedFileData,
    currentFile,
    reset,
  } = useOcrPipeline();
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  useEffect(() => {
    if (runId) {
      router.push(`/dashboard/scan/${runId}`);
    }
  }, [runId, router]);

  const handleFileSelect = (file: File) => {
    if (!file) {
      reset();
      return;
    }
    void uploadFile(file);
  };

  const handleStartScan = (schema?: string) => {
    void submitScan(selectedModelId || undefined, schema || undefined);
  };

  return (
    <DashboardPageShell
      eyebrow="New scan"
      title="Upload a document"
      description="Choose a model, add an optional schema, and start extraction from one mobile-friendly workspace."
    >
      <DashboardScanPanel
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        onFileSelect={handleFileSelect}
        onStartScan={handleStartScan}
        status={status}
        uploadProgress={uploadProgress}
        uploadPhase={uploadPhase}
        uploadedFileData={uploadedFileData}
        currentFile={currentFile}
      />
    </DashboardPageShell>
  );
}
