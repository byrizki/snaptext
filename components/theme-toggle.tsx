"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {Moon, Sun} from '@hugeicons/core-free-icons';
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center opacity-0">
        <div className="h-5 w-5" />
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-10 w-10 rounded-xl bg-zinc-900/50 dark:bg-zinc-900/50 light:bg-zinc-100 border border-zinc-800 dark:border-zinc-800 light:border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-50 dark:hover:text-zinc-50 light:hover:text-zinc-900 transition-colors shadow-sm"
      aria-label="Toggle theme"
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            scale: theme === "dark" ? 0 : 1,
            rotate: theme === "dark" ? 90 : 0,
            opacity: theme === "dark" ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <HugeiconsIcon icon={Sun} className="h-5 w-5" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            scale: theme === "dark" ? 1 : 0,
            rotate: theme === "dark" ? 0 : -90,
            opacity: theme === "dark" ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <HugeiconsIcon icon={Moon} className="h-5 w-5" />
        </motion.div>
      </div>
    </motion.button>
  );
}
