import type { Month } from "./types";

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthObj(key: string, day = 1): Month {
  const [y, m] = key.split("-").map(Number);
  return {
    key,
    name: new Date(y, m - 1, 1).toLocaleString("en", { month: "long" }),
    year: y,
    day,
    days: new Date(y, m, 0).getDate(),
  };
}

export function shiftKey(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + by, 1));
}

/** "NOV", or "November 2026" with style "long" */
export function monthLabel(key: string, style: "short" | "long" = "short"): string {
  const [y, m] = key.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleString("en", { month: style });
  return style === "long" ? `${name} ${y}` : name.toUpperCase();
}

/** "2026-11-09" for a day of the given month */
export function isoDate(month: Month, day: number): string {
  return `${month.key}-${String(day).padStart(2, "0")}`;
}

export function dayLabel(month: Month, day: number): string {
  if (day === month.day) return "Today";
  if (day === month.day - 1) return "Yesterday";
  return `${month.name.slice(0, 3)} ${day}`;
}
