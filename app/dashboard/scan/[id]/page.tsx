"use client";

import { DemoActiveWorkspace } from "@/components/demo/demo-active-workspace";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ScanLoadingSkeleton } from "@/components/scan/scan-loading-skeleton";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardJobRunPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    status,
    uploadProgress,
    uploadPhase,
    runId,
    result,
    error,
    currentFile,
    viewJob,
    stopJob,
  } = useOcrPipeline();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (id && !initialized) {
      setInitialized(true);
      viewJob(id, "document.pdf").catch(console.error);
    }
  }, [id, initialized, viewJob]);

  useEffect(() => {
    if (runId && runId !== id && (status === "scanning" || status === "completed")) {
      router.push(`/dashboard/scan/${runId}`);
    }
  }, [runId, id, status, router]);

  const handleReset = () => {
    router.push("/dashboard/scan");
  };

  return (
    <div className="mx-auto flex w-full max-w-[96vw] min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] lg:min-h-[640px]">
      <DashboardCard className="flex min-h-0 w-full overflow-hidden">
        {status !== "idle" ? (
          <DemoActiveWorkspace
            status={status}
            uploadProgress={uploadProgress}
            uploadPhase={uploadPhase}
            runId={runId || id}
            result={result}
            error={error}
            currentFile={currentFile}
            onReset={handleReset}
            onStop={status === "scanning" ? () => {
              const jobId = runId || id;
              if (jobId) stopJob(jobId);
            } : undefined}
          />
        ) : (
          <ScanLoadingSkeleton />
        )}
      </DashboardCard>
    </div>
  );
}
