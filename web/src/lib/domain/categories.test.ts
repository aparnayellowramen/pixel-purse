import { describe, expect, it } from "vitest";
import { spentIn, totalLeft } from "./budget";
import { applyCategoryChanges, categoryProblems, newCategoryId, removedCategories } from "./categories";
import { demoState } from "./defaults";
import type { Category } from "./types";

const nov11 = () => demoState(new Date(2026, 10, 11));

describe("category editing", () => {
  it("renaming keeps the id, so keyword matching and history still work", () => {
    const s = nov11();
    const next = s.cats.map((c) => (c.id === "food" ? { ...c, name: "Dining & delivery", limit: 400 } : c));
    applyCategoryChanges(s, next);
    expect(s.cats.find((c) => c.id === "food")?.name).toBe("Dining & delivery");
    expect(spentIn(s, "food")).toBe(272);
  });

  it("removing a category moves its expenses where the user chose", () => {
    const s = nov11();
    const bills = spentIn(s, "bills");
    const next = s.cats.filter((c) => c.id !== "bills");
    expect(removedCategories(s, next).map((c) => c.id)).toEqual(["bills"]);
    applyCategoryChanges(s, next, { bills: "other" });
    expect(s.expenses.some((e) => e.cat === "bills")).toBe(false);
    expect(spentIn(s, "other")).toBe(bills);
  });

  it("removing Bills takes fixed costs out of 'left this month'", () => {
    const s = nov11();
    s.expenses = s.expenses.filter((e) => e.cat !== "bills");
    applyCategoryChanges(s, s.cats.filter((c) => c.id !== "bills"));
    expect(totalLeft(s)).toBe(501); // 1,250 of budget left minus 749 of everyday spending
  });

  it("drops rules and rebalancing that point at a removed category", () => {
    const s = nov11();
    s.rules = { zara: "shop", rogers: "bills" };
    s.adjust = { bills: -20, food: 20 };
    applyCategoryChanges(s, s.cats.filter((c) => c.id !== "bills"));
    expect(s.rules).toEqual({ zara: "shop" });
    expect(s.adjust).toEqual({ food: 20 });
  });

  it("new ids are readable and never collide", () => {
    expect(newCategoryId("Travel, gifts & misc", [])).toBe("c-travel-gifts-mis"); // first 16 characters
    expect(newCategoryId("Pets", ["c-pets"])).toBe("c-pets-2");
    expect(newCategoryId("!!!", [])).toBe("c-cat");
  });

  it("flags names, duplicates, amounts and an all-debt list", () => {
    const base: Category = { id: "a", name: "Food", icon: "food", limit: 100 };
    expect(categoryProblems([base])).toEqual([]);
    expect(categoryProblems([{ ...base, name: " " }])).toContain("Every category needs a name.");
    expect(categoryProblems([base, { ...base, id: "b", name: "food " }])[0]).toMatch(/two categories called "food"/);
    expect(categoryProblems([{ ...base, limit: -1 }])[0]).toMatch(/amount of 0 or more/);
    expect(categoryProblems([{ ...base, debt: true }])).toContain("Keep at least one spending category.");
  });
});
