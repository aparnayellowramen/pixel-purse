// Checks that iPhone Safari visitors see the install guide before onboarding, and others don't.
// Run: node e2e/install-guide.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

const browser = await chromium.launch({ channel: "msedge", headless: true });
let failed = false;
const check = (ok, name) => {
  console.log(ok ? "OK  " : "FAIL", name);
  if (!ok) failed = true;
};

for (const [label, ua, expectGuide] of [
  ["iPhone Safari", IPHONE_SAFARI, true],
  ["desktop browser", undefined, false],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(ua ? { userAgent: ua } : {}) });
  const page = await ctx.newPage();
  await page.goto(BASE + "/start");
  const guide = page.getByRole("heading", { name: "Add Pixel Purse to your Home Screen" });
  const title = page.getByRole("button", { name: "Get started" });
  await Promise.race([guide.waitFor({ timeout: 20000 }), title.waitFor({ timeout: 20000 })]).catch(() => {});
  const sawGuide = await guide.isVisible();
  check(sawGuide === expectGuide, `${label}: install guide ${expectGuide ? "shown" : "not shown"}`);
  if (sawGuide) {
    await page.screenshot({ path: "e2e/install-guide.png" });
    await page.getByRole("button", { name: "Continue in Safari instead" }).click();
    check(await title.isVisible(), `${label}: "Continue in Safari instead" goes to the title screen`);
  }
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
