import { round2 } from "./money";
import { monthKeyOf, monthObj, shiftKey } from "./month";
import type { AppState, Category, MonthCategoryResult, MonthRecord } from "./types";

export const DEFAULT_CATS: Category[] = [
  { id: "food", name: "Food", icon: "food", limit: 400 },
  { id: "groc", name: "Groceries", icon: "groc", limit: 350 },
  { id: "shop", name: "Shopping", icon: "shop", limit: 200 },
  { id: "trans", name: "Transport", icon: "trans", limit: 150 },
  { id: "fun", name: "Fun", icon: "fun", limit: 100 },
  { id: "bills", name: "Bills", icon: "bills", limit: 250 },
  { id: "other", name: "Other", icon: "other", limit: 50 },
  { id: "debt", name: "Debt payment", icon: "debt", limit: 300, protected: true, debt: true },
];

export function summarizeMonth(
  key: string,
  cats: MonthCategoryResult[],
  extra: Partial<MonthRecord> = {},
): MonthRecord {
  return {
    key,
    cats,
    budget: cats.reduce((a, c) => a + c.limit, 0),
    spent: round2(cats.reduce((a, c) => a + c.spent, 0)),
    saved: round2(cats.reduce((a, c) => a + Math.max(0, c.limit - c.spent), 0)),
    stars: cats.filter((c) => c.spent <= c.limit).length,
    maxStars: cats.length,
    savedTo: "savings",
    moves: [],
    debtPaid: 0,
    streak: 0,
    ...extra,
  };
}

/* ---------- demo save file ---------- */

// Spent per spending category (DEFAULT_CATS order, without debt) for the 4 months before now.
const DEMO_HISTORY: { spent: number[]; streak: number }[] = [
  { spent: [470, 360, 260, 140, 130, 240, 30], streak: 9 },
  { spent: [280, 330, 230, 150, 120, 250, 50], streak: 16 },
  { spent: [330, 290, 110, 120, 115, 240, 0], streak: 23 },
  { spent: [420, 320, 150, 140, 90, 260, 20], streak: 18 },
];

// [day, amount, category, merchant, note]
const DEMO_EXPENSES: [number, number, string, string, string][] = [
  [1, 4.5, "food", "Tim Hortons", "coffee"], [1, 150, "debt", "", "credit card"], [1, 33.5, "trans", "Presto", "reload"],
  [2, 16, "food", "", "lunch"], [2, 85, "bills", "Rogers", "phone"], [2, 62, "groc", "No Frills", ""],
  [3, 38, "food", "", "sushi"], [3, 65, "bills", "Hydro", ""], [4, 4.5, "food", "Tim Hortons", "coffee"],
  [4, 59.9, "shop", "Uniqlo", "sweater"], [5, 100, "bills", "", "internet"], [5, 18.5, "trans", "Uber", ""],
  [6, 27, "food", "", "pizza"], [6, 71.4, "groc", "Loblaws", ""], [7, 42, "food", "", "brunch"], [7, 22, "fun", "", "movie"],
  [8, 6.25, "food", "Starbucks", "latte"], [8, 128.1, "shop", "Amazon", ""], [8, 12, "fun", "Spotify", ""],
  [9, 34.75, "food", "DoorDash", ""], [9, 18, "food", "", "lunch"], [9, 12, "trans", "Uber", ""],
  [10, 61, "food", "", "dinner"], [10, 46.6, "groc", "No Frills", ""], [10, 11, "fun", "", "bar"],
  [11, 4.5, "food", "Tim Hortons", "coffee"], [11, 15.5, "food", "", "lunch"],
];

let seq = 0;
export const newId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A realistic save file so every screen has something to show during development. */
export function demoState(now: Date): AppState {
  const key = monthKeyOf(now);
  const month = monthObj(key, now.getDate());
  const spendDefaults = DEFAULT_CATS.filter((c) => !c.debt);
  const history = DEMO_HISTORY.map((h, i) =>
    summarizeMonth(
      shiftKey(key, i - DEMO_HISTORY.length),
      spendDefaults.map((c, j) => ({ id: c.id, name: c.name, icon: c.icon, limit: c.limit, spent: h.spent[j] })),
      { debtPaid: 300, streak: h.streak },
    ),
  );
  const expenses = DEMO_EXPENSES.filter(([d]) => d <= month.day).map(([day, amount, cat, merchant, note]) => ({
    id: newId(), day, amount, cat, merchant, note, cur: "CAD", foreign: false,
  }));
  const lastLogDay = Math.min(month.day, 11);
  return {
    v: 1,
    started: true,
    user: { guest: false, email: "you@example.com" },
    currency: "CAD",
    sound: false,
    leftoverTo: "savings",
    level: 7,
    xp: 340,
    streak: lastLogDay >= month.day - 1 ? lastLogDay : 0,
    bestStreak: 23,
    lastLogDay,
    month,
    cats: structuredClone(DEFAULT_CATS),
    adjust: {},
    moves: [],
    expenses,
    chest: round2(history.reduce((a, h) => a + h.saved, 0)),
    history,
    rules: {},
    noSpend: [],
  };
}
