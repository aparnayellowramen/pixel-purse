// Editable categories: set up a budget like a real one (rename, add, remove, change icon),
// check logging still lands in the renamed category, and that removing a used category moves its expenses.
// Run: node e2e/budgets.mjs   (BASE_URL defaults to http://localhost:3000)
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));

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
const row = (name) => page.locator(".catrow", { has: page.locator(`input.catname[value="${name}"]`) });

await step("onboarding: rename, remove and add categories", async () => {
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("heading", { name: "Set your monthly budgets" }).waitFor();
  // Food → Dining & delivery, $400
  await page.locator("#cat-name-food").fill("Dining & delivery");
  await page.locator("#lim-food").fill("400");
  // Remove Bills, Fun and Other
  for (const n of ["Bills", "Fun", "Other"]) await row(n).getByRole("button", { name: `Remove ${n}` }).click();
  // Add Travel, gifts & misc with the plane icon
  await page.getByRole("button", { name: "+ Add category" }).click();
  const newName = page.locator("input.catname").last();
  await newName.fill("Travel, gifts & misc");
  await page.locator(".catrow").last().locator("input.limin").fill("300");
  await page.locator(".catrow").last().getByRole("button", { name: /Change icon/ }).click();
  await page.locator(".catrow").last().getByRole("button", { name: "plane" }).click();
  await page.locator("#lim-shop").fill("300");
  await page.locator("#cat-name-debt").fill("Edu loan fund");
  await page.locator("#lim-debt").fill("800");
  await text("CA$1,500"); // Dining 400 + Groceries 350 + Shopping 300 + Transport 150 + Travel 300 (the loan fund isn't spending)
});
await step("an empty name is caught before moving on", async () => {
  await page.getByRole("button", { name: "+ Add category" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await text("Every category needs a name.");
  await page.locator(".catrow").last().getByRole("button", { name: /^Remove/ }).click();
});
await step("finish onboarding with the custom budget", async () => {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Play as guest" }).click();
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.waitForURL(BASE + "/");
  await text("Dining & delivery");
  await text("Travel, gifts & misc");
  await text("Edu loan fund");
  if (await page.getByText("Bills", { exact: true }).count()) throw new Error("Bills is still on the main screen");
});
await step("the main screen shows today's date clearly", async () => {
  const today = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
  await text(today);
  await text("days left in");
});
await step("'coffee 4' still lands in the renamed food category", async () => {
  await page.locator("#add").fill("coffee 4 at tim hortons");
  await page.locator("#add").press("Enter");
  await text("Dining & delivery: CA$396 left");
});
await step("log a grocery expense", async () => {
  await page.locator("#add").fill("groceries 62 nofrills");
  await page.locator("#add").press("Enter");
  await text("Groceries: CA$288 left");
});
await step("Settings → Budgets: removing Groceries asks where its expense goes", async () => {
  await page.goto(BASE + "/settings");
  await page.getByRole("link", { name: "Edit budgets and categories" }).click();
  await page.waitForURL("**/budgets");
  await row("Groceries").getByRole("button", { name: "Remove Groceries" }).click();
  await text("Groceries has 1 expense this month");
  await page.getByLabel("Move Groceries expenses to").selectOption({ label: "Dining & delivery" });
  await page.getByRole("button", { name: "Save budgets" }).click();
  await page.waitForURL(BASE + "/");
  await text("Budgets saved.");
});
await step("the moved expense now counts in Dining & delivery", async () => {
  await text("CA$334 left"); // 400 − 4 − 62
  if (await page.getByText("Groceries", { exact: true }).count()) throw new Error("Groceries is still shown");
});

await page.screenshot({ path: "e2e/budgets.png" });
await browser.close();
console.log(problems.length ? `\nBrowser problems:\n- ${problems.join("\n- ")}` : "\nNo browser errors.");
process.exit(failed ? 1 : 0);
