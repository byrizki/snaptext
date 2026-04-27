"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-[56px] font-extrabold tracking-tight text-foreground mb-6 leading-tight">
          Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">Touch</span>
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xl max-w-2xl mx-auto font-medium">
          Whether you need a custom enterprise solution, volume pricing, or just have a question, our team is ready to help.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 max-w-5xl mx-auto">
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex flex-col gap-10"
        >
          <div>
            <h3 className="text-2xl font-bold mb-4">Sales & Enterprise</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">
              Interested in deploying SnapText in your own infrastructure? Want to discuss custom models or high-volume SLAs?
            </p>
            <a href="mailto:sales@snaptext.ai" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              sales@snaptext.ai
            </a>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-4">Technical Support</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">
              Need help integrating the API? Running into issues with schema extraction? Our engineering team is here.
            </p>
            <a href="mailto:support@snaptext.ai" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              support@snaptext.ai
            </a>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-4">Headquarters</h3>
            <p className="text-zinc-500 dark:text-zinc-400 flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" className="size-6 shrink-0 mt-0.5 text-zinc-400" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                123 AI Boulevard, Suite 400<br/>
                San Francisco, CA 94107<br/>
                United States
              </span>
            </p>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <div className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-xl p-8 md:p-10">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">First Name</label>
                  <Input placeholder="John" className="h-12 bg-white/50 dark:bg-zinc-950/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Last Name</label>
                  <Input placeholder="Doe" className="h-12 bg-white/50 dark:bg-zinc-950/50" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Work Email</label>
                <Input type="email" placeholder="john@company.com" className="h-12 bg-white/50 dark:bg-zinc-950/50" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Company</label>
                <Input placeholder="Acme Corp" className="h-12 bg-white/50 dark:bg-zinc-950/50" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">How can we help?</label>
                <Textarea
                  placeholder="Tell us about your project, volume, and what models you're interested in..."
                  className="min-h-[120px] bg-white/50 dark:bg-zinc-950/50 resize-y"
                />
              </div>

              <Button className="w-full h-12 text-[15px] font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-lg transition-all" type="button">
                Send Message
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
