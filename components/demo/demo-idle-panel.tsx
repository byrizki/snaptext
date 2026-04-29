"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ModelSelector } from "@/components/demo/model-selector";
import { UploadZone } from "@/components/demo/upload-zone";
import { HistoryList } from "@/components/demo/history-list";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, CodeCircleIcon, Presentation02Icon } from "@hugeicons/core-free-icons";
import { SchemaEditor } from "./schema-editor";
import Link from "next/link";

interface DemoIdlePanelProps {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  onFileSelect: (file: File, schema?: string) => void;
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
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [jsonSchema, setJsonSchema] = useState("");
  const [editorMode, setEditorMode] = useState<"raw" | "gui">("gui");
  const [isLoaded, setIsLoaded] = useState(false);
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number; isAnonymous: boolean } | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  useEffect(() => {
    setIsLoadingQuota(true);
    fetch("/api/dashboard/quota")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setQuota(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingQuota(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("snaptext_json_schema");
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJsonSchema(saved);
      setShowAdvanced(true);
    }
    setIsLoaded(true);
  }, []);

  const handleSchemaChange = (newSchema: string) => {
    setJsonSchema(newSchema);
    if (newSchema) {
      localStorage.setItem("snaptext_json_schema", newSchema);
    } else {
      localStorage.removeItem("snaptext_json_schema");
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 md:px-6 py-12 md:py-20 overflow-hidden relative">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[100px] -z-10 mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-[100px] -z-10 mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full flex flex-col items-center gap-12"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-sm font-medium shadow-inner">
            <HugeiconsIcon icon={SparklesIcon} className="w-4 h-4" />
            <span>AI-Powered Document Intelligence</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-md text-center leading-relaxed">
            By uploading files, you agree that logs and documents may be recorded for model evaluation and quality improvement.
          </p>
        </motion.div>

        <motion.div 
          layout
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`w-full relative ${activeTab === 'history' ? 'max-w-5xl' : 'max-w-[85vw]'}`}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'upload' ? (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col lg:flex-row gap-6 w-full items-stretch justify-center"
              >
                {/* Uploader Card */}
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`relative group w-full max-w-2xl mx-auto`}
                >
                  {/* Glowing Border Effect */}
                  <div className="absolute -inset-0.5 rounded-[32px] bg-linear-to-r from-blue-500 via-violet-500 to-emerald-500 blur-lg opacity-20 dark:opacity-40 group-hover:opacity-40 dark:group-hover:opacity-60 transition-opacity duration-700" />
                  
                  <div className="relative h-full flex flex-col rounded-[30px] border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                    {/* Top Toolbar */}
                    <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-black/20 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400/80" />
                          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Use Schema:</span>
                          <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAdvanced ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                            role="switch"
                            aria-checked={showAdvanced}
                            aria-label="Toggle schema editor"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAdvanced ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline-block">Model:</span>
                          <ModelSelector value={selectedModelId} onChange={onModelChange} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
                      <UploadZone 
                        quota={quota}
                        isLoadingQuota={isLoadingQuota}
                        onFileSelect={(file) => onFileSelect(file, showAdvanced ? jsonSchema : undefined)} 
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Schema Editor Card */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="relative group w-full lg:w-1/2 flex flex-col"
                    >
                      {/* Glowing Border Effect for Schema */}
                      <div className="absolute -inset-0.5 rounded-[32px] bg-linear-to-r from-violet-500 via-fuchsia-500 to-pink-500 blur-lg opacity-20 dark:opacity-40 group-hover:opacity-40 dark:group-hover:opacity-60 transition-opacity duration-700" />
                      
                      <div className="relative h-full flex flex-col rounded-[30px] border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                        <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-black/20 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <HugeiconsIcon icon={SparklesIcon} className="w-5 h-5 text-violet-500" />
                            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Output Schema</h3>
                          </div>
                          
                          <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-lg border border-zinc-200/50 dark:border-zinc-700/30">
                            <button
                              onClick={() => setEditorMode("gui")}
                              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${
                                editorMode === "gui"
                                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                              }`}
                            >
                              <HugeiconsIcon icon={Presentation02Icon} size={12} />
                              GUI
                            </button>
                            <button
                              onClick={() => setEditorMode("raw")}
                              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${
                                editorMode === "raw"
                                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                              }`}
                            >
                              <HugeiconsIcon icon={CodeCircleIcon} size={12} />
                              Raw
                            </button>
                          </div>
                        </div>
                        <div className="p-4 sm:p-6 flex-1 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-y-auto">
                          {isLoaded && <SchemaEditor schema={jsonSchema} onChange={handleSchemaChange} mode={editorMode} />}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <div className="relative rounded-[30px] border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 p-4 sm:p-6">
                  <HistoryList onRerun={onRerun} onView={onView} onStop={onStop} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemVariants} className="flex p-1 bg-zinc-100/80 dark:bg-zinc-800/50 backdrop-blur-md rounded-2xl border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`relative px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'upload' 
                ? 'text-zinc-900 dark:text-white shadow-md' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {activeTab === 'upload' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">New Scan</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`relative px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'history' 
                ? 'text-zinc-900 dark:text-white shadow-md' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {activeTab === 'history' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">History</span>
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
