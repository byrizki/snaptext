import Link from "next/link";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { QuotaCard } from "@/components/dashboard/quota-card";
import { ScanHistory } from "@/components/dashboard/scan-history";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard — SnapText",
  description: "Your personal SnapText dashboard — track scans, quota, and history.",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <DashboardPageShell
      eyebrow="Dashboard"
      title={`Welcome back, ${firstName}`}
      description="Track scan usage and pick up recent document work."
      actions={(
        <Link
          href="/dashboard/scan"
          id="dashboard-new-scan-btn"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New scan
        </Link>
      )}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1">
          <QuotaCard />
        </div>
        <div className="lg:col-span-2">
          <ScanHistory />
        </div>
      </div>
    </DashboardPageShell>
  );
}
