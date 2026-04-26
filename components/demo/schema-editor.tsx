import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeCircleIcon, Presentation02Icon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";
import { GuiSchemaEditor } from "./gui-schema-editor";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

export function SchemaEditor({
  schema,
  onChange,
  mode = "gui",
}: {
  schema: string;
  onChange: (s: string) => void;
  mode?: "raw" | "gui";
}) {
  const { resolvedTheme } = useTheme();

  const handleRawChange = (value: string | undefined) => {
    onChange(value || "");
  };

  return (
    <div className="flex flex-col w-full h-full">
      <AnimatePresence mode="wait">
        {mode === "raw" ? (
          <motion.div
            key="raw"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
          >
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              value={schema}
              onChange={handleRawChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                tabSize: 2,
                wordWrap: "on",
                formatOnPaste: true,
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="gui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <GuiSchemaEditor schema={schema} onChange={onChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
