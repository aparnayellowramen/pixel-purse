// End-to-end check of the new-player flow against a running dev server, using the installed Edge.
// Run: node e2e/guest-flow.mjs   (BASE_URL defaults to http://localhost:3000)
// Creates one real guest account in the configured Supabase project.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));

let failed = false;
async function step(name, fn) {
  if (failed) return console.log("-", name, "(skipped)");
  try {
    await fn();
    console.log("âœ“", name);
  } catch (e) {
    failed = true;
    console.log("âœ—", name, "â†’", String(e.message).split("\n")[0]);
    await page.screenshot({ path: "e2e/failure.png", fullPage: true });
  }
}
const text = (t) => page.getByText(t, { exact: false }).first().waitFor({ timeout: 15000 });
const syncMeta = () => page.evaluate(() => JSON.parse(localStorage.getItem("pixel-purse-sync") || "null"));

await step("a new visitor is sent to the start screen", async () => {
  await page.goto(BASE + "/");
  await page.waitForURL("**/start", { timeout: 30000 });
  await page.getByRole("button", { name: "Get started" }).waitFor();
});
await step("Get started creates a guest account", async () => {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("heading", { name: "Your currency" }).waitFor({ timeout: 20000 });
});
await step("pick a currency", async () => {
  await page.getByRole("button", { name: /Canadian dollar/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("heading", { name: "Set your monthly budgets" }).waitFor();
});
await step("set budgets", async () => {
  await page.getByLabel("Food", { exact: true }).fill("450");
  await text("CA$1,550");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("heading", { name: "Create your save file" }).waitFor();
});
await step("play as guest", async () => {
  await page.getByRole("button", { name: "Play as guest" }).click();
  await page.getByRole("heading", { name: "How it works" }).waitFor();
});
await step("finish the tutorial and land on the main screen", async () => {
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.waitForURL(BASE + "/");
  await text("Left this month");
  await text("CA$1,550");
});
await step("log an expense (auto-saves)", async () => {
  await page.locator("#add").fill("coffee 4 at tim hortons");
  await page.locator("#add").press("Enter");
  await text("Food: CA$446 left");
});
await step("the save file reaches Supabase", async () => {
  for (let i = 0; i < 20; i++) {
    const m = await syncMeta();
    if (m && m.version >= 1 && !m.pending) return;
    await page.waitForTimeout(500);
  }
  throw new Error(`not synced: ${JSON.stringify(await syncMeta())}`);
});
await step("reloading keeps the data", async () => {
  await page.reload();
  await text("Tim Hortons");
});
await step("going over budget opens the rebalance sheet", async () => {
  await page.locator("#add").fill("zara 300");
  await page.locator("#add").press("Enter");
  await page.getByRole("heading", { name: "Shopping took a hit" }).waitFor({ timeout: 15000 });
  await page.locator(".opt").first().click();
  await text("Nice save!");
});
await step("edit an expense", async () => {
  await page.getByRole("button", { name: /Edit Tim Hortons/ }).click();
  await page.locator("#ed-amt").fill("6");
  await page.getByRole("button", { name: "Save changes" }).click();
  await text("Changes saved.");
  await text("CA$6.00");
});
await step("Settings shows the guest account", async () => {
  await page.goto(BASE + "/settings");
  await text("Playing as guest");
});
await step("month end starts the next month", async () => {
  await page.getByRole("button", { name: "Simulate month end" }).click();
  await page.getByRole("heading", { name: "Level complete" }).waitFor();
  await page.getByRole("button", { name: /^Start / }).click();
  await page.waitForURL(BASE + "/");
  await text("Bars are full again");
});
await step("month end was synced too", async () => {
  await page.waitForTimeout(2500);
  const m = await syncMeta();
  if (!m || m.pending || m.version < 3) throw new Error(`sync after month end: ${JSON.stringify(m)}`);
});

await page.screenshot({ path: "e2e/last.png" });
await browser.close();
const real = problems.filter((p) => !/Download the React DevTools/.test(p));
console.log(real.length ? `\nBrowser problems:\n- ${real.join("\n- ")}` : "\nNo browser errors.");
process.exit(failed ? 1 : 0);
