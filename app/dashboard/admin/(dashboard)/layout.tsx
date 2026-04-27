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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard/admin", icon: Home01Icon, label: "Overview" },
    { href: "/dashboard/admin/models", icon: AiBrain01Icon, label: "OCR Models" },
    { href: "/dashboard/admin/jobs", icon: Database01Icon, label: "Job History" },
    { href: "/dashboard/admin/settings", icon: Settings02Icon, label: "Settings" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-[80vw] mx-auto">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 sticky top-24">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard/admin" && pathname?.startsWith(item.href));
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap
                  ${isActive 
                    ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                  }
                `}
              >
                <HugeiconsIcon icon={item.icon} size={20} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
