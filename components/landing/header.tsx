"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Models", href: "#models" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isHome = pathname === "/";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card ring-1 ring-border">
            <Image src="/logo.svg" alt="SnapText logo" width={28} height={28} className="size-6" />
          </span>
          <span className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">SnapText</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-muted/80 p-1 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={isHome ? item.href : `/${item.href}`}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={session?.user ? "/dashboard" : "/login"}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            {session?.user ? "Dashboard" : "Sign in"}
          </Link>
          <Link
            href="/demo"
            className={cn(
              buttonVariants({ size: "lg", className: "h-10 px-4" }),
              pathname.startsWith("/demo") && "bg-primary/90"
            )}
          >
            Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
