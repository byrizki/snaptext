"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="size-5 text-blue-500 shrink-0" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="text-center mb-24"
      >
        <h2 className="text-4xl md:text-[56px] font-extrabold tracking-tight text-foreground mb-6 leading-tight">
          Pay only for what you process.
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xl max-w-2xl mx-auto font-medium">
          No monthly subscriptions. Simple, transparent pricing per page based on the intelligence model you choose.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Flux Model */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg p-8 md:p-10 flex flex-col hover:shadow-xl dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
          <div className="mb-8">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Flux</h3>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Fast and efficient for clean documents.</p>
          </div>
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">$0.005</span>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">/ page</span>
            </div>
          </div>
          <div className="space-y-4 mb-10 flex-1">
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Standard JSON Schema extraction</span></div>
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">High speed processing</span></div>
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Best for invoices & receipts</span></div>
          </div>
          <Link href="/signup" className="w-full h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-900 dark:text-zinc-50 text-[15px] font-semibold flex items-center justify-center transition-all shadow-sm">
            Start Building
          </Link>
        </motion.div>

        {/* Spark Model (Recommended) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-[2rem] border-2 border-blue-500 dark:border-blue-500/80 bg-white dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl dark:shadow-[0_0_40px_rgba(59,130,246,0.15)] p-8 md:p-10 flex flex-col relative"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md">
              Most Popular
            </div>
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">Spark</h3>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Advanced reasoning for complex layouts.</p>
          </div>
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">$0.015</span>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">/ page</span>
            </div>
          </div>
          <div className="space-y-4 mb-10 flex-1">
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Complex nested schemas</span></div>
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Multi-column layout understanding</span></div>
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Best for forms & contracts</span></div>
          </div>
          <Link href="/signup" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[15px] font-semibold flex items-center justify-center transition-all shadow-md hover:shadow-lg">
            Start Building
          </Link>
        </motion.div>

        {/* Zenith Model */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg p-8 md:p-10 flex flex-col hover:shadow-xl dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
          <div className="mb-8">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Zenith</h3>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Maximum intelligence for the toughest tasks.</p>
          </div>
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">$0.050</span>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">/ page</span>
            </div>
          </div>
          <div className="space-y-4 mb-10 flex-1">
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Unmatched accuracy</span></div>
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Handwriting & poor quality scans</span></div>
            <div className="flex gap-3"><CheckIcon /><span className="text-zinc-600 dark:text-zinc-300 font-medium">Deep reasoning capabilities</span></div>
          </div>
          <Link href="/signup" className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-[15px] font-semibold flex items-center justify-center transition-all shadow-md hover:shadow-lg">
            Start Building
          </Link>
        </motion.div>

      </div>

      {/* Enterprise / Self Hosting Banner */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-16 w-full max-w-4xl mx-auto rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8"
      >
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Enterprise & Self Hosting</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-[15px]">
            Deploy SnapText securely within your own air-gapped infrastructure. Get unlimited custom models, full data privacy, and a dedicated support SLA.
          </p>
        </div>
        <div className="flex-shrink-0 w-full md:w-auto">
          <Link href="/contact" className="w-full md:w-auto px-8 h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-900 dark:text-zinc-50 text-[15px] font-semibold flex items-center justify-center transition-all shadow-sm">
            Contact Sales
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
