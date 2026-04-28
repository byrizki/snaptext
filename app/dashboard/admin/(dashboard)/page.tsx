/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, AiBrain01Icon, Analytics01Icon, Clock01Icon, Coins01Icon, UserGroupIcon, ReloadIcon } from "@hugeicons/core-free-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useSWR, { mutate } from "swr";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCompactNumber } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: jobsData = [] } = useSWR(
    "/api/admin/jobs",
    (url: string) => fetch(url).then((r) => r.json())
  );
  const jobs = Array.isArray(jobsData) ? jobsData : [];

  const { data: modelsData = [] } = useSWR(
    "/api/admin/models",
    (url: string) => fetch(url).then((r) => r.json())
  );
  const models = Array.isArray(modelsData) ? modelsData : [];

  const { data: statsData } = useSWR(
    "/api/admin/stats",
    (url: string) => fetch(url).then((r) => r.json())
  );

  const { data: balanceData } = useSWR(
    "/api/admin/gateway/balance",
    (url: string) => fetch(url).then((r) => r.json())
  );

  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());

  const handleRerun = async (jobId: string) => {
    try {
      setRerunningIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      
      const res = await fetch(`/api/ocr/${jobId}/rerun`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to rerun job");
      }
      
      toast.success("Job restarted successfully");
      await mutate("/api/admin/jobs");
    } catch (err: any) {
      toast.error(err.message || "Failed to restart job");
    } finally {
      setRerunningIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  // Generate chart data based on actual jobs grouping by day
  const chartData = useMemo(() => {
    if (jobs.length === 0) return [];
    
    // Group by Date (YYYY-MM-DD)
    const groups: Record<string, number> = {};
    
    // Initialize last 7 days to 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      groups[key] = 0;
    }

    jobs.forEach((j: any) => {
      const d = new Date(j.createdAt);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (groups[key] !== undefined) {
        groups[key]++;
      }
    });

    return Object.keys(groups).map(key => ({
      time: key,
      value: groups[key]
    }));
  }, [jobs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">Real-time platform metrics and financial monitoring.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { 
            title: "Gateway Balance", 
            value: balanceData 
              ? `$${(Number(balanceData.freeBalance?.balance || 0) + Number(balanceData.paidBalance?.balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : "Loading...", 
            trend: balanceData ? `Free: $${Number(balanceData.freeBalance?.balance || 0).toFixed(2)}\nPaid: $${Number(balanceData.paidBalance?.balance || 0).toFixed(2)}` : "Fetching available credits", 
            color: "text-purple-500" 
          },
          { title: "Active Models", value: formatCompactNumber(models.length), trend: "Configured", color: "text-zinc-500" },
          { title: "Total Users", value: statsData?.totalUsers ? formatCompactNumber(statsData.totalUsers) : "0", trend: "Registered", color: "text-amber-500" },
          { title: "Total Jobs", value: formatCompactNumber(jobs.length), trend: "Processed", color: "text-blue-500" },
          { title: "Total Tokens", value: statsData?.totalTokens ? formatCompactNumber(statsData.totalTokens) : "0", trend: "All time consumed", color: "text-indigo-500" },
          { title: "Total Cost", value: statsData?.totalCost ? `$${Number(statsData.totalCost).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : "$0.0000", trend: "Cumulative API spend", color: "text-emerald-500" },
        ].map((stat, i) => (
          <Card key={i} className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border-zinc-200/50 dark:border-white/5 shadow-xl rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</div>
              <p className={`text-[11px] font-medium mt-1 uppercase tracking-wider whitespace-pre-line ${stat.color}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border-zinc-200/50 dark:border-white/5 shadow-xl rounded-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">System Load (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                  <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border-zinc-200/50 dark:border-white/5 shadow-xl rounded-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job: any) => (
                <div key={job.id} className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`shrink-0 w-2 h-2 rounded-full shadow-sm ${job.status === 'completed' ? 'bg-emerald-500 shadow-emerald-500/50' : job.status === 'failed' ? 'bg-red-500 shadow-red-500/50' : 'bg-amber-500 shadow-amber-500/50'}`} />
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[180px] sm:max-w-[250px]" title={job.filename}>
                        {job.filename || "Unknown file"}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <HugeiconsIcon icon={Coins01Icon} size={10} />
                      ${Number(job.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mt-1">
                    <div className="flex items-center gap-2 max-w-[150px]">
                      {job.user?.name ? (
                        <>
                          <div className="size-4 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                            {job.user.image ? (
                              <img src={job.user.image} alt={job.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-zinc-500 uppercase">{job.user.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-zinc-600 dark:text-zinc-400 truncate font-medium" title={job.user.name}>
                            {job.user.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-400 italic">Anonymous</span>
                      )}
                      <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">&bull;</span>
                      <span className="text-zinc-500 truncate hidden sm:inline" title={job.model?.name || "Unknown Model"}>
                        {job.model?.name || "Unknown"}
                      </span>
                    </div>
                    <span className="text-zinc-500">
                      {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {job.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[9px] uppercase tracking-wider font-bold ml-2 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRerun(job.id);
                        }}
                        disabled={rerunningIds.has(job.id)}
                      >
                        {rerunningIds.has(job.id) ? (
                          <div className="size-3 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin" />
                        ) : (
                          <>
                            <HugeiconsIcon icon={ReloadIcon} size={10} className="mr-1" />
                            Rerun
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!jobs || jobs.length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 text-zinc-400">
                  <HugeiconsIcon icon={Database01Icon} size={24} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No recent activity.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
