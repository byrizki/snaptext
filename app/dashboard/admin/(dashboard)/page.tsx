/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, ReloadIcon } from "@hugeicons/core-free-icons";
import useSWR, { mutate } from "swr";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { formatCompactNumber } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminDashboardPage() {
  const { data: jobsData = [] } = useSWR("/api/admin/jobs", fetcher);
  const { data: modelsData = [] } = useSWR("/api/admin/models", fetcher);
  const { data: statsData } = useSWR("/api/admin/stats", fetcher);
  const { data: balanceData } = useSWR("/api/admin/gateway/balance", fetcher);
  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());

  const jobs = Array.isArray(jobsData) ? jobsData : [];
  const models = Array.isArray(modelsData) ? modelsData : [];

  const handleRerun = async (jobId: string) => {
    try {
      setRerunningIds((prev) => new Set(prev).add(jobId));
      const res = await fetch(`/api/ocr/${jobId}/rerun`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to rerun job");
      toast.success("Job restarted.");
      await mutate("/api/admin/jobs");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restart job");
    } finally {
      setRerunningIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      groups[day.toLocaleDateString(undefined, { month: "short", day: "numeric" })] = 0;
    }
    jobs.forEach((job: any) => {
      const key = new Date(job.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (groups[key] !== undefined) groups[key]++;
    });
    return Object.keys(groups).map((time) => ({ time, value: groups[time] }));
  }, [jobs]);

  const stats = [
    {
      title: "Gateway balance",
      value: balanceData ? `$${(Number(balanceData.freeBalance?.balance || 0) + Number(balanceData.paidBalance?.balance || 0)).toFixed(2)}` : "...",
      detail: balanceData ? `Free $${Number(balanceData.freeBalance?.balance || 0).toFixed(2)} · Paid $${Number(balanceData.paidBalance?.balance || 0).toFixed(2)}` : "Loading credits",
    },
    { title: "Models", value: formatCompactNumber(models.length), detail: "Configured" },
    { title: "Users", value: statsData?.totalUsers ? formatCompactNumber(statsData.totalUsers) : "0", detail: "Registered" },
    { title: "Jobs", value: formatCompactNumber(jobs.length), detail: "Processed" },
    { title: "Tokens", value: statsData?.totalTokens ? formatCompactNumber(statsData.totalTokens) : "0", detail: "All time" },
    { title: "Cost", value: statsData?.totalCost ? `$${Number(statsData.totalCost).toFixed(4)}` : "$0.0000", detail: "API spend" },
  ];

  return (
    <DashboardPageShell eyebrow="Admin" title="Overview" description="Platform health, usage, and recent processing activity.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => (
          <DashboardCard key={stat.title} className="p-4">
            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
          </DashboardCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-7 lg:gap-6">
        <DashboardCard className="p-4 sm:p-5 lg:col-span-4">
          <h2 className="text-lg font-semibold text-foreground">Jobs this week</h2>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard className="p-4 sm:p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {jobs.slice(0, 5).map((job: any) => (
              <div key={job.id} className="rounded-2xl border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{job.filename || "Unknown file"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{job.user?.name || "Anonymous"} · {job.model?.name || "Unknown model"}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">${Number(job.cost || 0).toFixed(4)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{new Date(job.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {job.status === "failed" ? (
                    <button onClick={() => handleRerun(job.id)} disabled={rerunningIds.has(job.id)} className="inline-flex h-8 items-center gap-1 rounded-xl border px-3 font-semibold text-foreground transition hover:bg-accent disabled:opacity-50">
                      <HugeiconsIcon icon={ReloadIcon} size={12} />
                      Rerun
                    </button>
                  ) : (
                    <span className="capitalize">{job.status}</span>
                  )}
                </div>
              </div>
            ))}
            {jobs.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <HugeiconsIcon icon={Database01Icon} size={24} className="mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium">No recent activity</p>
              </div>
            ) : null}
          </div>
        </DashboardCard>
      </div>
    </DashboardPageShell>
  );
}
