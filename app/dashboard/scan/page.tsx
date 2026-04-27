"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DashboardScanPanel } from "@/components/dashboard/dashboard-scan-panel";
import { DemoActiveWorkspace } from "@/components/demo/demo-active-workspace";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";

export default function DashboardScanPage() {
  const router = useRouter();
  const {
    status,
    uploadProgress,
    runId,
    result,
    error,
    currentFile,
    startOcr,
    rerunOcr,
    stopJob,
    reset,
  } = useOcrPipeline();

  const [selectedModelId, setSelectedModelId] = useState<string>("");

  useEffect(() => {
    if (runId && (status === "scanning" || status === "completed")) {
      router.push(`/dashboard/scan/${runId}`);
    }
  }, [runId, status, router]);

  const isActive = status !== "idle";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {!isActive && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <DashboardScanPanel
                selectedModelId={selectedModelId}
                onModelChange={setSelectedModelId}
                onFileSelect={(file, schema) => startOcr(file, selectedModelId, schema)}
              />
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
