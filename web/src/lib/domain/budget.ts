import { fmt0, round2 } from "./money";
import type { AppState, Category, CategoryId, Expense } from "./types";

export const limitOf = (s: AppState, c: Category) => c.limit + (s.adjust[c.id] ?? 0);

export const counts = (e: Expense) => !e.foreign;

export function spentIn(s: AppState, id: CategoryId): number {
  return round2(s.expenses.filter((e) => e.cat === id && counts(e)).reduce((a, e) => a + e.amount, 0));
}

export const remaining = (s: AppState, c: Category) => round2(limitOf(s, c) - spentIn(s, c.id));

export const spendCats = (s: AppState) => s.cats.filter((c) => !c.debt);

export const totalLeft = (s: AppState) => round2(spendCats(s).reduce((a, c) => a + remaining(s, c), 0));

/** Days left in the month, counting today. */
export const daysLeft = (s: AppState) => s.month.days - s.month.day + 1;

export const dailyPace = (s: AppState) => Math.max(0, totalLeft(s)) / daysLeft(s);

/** Share of the category's budget used (can exceed 1). */
export function usedRatio(s: AppState, c: Category): number {
  const l = limitOf(s, c);
  return l > 0 ? 1 - remaining(s, c) / l : 1;
}

/** Bars that can cover an overspend in `id`: unprotected, with money left, most left first. */
export function rebalanceSources(s: AppState, id: CategoryId, max = 3): Category[] {
  return s.cats
    .filter((c) => !c.protected && !c.debt && c.id !== id && remaining(s, c) > 0)
    .sort((a, b) => remaining(s, b) - remaining(s, a))
    .slice(0, max);
}

export const findCat =(s: AppState, id: CategoryId | null | undefined): Category | undefined =>
  s.cats.find((c) => c.id === id);

export type BarTone = "ok" | "warn" | "bad" | "debt";

export interface BarState {
  /** 0-100 width of the bar */
  pct: number;
  tone: BarTone;
  text: string;
}

/** What a category's health bar shows: HP left for spending, progress for debt. */
export function barState(s: AppState, c: Category): BarState {
  const l = limitOf(s, c);
  const sp = spentIn(s, c.id);
  if (c.debt) {
    return {
      pct: l > 0 ? Math.min(100, (sp / l) * 100) : 0,
      tone: "debt",
      text: `${fmt0(sp, s.currency)}/${fmt0(l, s.currency)} paid`,
    };
  }
  const rem = l - sp;
  const pct = rem <= 0 || l <= 0 ? 0 : Math.min(100, (rem / l) * 100);
  const tone: BarTone = pct > 50 ? "ok" : pct > 20 ? "warn" : "bad";
  return { pct, tone, text: rem < 0 ? `${fmt0(-rem, s.currency)} over` : `${fmt0(rem, s.currency)} left` };
}
