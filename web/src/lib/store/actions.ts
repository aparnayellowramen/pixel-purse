import { findCat, limitOf, remaining, spentIn, usedRatio } from "../domain/budget";
import { newId } from "../domain/defaults";
import { fmt, fmt0, round2, symbolFor } from "../domain/money";
import { applyLevel, type LevelResult } from "../domain/month-end";
import type { AppState, CategoryId, Expense, ParsedItem } from "../domain/types";
import { getState, update } from "./app-store";

export const XP_PER_LEVEL = 500;

function addXP(s: AppState, n: number): boolean {
  s.xp += n;
  let leveled = false;
  while (s.xp >= XP_PER_LEVEL) {
    s.xp -= XP_PER_LEVEL;
    s.level++;
    leveled = true;
  }
  return leveled;
}

function bumpStreak(s: AppState) {
  const d = s.month.day;
  if (s.lastLogDay === d) return;
  s.streak = s.lastLogDay === d - 1 ? s.streak + 1 : 1;
  s.lastLogDay = d;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
}

/** Spending bars (not debt, not protected) that are over budget, out of the given ids. */
function overAmong(s: AppState, ids: (CategoryId | null)[]): CategoryId | undefined {
  return ids
    .map((id) => findCat(s, id))
    .find((c) => !!c && !c.debt && !c.protected && remaining(s, c) < 0)?.id;
}

/* ---------- logging ---------- */

export interface CommitResult {
  ids: string[];
  message: string;
  /** A spending category that went over budget with this save. */
  overCat?: CategoryId;
}

export function commitItems(items: ParsedItem[]): CommitResult {
  const before = getState();
  const ratioBefore = Object.fromEntries(before.cats.map((c) => [c.id, usedRatio(before, c)]));
  const ids: string[] = [];
  let xp = 0;
  let leveled = false;

  update((s) => {
    for (const i of items) {
      if (!i.cat) continue;
      const id = newId();
      ids.push(id);
      s.expenses.push({ id, day: i.day, amount: i.amount, cat: i.cat, merchant: i.merchant, note: i.note, cur: i.cur, foreign: i.foreign });
      if (i.picked && i.merchant) s.rules[i.merchant.toLowerCase()] = i.cat;
      xp += findCat(s, i.cat)?.debt ? 25 : 5;
    }
    leveled = addXP(s, xp);
    bumpStreak(s);
  });

  const s = getState();
  const first = items[0];
  const fc = findCat(s, first.cat);
  let message: string;
  if (items.length > 1) message = `Saved ${items.length} expenses · +${xp} XP`;
  else if (fc?.debt) message = `+25 XP · debt down! ${fmt0(spentIn(s, fc.id), s.currency)} of ${fmt0(limitOf(s, fc), s.currency)} paid`;
  else if (first.foreign) message = `Saved ${symbolFor(first.cur)}${first.amount.toFixed(2)}. Not counted until you enter it in ${s.currency}.`;
  else if (fc) {
    const r = remaining(s, fc);
    message = r < 0 ? `${fc.name}: ${fmt0(-r, s.currency)} over` : `${fc.name}: ${fmt0(r, s.currency)} left`;
  } else message = `Saved ${fmt(first.amount, s.currency)}`;
  if (leveled) message += ` · Level up! LV ${s.level}`;

  const touched = [...new Set(items.filter((i) => !i.foreign).map((i) => i.cat))];
  const overCat = overAmong(s, touched);
  const warn = touched
    .map((id) => findCat(s, id))
    .find((c) => !!c && !c.debt && !c.protected && remaining(s, c) >= 0 && usedRatio(s, c) >= 0.8 && ratioBefore[c.id] < 0.8);
  if (warn && !overCat) message += ` · Heads up: ${warn.name} is at ${Math.round(usedRatio(s, warn) * 100)}%`;

  return { ids, message, overCat };
}

export function removeExpenses(ids: string[]) {
  update((s) => {
    s.expenses = s.expenses.filter((e) => !ids.includes(e.id));
  });
}

