"use client";

import { ModelSelector } from "@/components/demo/model-selector";
import { UploadZone } from "@/components/demo/upload-zone";
import { HistoryList } from "@/components/demo/history-list";

interface DemoIdlePanelProps {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  onFileSelect: (file: File) => void;
  onRerun: (jobId: string, filename: string) => Promise<void>;
  onView: (jobId: string, filename: string) => Promise<void>;
  onStop: (jobId: string) => Promise<void>;
}

export function DemoIdlePanel({
  selectedModelId,
  onModelChange,
  onFileSelect,
  onRerun,
  onView,
  onStop,
}: DemoIdlePanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center px-4 md:px-6 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 animate-gradient-x">
              Experience the Magic.
            </span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base">
            Upload a PDF to see SnapText extract structured data in real-time.
          </p>
        </div>

        <div className="relative w-full group">
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 blur-sm opacity-20 dark:opacity-30 group-hover:opacity-35 transition-opacity duration-500" />
          <div className="relative rounded-3xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Scan Intelligence
              </span>
              <ModelSelector value={selectedModelId} onChange={onModelChange} />
            </div>
            <div className="p-6">
              <UploadZone onFileSelect={onFileSelect} />
            </div>
          </div>
        </div>

        <div className="w-full">
          <HistoryList onRerun={onRerun} onView={onView} onStop={onStop} />
        </div>
      </div>
    </div>
  );
}
