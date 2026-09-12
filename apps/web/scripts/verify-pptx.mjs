import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DEAL = "valostrike-56352b2b";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));

await page.goto(`${BASE}/deals/${DEAL}`, { waitUntil: "networkidle" });
await page.getByText(/Beautified_VC_Pitch_Deck/i).first().click();
await page.locator(".pptx-slide").first().waitFor({ timeout: 15000 });
const lobbySlides = await page.locator(".pptx-slide").count();
const lobbyDup = errors.some((msg) => /same key/i.test(msg));

await page.goto(`${BASE}/deals/${DEAL}/deck`, { waitUntil: "networkidle" });
await page.locator("main .pptx-slide").first().waitFor({ timeout: 15000 });
const deckSlides = await page.locator("main .pptx-slide").count();
const titles = await page.locator("main .pptx-slide h2").allTextContents();

console.log(
  JSON.stringify(
    {
      lobbySlides,
      deckSlides,
      titles: titles.map((t) => t.trim()),
      lobbyDup,
      errors,
    },
    null,
    2,
  ),
);

await page.locator("main .pptx-slide").first().screenshot({ path: "/tmp/valostrike-slide-1.png" });
await browser.close();
if (lobbySlides < 8 || deckSlides < 8 || lobbyDup) process.exit(1);
