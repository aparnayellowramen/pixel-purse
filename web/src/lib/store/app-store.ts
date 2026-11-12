/**
 * App state store (M1-M2: saved in this browser).
 * Screens only use useAppState(), getState() and update(), so M3 can swap the
 * persistence for Supabase without touching the UI.
 */
import { useSyncExternalStore } from "react";
import { demoState } from "../domain/defaults";
import { monthKeyOf } from "../domain/month";
import type { AppState } from "../domain/types";

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

function init() {
  if (state || typeof window === "undefined") return;
  const now = new Date();
  const current = monthKeyOf(now);
  const saved = load();
  if (!saved) {
    state = demoState(now);
  } else {
    if (saved.month.key === current) saved.month.day = now.getDate();
    else if (saved.month.key < current) {
      // The month ended while the app was closed: score it before anything else.
      saved.month.day = saved.month.days;
      saved.monthEndDue = true;
    }
    // A month after `current` only happens after "Simulate month end"; keep it as is.
    state = saved;
  }
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
  listeners.forEach((l) => l());
}

export function resetDemo() {
  state = demoState(new Date());
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
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
