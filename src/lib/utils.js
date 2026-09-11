import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Short relative time (e.g. "Just now", "5m", "2h", "3d") for feed timestamps. */
export function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
