"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, SaveIcon } from "@hugeicons/core-free-icons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import useSWR from "swr";

export default function SettingsPage() {
  const { data: settings, mutate } = useSWR(
    "/api/admin/settings",
    (url: string) => fetch(url).then((r) => r.json())
  );

  const [globalDailyScanLimit, setGlobalDailyScanLimit] = useState("20");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && settings.global_daily_scan_limit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGlobalDailyScanLimit(settings.global_daily_scan_limit);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_daily_scan_limit: globalDailyScanLimit,
        }),
      });

      if (res.ok) {
        toast.success("Settings saved successfully");
        mutate();
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global application limits and behaviors.</p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-lg max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Settings02Icon} size={20} className="text-primary" />
              Rate Limits & Quotas
            </CardTitle>
            <CardDescription>
              Control the volume of OCR extraction requests allowed on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily-limit">Global Daily Scan Limit</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="daily-limit"
                  type="number"
                  min="0"
                  value={globalDailyScanLimit}
                  onChange={(e) => setGlobalDailyScanLimit(e.target.value)}
                  className="max-w-[200px]"
                />
                <span className="text-sm text-muted-foreground">documents / day</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This is the total number of documents that can be scanned across all users per day.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-white/5 pt-6">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <HugeiconsIcon icon={SaveIcon} size={16} />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
