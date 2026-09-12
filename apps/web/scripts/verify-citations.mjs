import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DEAL = "concept-ventures-fund-9e5c2418";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/deals/${DEAL}/deck`, { waitUntil: "networkidle" });
await page.waitForSelector("main canvas", { timeout: 30000 });
await page.waitForTimeout(1200);

const desk = page.locator("#side-desk");
const rows = page.locator("aside").first().locator("button");
const count = await rows.count();
const results = [];

for (let i = 0; i < count; i++) {
  const label = (await rows.nth(i).innerText()).replace(/\s+/g, " ").trim().slice(0, 80);
  await rows.nth(i).click();
  await page.waitForTimeout(800);
  const standing = await desk.getByText("The slide is standing alone").count();
  const file = await desk.getByText("Concept_Ventures_Source_Data.xlsx").count();
  await desk.locator(".xl-app table").waitFor({ timeout: 12000 }).catch(() => {});
  const hits = await desk.locator(".xl-hit-cell").count();
  results.push({ label, standing, file, hits });
}

console.log(JSON.stringify(results, null, 2));
const cited = results.filter((row) => !/Missing|cap table/i.test(row.label));
const ok = cited.every((row) => row.file > 0 && row.standing === 0 && row.hits > 0);
await browser.close();
if (!ok) process.exit(1);
