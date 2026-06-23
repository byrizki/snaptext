import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(number: number) {
  if (number === undefined || number === null) return "0";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

/**
 * Formats a duration in milliseconds into a human-readable string.
 * < 60s  → "3.4s"
 * < 1h   → "1m 3s"
 * ≥ 1h   → "1h 2m"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    const remainingSeconds = Math.floor(totalSeconds % 60);
    return `${totalMinutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
