import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeCircleIcon, Presentation02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";
import { GuiSchemaEditor } from "./gui-schema-editor";
import { toast } from "sonner";

export function SchemaEditor({
  schema,
  onChange,
}: {
  schema: string;
  onChange: (s: string) => void;
}) {
  const [mode, setMode] = useState<"raw" | "gui">("gui");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleGenerateSchema = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported for schema generation.");
      return;
    }

    setIsGenerating(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/demo/schema-generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start schema generation");
      }

      const { runId } = await res.json();

      // Poll for completion
      let attempts = 0;
      while (attempts < 60) { // 60 attempts = ~2-3 mins depending on interval
        await new Promise(resolve => setTimeout(resolve, 2500));
        const statusRes = await fetch(`/api/demo/schema-generate/status/${runId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          let parsedSchema;
          try {
             parsedSchema = JSON.parse(statusData.schema);
          } catch {
             parsedSchema = {};
          }
          onChange(JSON.stringify(parsedSchema, null, 2));
          toast.success("Schema generated successfully!");
          break;
        } else if (statusData.status === "failed" || statusData.status === "cancelled") {
          throw new Error(statusData.error || "Schema generation failed");
        }
        attempts++;
      }

      if (attempts >= 60) throw new Error("Schema generation timed out");

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsGenerating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Target Output Schema</h4>

          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleGenerateSchema}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 dark:text-violet-400 border border-violet-500/20 rounded-md transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="size-3 rounded-full border-[1.5px] border-violet-500 border-t-transparent animate-spin" />
            ) : (
              <HugeiconsIcon icon={SparklesIcon} size={12} />
            )}
            {isGenerating ? "Generating..." : "Auto-Generate"}
          </button>
        </div>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setMode("gui")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              mode === "gui"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <HugeiconsIcon icon={Presentation02Icon} size={14} />
            Intuitive
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              mode === "raw"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <HugeiconsIcon icon={CodeCircleIcon} size={14} />
            Raw JSON
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "raw" ? (
          <motion.div
            key="raw"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <textarea
              className="w-full h-48 p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
              value={schema}
              onChange={handleRawChange}
              placeholder={'{\n  "type": "object",\n  "properties": {\n    "field_name": { "type": "string" }\n  }\n}'}
              spellCheck={false}
            />
          </motion.div>
        ) : (
          <motion.div
            key="gui"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-zinc-50/50 dark:bg-zinc-950/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
          >
            <GuiSchemaEditor schema={schema} onChange={onChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
