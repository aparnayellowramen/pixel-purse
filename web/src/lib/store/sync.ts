/**
 * Mirrors the local save file to Supabase (table `saves`, one row per user).
 * - Local changes are pushed a moment after they happen.
 * - Each push bumps `version` and only succeeds if nobody else saved in between;
 *   if another device did, its version wins and is loaded here.
 * - Offline edits are remembered and pushed on the next start.
 */
import type { AppState } from "../domain/types";
import { supabase } from "../supabase/client";
import { getState, replaceState, subscribe } from "./app-store";

const META_KEY = "pixel-purse-sync";
const PUSH_DELAY_MS = 800;

interface Meta {
  userId: string;
  /** Version of the save last read from or written to the server. 0 = no row yet. */
  version: number;
  /** Local changes not yet on the server. */
  pending: boolean;
}

let meta: Meta | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let applyingRemote = false;
let started = false;
let pushing: Promise<void> | null = null;
const onConflict = new Set<(msg: string) => void>();

function loadMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Meta) : null;
  } catch {
    return null;
  }
}

function saveMeta() {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}

function applyRemote(s: AppState) {
  applyingRemote = true;
  try {
    replaceState(s);
  } finally {
    applyingRemote = false;
  }
}

/** Show a message when another device's save replaced this one. */
export function onSyncMessage(fn: (msg: string) => void) {
  onConflict.add(fn);
  return () => {
    onConflict.delete(fn);
  };
}

/** Load the user's save from the server and decide which copy wins. */
async function pull(userId: string): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { data, error } = await sb.from("saves").select("state, version").eq("user_id", userId).maybeSingle();
  if (error) return; // offline or server trouble: keep using the local copy

  const sameUser = meta?.userId === userId;
  if (!data) {
    // No save on the server yet: this device's copy becomes the save file.
    meta = { userId, version: 0, pending: true };
    saveMeta();
    await push();
    return;
  }
  if (sameUser && meta!.version === data.version) {
    if (meta!.pending) await push(); // offline edits made since the last sync
    return;
  }
  if (sameUser && meta!.pending) onConflict.forEach((f) => f("Your save was updated on another device, so this phone now shows that version."));
  meta = { userId, version: data.version, pending: false };
  saveMeta();
  applyRemote(data.state as AppState);
}

async function doPush(): Promise<void> {
  const sb = supabase();
  if (!sb || !meta) return;
  const state = getState();
  if (!state.started) return; // nothing worth saving before onboarding ends
  const next = meta.version + 1;

  if (meta.version === 0) {
    const { error } = await sb.from("saves").insert({ user_id: meta.userId, state, version: next });
    if (!error) meta = { ...meta, version: next, pending: false };
    else if (error.code === "23505") return pull(meta.userId); // another device created it first
    else meta = { ...meta, pending: true };
  } else {
    const { data, error } = await sb
      .from("saves")
      .update({ state, version: next, updated_at: new Date().toISOString() })
      .eq("user_id", meta.userId)
      .eq("version", meta.version)
      .select("version");
    if (error) meta = { ...meta, pending: true };
    else if (data.length) meta = { ...meta, version: next, pending: false };
    else return pull(meta.userId); // someone saved in between: theirs wins
  }
  saveMeta();
}

function push(): Promise<void> {
  // One push at a time; queue another if changes arrive meanwhile.
  pushing = (pushing ?? Promise.resolve()).then(doPush, doPush).finally(() => {
    pushing = null;
  });
  return pushing;
}

function schedulePush() {
  if (applyingRemote || !meta) return;
  meta = { ...meta, pending: true };
  saveMeta();
  clearTimeout(timer);
  timer = setTimeout(() => void push(), PUSH_DELAY_MS);
}

/** Start syncing for whoever is signed in. Safe to call more than once. */
export async function startSync(): Promise<void> {
  const sb = supabase();
  if (!sb || typeof window === "undefined") return;
  if (!started) {
    started = true;
    meta = loadMeta();
    subscribe(schedulePush);
    window.addEventListener("online", () => meta && void pull(meta.userId));
  }
  const { data } = await sb.auth.getSession();
  let userId = data.session?.user.id;
  if (!userId && getState().started) {
    // Data from before accounts existed: keep it by giving it a guest account.
    const { data: anon } = await sb.auth.signInAnonymously();
    userId = anon.user?.id;
  }
  if (userId) await pull(userId);
}

/** After signing in to an existing account: that account's save replaces this device's copy. */
export async function adoptAccount(userId: string): Promise<boolean> {
  meta = { userId, version: -1, pending: false };
  saveMeta();
  const sb = supabase();
  if (!sb) return false;
  const { data } = await sb.from("saves").select("state, version").eq("user_id", userId).maybeSingle();
  if (!data) {
    meta = { userId, version: 0, pending: true };
    saveMeta();
    return false;
  }
  meta = { userId, version: data.version, pending: false };
  saveMeta();
  applyRemote(data.state as AppState);
  return true;
}

/** The guest account just became a real account (same user id): nothing to move. */
export function flushNow(): Promise<void> {
  clearTimeout(timer);
  return push();
}

export function forgetSync() {
  clearTimeout(timer);
  meta = null;
  saveMeta();
}
