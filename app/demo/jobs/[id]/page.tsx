"use client";

import { DemoActiveWorkspace } from "@/components/demo/demo-active-workspace";
import { ScanLoadingSkeleton } from "@/components/scan/scan-loading-skeleton";
import { BackgroundGrid } from "@/components/landing/background-grid";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JobRunPage() {
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
    if (
      runId &&
      runId !== id &&
      (status === "scanning" || status === "completed")
    ) {
      router.push(`/demo/jobs/${runId}`);
    }
  }, [runId, id, status, router]);

  const handleReset = () => {
    router.push("/demo");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <BackgroundGrid />
      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-20 sm:px-6">
        <AnimatePresence mode="wait">
          {status !== "idle" ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex w-full flex-1 flex-col overflow-hidden rounded-[2rem] border bg-card/85 shadow-[0_0_64px_rgba(59,130,246,0.10)]"
            >
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
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden rounded-[2rem] border bg-card/85 shadow-[0_0_64px_rgba(59,130,246,0.10)]"
            >
              <ScanLoadingSkeleton />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

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
