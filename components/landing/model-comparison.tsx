"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, Cancel01Icon, CpuIcon } from "@hugeicons/core-free-icons";

const models = [
  {
    name: "Flux",
    description: "Fast and efficient for clean documents.",
    speed: "Ultra-fast (ms)",
    reasoning: "Basic",
    handwriting: false,
    complexLayouts: "Good",
    bestFor: "Receipts, typed invoices, standard forms.",
    color: "blue"
  },
  {
    name: "Spark",
    description: "Balanced intelligence for complex structures.",
    speed: "Fast (< 2s)",
    reasoning: "Advanced",
    handwriting: "Partial",
    complexLayouts: "Excellent",
    bestFor: "Mixed tables, complex invoices, resumes.",
    color: "violet"
  },
  {
    name: "Zenith",
    description: "Deep reasoning for the hardest extractions.",
    speed: "Moderate (2-5s)",
    reasoning: "State-of-the-art",
    handwriting: true,
    complexLayouts: "Perfect",
    bestFor: "Cursive, historical docs, blurry scans.",
    color: "emerald"
  }
];

export function ModelComparison() {
  return (
    <section id="models" className="w-full py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-sm font-medium shadow-inner mb-6">
            <HugeiconsIcon icon={CpuIcon} className="w-4 h-4" />
            <span>Intelligence Levels</span>
          </div>
          <h2 className="text-4xl md:text-[48px] font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Compare Our Models
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto font-medium">
            Choose the right level of intelligence for your document processing needs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full overflow-x-auto pb-4"
        >
          <div className="min-w-[800px] rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-4 bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/50 dark:border-zinc-700/50">
              <div className="p-6 font-semibold text-zinc-500 dark:text-zinc-400">Feature</div>
              {models.map(model => (
                <div key={model.name} className="p-6 border-l border-zinc-200/50 dark:border-zinc-700/50 text-center">
                  <h3 className={`text-xl font-bold mb-2 ${
                    model.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    model.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
                    'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {model.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{model.description}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 border-b border-zinc-200/30 dark:border-zinc-800/50">
              <div className="p-6 font-medium text-zinc-700 dark:text-zinc-300 flex items-center">Speed</div>
              {models.map(model => (
                <div key={model.name} className="p-6 border-l border-zinc-200/30 dark:border-zinc-800/50 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  {model.speed}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 border-b border-zinc-200/30 dark:border-zinc-800/50">
              <div className="p-6 font-medium text-zinc-700 dark:text-zinc-300 flex items-center">Reasoning Ability</div>
              {models.map(model => (
                <div key={model.name} className="p-6 border-l border-zinc-200/30 dark:border-zinc-800/50 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  {model.reasoning}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 border-b border-zinc-200/30 dark:border-zinc-800/50">
              <div className="p-6 font-medium text-zinc-700 dark:text-zinc-300 flex items-center">Complex Layouts</div>
              {models.map(model => (
                <div key={model.name} className="p-6 border-l border-zinc-200/30 dark:border-zinc-800/50 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  {model.complexLayouts}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 border-b border-zinc-200/30 dark:border-zinc-800/50">
              <div className="p-6 font-medium text-zinc-700 dark:text-zinc-300 flex items-center">Handwriting Support</div>
              {models.map(model => (
                <div key={model.name} className="p-6 border-l border-zinc-200/30 dark:border-zinc-800/50 flex items-center justify-center">
                  {model.handwriting === true ? (
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-6 h-6 text-emerald-500" />
                  ) : model.handwriting === false ? (
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                  ) : (
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{model.handwriting}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 bg-zinc-50/30 dark:bg-zinc-800/20">
              <div className="p-6 font-medium text-zinc-700 dark:text-zinc-300 flex items-center">Best For</div>
              {models.map(model => (
                <div key={model.name} className="p-6 border-l border-zinc-200/30 dark:border-zinc-800/50 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  {model.bestFor}
                </div>
              ))}
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
