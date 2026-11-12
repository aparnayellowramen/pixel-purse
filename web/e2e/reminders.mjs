// Reminders check against a PRODUCTION build (service worker is off in development):
//   $env:NEXT_DIST_DIR=".next-prod"; npm run build; npx next start --port 3100
//   $env:BASE_URL="http://localhost:3100"; node e2e/reminders.mjs
// Turns a reminder on for a throwaway guest, sends a test push through the real push service,
// then turns it off again.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.grantPermissions(["notifications"], { origin: BASE });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));

let failed = false;
async function step(name, fn) {
  if (failed) return console.log("-   ", name, "(skipped)");
  try {
    await fn();
    console.log("OK  ", name);
  } catch (e) {
    failed = true;
    console.log("FAIL", name, "->", String(e.message).split("\n")[0]);
    await page.screenshot({ path: "e2e/failure.png", fullPage: true });
  }
}
const text = (t) => page.getByText(t, { exact: false }).first().waitFor({ timeout: 20000 });
const reminder = () => page.locator("section", { hasText: "Daily reminder" });

await step("set up a guest", async () => {
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Play as guest" }).click();
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.waitForURL(BASE + "/");
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 20000 }).catch(() => page.reload());
});
await step("Settings shows the Daily reminder controls", async () => {
  await page.goto(BASE + "/settings");
  await text("Daily reminder");
  await page.locator("#reminder-time").waitFor();
});
let noPushService = false;
await step("turning the reminder on subscribes and saves it", async () => {
  await page.locator("#reminder-time").fill("21:30");
  await reminder().getByRole("button", { name: "On", exact: true }).click();
  const ok = page.getByText("Reminder set for 21:30 every day.");
  const err = reminder().locator(".err");
  await Promise.race([ok.waitFor({ timeout: 20000 }), err.waitFor({ timeout: 20000 })]);
  if (await ok.isVisible()) return;
  // Headless browsers have no push service. The app must say so clearly and not get stuck.
  const msg = await err.textContent();
  if (!/Couldn't turn on reminders/.test(msg ?? "")) throw new Error(`unexpected error: ${msg}`);
  if (await reminder().getByRole("button", { name: "On", exact: true }).isDisabled()) throw new Error("buttons stuck after an error");
  noPushService = true;
  console.log("     (this browser has no push service: checked the error message and that the buttons recover)");
});
if (noPushService) {
  await browser.close();
  console.log("\nSKIPPED the push-sending steps: run them on a real device (iPhone or a normal browser window).");
  process.exit(0);
}
await step("Send a test reminder goes through the push service", async () => {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/reminders/test"), { timeout: 30000 }),
    page.getByRole("button", { name: "Send a test reminder" }).click(),
  ]);
  const body = await res.json();
  if (!res.ok() || body.sent < 1) throw new Error(`test send: ${res.status()} ${JSON.stringify(body)}`);
  await text("Test reminder sent.");
});
await step("after reloading, Settings still shows the reminder as on", async () => {
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Daily reminder'))?.querySelector('button[aria-pressed="true"]')?.textContent === "On", null, { timeout: 20000 });
});
await step("turning it off removes the subscription", async () => {
  await reminder().getByRole("button", { name: "Off", exact: true }).click();
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/reminders/test"), { timeout: 5000 }).catch(() => null),
    page.waitForTimeout(1500),
  ]);
  void res;
  const r = await page.evaluate(async () => {
    const t = JSON.parse(localStorage.getItem("pixel-purse-auth") || "{}").access_token;
    const x = await fetch("/api/reminders/test", { method: "POST", headers: { authorization: `Bearer ${t}` } });
    return x.status;
  });
  if (r !== 404) throw new Error(`expected no subscriptions (404), got ${r}`);
});

await browser.close();
console.log(problems.length ? `\nBrowser problems:\n- ${problems.join("\n- ")}` : "\nNo browser errors.");
process.exit(failed ? 1 : 0);
