import { NextResponse } from "next/server";
import * as z from "zod";
import { claudeAvailable, parseWithClaude } from "@/lib/parse/claude";
import { parseEntry } from "@/lib/parse/rules";

export const runtime = "nodejs";

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

  // TODO(M3): require a session and limit each user to 100 parses a day.

  const fallback = () =>
    parseEntry(input.text, {
      currency: input.currency,
      today: Number(input.today.slice(8, 10)),
      categories: input.categories,
      rules: {},
    });

  if (!claudeAvailable()) return NextResponse.json(fallback());

  try {
    return NextResponse.json(await parseWithClaude(input));
  } catch (err) {
    console.error("[parse] Claude failed, using rule parser:", err instanceof Error ? err.message : err);
    return NextResponse.json(fallback());
  }
}
