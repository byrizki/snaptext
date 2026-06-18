"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/scan", label: "Scan" },
  { href: "/dashboard/developer", label: "API" },
];

export function DashboardPrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-2xl border bg-card/80 p-1 text-sm shadow-sm">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-xl px-3 py-2 font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
