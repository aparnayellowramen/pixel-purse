/**
 * Account actions (sign-in-flow.md).
 * Email sign-in uses a 6-digit code typed into the app, never a link, because
 * on iPhone a link opens Safari instead of the Home Screen app.
 */
import { supabase } from "./supabase/client";
import { getState, update, clearLocal } from "./store/app-store";
import { adoptAccount, flushNow, forgetSync, startSync } from "./store/sync";

export type AuthResult = { ok: true } | { ok: false; reason: "offline" | "exists" | "not-found" | "bad-code" | "error"; message: string };

const fail = (reason: Exclude<AuthResult, { ok: true }>["reason"], message: string): AuthResult => ({ ok: false, reason, message });

function client() {
  const sb = supabase();
  if (!sb) throw new Error("Supabase isn't configured. Add the keys to web/.env.local.");
  return sb;
}

export async function currentUser() {
  const { data } = await client().auth.getUser();
  return data.user;
}

/** "Get started": a guest account with no name or email. */
export async function startAsGuest(): Promise<AuthResult> {
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session) {
    await startSync();
    return { ok: true };
  }
  const { error } = await sb.auth.signInAnonymously();
  if (error) return fail("offline", "Need a connection to start a new game.");
  await startSync(); // attach the new account so onboarding gets saved to it
  return { ok: true };
}

/* ---------- save your progress: guest → real account (same user, data stays) ---------- */

export async function sendSaveCode(email: string): Promise<AuthResult> {
  const { error } = await client().auth.updateUser({ email });
  if (!error) return { ok: true };
  if (error.code === "email_exists" || /already been registered/i.test(error.message)) {
    return fail("exists", "This email already has a save file.");
  }
  if (error.code === "over_email_send_rate_limit") return fail("error", "Too many codes sent. Wait a few minutes and try again.");
  return fail("error", error.message);
}

export async function verifySaveCode(email: string, token: string): Promise<AuthResult> {
  const { error } = await client().auth.verifyOtp({ email, token, type: "email_change" });
  if (error) return fail("bad-code", "That code didn't match, or it expired. Try again or get a new code.");
  update((s) => {
    s.user = { guest: false, email };
  });
  await flushNow();
  return { ok: true };
}

/* ---------- load your save: sign in to an existing account ---------- */

export async function sendSignInCode(email: string): Promise<AuthResult> {
  const { error } = await client().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (!error) return { ok: true };
  if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
    return fail("not-found", "No save file found for this email.");
  }
  if (error.code === "over_email_send_rate_limit") return fail("error", "Too many codes sent. Wait a few minutes and try again.");
  return fail("error", error.message);
}

export async function verifySignInCode(email: string, token: string): Promise<AuthResult> {
  const { data, error } = await client().auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return fail("bad-code", "That code didn't match, or it expired. Try again or get a new code.");
  const found = await adoptAccount(data.user.id);
  if (!found) {
    // Signed in, but this account has no save yet: start fresh with it.
    clearLocal();
  }
  update((s) => {
    s.user = { guest: false, email };
  });
  return { ok: true };
}

/* ---------- sign out ---------- */

export async function signOut() {
  forgetSync();
  await client().auth.signOut();
  clearLocal();
}

export const isGuest = () => getState().user.guest;
