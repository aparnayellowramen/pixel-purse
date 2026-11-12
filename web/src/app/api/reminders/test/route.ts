import { NextResponse } from "next/server";
import { pushConfigured, sendPush } from "@/lib/push-server";
import { supabaseAsUser, supabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Send a test reminder" in Settings: notifies only the signed-in user's own devices. */
export async function POST(req: Request) {
  if (!pushConfigured() || !supabaseConfigured()) return NextResponse.json({ error: "Reminders aren't configured" }, { status: 503 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  // Row-level security limits this to the caller's own subscriptions.
  const { data, error } = await supabaseAsUser(token).from("push_subscriptions").select("endpoint, p256dh, auth");
  if (error) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!data?.length) return NextResponse.json({ error: "Reminders aren't on for this account" }, { status: 404 });

  const results = await Promise.all(
    data.map((d) => sendPush(d, { title: "Test reminder", body: "This is what your daily reminder looks like.", url: "/" })),
  );
  return NextResponse.json({ sent: results.filter((r) => r === "sent").length, failed: results.filter((r) => r !== "sent").length });
}
