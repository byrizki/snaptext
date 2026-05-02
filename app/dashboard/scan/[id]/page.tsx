"use client";

import { DemoActiveWorkspace } from "@/components/demo/demo-active-workspace";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";
import { AnimatePresence, motion } from "framer-motion";
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
    // If a new job is started from here, redirect to the new job's page
    if (
      runId &&
      runId !== id &&
      (status === "scanning" || status === "completed")
    ) {
      router.push(`/dashboard/scan/${runId}`);
    }
  }, [runId, id, status, router]);

  const handleReset = () => {
    router.push("/dashboard/scan");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {status !== "idle" && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-xl overflow-hidden relative">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes scan-laser {
            0% { top: 0; }
            100% { top: 100%; }
          }
          .animate-scan-laser {
            animation: scan-laser 1.8s ease-in-out infinite alternate;
          }
          @keyframes gradient-x {
            0%, 100% { background-size: 200% 200%; background-position: left center; }
            50% { background-size: 200% 200%; background-position: right center; }
          }
          .animate-gradient-x { animation: gradient-x 6s ease infinite; }
        `,
        }}
      />
    </div>
  );
}
