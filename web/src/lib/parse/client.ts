import { isoDate } from "../domain/month";
import { accessToken } from "../supabase/client";
import type { AppState, ParseResult } from "../domain/types";
import { applyMerchantRules, parseEntry } from "./rules";

/**
 * Parse what the user typed.
 * 1. Saved merchant rules match → no AI call (faster, free).
 * 2. Otherwise ask the server (Claude Opus 5.5).
 * 3. Offline or the server fails → the rule parser's result.
 */
export async function parseOnClient(text: string, s: AppState): Promise<ParseResult> {
  const local = parseEntry(text, { currency: s.currency, today: s.month.day, categories: s.cats, rules: s.rules });
  if (local.items?.length && local.items.every((i) => i.how === "rule")) return local;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const token = await accessToken();
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        text,
        currency: s.currency,
        today: isoDate(s.month, s.month.day),
        categories: s.cats.map(({ id, name, debt }) => ({ id, name, debt: !!debt })),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ParseResult;
    return data.items ? { ...data, items: applyMerchantRules(data.items, s.rules) } : data;
  } catch {
    return { ...local, source: "offline" };
  } finally {
    clearTimeout(timer);
  }
}
