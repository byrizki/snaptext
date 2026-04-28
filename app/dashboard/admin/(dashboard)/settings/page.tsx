"use client";

import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  UserGroupIcon,
  Search01Icon,
  Delete02Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Edit01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import useSWR from "swr";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResetPeriod = "daily" | "monthly";

interface QuotaSettings {
  count: number;
  resetPeriod: ResetPeriod;
}

interface AdminSettings {
  guest: QuotaSettings;
  registered: QuotaSettings;
  system: {
    concurrencyLength: number;
  };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  overrideId: string | null;
  overrideCount: number | null;
  overrideResetPeriod: string | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

function UserAvatar({ image, name }: { image: string | null; name: string }) {
  return (
    <div className="size-8 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-white dark:ring-zinc-900">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-zinc-400 uppercase">{name.charAt(0)}</span>
      )}
    </div>
  );
}

interface QuotaRowProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  quota: QuotaSettings;
  onChange: (next: QuotaSettings) => void;
  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
}

function QuotaRow({
  label,
  description,
  icon,
  accentClass,
  quota,
  onChange,
  onSave,
  isSaving,
  isDirty,
}: QuotaRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${accentClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 h-9 border border-zinc-200/80 dark:border-zinc-700/60">
          <input
            type="number"
            min={0}
            value={quota.count}
            onChange={(e) => onChange({ ...quota, count: parseInt(e.target.value, 10) || 0 })}
            className="w-14 bg-transparent text-sm font-bold text-zinc-900 dark:text-zinc-50 outline-none text-center tabular-nums"
          />
          <span className="text-xs text-zinc-400 font-medium">docs</span>
        </div>

        <Select
          value={quota.resetPeriod}
          onValueChange={(v) => v && onChange({ ...quota, resetPeriod: v as ResetPeriod })}
        >
          <SelectTrigger className="h-9 rounded-xl border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.14 }}
            >
              <Button
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-md shadow-blue-500/20"
              >
                {isSaving ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} />
                )}
                Save
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Inline override editor for a user row ────────────────────────────────────

interface UserOverrideEditorProps {
  userId: string;
  initialCount: number;
  initialPeriod: string;
  hasOverride: boolean;
  onSaved: () => void;
  onCancelled: () => void;
  onDeleted: () => void;
  overrideId: string | null;
}

