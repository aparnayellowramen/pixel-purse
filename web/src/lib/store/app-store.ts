/**
 * App state store. Screens only use useAppState(), getState() and update().
 * The state is cached in this browser, and sync.ts mirrors it to Supabase.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_CATS, demoState } from "../domain/defaults";
import { monthKeyOf, monthObj } from "../domain/month";
import type { AppState, Category, HomeCurrency, User } from "../domain/types";

const KEY = "pixel-purse-v1";

let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode): keep working in memory */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

/** A brand-new player who hasn't finished onboarding. */
export function blankState(now = new Date()): AppState {
  return {
    v: 1,
    started: false,
    user: { guest: true },
    currency: "CAD",
    sound: false,
    leftoverTo: "savings",
    level: 1,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastLogDay: -5,
    month: monthObj(monthKeyOf(now), now.getDate()),
    cats: structuredClone(DEFAULT_CATS),
    adjust: {},
    moves: [],
    expenses: [],
    chest: 0,
    history: [],
    rules: {},
    noSpend: [],
  };
}

/** Bring a saved state up to today: same month → update the day; month over → month end is due. */
function refreshDate(s: AppState, now = new Date()): AppState {
  const current = monthKeyOf(now);
  if (s.month.key === current) s.month.day = now.getDate();
  else if (s.month.key < current) {
    s.month.day = s.month.days;
    s.monthEndDue = true;
  }
  // A month after `current` only happens after "Simulate month end"; keep it as is.
  return s;
}

function init() {
  if (state || typeof window === "undefined") return;
  const saved = load();
  state = saved ? refreshDate(saved) : blankState();
  persist();
}

export function getState(): AppState {
  init();
  if (!state) throw new Error("App state is only available in the browser");
  return state;
}

/** Apply a change to a copy of the state, then save and notify the UI. */
export function update(change: (draft: AppState) => void) {
  const draft = structuredClone(getState());
  change(draft);
  state = draft;
  persist();
  notify();
}

/** Replace everything (for example with the save file loaded from Supabase). */
export function replaceState(next: AppState) {
  state = refreshDate(structuredClone(next));
  persist();
  notify();
}

/** Onboarding finished: start the first month with these budgets. */
export function newGame(currency: HomeCurrency, cats: Category[], user: User) {
  const s = blankState();
  s.currency = currency;
  s.cats = cats;
  s.user = user;
  replaceState(s);
}

export function loadDemo() {
  const d = demoState(new Date());
  d.user = getState().user;
  replaceState(d);
}

/** Forget everything on this device (after signing out). */
export function clearLocal() {
  replaceState(blankState());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Null during server rendering and the first hydration pass. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      init();
      return state;
    },
    () => null,
  );
}
