import Link from "next/link";
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-[15px]">
            Here&apos;s what&apos;s happening with your documents today.
          </p>
        </div>

        <Link
          href="/dashboard/scan"
          id="dashboard-new-scan-btn"
          className="h-11 px-6 rounded-xl bg-blue-600 dark:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 hover:bg-blue-500 dark:hover:bg-blue-400 transition-all shadow-md hover:shadow-lg dark:shadow-[0_0_20px_rgba(59,130,246,0.25)] self-start sm:self-auto"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Scan
        </Link>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quota card — narrow column */}
        <div className="lg:col-span-1">
          <QuotaCard />
        </div>

        {/* Scan history — wide column */}
        <div className="lg:col-span-2">
          <ScanHistory />
        </div>
      </div>
    </div>
  );
}
