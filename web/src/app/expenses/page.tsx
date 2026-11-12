"use client";

import { useState } from "react";
import { ExpenseRow } from "@/components/expense-row";
import { PageShell } from "@/components/page-shell";
import { PixelIcon } from "@/components/pixel-icon";
import { findCat, spentIn } from "@/lib/domain/budget";
import { fmt, round2 } from "@/lib/domain/money";
import { dayLabel } from "@/lib/domain/month";
import type { AppState, Expense } from "@/lib/domain/types";

const counted = (s: AppState, list: Expense[]) =>
  round2(list.filter((e) => !e.foreign && !findCat(s, e.cat)?.debt).reduce((a, e) => a + e.amount, 0));

export default function ExpensesPage() {
  const [filter, setFilter] = useState("all");
  return (
    <PageShell title="This month">
      {(s) => {
        const list = s.expenses.filter((e) => filter === "all" || e.cat === filter);
        const days = [...new Set(list.map((e) => e.day))].sort((a, b) => b - a);
        const fc = filter === "all" ? null : findCat(s, filter);
        const summary = fc?.debt ? `${fmt(spentIn(s, fc.id), s.currency)} paid` : `${fmt(counted(s, list), s.currency)} spent`;
        return (
          <>
            <div className="cats" style={{ marginTop: 0 }}>
              <button className="cchip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
              {s.cats.map((c) => (
                <button key={c.id} className="cchip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                  <PixelIcon name={c.icon} />
                  {c.name}
                </button>
              ))}
            </div>
            <p className="sub">
              {list.length} expense{list.length === 1 ? "" : "s"} in {s.month.name} · {summary}. Tap one to edit it.
            </p>
            {days.length ? (
              days.map((d) => {
                const items = list.filter((e) => e.day === d).reverse();
                return (
                  <section className="panel px today" key={d}>
                    <div className="lab daylab">
                      <span>{dayLabel(s.month, d)}</span>
                      <span>{fmt(counted(s, items), s.currency)}</span>
                    </div>
                    {items.map((e) => <ExpenseRow key={e.id} s={s} e={e} />)}
                  </section>
                );
              })
            ) : (
              <p className="empty">No expenses{fc ? ` in ${fc.name}` : ""} yet this month.</p>
            )}
          </>
        );
      }}
    </PageShell>
  );
}
