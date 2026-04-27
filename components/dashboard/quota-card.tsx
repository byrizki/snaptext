"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "framer-motion";

interface QuotaData {
  limit: number;
  used: number;
  remaining: number;
  resetPeriod: "daily" | "monthly";
  isAnonymous: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function QuotaRing({ used, limit }: { used: number; limit: number }) {
  const isUnlimited = limit === Number.MAX_SAFE_INTEGER;
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(used / limit, 1) : 0;
  const dashOffset = circumference * (1 - percentage);

  const color =
    percentage >= 0.9 ? "#ef4444" : percentage >= 0.7 ? "#f59e0b" : "#3b82f6";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-200 dark:text-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{used}</span>
        <span className="text-[11px] text-zinc-400 font-medium">
          / {isUnlimited ? "∞" : limit}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export function QuotaCard() {
  const { data, isLoading } = useSWR<QuotaData>("/api/dashboard/quota", fetcher);

  const isUnlimited = data?.limit === Number.MAX_SAFE_INTEGER;
  const resetLabel = data?.resetPeriod === "monthly" ? "monthly" : "daily";
  const resetCopy = data?.resetPeriod === "monthly" ? "Resets monthly" : "Resets at midnight";

  return (
    <div className="rounded-[1.75rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {resetLabel === "monthly" ? "Monthly" : "Daily"} Scans
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{resetCopy}</p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center gap-6">
          <div className="size-[120px] rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-3/4 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-8">
          <QuotaRing used={data.used} limit={data.limit} />
          <div className="space-y-4 flex-1">
            <Stat label="Used" value={data.used} color="text-blue-600 dark:text-blue-400" />
            <Stat
              label="Remaining"
              value={isUnlimited ? "Unlimited" : data.remaining}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <Stat
              label="Limit"
              value={isUnlimited ? "Unlimited" : data.limit}
              color="text-zinc-500 dark:text-zinc-400"
            />
          </div>
        </div>
      )}

      {/* CTA — contact support for higher limits */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3 leading-relaxed">
          Need more scans? Contact us to request a higher limit for your account.
        </p>
        <Link
          href="/contact"
          id="quota-card-contact-support-btn"
          className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-sm font-semibold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:border-blue-500 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Request Higher Limits
        </Link>
      </div>
    </div>
  );
}