export function logNoSpend(): string {
  update((s) => {
    const key = `${s.month.key}-${s.month.day}`;
    if (s.noSpend.includes(key)) return;
    s.noSpend.push(key);
    bumpStreak(s);
    addXP(s, 10);
  });
  return `No-spend day! +10 XP · Combo ×${getState().streak}`;
}

/* ---------- editing ---------- */

export interface ExpenseEdit {
  amount: number;
  merchant: string;
  note: string;
  day: number;
  cat: CategoryId;
  /** For a foreign expense: the amount in home currency, which makes it count. */
  homeAmount?: number;
}

export interface EditResult {
  previous: Expense;
  overCat?: CategoryId;
}

export function editExpense(id: string, edit: ExpenseEdit): EditResult | null {
  const previous = getState().expenses.find((e) => e.id === id);
  if (!previous) return null;
  const prevCopy = { ...previous };
  update((s) => {
    const e = s.expenses.find((x) => x.id === id);
    if (!e) return;
    const catChanged = e.cat !== edit.cat;
    e.merchant = edit.merchant.trim();
    e.note = edit.note.trim();
    e.day = edit.day;
    e.cat = edit.cat;
    if (e.foreign && edit.homeAmount && edit.homeAmount > 0) {
      e.note = (e.note ? `${e.note} · ` : "") + `was ${symbolFor(e.cur)}${edit.amount.toFixed(2)}`;
      e.amount = round2(edit.homeAmount);
      e.cur = s.currency;
      e.foreign = false;
    } else {
      e.amount = round2(edit.amount);
    }
    if (catChanged && e.merchant) s.rules[e.merchant.toLowerCase()] = e.cat;
  });
  const s = getState();
  const now = s.expenses.find((e) => e.id === id)!;
  const grew = now.cat !== prevCopy.cat || now.amount > prevCopy.amount || (prevCopy.foreign && !now.foreign);
  return { previous: prevCopy, overCat: grew && !now.foreign ? overAmong(s, [now.cat]) : undefined };
}

/** Put an expense back exactly as it was (for Undo). */
export function restoreExpense(e: Expense, index?: number) {
  update((s) => {
    const i = s.expenses.findIndex((x) => x.id === e.id);
    if (i >= 0) s.expenses[i] = e;
    else s.expenses.splice(index ?? s.expenses.length, 0, e);
  });
}

export function deleteExpense(id: string): { expense: Expense; index: number } | null {
  const s = getState();
  const index = s.expenses.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const expense = s.expenses[index];
  removeExpenses([id]);
  return { expense, index };
}

/* ---------- rebalancing ---------- */

/** Move budget from one bar to an overspent one. Returns the amount moved. */
export function rebalance(from: CategoryId, to: CategoryId): number {
  const s = getState();
  const f = findCat(s, from);
  const t = findCat(s, to);
  if (!f || !t) return 0;
  const amt = round2(Math.min(-remaining(s, t), remaining(s, f)));
  if (amt <= 0) return 0;
  update((d) => {
    d.adjust[from] = round2((d.adjust[from] ?? 0) - amt);
    d.adjust[to] = round2((d.adjust[to] ?? 0) + amt);
    d.moves.push({ from, to, amt });
  });
  return amt;
}

/** Cover an overspend from savings (after the user confirms). */
export function takeFromChest(to: CategoryId): number {
  const s = getState();
  const t = findCat(s, to);
  if (!t) return 0;
  const amt = round2(Math.min(-remaining(s, t), s.chest));
  if (amt <= 0) return 0;
  update((d) => {
    d.chest = round2(d.chest - amt);
    d.adjust[to] = round2((d.adjust[to] ?? 0) + amt);
    d.moves.push({ from: "chest", to, amt });
  });
  return amt;
}

/* ---------- settings ---------- */

export const setSound = (on: boolean) => update((s) => void (s.sound = on));
export const setLeftoverTo = (to: "savings" | "debt") => update((s) => void (s.leftoverTo = to));
export const deleteRule = (merchant: string) => update((s) => void delete s.rules[merchant]);

/* ---------- month end ---------- */

export function completeMonth(result: LevelResult, acceptTip: boolean) {
  update((s) => applyLevel(s, result, acceptTip, new Date()));
}
