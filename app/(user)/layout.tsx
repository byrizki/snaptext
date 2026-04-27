import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function UserAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-background flex flex-col transition-colors">
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-zinc-200/50 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-6 max-w-[95vw] mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm">
              <Image src="/logo.svg" alt="SnapText Logo" width={32} height={32} className="size-5 object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-blue-600 dark:text-blue-500">Snap</span>
              <span className="text-violet-600 dark:text-violet-500">Text</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center pt-16 px-4">
        {children}
      </main>
    </div>
  );
}
