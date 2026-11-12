"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryEditor, toCategories, toRows, type CategoryRow } from "@/components/category-editor";
import { PageShell } from "@/components/page-shell";
import { useToast } from "@/components/toast";
import { categoryProblems } from "@/lib/domain/categories";
import { fmt0 } from "@/lib/domain/money";
import type { AppState } from "@/lib/domain/types";
import { saveCategories } from "@/lib/store/actions";

function BudgetsEditor({ s }: { s: AppState }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<CategoryRow[]>(() => toRows(s.cats));
  const [moveTo, setMoveTo] = useState<Record<string, string>>({});
  const [problems, setProblems] = useState<string[]>([]);

  const next = toCategories(rows);
  const keep = new Set(next.map((c) => c.id));
  // Removed categories that still have expenses this month need a new home.
  const orphaned = s.cats
    .filter((c) => !keep.has(c.id))
    .map((c) => ({ c, count: s.expenses.filter((e) => e.cat === c.id).length }))
    .filter((o) => o.count > 0);
  const targets = next.filter((c) => c.name.trim());
  const spending = next.filter((c) => !c.debt).reduce((a, c) => a + c.limit, 0);
  const days = s.month.days;

  const save = () => {
    const p = categoryProblems(next);
    setProblems(p);
    if (p.length) return;
    saveCategories(next, Object.fromEntries(orphaned.map(({ c }) => [c.id, moveTo[c.id] ?? targets.find((t) => !t.debt)?.id ?? targets[0].id])));
    toast("Budgets saved.");
    router.push("/");
  };

  return (
    <>
      <p className="sub">
        Your monthly budget for each category. Rename, add or remove categories, and tap an icon to change it. Leave out fixed bills like rent so
        your daily pace only covers everyday spending.
      </p>
      <CategoryEditor rows={rows} onChange={(r) => { setRows(r); setProblems([]); }} currency={s.currency} />
      <p className="sub">
        Spending budget: <b style={{ color: "var(--ink)" }}>{fmt0(spending, s.currency)}</b> a month, about{" "}
        <b style={{ color: "var(--ink)" }}>{fmt0(spending / days, s.currency)}</b> a day.
      </p>

      {orphaned.map(({ c, count }) => (
        <section className="panel px stack" key={c.id}>
          <p>
            <b>{c.name}</b> has {count} expense{count === 1 ? "" : "s"} this month. Move {count === 1 ? "it" : "them"} to:
          </p>
          <select
            className="field"
            aria-label={`Move ${c.name} expenses to`}
            value={moveTo[c.id] ?? targets.find((t) => !t.debt)?.id ?? ""}
            onChange={(e) => setMoveTo({ ...moveTo, [c.id]: e.target.value })}
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </section>
      ))}

      {problems.length > 0 && (
        <div className="stack">{problems.map((p) => <p className="err" key={p}>{p}</p>)}</div>
      )}
      <button className="btn" onClick={save}>Save budgets</button>
      <button className="btn ghost" onClick={() => router.back()}>Cancel</button>
      <p className="fine">Changes apply to this month straight away. Past months in your Hall of records keep the budgets they had.</p>
    </>
  );
}

export default function BudgetsPage() {
  return <PageShell title="Budgets">{(s) => <BudgetsEditor s={s} />}</PageShell>;
}
