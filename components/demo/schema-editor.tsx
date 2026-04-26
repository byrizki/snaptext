import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeCircleIcon, Presentation02Icon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";
import { GuiSchemaEditor } from "./gui-schema-editor";

export function SchemaEditor({
  schema,
  onChange,
}: {
  schema: string;
  onChange: (s: string) => void;
}) {
  const [mode, setMode] = useState<"raw" | "gui">("gui");

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Target Output Schema</h4>
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
