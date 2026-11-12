/**
 * Rule-based expense parser.
 * Used when the AI isn't available (offline, no API key, API error) and to apply the
 * user's saved merchant rules without calling the AI at all.
 */
import { round2 } from "../domain/money";
import type { Category, CategoryId, ParsedItem, ParseResult } from "../domain/types";

export interface ParseContext {
  currency: string;
  /** Today's day of the month. */
  today: number;
  categories: Pick<Category, "id">[];
  rules: Record<string, CategoryId>;
}

const SYMBOL_CODE: Record<string, string> = {
  "ca$": "CAD", "c$": "CAD", cad: "CAD", "us$": "USD", usd: "USD", "€": "EUR", eur: "EUR", euro: "EUR", euros: "EUR",
  "£": "GBP", gbp: "GBP", "₹": "INR", inr: "INR",
};

// [keyword, category, display name if it's a brand]
const KEYWORDS: [string, string, string?][] = [
  ["tim hortons", "food", "Tim Hortons"], ["tims", "food", "Tim Hortons"], ["starbucks", "food", "Starbucks"],
  ["uber eats", "food", "Uber Eats"], ["doordash", "food", "DoorDash"], ["skip the dishes", "food", "SkipTheDishes"],
  ["mcdonalds", "food", "McDonald's"], ["mcdonald's", "food", "McDonald's"], ["subway", "food", "Subway"],
  ["coffee", "food"], ["latte", "food"], ["croissant", "food"], ["lunch", "food"], ["dinner", "food"],
  ["breakfast", "food"], ["brunch", "food"], ["bagel", "food"], ["burger", "food"], ["pizza", "food"],
  ["sushi", "food"], ["restaurant", "food"], ["cafe", "food"], ["snack", "food"],
  ["no frills", "groc", "No Frills"], ["nofrills", "groc", "No Frills"], ["loblaws", "groc", "Loblaws"],
  ["sobeys", "groc", "Sobeys"], ["metro", "groc", "Metro"], ["freshco", "groc", "FreshCo"], ["costco", "groc", "Costco"],
  ["walmart", "groc", "Walmart"], ["groceries", "groc"], ["grocery", "groc"], ["milk", "groc"], ["eggs", "groc"], ["bread", "groc"],
  ["zara", "shop", "Zara"], ["h&m", "shop", "H&M"], ["uniqlo", "shop", "Uniqlo"], ["amazon", "shop", "Amazon"],
  ["sephora", "shop", "Sephora"], ["ikea", "shop", "IKEA"], ["best buy", "shop", "Best Buy"], ["winners", "shop", "Winners"],
  ["clothes", "shop"], ["shoes", "shop"], ["shirt", "shop"], ["jeans", "shop"], ["gift", "shop"],
  ["uber", "trans", "Uber"], ["lyft", "trans", "Lyft"], ["presto", "trans", "Presto"], ["ttc", "trans", "TTC"],
  ["taxi", "trans"], ["bus", "trans"], ["train", "trans"], ["gas", "trans"], ["parking", "trans"],
  ["petro", "trans", "Petro-Canada"], ["esso", "trans", "Esso"],
  ["netflix", "fun", "Netflix"], ["spotify", "fun", "Spotify"], ["steam", "fun", "Steam"], ["movie", "fun"], ["movies", "fun"],
  ["cinema", "fun"], ["concert", "fun"], ["tickets", "fun"], ["bar", "fun"], ["beer", "fun"], ["drinks", "fun"], ["bowling", "fun"],
  ["rogers", "bills", "Rogers"], ["bell", "bills", "Bell"], ["hydro", "bills", "Hydro"], ["internet", "bills"],
  ["phone bill", "bills"], ["insurance", "bills"], ["electricity", "bills"],
  ["credit card", "debt"], ["student loan", "debt"], ["loan", "debt"], ["debt", "debt"],
];

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const KWS = KEYWORDS.map(([kw, cat, brand]) => ({
  kw, cat, brand,
  rx: new RegExp("(^|[^a-z&'])" + escapeRx(kw) + "(?=[^a-z]|$)"),
})).sort((a, b) => b.kw.length - a.kw.length);

