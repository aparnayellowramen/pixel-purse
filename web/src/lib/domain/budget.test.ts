import { describe, expect, it } from "vitest";
import { barState, dailyPace, daysLeft, remaining, spentIn, totalLeft } from "./budget";
import { demoState } from "./defaults";
import type { AppState } from "./types";

const demo = (): AppState => demoState(new Date(2026, 10, 11)); // 11 Nov 2026

describe("budget math (demo save file on Nov 11)", () => {
  it("adds up spending per category", () => {
    const s = demo();
    expect(spentIn(s, "food")).toBe(272);
    expect(spentIn(s, "shop")).toBe(188);
    expect(spentIn(s, "debt")).toBe(150);
  });

  it("left this month excludes debt payments", () => {
    expect(totalLeft(demo())).toBe(501);
  });

  it("daily pace spreads what's left over the remaining days, including today", () => {
    const s = demo();
    expect(daysLeft(s)).toBe(20);
    expect(dailyPace(s)).toBeCloseTo(25.05);
  });

  it("rebalancing moves budget between bars without changing the total", () => {
    const s = demo();
    s.adjust = { fun: -20, shop: 20 };
    expect(remaining(s, s.cats.find((c) => c.id === "shop")!)).toBe(32);
    expect(totalLeft(s)).toBe(501);
  });

  it("foreign-currency expenses aren't counted", () => {
    const s = demo();
    s.expenses.push({ id: "x", day: 11, amount: 12, cat: "food", merchant: "", note: "", cur: "EUR", foreign: true });
    expect(spentIn(s, "food")).toBe(272);
  });

  it("bar colours: green > 50% left, amber 20-50%, red below", () => {
    const s = demo();
    const cat = (id: string) => s.cats.find((c) => c.id === id)!;
    expect(barState(s, cat("trans")).tone).toBe("ok"); // 86 of 150 left
    expect(barState(s, cat("food")).tone).toBe("warn"); // 128 of 400 left
    expect(barState(s, cat("shop")).tone).toBe("bad"); // 12 of 200 left
    expect(barState(s, cat("debt"))).toMatchObject({ tone: "debt", pct: 50 });
  });

  it("over budget shows how much over", () => {
    const s = demo();
    s.expenses.push({ id: "x", day: 11, amount: 40, cat: "shop", merchant: "Zara", note: "", cur: "CAD", foreign: false });
    expect(barState(s, s.cats.find((c) => c.id === "shop")!)).toMatchObject({ pct: 0, tone: "bad", text: "CA$28 over" });
  });
});
