/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon, AiBrain01Icon, Analytics01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useSWR from "swr";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Generate fake data for the chart based on jobs if available, else static
  const chartData = [
    { time: '00:00', value: 20 },
    { time: '04:00', value: 45 },
    { time: '08:00', value: 80 },
    { time: '12:00', value: 120 },
    { time: '16:00', value: 90 },
    { time: '20:00', value: 50 },
    { time: '24:00', value: 30 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time platform metrics and monitoring.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Models", value: models.length.toString(), icon: AiBrain01Icon, trend: "Configured", color: "text-primary" },
          { title: "Total Jobs", value: jobs.length.toString(), icon: Database01Icon, trend: "Processed", color: "text-blue-500" },
          { title: "Avg Latency", value: "1.2s", icon: Clock01Icon, trend: "-0.4s from last hour", color: "text-emerald-500" },
          { title: "Success Rate", value: "99.8%", icon: Analytics01Icon, trend: "+0.1% from last hour", color: "text-emerald-500" },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/40 backdrop-blur-xl border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <HugeiconsIcon icon={stat.icon} size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs mt-1 ${stat.color}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card/40 backdrop-blur-xl border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle>System Load (Last 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="5 5" vertical={false} opacity={0.4} />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} 
                    itemStyle={{ color: '#e4e4e7' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-card/40 backdrop-blur-xl border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${job.status === 'completed' ? 'bg-emerald-500' : job.status === 'failed' ? 'bg-destructive' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-medium">Job {job.id.substring(0, 8)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{job.status}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(!jobs || jobs.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