const FILLER = new Set(["paid", "pay", "for", "to", "on", "spent", "bought", "buy", "got", "the", "a", "an", "at", "my", "some", "from", "and"]);

const AMOUNT_RX =
  /(ca\$|c\$|us\$|usd|cad|eur|gbp|inr|\$|€|£|₹)?\s*(\d+(?:[.,]\d{1,2})?)\s*(cad|usd|eur|gbp|inr|euros?|dollars|bucks)?(?![a-z0-9])/i;

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export const NO_AMOUNT_MESSAGE = "I couldn't find an amount. Try “coffee 4”.";

export function parseEntry(text: string, ctx: ParseContext): ParseResult {
  const raw = text.trim();
  if (!raw) return { error: "Type what you spent, like “coffee 4”.", source: "rules" };
  const items = raw
    .split(/\s+(?:and|plus|\+)\s+|\s*,\s+/i)
    .map((p) => parsePart(p, ctx))
    .filter((x): x is ParsedItem => x !== null);
  if (!items.length) return { error: NO_AMOUNT_MESSAGE, source: "rules" };
  return { items, source: "rules" };
}

function parsePart(part: string, ctx: ParseContext): ParsedItem | null {
  const low = " " + part.toLowerCase().replace(/\s+/g, " ").trim() + " ";
  const m = low.match(AMOUNT_RX);
  if (!m || m.index === undefined) return null;
  const amount = parseFloat(m[2].replace(",", "."));
  if (!(amount > 0)) return null;

  const symbol = (m[1] || m[3] || "").toLowerCase();
  const cur = SYMBOL_CODE[symbol] ?? ctx.currency;
  let rest = low.slice(0, m.index) + " " + low.slice(m.index + m[0].length);

  let day = ctx.today;
  if (/\byesterday\b/.test(rest)) {
    day = Math.max(1, day - 1);
    rest = rest.replace(/\byesterday\b/, " ");
  }
  rest = rest.replace(/\btoday\b/, " ");

  let merchant = "";
  const at = rest.match(/\b(?:at|from)\s+(.+?)\s*$/);
  if (at && at.index !== undefined) {
    merchant = at[1].trim();
    rest = rest.slice(0, at.index) + " ";
  }

  const hay = " " + merchant + " " + rest + " ";
  const known = new Set(ctx.categories.map((c) => c.id));

  let cat: CategoryId | null = null;
  let how: ParsedItem["how"] = "";
  for (const [k, v] of Object.entries(ctx.rules)) {
    if (k && known.has(v) && (merchant.toLowerCase() === k || hay.includes(" " + k + " "))) {
      cat = v;
      how = "rule";
      break;
    }
  }

  const brandHit = KWS.find((k) => k.brand && k.rx.test(hay));
  const hit = brandHit ?? KWS.find((k) => k.rx.test(hay));
  if (!cat && hit && known.has(hit.cat)) {
    cat = hit.cat;
    how = "keywords";
  }

  if (merchant) {
    const b = KWS.find((k) => k.brand && k.rx.test(" " + merchant + " "));
    merchant = b?.brand ?? titleCase(merchant);
  } else if (brandHit?.brand) {
    merchant = brandHit.brand;
    rest = rest.replace(brandHit.rx, "$1 ");
  }

  const note = rest.split(" ").filter((w) => w && !FILLER.has(w)).join(" ").trim();
  const foreign = cur !== ctx.currency;
  const conf = cat ? (foreign ? 0.7 : how === "rule" ? 0.99 : 0.9) : 0.4;
  return { amount: round2(amount), cur, foreign, cat, merchant, note, day, conf, how };
}

/** Saved merchant rules always win, whichever parser produced the item. */
export function applyMerchantRules(items: ParsedItem[], rules: Record<string, CategoryId>): ParsedItem[] {
  return items.map((i) => {
    const k = i.merchant.toLowerCase();
    return k && rules[k] ? { ...i, cat: rules[k], how: "rule", conf: 0.99 } : i;
  });
}
