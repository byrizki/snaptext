"use client";

import { motion } from "framer-motion";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";

const faqs = [
  {
    question: "How does the per-page pricing work?",
    answer: "You are only charged for the exact number of pages you process. Different models have different per-page rates. There are no monthly subscription fees or minimum commitments."
  },
  {
    question: "Can I use SnapText for handwritten documents?",
    answer: "Yes, our Zenith model is specifically trained to handle complex handwriting, cursive, and historical documents with exceptional accuracy. Flux and Spark are better suited for typed or printed text."
  },
  {
    question: "Is my data secure and private?",
    answer: "Absolutely. We do not use your documents to train our core models unless you explicitly opt-in. Documents are processed securely, encrypted at rest and in transit, and can be automatically deleted after processing based on your retention settings."
  },
  {
    question: "Do you offer an on-premise or self-hosted version?",
    answer: "Yes. For enterprise customers with strict compliance or security requirements, we offer an air-gapped, self-hosted deployment option. Contact our sales team to discuss Enterprise licensing."
  },
  {
    question: "Can I extract specific data into JSON?",
    answer: "Yes! Our OCR models support structured data extraction via JSON schemas. You can define exactly what fields you need, and the model will return perfectly formatted JSON."
  },
  {
    question: "How fast is the processing?",
    answer: "Our Spark model is optimized for high-throughput and returns results in milliseconds. The Zenith model, which performs deep reasoning, may take slightly longer but provides the highest accuracy."
  }
];

export function FAQ() {
  return (
    <section id="faq" className="w-full py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-sm font-medium shadow-inner mb-6">
            <HugeiconsIcon icon={SparklesIcon} className="w-4 h-4" />
            <span>Got questions?</span>
          </div>
          <h2 className="text-4xl md:text-[48px] font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto font-medium">
            Everything you need to know about the product and billing.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full"
        >
          <Accordion className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg border">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-[16px] px-6 py-5 hover:no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
