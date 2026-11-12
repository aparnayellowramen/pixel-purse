import { describe, expect, it } from "vitest";
import { demoState } from "./domain/defaults";
import { toCsv } from "./export";

describe("CSV export", () => {
  const s = demoState(new Date(2026, 10, 11));
  const csv = toCsv(s);
  const lines = csv.trim().split("\n");

  it("has a header and one row per expense, oldest first", () => {
    expect(lines[0]).toBe("date,amount,currency,category,store,note,counted");
    expect(lines[1]).toBe("2026-11-01,4.50,CAD,Food,Tim Hortons,coffee,yes");
    expect(lines.filter((l) => l.startsWith("2026-11-"))).toHaveLength(s.expenses.length);
  });

  it("includes past months' totals", () => {
    expect(csv).toContain("month,spent,budget,saved,saved to,stars");
    expect(csv).toContain("2026-09,1205.00,1500.00,310.00,savings,6/7");
  });

  it("quotes cells that contain commas or quotes", () => {
    const t = demoState(new Date(2026, 10, 11));
    t.expenses = [{ id: "x", day: 2, amount: 10, cat: "fun", merchant: 'Joe\'s "Bar", Inc', note: "", cur: "CAD", foreign: false }];
    expect(toCsv(t)).toContain('"Joe\'s ""Bar"", Inc"');
  });
});
