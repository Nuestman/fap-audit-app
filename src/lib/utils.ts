import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
