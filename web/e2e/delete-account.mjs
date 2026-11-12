// End-to-end check of Delete account (sign-in-flow.md, Flow G) as a fresh guest.
// Run: node e2e/delete-account.mjs   (needs supabase/migrations/0002_delete_account.sql applied)
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && problems.push(`console: ${m.text()}`));
page.on("response", (r) => {
  // Expected: logging out a user who was just deleted returns 403 (supabase-js ignores it).
  const expected = r.status() === 403 && new URL(r.url()).pathname === "/auth/v1/logout";
  if (r.status() >= 400 && !expected) problems.push(`HTTP ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
});

let failed = false;
async function step(name, fn) {
  if (failed) return console.log("-", name, "(skipped)");
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
const session = () => page.evaluate(() => JSON.parse(localStorage.getItem("pixel-purse-auth") || "null"));

let userId, token;
await step("create a guest and finish onboarding", async () => {
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Play as guest" }).click();
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.waitForURL(BASE + "/");
  await page.locator("#add").fill("lunch 15");
  await page.locator("#add").press("Enter");
  await text("Food: CA$385 left");
  const s = await session();
  userId = s?.user?.id;
  token = s?.access_token;
  if (!userId) throw new Error("no session");
});
await step("the save file exists on the server", async () => {
  for (let i = 0; i < 20; i++) {
    const m = await page.evaluate(() => JSON.parse(localStorage.getItem("pixel-purse-sync") || "null"));
    if (m?.version >= 1 && !m.pending) return;
    await page.waitForTimeout(500);
  }
  throw new Error("save never synced");
});
await step("Settings links to Delete account", async () => {
  await page.goto(BASE + "/settings");
  await page.getByRole("link", { name: "Delete account" }).click();
  await page.getByRole("heading", { name: "Delete your save file forever?" }).waitFor();
  await text("1 expense this month");
});
await step("Download my data gives a CSV", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download my data/ }).click()]);
  const path = await dl.path();
  const fs = await import("node:fs");
  const csv = fs.readFileSync(path, "utf8");
  if (!csv.includes("Food") || !csv.startsWith("date,amount")) throw new Error("unexpected CSV: " + csv.slice(0, 80));
});
await step("Delete forever is locked until DELETE is typed", async () => {
  if (await page.getByRole("button", { name: "Delete forever" }).isEnabled()) throw new Error("button enabled too early");
  await page.locator("#confirm-delete").fill("delete");
});
await step("deleting returns to the start screen and clears this device", async () => {
  await page.getByRole("button", { name: "Delete forever" }).click();
  await page.waitForURL("**/start", { timeout: 20000 });
  await text("Game deleted.");
  if (await session()) throw new Error("session still stored");
  const sync = await page.evaluate(() => localStorage.getItem("pixel-purse-sync"));
  if (sync) throw new Error("sync info still stored");
});
await step("the old account no longer works on the server", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return console.log("     (skipped server check: Supabase env not passed to this script)");
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (r.ok) throw new Error("deleted user can still fetch their profile");
});

await browser.close();
const real = problems.filter((p) => !/Download the React DevTools/.test(p));
console.log(real.length ? `\nBrowser problems:\n- ${real.join("\n- ")}` : "\nNo browser errors.");
process.exit(failed ? 1 : 0);
