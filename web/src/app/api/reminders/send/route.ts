import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { pushConfigured, reminderMessage, sendPush } from "@/lib/push-server";
import { supabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time comparison, so the secret can't be guessed from response timing. */
function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Sends the daily reminders that are due. Called every 15 minutes by Supabase's scheduler (pg_cron),
 * with the shared CRON_SECRET. Anyone else gets 401.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !sameSecret(given, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured() || !supabaseConfigured()) return NextResponse.json({ error: "Reminders aren't configured" }, { status: 503 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("claim_due_reminders", { p_secret: secret });
  if (error) {
    console.error("[reminders] claim failed:", error.message);
    return NextResponse.json({ error: "Couldn't load reminders" }, { status: 500 });
  }

  const due = (data ?? []) as { endpoint: string; p256dh: string; auth: string; streak: number }[];
  const results = await Promise.all(due.map((d) => sendPush(d, reminderMessage(d.streak))));
  await Promise.all(
    due.filter((_, i) => results[i] === "gone").map((d) => db.rpc("remove_push_subscription", { p_secret: secret, p_endpoint: d.endpoint })),
  );

  return NextResponse.json({
    due: due.length,
    sent: results.filter((r) => r === "sent").length,
    removed: results.filter((r) => r === "gone").length,
    failed: results.filter((r) => r === "failed").length,
  });
}
