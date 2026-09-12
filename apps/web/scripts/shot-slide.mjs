import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
await page.locator("table a", { hasText: "Northstar Robotics" }).first().click();
await page.waitForURL(/\/deals\//);
await page.waitForTimeout(2500);
await page.locator("aside button").first().click();
await page.waitForTimeout(600);
const slide = page.locator("#slide-3");
await slide.screenshot({ path: "/tmp/night-desk-slide3.png" });
const box = await page.locator("#slide-3 .slide-hl").first().boundingBox();
const canvas = await page.locator("#slide-3 canvas").boundingBox();
console.log({ box, canvas, hl: await page.locator("#slide-3 .slide-hl").count() });
await browser.close();
