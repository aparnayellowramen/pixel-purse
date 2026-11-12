import { NextResponse } from "next/server";
import * as z from "zod";
import { claudeAvailable, parseWithClaude } from "@/lib/parse/claude";
import { parseEntry } from "@/lib/parse/rules";
import { supabaseAsUser, supabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** AI parses allowed per user per day (PRD §8.4). After that, the rule parser takes over. */
const DAILY_AI_LIMIT = 100;

const Body = z.object({
  text: z.string().trim().min(1).max(200),
  currency: z.string().regex(/^[A-Z]{3}$/),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categories: z
    .array(z.object({ id: z.string().min(1).max(40), name: z.string().min(1).max(40), debt: z.boolean().optional() }))
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const input = parsed.data;

  const fallback = () =>
    parseEntry(input.text, {
      currency: input.currency,
      today: Number(input.today.slice(8, 10)),
      categories: input.categories,
      rules: {},
    });

  if (!claudeAvailable()) return NextResponse.json(fallback());

  // Every AI call costs money, so it needs a signed-in user (guest accounts count) within the daily limit.
  if (supabaseConfigured()) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const { data: count, error } = await supabaseAsUser(token).rpc("claim_parse");
    if (error) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (typeof count === "number" && count > DAILY_AI_LIMIT) return NextResponse.json(fallback());
  }

  try {
    return NextResponse.json(await parseWithClaude(input));
  } catch (err) {
    console.error("[parse] Claude failed, using rule parser:", err instanceof Error ? err.message : err);
    return NextResponse.json(fallback());
  }
}
