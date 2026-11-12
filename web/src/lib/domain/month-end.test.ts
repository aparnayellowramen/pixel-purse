import { describe, expect, it } from "vitest";
import { remaining, totalLeft } from "./budget";
import { demoState } from "./defaults";
import { applyLevel, computeLevel } from "./month-end";

const NOV_11 = new Date(2026, 10, 11);

describe("month end", () => {
  it("scores the month and offers one tip", () => {
    const s = demoState(NOV_11);
    s.expenses.push({ id: "x", day: 11, amount: 40, cat: "shop", merchant: "Zara", note: "", cur: "CAD", foreign: false });
    const r = computeLevel(s);
    expect(r.record.stars).toBe(6); // Shopping went over
    expect(r.record.maxStars).toBe(7);
    expect(r.leftover).toBe(489); // what's left in the 6 bars that survived
    expect(r.tip).toMatchObject({ to: "shop", from: "groc", amt: 50 });
  });

  it("pays leftovers into the chest and starts the next month with full bars", () => {
    const s = demoState(NOV_11);
    const chest = s.chest;
    const r = computeLevel(s);
    applyLevel(s, r, false, NOV_11);
    expect(s.chest).toBe(chest + r.leftover);
    expect(s.history.at(-1)?.key).toBe("2026-11");
    expect(s.month.key).toBe("2026-12");
    expect(s.month.day).toBe(1);
    expect(s.expenses).toHaveLength(0);
    expect(totalLeft(s)).toBe(1500);
  });

  it("leftovers sent to debt don't go into the chest", () => {
    const s = demoState(NOV_11);
    s.leftoverTo = "debt";
    const chest = s.chest;
    applyLevel(s, computeLevel(s), false, NOV_11);
    expect(s.chest).toBe(chest);
    expect(s.history.at(-1)?.savedTo).toBe("debt");
  });

  it("an accepted tip moves budget for next month", () => {
    const s = demoState(NOV_11);
    s.expenses.push({ id: "x", day: 11, amount: 40, cat: "shop", merchant: "", note: "", cur: "CAD", foreign: false });
    const r = computeLevel(s);
    applyLevel(s, r, true, NOV_11);
    const cat = (id: string) => s.cats.find((c) => c.id === id)!;
    expect(cat("shop").limit).toBe(250);
    expect(cat("groc").limit).toBe(300);
    expect(remaining(s, cat("shop"))).toBe(250);
  });

  it("jumps to the real current month after a long break", () => {
    const s = demoState(NOV_11);
    applyLevel(s, computeLevel(s), false, new Date(2027, 1, 3));
    expect(s.month.key).toBe("2027-02");
    expect(s.month.day).toBe(3);
  });
});
