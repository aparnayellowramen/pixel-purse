"use client";

import { findCat } from "@/lib/domain/budget";
import { fmt, symbolFor } from "@/lib/domain/money";
import type { AppState, Expense } from "@/lib/domain/types";
import { PixelIcon } from "./pixel-icon";
import { useSheets } from "./sheets";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const expenseLabel = (s: AppState, e: Expense) => e.merchant || cap(e.note) || findCat(s, e.cat)?.name || "Expense";

export function ExpenseRow({ s, e }: { s: AppState; e: Expense }) {
  const { openEdit } = useSheets();
  const c = findCat(s, e.cat);
  const amount = e.foreign ? `${symbolFor(e.cur)}${e.amount.toFixed(2)}` : (c?.debt ? "+" : "") + fmt(e.amount, s.currency);
  const sub = (c?.name ?? "Other") + (e.merchant && e.note ? ` · ${e.note}` : "") + (e.foreign ? " · not counted" : "");
  return (
    <button type="button" className="exp" onClick={() => openEdit(e.id)} aria-label={`Edit ${expenseLabel(s, e)}, ${amount}`}>
      <PixelIcon name={c?.icon ?? "other"} />
      <div className="et">
        <div className="el">{expenseLabel(s, e)}</div>
        <div className="em">{sub}</div>
      </div>
      <span className={`ea ${c?.debt ? "debt" : ""}`}>{amount}</span>
    </button>
  );
}
