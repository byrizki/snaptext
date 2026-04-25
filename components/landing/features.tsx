"use client";

import { motion } from "framer-motion";

export function Features() {
  return (
    <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="text-center mb-24"
      >
        <h2 className="text-4xl md:text-[56px] font-extrabold tracking-tight text-foreground mb-6 leading-tight">
          A clean slate for your data.
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xl max-w-2xl mx-auto font-medium">
          Built from the ground up to understand documents frictionlessly, 
          powered by next-generation vision models.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Feature 1: Structured JSON Extraction */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2 rounded-[2.5rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg hover:shadow-xl dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="p-10 md:p-12 relative z-10 flex flex-col h-full">
            <div className="size-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center border border-blue-200 dark:border-blue-500/20 mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <svg viewBox="0 0 24 24" fill="none" className="size-7 text-blue-600 dark:text-blue-500" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Structured JSON</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-10 max-w-lg leading-relaxed font-medium">
              Extract precise data points from unstructured documents. Define your schema, and our engine guarantees output that matches exactly, every time.
            </p>
            <div className="mt-auto relative w-full h-[240px] rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/80 shadow-inner overflow-hidden">
              <div className="absolute inset-0 p-8 font-mono text-[15px] text-blue-600/80 dark:text-blue-300/80 leading-[1.8] overflow-hidden">
                {"{\n"}
                {"  "}<span className="text-zinc-800 dark:text-zinc-50">"invoice"</span>: {"{\n"}
                {"    "}<span className="text-zinc-800 dark:text-zinc-50">"id"</span>: <span className="text-emerald-600 dark:text-emerald-400">"INV-2023-001"</span>,{"\n"}
                {"    "}<span className="text-zinc-800 dark:text-zinc-50">"date"</span>: <span className="text-emerald-600 dark:text-emerald-400">"2023-10-24"</span>,{"\n"}
                {"    "}<span className="text-zinc-800 dark:text-zinc-50">"total"</span>: <span className="text-amber-600 dark:text-amber-400">1250.00</span>,{"\n"}
                {"    "}<span className="text-zinc-800 dark:text-zinc-50">"lineItems"</span>: [{"\n"}
                {"      "}{"{ "}<span className="text-zinc-800 dark:text-zinc-50">"desc"</span>: <span className="text-emerald-600 dark:text-emerald-400">"API Usage"</span>, <span className="text-zinc-800 dark:text-zinc-50">"amount"</span>: <span className="text-amber-600 dark:text-amber-400">1250.00</span> {"}"}{"\n"}
                {"    "}]{"\n"}
                {"  "}{"}"}{"\n"}
                {"}"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature 2: Document Summarization */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-[2.5rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg hover:shadow-xl dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="p-10 md:p-12 relative z-10 flex flex-col h-full">
            <div className="size-14 rounded-2xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center border border-violet-200 dark:border-violet-500/20 mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <svg viewBox="0 0 24 24" fill="none" className="size-7 text-violet-600 dark:text-violet-500" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Summarization</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-10 leading-relaxed font-medium">
              Condense 100-page reports into highly accurate, concise summaries preserving the core context.
            </p>
            <div className="mt-auto relative w-full h-[240px] rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/80 shadow-inner p-8 flex flex-col justify-center gap-4">
              <div className="w-full h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="w-5/6 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="w-full h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="flex items-center justify-center py-4">
                <div className="p-2 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="w-full h-4 bg-violet-200/50 dark:bg-violet-500/30 rounded-full" />
              <div className="w-3/4 h-4 bg-violet-200/50 dark:bg-violet-500/30 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Feature 3: Smart Context Generation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-3 rounded-[2.5rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg hover:shadow-xl dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="p-10 md:p-12 relative z-10 flex flex-col md:flex-row gap-12 items-center h-full">
            <div className="flex-1">
              <div className="size-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20 mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
                <svg viewBox="0 0 24 24" fill="none" className="size-7 text-emerald-600 dark:text-emerald-500" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Smart Context Generation</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-lg leading-relaxed font-medium">
                Convert messy PDFs, images, and raw text into clean, chunked formats specifically optimized for high-performance intelligence and search systems.
              </p>
            </div>
            <div className="flex-1 w-full relative h-[280px] rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/80 shadow-inner p-8 font-mono text-[15px] overflow-hidden">
              <div className="text-zinc-400 dark:text-zinc-500 mb-4"># Generated by <span className="text-blue-600 dark:text-blue-500">Snap</span><span className="text-violet-600 dark:text-violet-500">Text</span></div>
              <div className="text-emerald-600 dark:text-emerald-400 mb-3 font-semibold">## 1. Executive Summary</div>
              <div className="text-zinc-700 dark:text-zinc-300 mb-6 leading-[1.8]">
                The Q3 results demonstrate a <span className="text-zinc-900 dark:text-zinc-50 font-bold bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">24% YoY growth</span> in enterprise segments...
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 mb-3 font-semibold">### 1.1 Key Metrics</div>
              <div className="text-zinc-700 dark:text-zinc-300 leading-[1.8]">
                - ARR: $12.4M<br/>
                - NRR: 114%<br/>
                - Churn: 0.8%
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
