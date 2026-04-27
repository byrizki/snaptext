"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-52 md:pb-32 px-6 flex flex-col items-center justify-center text-center max-w-5xl mx-auto z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 mb-10 group cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/80 transition-all shadow-sm backdrop-blur-md"
      >
        <span className="flex h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.9)] animate-pulse" />
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors">Experience frictionless parsing</span>
        <svg viewBox="0 0 24 24" fill="none" className="size-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
      
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-5xl sm:text-6xl md:text-[80px] font-extrabold tracking-tight text-foreground mb-8 leading-[1.05]"
      >
        Transform any document into{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500 drop-shadow-sm">
          magic.
        </span>
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-2xl text-lg sm:text-2xl text-zinc-500 dark:text-zinc-400 mb-12 font-medium leading-relaxed"
      >
        Your magic wand for unstructured data. Extract clean JSON, summarize effortlessly, and generate AI-ready context in milliseconds.
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
      >
        <Link href="/demo" className="h-14 w-full sm:w-auto px-10 rounded-2xl bg-blue-600 text-white text-[17px] font-semibold flex items-center justify-center hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 group">
          Try It Now
          <svg viewBox="0 0 24 24" fill="none" className="ml-2 size-5 group-hover:translate-x-1 transition-transform" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </Link>
        <Link href="/dashboard" className="h-14 w-full sm:w-auto px-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-[17px] font-semibold flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
          Get Started
        </Link>
      </motion.div>
    </section>
  );
}