function UserOverrideEditor({
  userId,
  initialCount,
  initialPeriod,
  hasOverride,
  onSaved,
  onCancelled,
  onDeleted,
  overrideId,
}: UserOverrideEditorProps) {
  const [count, setCount] = useState(initialCount);
  const [period, setPeriod] = useState(initialPeriod);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/quotas/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, count, resetPeriod: period }),
      });
      if (res.ok) {
        toast.success("Quota override saved");
        onSaved();
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!overrideId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/quotas/user?id=${overrideId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Override removed");
        onDeleted();
      } else {
        toast.error("Failed to remove");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 h-8">
        <input
          type="number"
          min={0}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10) || 0)}
          className="w-12 bg-transparent text-sm font-bold outline-none text-center tabular-nums text-zinc-900 dark:text-zinc-50"
        />
        <span className="text-xs text-zinc-400">docs</span>
      </div>

      <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
        <SelectTrigger className="h-8 rounded-lg text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>

      <button
        onClick={handleSave}
        disabled={saving}
        className="h-8 px-3 flex items-center gap-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
      >
        {saving ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />}
        Save
      </button>

      {hasOverride && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="h-8 px-2.5 flex items-center gap-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
        >
          {deleting ? <div className="size-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /> : <HugeiconsIcon icon={Delete02Icon} size={13} />}
          Remove
        </button>
      )}

      <button
        onClick={onCancelled}
        className="size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: settings, mutate: mutateSettings, isLoading } = useSWR<AdminSettings>(
    "/api/admin/settings",
    fetcher
  );

  const [guestForm, setGuestForm] = useState<QuotaSettings>({ count: 5, resetPeriod: "daily" });
  const [registeredForm, setRegisteredForm] = useState<QuotaSettings>({ count: 50, resetPeriod: "daily" });
  const [systemForm, setSystemForm] = useState({ concurrencyLength: 5 });
  const [guestDirty, setGuestDirty] = useState(false);
  const [registeredDirty, setRegisteredDirty] = useState(false);
  const [systemDirty, setSystemDirty] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const [savingRegistered, setSavingRegistered] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);

  // Users table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { data: usersData, mutate: mutateUsers } = useSWR<UsersResponse>(
    `/api/admin/users?page=${page}&q=${encodeURIComponent(debouncedSearch)}`,
    fetcher
  );

  // Sync settings → forms
  useEffect(() => {
    if (!settings) return;
    setGuestForm(settings.guest);
    setRegisteredForm(settings.registered);
    if (settings.system) setSystemForm(settings.system);
    setGuestDirty(false);
    setRegisteredDirty(false);
    setSystemDirty(false);
  }, [settings]);

  // Debounce search + reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleGuestChange = useCallback((next: QuotaSettings) => {
    setGuestForm(next);
    setGuestDirty(true);
  }, []);

  const handleRegisteredChange = useCallback((next: QuotaSettings) => {
    setRegisteredForm(next);
    setRegisteredDirty(true);
  }, []);

  const saveSystemSetting = async () => {
    setSavingSystem(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemForm }),
      });
      if (res.ok) {
        toast.success("System settings saved");
        setSystemDirty(false);
        mutateSettings();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingSystem(false);
    }
  };

  const saveQuota = async (
    tier: "guest" | "registered",
    form: QuotaSettings,
    setLoading: (v: boolean) => void,
    setDirty: (v: boolean) => void
  ) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [tier]: form }),
      });
      if (res.ok) {
        toast.success(`${tier === "guest" ? "Anonymous" : "Registered"} quota saved`);
        setDirty(false);
        mutateSettings();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const users = usersData?.users ?? [];
  const totalPages = usersData?.totalPages ?? 1;
  const totalUsers = usersData?.total ?? 0;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Quota Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Control scan limits for each access tier and individual users.
        </p>
      </div>

      {/* ── Tier Defaults ──────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <SectionLabel>Tier Defaults</SectionLabel>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 px-6">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center gap-3 text-zinc-400">
              <div className="size-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 rounded-full animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              <QuotaRow
                label="Anonymous Users"
                description="Applied globally to all unauthenticated visitors."
                icon={<HugeiconsIcon icon={UserIcon} size={18} className="text-slate-600 dark:text-slate-400" />}
                accentClass="bg-slate-100 dark:bg-slate-800/60"
                quota={guestForm}
                onChange={handleGuestChange}
                onSave={() => saveQuota("guest", guestForm, setSavingGuest, setGuestDirty)}
                isSaving={savingGuest}
                isDirty={guestDirty}
              />
              <QuotaRow
                label="Registered Users"
                description="Default for all logged-in accounts unless individually overridden."
                icon={<HugeiconsIcon icon={UserGroupIcon} size={18} className="text-indigo-600 dark:text-indigo-400" />}
                accentClass="bg-indigo-50 dark:bg-indigo-900/30"
                quota={registeredForm}
                onChange={handleRegisteredChange}
                onSave={() => saveQuota("registered", registeredForm, setSavingRegistered, setRegisteredDirty)}
                isSaving={savingRegistered}
                isDirty={registeredDirty}
              />
            </>
          )}
        </div>

        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex items-start gap-2">
          <HugeiconsIcon icon={Alert02Icon} size={13} className="text-zinc-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
            The <strong className="font-semibold text-zinc-500">registered</strong> default applies to all users
            without a personal override. Admins are always unlimited.
          </p>
        </div>
      </div>

      {/* ── System Settings ─────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <SectionLabel>System Settings</SectionLabel>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 px-6">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center gap-3 text-zinc-400">
              <div className="size-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 rounded-full animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="size-10 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-900/30">
                  <HugeiconsIcon icon={Settings01Icon} size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Workflow Concurrency</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Global maximum concurrent tasks during OCR extraction</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 h-9 border border-zinc-200/80 dark:border-zinc-700/60">
                  <input
                    type="number"
                    min={1}
                    value={systemForm.concurrencyLength}
                    onChange={(e) => {
                      setSystemForm({ ...systemForm, concurrencyLength: parseInt(e.target.value, 10) || 1 });
                      setSystemDirty(true);
                    }}
                    className="w-14 bg-transparent text-sm font-bold text-zinc-900 dark:text-zinc-50 outline-none text-center tabular-nums"
                  />
                  <span className="text-xs text-zinc-400 font-medium">tasks</span>
                </div>

                <AnimatePresence>
                  {systemDirty && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.14 }}
                    >
                      <Button
                        onClick={saveSystemSetting}
                        disabled={savingSystem}
                        size="sm"
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        {savingSystem ? (
                          <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} />
                        )}
                        Save
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── User Overrides ─────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Header + search */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <SectionLabel>User Overrides</SectionLabel>
            {usersData && (
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {totalUsers} user{totalUsers !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              <HugeiconsIcon icon={Search01Icon} size={15} />
            </div>
            <Input
              id="user-table-search"
              placeholder="Filter by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
            />
          </div>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-6 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          <span>User</span>
          <span>Email</span>
          <span>Quota Override</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {!usersData ? (
            <div className="py-10 flex items-center justify-center gap-3 text-zinc-400">
              <div className="size-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 rounded-full animate-spin" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">No users found.</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="px-6 py-3">
                {/* Normal row */}
                <div className="grid sm:grid-cols-[2fr_2fr_1fr_auto] gap-4 items-center">
                  {/* Name + avatar */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar image={u.image} name={u.name} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">{u.name}</p>
                      {u.role === "admin" && (
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Admin</span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <p className="text-xs text-zinc-500 truncate hidden sm:block">{u.email}</p>

                  {/* Override badge */}
                  <div className="hidden sm:flex">
                    {u.overrideId ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[11px] font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                        {u.overrideCount}&nbsp;
                        <span className="font-normal text-amber-600/70 dark:text-amber-500/60">/{u.overrideResetPeriod}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">default</span>
                    )}
                  </div>

                  {/* Edit button */}
                  <div className="flex justify-end">
                    {editingUserId !== u.id && (
                      <button
                        onClick={() => setEditingUserId(u.id)}
                        className="h-7 px-2.5 flex items-center gap-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <HugeiconsIcon icon={Edit01Icon} size={13} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline editor */}
                <AnimatePresence>
                  {editingUserId === u.id && (
                    <motion.div
                      key="editor"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.16 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 pl-10">
                        <UserOverrideEditor
                          userId={u.id}
                          initialCount={u.overrideCount ?? 100}
                          initialPeriod={u.overrideResetPeriod ?? "daily"}
                          hasOverride={!!u.overrideId}
                          overrideId={u.overrideId}
                          onSaved={() => { setEditingUserId(null); mutateUsers(); }}
                          onCancelled={() => setEditingUserId(null)}
                          onDeleted={() => { setEditingUserId(null); mutateUsers(); }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-400 tabular-nums">
              Page {page} of {totalPages}
              <span className="ml-2 text-zinc-300 dark:text-zinc-600">·</span>
              <span className="ml-2">{totalUsers} total</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="size-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "…" ? (
                    <span key={`ellipsis-${idx}`} className="text-xs text-zinc-400 px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`size-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        page === p
                          ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                          : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="size-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
