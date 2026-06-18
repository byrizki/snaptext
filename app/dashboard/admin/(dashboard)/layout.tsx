"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Settings02Icon, 
  Database01Icon, 
  AiBrain01Icon, 
  Home01Icon
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard/admin", icon: Home01Icon, label: "Overview" },
    { href: "/dashboard/admin/models", icon: AiBrain01Icon, label: "OCR Models" },
    { href: "/dashboard/admin/jobs", icon: Database01Icon, label: "Job History" },
    { href: "/dashboard/admin/settings", icon: Settings02Icon, label: "Settings" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:flex-row lg:gap-6">
      <aside className="w-full shrink-0 lg:w-64">
        <nav className="sticky top-24 flex gap-2 overflow-x-auto rounded-3xl border bg-card p-2 shadow-sm lg:flex-col">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground",
                  isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <HugeiconsIcon icon={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
