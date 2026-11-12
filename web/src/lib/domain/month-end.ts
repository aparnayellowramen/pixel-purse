import { limitOf, spendCats, spentIn } from "./budget";
import { summarizeMonth } from "./defaults";
import { fmt0, round2 } from "./money";
import { monthKeyOf, monthObj, shiftKey } from "./month";
import type { AppState, CategoryId, MonthRecord } from "./types";

export interface BudgetTip {
  from: CategoryId;
  to: CategoryId;
  amt: number;
  text: string;
}

export interface LevelResult {
  record: MonthRecord;
  /** Money left in spending bars, going to savings or debt. */
  leftover: number;
  dest: "savings" | "debt";
  tip: BudgetTip | null;
}

const STEP = 25;

/** Score the current month without changing anything. */
export function computeLevel(s: AppState): LevelResult {
  const cats = spendCats(s).map((c) => ({ id: c.id, name: c.name, icon: c.icon, limit: limitOf(s, c), spent: spentIn(s, c.id) }));
  const record = summarizeMonth(s.month.key, cats, {
    debtPaid: spentIn(s, "debt"),
    streak: s.streak,
    moves: structuredClone(s.moves),
    savedTo: s.leftoverTo,
  });

  // One tip: move budget from the bar with the most left to the bar that went over the most.
  let tip: BudgetTip | null = null;
  const over = cats.filter((c) => c.spent > c.limit).sort((a, b) => b.spent - b.limit - (a.spent - a.limit))[0];
  const under = cats
    .filter((c) => c.limit - c.spent >= STEP && c.id !== over?.id)
    .sort((a, b) => b.limit - b.spent - (a.limit - a.spent))[0];
  if (over && under) {
    const amt = Math.min(Math.ceil((over.spent - over.limit) / STEP) * STEP, Math.floor((under.limit - under.spent) / STEP) * STEP);
    const base = (id: CategoryId) => s.cats.find((c) => c.id === id)!.limit;
    if (amt > 0) {
      tip = {
        from: under.id,
        to: over.id,
        amt,
        text: `${over.name} went over by ${fmt0(over.spent - over.limit, s.currency)}. Raise ${over.name} to ${fmt0(base(over.id) + amt, s.currency)} and lower ${under.name} to ${fmt0(base(under.id) - amt, s.currency)} next month?`,
      };
    }
  }
  return { record, leftover: record.saved, dest: s.leftoverTo, tip };
}

/** The month after this one, or the real current month if the user skipped ahead. */
export function nextMonthKey(s: AppState, now: Date): string {
  const next = shiftKey(s.month.key, 1);
  const current = monthKeyOf(now);
  return current > next ? current : next;
}

/** Close the month: record it, pay out leftovers, start the next month with full bars. */
export function applyLevel(s: AppState, result: LevelResult, acceptTip: boolean, now: Date) {
  s.history.push(result.record);
  if (result.dest === "savings") s.chest = round2(s.chest + result.leftover);
  if (acceptTip && result.tip) {
    const to = s.cats.find((c) => c.id === result.tip!.to);
    const from = s.cats.find((c) => c.id === result.tip!.from);
    if (to && from) {
      to.limit += result.tip.amt;
      from.limit -= result.tip.amt;
    }
  }
  s.xp += 100 + (result.dest === "debt" && result.leftover > 0 ? 50 : 0);
  while (s.xp >= 500) {
    s.xp -= 500;
    s.level++;
  }
  const key = nextMonthKey(s, now);
  s.month = monthObj(key, key === monthKeyOf(now) ? now.getDate() : 1);
  s.expenses = [];
  s.adjust = {};
  s.moves = [];
  s.noSpend = [];
  s.lastLogDay = 0;
  s.monthEndDue = false;
}
