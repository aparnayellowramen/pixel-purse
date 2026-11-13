// Portfolio screenshots of the real app with demo data, at iPhone size.
// Run: node e2e/screenshots.mjs   (BASE_URL defaults to http://localhost:3000; writes ../docs/screenshots)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../../docs/screenshots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const shot = (page, name) => page.screenshot({ path: OUT + name });
const device = (scheme, extra = {}) => ({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, ...extra });

async function demoPage(scheme) {
  const ctx = await browser.newContext(device(scheme));
  const page = await ctx.newPage();
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Play as guest" }).click();
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/settings");
  await page.getByRole("button", { name: "Load demo data" }).click();
  await page.getByRole("button", { name: "Replace with demo data" }).click();
  await page.waitForURL(BASE + "/");
  await page.getByText("Left this month").waitFor();
  await page.waitForTimeout(800);
  return page;
}
const hideToast = (page) => page.addStyleTag({ content: ".ov-toast-wrap{display:none!important} nextjs-portal{display:none!important}" });

// Light mode: the main flows
const page = await demoPage("light");
await hideToast(page);
await shot(page, "01-main-screen.png");

await page.locator("#add").fill("coffee CA$ 4 at tim hortons");
await page.locator("#add").press("Enter");
await page.getByText("Expense found").waitFor();
await shot(page, "02-type-what-you-spent.png");
await page.waitForTimeout(2200); // auto-save

await page.locator("#add").fill("zara 40");
await page.locator("#add").press("Enter");
await page.getByRole("heading", { name: "Shopping took a hit" }).waitFor({ timeout: 15000 });
await page.waitForTimeout(400);
await shot(page, "03-over-budget-rebalance.png");
await page.getByRole("button", { name: "Not now" }).click();

await page.goto(BASE + "/records");
await page.getByText("Spent vs budget").waitFor();
await hideToast(page);
await shot(page, "04-hall-of-records.png");

await page.goto(BASE + "/level");
await page.getByRole("heading", { name: "Level complete" }).waitFor();
await hideToast(page);
await shot(page, "05-month-end.png");

await page.goto(BASE + "/budgets");
await page.getByText("Spending budget").waitFor();
await hideToast(page);
await shot(page, "06-edit-budgets.png");

// Dark mode main screen
const dark = await demoPage("dark");
await hideToast(dark);
await shot(dark, "07-main-screen-dark.png");

// iPhone Safari install guide
const ios = await (await browser.newContext(device("light", { userAgent: IPHONE }))).newPage();
await ios.goto(BASE + "/start");
await ios.getByRole("heading", { name: "Add Pixel Purse to your Home Screen" }).waitFor();
await hideToast(ios);
await shot(ios, "08-install-guide.png");

await browser.close();
console.log("Saved screenshots to", OUT);
