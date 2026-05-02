"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BackgroundGrid } from "@/components/landing/background-grid";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { DemoIdlePanel } from "@/components/demo/demo-idle-panel";
import { DemoActiveWorkspace } from "@/components/demo/demo-active-workspace";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";

export default function DemoPage() {
  const router = useRouter();
  const {
    status,
    uploadProgress,
    uploadPhase,
    runId,
    result,
    error,
    currentFile,
    startOcr,
    rerunOcr,
    stopJob,
    reset,
  } = useOcrPipeline();

  useEffect(() => {
    if (runId && (status === "scanning" || status === "completed")) {
      router.push(`/demo/jobs/${runId}`);
    }
  }, [runId, status, router]);

  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const isActive = status !== "idle";

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-background text-foreground flex flex-col">
      <BackgroundGrid />
      <Header />

      <main className="relative z-10 flex-1 flex flex-col pt-20">
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <DemoIdlePanel
                selectedModelId={selectedModelId}
                onModelChange={setSelectedModelId}
                onFileSelect={(file, schema) => startOcr(file, selectedModelId, schema)}
                onRerun={rerunOcr}
                onView={async (jobId) => router.push(`/demo/jobs/${jobId}`)}
                onStop={stopJob}
              />
              <Footer />
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
              <DemoActiveWorkspace
                status={status}
                uploadProgress={uploadProgress}
                uploadPhase={uploadPhase}
                runId={runId}
                result={result}
                error={error}
                currentFile={currentFile}
                onReset={reset}
                onStop={() => runId && stopJob(runId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
