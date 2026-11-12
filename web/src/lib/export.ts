import { findCat } from "./domain/budget";
import { isoDate } from "./domain/month";
import type { AppState } from "./domain/types";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** This month's expenses plus past months' totals, as CSV text. */
export function toCsv(s: AppState): string {
  const rows: (string | number)[][] = [["date", "amount", "currency", "category", "store", "note", "counted"]];
  for (const e of [...s.expenses].sort((a, b) => a.day - b.day)) {
    rows.push([isoDate(s.month, e.day), e.amount.toFixed(2), e.cur, findCat(s, e.cat)?.name ?? e.cat, e.merchant, e.note, e.foreign ? "no" : "yes"]);
  }
  if (s.history.length) {
    rows.push([], ["month", "spent", "budget", "saved", "saved to", "stars"]);
    for (const h of s.history) rows.push([h.key, h.spent.toFixed(2), h.budget.toFixed(2), h.saved.toFixed(2), h.savedTo, `${h.stars}/${h.maxStars}`]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

/** Save the CSV to the device (Files on iPhone, Downloads elsewhere). */
export function downloadCsv(s: AppState) {
  const blob = new Blob([toCsv(s)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pixel-purse-${s.month.key}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
