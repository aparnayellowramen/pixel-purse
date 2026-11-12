import { describe, expect, it } from "vitest";
import { DEFAULT_CATS } from "../domain/defaults";
import { applyMerchantRules, NO_AMOUNT_MESSAGE, parseEntry, type ParseContext } from "./rules";

const ctx = (over: Partial<ParseContext> = {}): ParseContext => ({
  currency: "CAD",
  today: 11,
  categories: DEFAULT_CATS,
  rules: {},
  ...over,
});

// The examples from PRD §8.2
describe("parseEntry", () => {
  it("coffee CA$ 4 at tim hortons", () => {
    const [i] = parseEntry("coffee CA$ 4 at tim hortons", ctx()).items!;
    expect(i).toMatchObject({ amount: 4, cur: "CAD", foreign: false, cat: "food", merchant: "Tim Hortons", note: "coffee", day: 11 });
    expect(i.conf).toBeGreaterThanOrEqual(0.85);
  });

  it("uber 18.50", () => {
    expect(parseEntry("uber 18.50", ctx()).items![0]).toMatchObject({ amount: 18.5, cat: "trans", merchant: "Uber" });
  });

  it("groceries 62 nofrills yesterday", () => {
    expect(parseEntry("groceries 62 nofrills yesterday", ctx()).items![0]).toMatchObject({
      amount: 62, cat: "groc", merchant: "No Frills", day: 10,
    });
  });

  it("lunch 15 and uber home 22 → two expenses", () => {
    const items = parseEntry("lunch 15 and uber home 22", ctx()).items!;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ amount: 15, cat: "food", note: "lunch" });
    expect(items[1]).toMatchObject({ amount: 22, cat: "trans", merchant: "Uber", note: "home" });
  });

  it("$40 zara uses the home currency", () => {
    expect(parseEntry("$40 zara", ctx()).items![0]).toMatchObject({ amount: 40, cur: "CAD", foreign: false, cat: "shop", merchant: "Zara" });
  });

  it("paid 200 to credit card → debt payment", () => {
    expect(parseEntry("paid 200 to credit card", ctx()).items![0]).toMatchObject({ amount: 200, cat: "debt" });
  });

  it("an amount alone needs a category from the user", () => {
    const [i] = parseEntry("4", ctx()).items!;
    expect(i.cat).toBeNull();
    expect(i.conf).toBeLessThan(0.85);
  });

  it("no amount → friendly error", () => {
    expect(parseEntry("hello", ctx())).toEqual({ error: NO_AMOUNT_MESSAGE, source: "rules" });
  });

  it("another currency is flagged as foreign", () => {
    expect(parseEntry("€12 croissant", ctx()).items![0]).toMatchObject({ amount: 12, cur: "EUR", foreign: true, cat: "food" });
  });

  it("'yesterday' on the 1st stays in this month", () => {
    expect(parseEntry("lunch 10 yesterday", ctx({ today: 1 })).items![0].day).toBe(1);
  });

  it("a saved merchant rule wins over keywords", () => {
    const [i] = parseEntry("zara 40", ctx({ rules: { zara: "fun" } })).items!;
    expect(i).toMatchObject({ cat: "fun", how: "rule" });
  });
});

describe("applyMerchantRules", () => {
  it("overrides the AI's category for a known merchant", () => {
    const items = applyMerchantRules(
      [{ amount: 4, cur: "CAD", foreign: false, cat: "food", merchant: "Tim Hortons", note: "", day: 1, conf: 0.9, how: "claude" }],
      { "tim hortons": "other" },
    );
    expect(items[0]).toMatchObject({ cat: "other", how: "rule" });
  });
});
