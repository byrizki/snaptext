"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Settings02Icon, 
  Database01Icon, 
  AiBrain01Icon, 
  Activity01Icon,
  Menu01Icon,
  Cancel01Icon,
  Logout01Icon,
  Home01Icon
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/admin/login";
  };

  const navItems = [
    { href: "/admin", icon: Home01Icon, label: "Overview" },
    { href: "/admin/models", icon: AiBrain01Icon, label: "OCR Models" },
    { href: "/admin/jobs", icon: Database01Icon, label: "Job History" },
    { href: "/admin/settings", icon: Settings02Icon, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-xl">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="size-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-sm transition-all">
            <Image src="/logo.svg" alt="SnapText Logo" width={32} height={32} className="size-5 object-contain" />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)] opacity-0 group-hover:opacity-100 group-hover:animate-[scan_1.5s_ease-in-out_infinite]" />
          </div>
          <span className="font-bold text-xl tracking-tight"><span className="text-blue-600 dark:text-blue-500">Snap</span><span className="text-violet-600 dark:text-violet-500">Text</span> Admin</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link 
            href="/demo" 
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden md:flex")}
          >
            Back to App
          </Link>
          <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <HugeiconsIcon icon={isSidebarOpen ? Cancel01Icon : Menu01Icon} size={20} />
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 relative overflow-hidden">
        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? "mr-72" : ""}`}>
          <div className="flex-1 p-6 lg:p-8 w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Collapsible Right Sidebar */}
        <aside 
          className={`absolute right-0 top-0 bottom-0 w-72 border-l bg-card/80 backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-in-out z-30 flex flex-col
            ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <div className="p-6">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Navigation</h3>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200
                      ${isActive 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <HugeiconsIcon icon={item.icon} size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t">
            <Button variant="destructive" className="w-full gap-2 justify-start bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-transparent hover:border-destructive/20" onClick={handleSignOut}>
              <HugeiconsIcon icon={Logout01Icon} size={18} />
              Sign Out
            </Button>
          </div>
        </aside>
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}} />
    </div>
  );
}
