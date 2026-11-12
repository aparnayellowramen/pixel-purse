/**
 * Daily reminder on this device (PRD US-8): a web push subscription saved in Supabase.
 * On iPhone this only works in the Home Screen app (iOS 16.4+), never in a Safari tab.
 */
import { isIOS, isStandalone } from "./pwa";
import { accessToken, supabase } from "./supabase/client";

export type ReminderSupport = "ok" | "install-first" | "unsupported" | "dev";

export const DEFAULT_TIME = "20:00";
const TIME_KEY = "pixel-purse-reminder-time";

export function reminderSupport(): ReminderSupport {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !isStandalone()) return "install-first";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (process.env.NODE_ENV !== "production") return "dev"; // the service worker only runs in production builds
  return "ok";
}

export const permission = (): NotificationPermission | "unsupported" =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

function vapidKey(): Uint8Array<ArrayBuffer> {
  const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const padded = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function savedTime(): string {
  try {
    return localStorage.getItem(TIME_KEY) || DEFAULT_TIME;
  } catch {
    return DEFAULT_TIME;
  }
}

/** Is a reminder on for this device? (Checks both the browser and the server row.) */
export async function reminderOn(): Promise<boolean> {
  if (reminderSupport() !== "ok" || permission() !== "granted") return false;
  const sub = await currentSubscription();
  if (!sub) return false;
  const sb = supabase();
  if (!sb) return false;
  const { data } = await sb.from("push_subscriptions").select("endpoint").eq("endpoint", sub.endpoint).maybeSingle();
  return !!data;
}

export type EnableResult = { ok: true } | { ok: false; message: string };

/** Must be called from a tap: browsers only show the permission prompt in response to one. */
export async function enableReminder(time: string): Promise<EnableResult> {
  try {
    return await enable(time);
  } catch (err) {
    console.error("[reminders] enable failed:", err);
    return { ok: false, message: "Couldn't turn on reminders on this device. Check notifications are allowed, then try again." };
  }
}

async function enable(time: string): Promise<EnableResult> {
  const support = reminderSupport();
  if (support === "install-first") return { ok: false, message: "Open Pixel Purse from your Home Screen icon to turn on reminders." };
  if (support !== "ok") return { ok: false, message: "This browser can't show reminders." };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return {
      ok: false,
      message: isIOS()
        ? "Notifications are off. Turn them on in iPhone Settings → Notifications → Pixel Purse."
        : "Notifications are blocked for this site. Allow them in your browser's site settings.",
    };
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() }));
  const json = sub.toJSON();
  const sb = supabase();
  if (!sb) return { ok: false, message: "Reminders need an account. Try again in a moment." };
  const { error } = await sb.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    remind_at: time,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    last_sent: null,
  });
  if (error) return { ok: false, message: "Couldn't save your reminder. Check your connection and try again." };
  try {
    localStorage.setItem(TIME_KEY, time);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export async function changeReminderTime(time: string): Promise<EnableResult> {
  const sub = await currentSubscription();
  const sb = supabase();
  if (!sub || !sb) return { ok: false, message: "Turn the reminder on first." };
  const { error } = await sb.from("push_subscriptions").update({ remind_at: time, last_sent: null }).eq("endpoint", sub.endpoint);
  if (error) return { ok: false, message: "Couldn't change the time. Check your connection." };
  try {
    localStorage.setItem(TIME_KEY, time);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export async function disableReminder(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase()?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestReminder(): Promise<EnableResult> {
  const token = await accessToken();
  const res = await fetch("/api/reminders/test", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, message: body.error ?? "Couldn't send a test reminder." };
}
