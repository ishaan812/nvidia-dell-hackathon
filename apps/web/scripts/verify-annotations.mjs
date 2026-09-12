import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DEAL = "concept-ventures-fund-9e5c2418";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));

await page.goto(`${BASE}/deals/${DEAL}/deck`, { waitUntil: "networkidle" });
await page.waitForSelector("main canvas", { timeout: 30000 });
await page.waitForTimeout(1500);

const flags = await page.locator("aside .flag-row").count();
const highlights = await page.locator("main .slide-hl").count();
const slide8 = await page.locator("#slide-8 .slide-hl").count();
const slide1 = await page.locator("#slide-1 .slide-hl").count();
const slideLabels = await page.locator("aside .flag-row").allTextContents();

const slide = page.locator("#slide-8");
if (await slide.count()) {
  await slide.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator("#slide-8").screenshot({
    path: "/tmp/concept-slide-8.png",
  });
}

const slide1El = page.locator("#slide-1");
if (await slide1El.count()) {
  await slide1El.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator("#slide-1").screenshot({ path: "/tmp/concept-slide-1.png" });
}

console.log(
  JSON.stringify(
    {
      flags,
      highlights,
      slide1,
      slide8,
      slideLabels: slideLabels.map((text) => text.replace(/\s+/g, " ").trim().slice(0, 160)),
      errors,
    },
    null,
    2,
  ),
);

if (highlights < 1 || slide8 < 1) {
  process.exitCode = 1;
}
await browser.close();
