import "server-only";
import * as webpush from "web-push";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const pushConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

export function reminderMessage(streak: number) {
  return {
    title: "Logged today's spending?",
    body: streak > 1 ? `Keep your combo going: ×${streak}. It takes 5 seconds.` : "Type what you spent today. It takes 5 seconds.",
    url: "/",
  };
}

/** Sends one notification. Returns "gone" when the device unsubscribed, so its row can be removed. */
export async function sendPush(target: PushTarget, message: { title: string; body: string; url: string }): Promise<"sent" | "gone" | "failed"> {
  setup();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(message),
      { TTL: 60 * 60 * 4, urgency: "normal" },
    );
    return "sent";
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return "gone";
    console.error("[push] send failed:", code, err instanceof Error ? err.message : err);
    return "failed";
  }
}
