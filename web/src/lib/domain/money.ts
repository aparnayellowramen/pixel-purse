export const CURRENCY_SYMBOL: Record<string, string> = {
  CAD: "CA$",
  USD: "US$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
};

export const CURRENCY_NAME: Record<string, string> = {
  CAD: "Canadian dollar",
  USD: "US dollar",
  GBP: "British pound",
  EUR: "Euro",
  INR: "Indian rupee",
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const symbolFor = (cur: string) => CURRENCY_SYMBOL[cur] ?? `${cur} `;

/** CA$4.00, or −CA$4.00 */
export function fmt(n: number, cur: string): string {
  return (n < 0 ? "−" : "") + symbolFor(cur) + Math.abs(n).toFixed(2);
}

/** CA$1,205 (whole units) */
export function fmt0(n: number, cur: string): string {
  return (n < 0 ? "−" : "") + symbolFor(cur) + Math.round(Math.abs(n)).toLocaleString("en-US");
}
