import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function UserAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 size-96 rounded-full bg-accent/15 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card ring-1 ring-border">
              <Image src="/logo.svg" alt="SnapText logo" width={28} height={28} className="size-6" />
            </span>
            <span className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">SnapText</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-24 sm:px-6">
        {children}
      </main>
    </div>
  );
}
