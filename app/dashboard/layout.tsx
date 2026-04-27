import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/dashboard/user-nav";
import { AdminNav } from "@/components/dashboard/admin-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-background transition-colors">
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-zinc-200/50 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-colors">
        <div className="flex h-full items-center justify-between px-6 max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm transition-all">
              <Image src="/logo.svg" alt="SnapText Logo" width={32} height={32} className="size-5 object-contain" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)] opacity-0 group-hover:opacity-100 group-hover:animate-[scan_1.5s_ease-in-out_infinite]" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-blue-600 dark:text-blue-500">Snap</span>
              <span className="text-violet-600 dark:text-violet-500">Text</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="text-zinc-900 dark:text-zinc-50 font-semibold"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/scan"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            >
              New Scan
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <AdminNav />
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }` }} />
      </header>

      <main className="pt-16 min-h-screen">
        <div className="w-full mx-auto px-6 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
