export const CURRENCIES = ["CAD", "USD", "GBP", "EUR", "INR"] as const;
export type HomeCurrency = (typeof CURRENCIES)[number];

export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  /** Name of a pixel icon (see components/pixel-icon.tsx). */
  icon: string;
  /** Monthly budget in home currency. For debt, the planned monthly payment. */
  limit: number;
  /** Never suggested as a source when rebalancing. */
  protected?: boolean;
  /** Spending here is progress (debt paid), not damage. */
  debt?: boolean;
}

export interface Expense {
  id: string;
  /** Day of the current budget month (1-31). */
  day: number;
  amount: number;
  cat: CategoryId;
  merchant: string;
  note: string;
  /** ISO currency code the amount was entered in. */
  cur: string;
  /** True when `cur` isn't the home currency. Not counted until converted. */
  foreign: boolean;
}

export interface Month {
  /** "YYYY-MM" */
  key: string;
  name: string;
  year: number;
  /** Today's day of month while this month is current. */
  day: number;
  days: number;
}

export interface Move {
  from: CategoryId | "chest";
  to: CategoryId;
  amt: number;
}

export interface MonthCategoryResult {
  id: CategoryId;
  name: string;
  icon: string;
  limit: number;
  spent: number;
}

export interface MonthRecord {
  key: string;
  cats: MonthCategoryResult[];
  budget: number;
  spent: number;
  saved: number;
  stars: number;
  maxStars: number;
  savedTo: "savings" | "debt";
  moves: Move[];
  debtPaid: number;
  streak: number;
}

export interface User {
  guest: boolean;
  email?: string;
}

export interface AppState {
  v: 1;
  started: boolean;
  user: User;
  currency: HomeCurrency;
  sound: boolean;
  leftoverTo: "savings" | "debt";
  level: number;
  xp: number;
  streak: number;
  bestStreak: number;
  lastLogDay: number;
  month: Month;
  cats: Category[];
  /** Per-category budget changes this month from rebalancing. */
  adjust: Record<CategoryId, number>;
  moves: Move[];
  expenses: Expense[];
  /** Treasure chest (Savings) total. */
  chest: number;
  history: MonthRecord[];
  /** Merchant (lowercase) → category the user chose. */
  rules: Record<string, CategoryId>;
  /** "YYYY-MM-D" keys of days marked as no-spend. */
  noSpend: string[];
  /** The saved month has ended on the calendar; show Level complete before anything else. */
  monthEndDue?: boolean;
}

export type ParseSource = "rules" | "claude" | "offline";

export interface ParsedItem {
  amount: number;
  cur: string;
  foreign: boolean;
  cat: CategoryId | null;
  merchant: string;
  note: string;
  day: number;
  /** 0-1: how sure we are of the category. */
  conf: number;
  how: "rule" | "keywords" | "claude" | "";
  /** Set when the user picked the category on the confirm card. */
  picked?: boolean;
}

export interface ParseResult {
  items?: ParsedItem[];
  error?: string;
  source: ParseSource;
}
