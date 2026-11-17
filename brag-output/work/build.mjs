// Builds the composition from the app's real CSS + sprites, then renders stills or all frames.
// node build.mjs stills 0.5 3 ...   → work/stills/t-<s>.jpg
// node build.mjs frames             → work/frames/f00000.jpg … (30fps, 20s)
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const web = join(root, "web");
const { chromium } = createRequire(join(web, "package.json"))("playwright-core");

// 1. Compose: the app's stylesheet (minus the Tailwind import, which needs a build step) and sprites.
const css = readFileSync(join(web, "src/app/globals.css"), "utf8").replace(/@import\s+"tailwindcss";/, "");
const iconSrc = readFileSync(join(web, "src/components/pixel-icon.tsx"), "utf8");
const sprites = iconSrc.match(/const SPRITES[^=]*=\s*(\{[\s\S]*?\n\});/)[1];
const html = readFileSync(join(here, "composition.template.html"), "utf8").replace("{{APP_CSS}}", css).replace("{{SPRITES}}", sprites);
const out = join(here, "composition.html");
writeFileSync(out, html);

const FPS = 30, DURATION = 20;
const [mode = "stills", ...rest] = process.argv.slice(2);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "light" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(pathToFileURL(out).href);
await page.evaluate(() => window.ready);

async function frameAt(t, path) {
  await page.evaluate((tt) => window.render(tt), t);
  await page.screenshot({ path, type: "jpeg", quality: 92 });
}

if (mode === "stills") {
  const dir = join(here, "stills");
  mkdirSync(dir, { recursive: true });
  for (const s of rest.map(Number)) await frameAt(s, join(dir, `t-${s.toFixed(2)}.jpg`));
  console.log("stills:", rest.join(", "));
} else {
  const dir = join(here, "frames");
  mkdirSync(dir, { recursive: true });
  const n = FPS * DURATION;
  for (let i = 0; i < n; i++) {
    await frameAt(i / FPS, join(dir, `f${String(i).padStart(5, "0")}.jpg`));
    if (i % 60 === 0) console.log(`frame ${i}/${n}`);
  }
  console.log(`frames: ${n}`);
}
await browser.close();
if (errors.length) { console.log("page errors:", errors); process.exit(1); }
