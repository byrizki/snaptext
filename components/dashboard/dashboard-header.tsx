import { AdminNav } from "@/components/dashboard/admin-nav";
import { DashboardBrand } from "@/components/dashboard/dashboard-brand";
import { DashboardPrimaryNav } from "@/components/dashboard/dashboard-primary-nav";
import { UserNav } from "@/components/dashboard/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <DashboardBrand />
        <div className="hidden md:block">
          <DashboardPrimaryNav />
        </div>
        <div className="flex items-center gap-2">
          <AdminNav />
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
      <div className="border-t px-4 py-2 md:hidden">
        <DashboardPrimaryNav />
      </div>
    </header>
  );
}
