// Offline check against a PRODUCTION build (the service worker is off in development):
//   $env:NEXT_DIST_DIR=".next-prod"; npm run build; npx next start --port 3100
//   $env:BASE_URL="http://localhost:3100"; node e2e/offline.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
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
const text = (t) => page.getByText(t, { exact: false }).first().waitFor({ timeout: 15000 });
const syncMeta = () => page.evaluate(() => JSON.parse(localStorage.getItem("pixel-purse-sync") || "null"));

await step("set up a guest while online", async () => {
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Play as guest" }).click();
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.waitForURL(BASE + "/");
  await text("Left this month");
});
await step("the service worker takes control", async () => {
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 20000 }).catch(async () => {
    await page.reload(); // first load can finish before the worker claims the page
    await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 20000 });
  });
  await page.waitForTimeout(1500); // let the precache message finish
});
await step("going offline shows the offline note", async () => {
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await text("Offline");
});
await step("the app still opens with no connection", async () => {
  await page.reload();
  await text("Left this month");
});
await step("logging still works offline (keyword parser)", async () => {
  await page.locator("#add").fill("coffee 4 at tim hortons");
  await page.locator("#add").press("Enter");
  await text("Offline · basic matching");
  await text("Food: CA$396 left");
  const m = await syncMeta();
  if (!m?.pending) throw new Error(`expected a pending sync, got ${JSON.stringify(m)}`);
});
await step("back online, the offline expense syncs", async () => {
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  for (let i = 0; i < 30; i++) {
    const m = await syncMeta();
    if (m && !m.pending && m.version >= 2) return;
    await page.waitForTimeout(500);
  }
  throw new Error(`still pending: ${JSON.stringify(await syncMeta())}`);
});

await browser.close();
console.log(problems.length ? `\nBrowser problems:\n- ${problems.join("\n- ")}` : "\nNo browser errors.");
process.exit(failed ? 1 : 0);
