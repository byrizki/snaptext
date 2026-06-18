import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <DashboardHeader />
      <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
