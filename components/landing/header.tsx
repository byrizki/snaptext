"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

export function Header() {
  const pathname = usePathname();
  const isDemo = pathname.includes("/demo");
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-20 border-b border-zinc-200/50 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-colors text-foreground">
      <div className="flex h-full items-center justify-between px-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm transition-all">
            <Image src="/logo.svg" alt="SnapText Logo" width={40} height={40} className="size-7 object-contain" />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)] opacity-0 group-hover:opacity-100 group-hover:animate-[scan_1.5s_ease-in-out_infinite]" />
          </div>
          <span className="font-bold text-xl tracking-tight"><span className="text-blue-600 dark:text-blue-500">Snap</span><span className="text-violet-600 dark:text-violet-500">Text</span></span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 bg-zinc-50/80 dark:bg-zinc-900/40 px-6 py-2 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md shadow-sm dark:shadow-none">
          <Link href={isDemo ? "/#features" : "#features"} className="text-[14px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">Features</Link>
          <Link href={isDemo ? "/#faq" : "#faq"} className="text-[14px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">FAQ</Link>
          <Link href="/demo" className={cn(
            "text-[14px] font-medium transition-colors",
            isDemo ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          )}>Demo</Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user ? (
            <Link href="/dashboard" className="text-[14px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors hidden sm:block">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-[14px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors hidden sm:block">
              Sign In
            </Link>
          )}
          <Link href="/demo" className="h-10 px-5 rounded-xl bg-blue-600 dark:bg-blue-500 text-white text-[14px] font-semibold flex items-center justify-center hover:bg-blue-500 dark:hover:bg-blue-400 transition-all shadow-md hover:shadow-lg dark:shadow-[0_0_20px_rgba(59,130,246,0.25)] dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]">
            Get Started
          </Link>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}} />
    </header>
  );
}
