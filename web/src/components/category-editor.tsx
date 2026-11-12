"use client";

import { useState } from "react";
import { CATEGORY_ICONS, MAX_CATEGORIES, MAX_NAME, newCategoryId } from "@/lib/domain/categories";
import { symbolFor } from "@/lib/domain/money";
import type { Category } from "@/lib/domain/types";
import { PixelIcon } from "./pixel-icon";

/** One editable row. The amount is kept as text so people can type "4" then "45" freely. */
export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  amount: string;
  debt?: boolean;
  protected?: boolean;
}

export const toRows = (cats: Category[]): CategoryRow[] =>
  cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, amount: c.limit ? String(c.limit) : "", debt: c.debt, protected: c.protected }));

export const toCategories = (rows: CategoryRow[]): Category[] =>
  rows.map(({ amount, ...r }) => {
    const limit = parseFloat(amount.replace(",", ".").replace(/[^\d.]/g, ""));
    return { ...r, limit: Number.isFinite(limit) ? limit : 0 };
  });

export function CategoryEditor({ rows, onChange, currency }: { rows: CategoryRow[]; onChange: (rows: CategoryRow[]) => void; currency: string }) {
  const [picking, setPicking] = useState<string | null>(null);
  const set = (id: string, patch: Partial<CategoryRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const sym = symbolFor(currency);
  const hasDebt = rows.some((r) => r.debt);

  const add = (debt: boolean) => {
    const name = debt ? "Debt payment" : "";
    const id = newCategoryId(name || "category", rows.map((r) => r.id));
    onChange([...rows, { id, name, icon: debt ? "debt" : "other", amount: "", ...(debt ? { debt: true, protected: true } : {}) }]);
    setTimeout(() => document.getElementById(`cat-name-${id}`)?.focus(), 0);
  };

  return (
    <div className="stack">
      <section className="panel px">
        {rows.map((r) => (
          <div className="catrow" key={r.id}>
            <div className="limrow">
              <button
                type="button"
                className="iconpick"
                aria-label={`Change icon for ${r.name || "this category"}`}
                aria-expanded={picking === r.id}
                onClick={() => setPicking(picking === r.id ? null : r.id)}
              >
                <PixelIcon name={r.icon} />
              </button>
              <div className="ln">
                <input
                  id={`cat-name-${r.id}`}
                  className="catname"
                  value={r.name}
                  maxLength={MAX_NAME}
                  placeholder="Category name"
                  aria-label="Category name"
                  onChange={(e) => set(r.id, { name: e.target.value })}
                />
                {r.debt && <small>Savings or debt goal. Never used to cover overspending.</small>}
              </div>
              <div className="amt">
                <span aria-hidden="true">{sym}</span>
                <input
                  className="limin"
                  id={`lim-${r.id}`}
                  inputMode="decimal"
                  value={r.amount}
                  placeholder="0"
                  aria-label={`${r.name || "Category"} monthly budget`}
                  onChange={(e) => set(r.id, { amount: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="rm"
                aria-label={`Remove ${r.name || "this category"}`}
                onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
              >
                ✕
              </button>
            </div>
            {picking === r.id && (
              <div className="icons" role="group" aria-label="Choose an icon">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className="cchip"
                    aria-pressed={r.icon === icon}
                    aria-label={icon}
                    onClick={() => {
                      set(r.id, { icon });
                      setPicking(null);
                    }}
                  >
                    <PixelIcon name={icon} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
      {rows.length < MAX_CATEGORIES && (
        <div className="row">
          <button type="button" className="btn alt sm" onClick={() => add(false)}>+ Add category</button>
          {!hasDebt && (
            <button type="button" className="btn alt sm" onClick={() => add(true)}>+ Add savings or debt goal</button>
          )}
        </div>
      )}
    </div>
  );
}
