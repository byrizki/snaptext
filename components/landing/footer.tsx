"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isDemo = pathname.includes("/demo");
  const isContact = pathname.includes("/contact");

  return (
    <footer className="border-t border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 relative z-10 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-8 rounded-[0.75rem] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm group">
                <Image src="/logo.svg" alt="SnapText Logo" width={32} height={32} className="size-5 object-contain" />
              </div>
              <span className="font-bold text-lg tracking-tight font-sans"><span className="text-blue-600 dark:text-blue-500">Snap</span><span className="text-violet-600 dark:text-violet-500">Text</span></span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-[15px] max-w-sm leading-relaxed">
              Your magic wand for unstructured data. The ultimate OCR engine built to power the next generation of AI applications.
            </p>
          </div>
          <div>
            <h4 className="text-zinc-900 dark:text-zinc-50 font-semibold mb-5 text-[15px]">Product</h4>
            <ul className="space-y-3 text-[15px] text-zinc-500 dark:text-zinc-400">
              <li><Link href={isDemo || isContact ? "/#features" : "#features"} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link href={isDemo || isContact ? "/#models" : "#models"} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Models</Link></li>
              <li><Link href={isDemo || isContact ? "/#faq" : "#faq"} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-900 dark:text-zinc-50 font-semibold mb-5 text-[15px]">Resources</h4>
            <ul className="space-y-3 text-[15px] text-zinc-500 dark:text-zinc-400">
              <li><Link href="/demo" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Interactive Demo</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact Sales</Link></li>
              <li><Link href="#docs" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Documentation</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-200/50 dark:border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-zinc-500 text-sm">© {new Date().getFullYear()} <span className="font-semibold"><span className="text-blue-600 dark:text-blue-500">Snap</span><span className="text-violet-600 dark:text-violet-500">Text</span></span> Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/privacy-policy" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
