import type { AppState, Category, CategoryId } from "./types";

/** Icons a category can use (all original pixel art in components/pixel-icon.tsx). */
export const CATEGORY_ICONS = [
  "food", "groc", "shop", "trans", "fun", "bills", "plane", "gift", "home", "phone", "heart", "star", "coin", "debt", "other",
] as const;

export const MAX_NAME = 24;
export const MAX_CATEGORIES = 15;

/** Problems with a set of categories, in the order the user should fix them. */
export function categoryProblems(cats: Category[]): string[] {
  const problems: string[] = [];
  const names = new Map<string, number>();
  cats.forEach((c) => {
    const n = c.name.trim();
    if (!n) problems.push("Every category needs a name.");
    else if (n.length > MAX_NAME) problems.push(`"${n.slice(0, 12)}…" is too long. Keep names under ${MAX_NAME} characters.`);
    const key = n.toLowerCase();
    if (key) names.set(key, (names.get(key) ?? 0) + 1);
    if (!Number.isFinite(c.limit) || c.limit < 0) problems.push(`${n || "A category"} needs an amount of 0 or more.`);
  });
  for (const [name, count] of names) if (count > 1) problems.push(`There are two categories called "${name}". Rename one.`);
  if (!cats.some((c) => !c.debt)) problems.push("Keep at least one spending category.");
  if (cats.length > MAX_CATEGORIES) problems.push(`You can have up to ${MAX_CATEGORIES} categories.`);
  return [...new Set(problems)];
}

/** A stable id for a new category, from its name. Renaming later keeps the id. */
export function newCategoryId(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "cat";
  let id = `c-${base}`;
  for (let i = 2; used.has(id); i++) id = `c-${base}-${i}`;
  return id;
}

/** Categories that exist now but not in `next`. */
export function removedCategories(s: AppState, next: Category[]): Category[] {
  const keep = new Set(next.map((c) => c.id));
  return s.cats.filter((c) => !keep.has(c.id));
}

/**
 * Apply edited categories to the state. Expenses in removed categories move to `moveTo[removedId]`
 * (or the first spending category). Rules and rebalancing for removed categories are dropped.
 */
export function applyCategoryChanges(s: AppState, next: Category[], moveTo: Record<CategoryId, CategoryId> = {}) {
  const removed = removedCategories(s, next).map((c) => c.id);
  const fallback = next.find((c) => !c.debt)?.id ?? next[0]?.id;
  const cleaned = next.map((c) => ({ ...c, name: c.name.trim(), limit: Math.round(c.limit * 100) / 100 }));

  for (const e of s.expenses) {
    if (removed.includes(e.cat)) e.cat = moveTo[e.cat] && cleaned.some((c) => c.id === moveTo[e.cat]) ? moveTo[e.cat] : fallback;
  }
  for (const [merchant, cat] of Object.entries(s.rules)) if (removed.includes(cat)) delete s.rules[merchant];
  for (const id of removed) delete s.adjust[id];
  s.cats = cleaned;
}
