import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const extraName = `night-desk-extra-${Date.now()}.csv`;
const extra = `/tmp/${extraName}`;
await writeFile(extra, "Item,Value\nNote,Added during flow test\n");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];
page.on("pageerror", (err) => {
  failures.push(`PAGEERROR ${err.message}`);
  console.error("PAGEERROR", err.message);
});
page.on("console", (msg) => {
  if (msg.type() === "error") {
    failures.push(`CONSOLE ${msg.text()}`);
    console.error("CONSOLE", msg.text());
  }
});

async function must(ok, message) {
  if (!ok) throw new Error(message);
}

await page.goto(BASE, { waitUntil: "networkidle" });
const title = await page.locator("h1").first().textContent();
await must(title?.includes("Open a deal"), `home title: ${title}`);
await must(await page.getByRole("button", { name: "Create this deal" }).count(), "create deal missing");
await must(await page.getByLabel("Add files").count(), "file picker missing");

const named = page.locator("a", { hasText: "Northstar Robotics" }).first();
if (await named.count()) await named.click();
else await page.locator("section a").first().click();
await page.waitForURL(/\/deals\/[^/]+$/);
const dealUrl = page.url();
const dealId = dealUrl.match(/\/deals\/([^/]+)/)?.[1];
await must(dealId, "no deal id");

await page.getByRole("link", { name: "Open the deck" }).first().waitFor();
await must(await page.getByText("northstar-deck.pdf").count(), "deck list missing the pitch deck");
await must(await page.getByRole("heading", { name: "Data room" }).count(), "lobby missing data room");
if (await page.getByText("ishaan_resume.pdf").count()) {
  await must(await page.getByRole("button", { name: "Use as deck" }).count(), "resume should stay in the room");
}
await must(
  await page.getByText(/financial-model|cap-table|metrics\.docx/i).count(),
  "lobby missing room files",
);
await must(await page.getByRole("button", { name: "Graph" }).count(), "graph tab missing");
await must(await page.locator(".room-graph-svg").count(), "knowledge graph missing");
await must(await page.getByRole("button", { name: "Add these files" }).count(), "add-files missing");
await must(await page.getByRole("button", { name: "Recompute the deck" }).count(), "recompute missing");

await page.locator(".deal-row button", { hasText: "northstar-financial-model.xlsx" }).click();
await page.getByRole("tab", { name: /summary|p-l|headcount|cash/i }).first().waitFor({ timeout: 10_000 });
await must(await page.locator(".xl-app table").count(), "xlsx preview has no workbook");
await must(await page.getByRole("link", { name: "Open in new tab" }).count(), "open in new tab missing");
const blotter = await page.evaluate(() => {
  const split = document.querySelector(".lobby-split");
  const files = document.querySelector(".lobby-files")?.getBoundingClientRect();
  const preview = document.querySelector(".lobby-preview")?.getBoundingClientRect();
  return {
    open: Boolean(split?.classList.contains("is-open")),
    filesW: Math.round(files?.width ?? 0),
    previewW: Math.round(preview?.width ?? 0),
    viewW: window.innerWidth,
  };
});
await must(blotter.open, "blotter did not open after file click");
await must(
  blotter.previewW > blotter.viewW * 0.35 && blotter.previewW < blotter.viewW * 0.62,
  `blotter should be half the page, got ${blotter.previewW} of ${blotter.viewW}`,
);

const [previewPage] = await Promise.all([
  page.waitForEvent("popup"),
  page.getByRole("link", { name: "Open in new tab" }).click(),
]);
await previewPage.waitForLoadState("domcontentloaded");
await must(previewPage.url().includes("/preview"), `preview url: ${previewPage.url()}`);
await previewPage.locator(".xl-app table").waitFor({ timeout: 10_000 });
await must(await previewPage.locator(".xl-app table").count(), "full preview has no workbook");
await previewPage.close();

await page.locator(".deal-row button", { hasText: "northstar-metrics.docx" }).click();
await page.locator(".word-page").waitFor({ timeout: 10_000 });
await must(await page.locator(".word-page p").count(), "docx preview has no paragraphs");
await must(await page.getByText(/operating metrics|NRR 118/i).count(), "docx preview missing body");

await page.locator("#room-files").setInputFiles(extra);
await page.getByRole("list", { name: "Files ready to add" }).getByText(extraName).waitFor();
await page.getByRole("button", { name: "Add these files" }).click();
await page.getByText(/Added\. This room now has/i).waitFor({ timeout: 180_000 });
await page.locator(".deal-row button", { hasText: extraName }).waitFor({ timeout: 15_000 });
await page.locator(".deal-row button", { hasText: extraName }).click();
await page.locator(".xl-app table").waitFor({ timeout: 10_000 });
await must(await page.getByText(/Added during flow test/i).count(), "csv preview missing rows");

await page.getByRole("button", { name: "Compare" }).click();
await must(await page.getByText(/ARR|runway|headcount|ownership/i).count(), "compare missing rows");
await page.getByRole("button", { name: "Graph" }).click();
await must(await page.locator(".room-graph-svg").count(), "graph tab did not return");

await page.getByRole("link", { name: "Open the deck" }).first().click();
await page.waitForURL(/\/deals\/[^/]+\/deck/);
await page.waitForTimeout(2500);

const canvases = await page.locator("main canvas").count();
const iframe = await page.locator("main iframe").count();
const highlights = await page.locator("main .slide-hl").count();
await must(!(await page.getByText("Could not render the deck").count()), "deck hard-failed");
await must(canvases >= 1 || iframe >= 1, "no canvas and no iframe");
await must(highlights >= 4, `expected on-slide highlights, got ${highlights}`);

const flags = await page.locator("aside").first().locator("button").count();
await must(flags >= 4, `expected flags, got ${flags}`);

const desk = page.locator("#side-desk");
await must(await desk.getByText("northstar-financial-model").count(), "source file missing");
await must(await desk.getByText("$2.8M").count(), "source number missing");

await page.locator("aside").first().locator("button").first().click();
await page.waitForTimeout(400);
await desk.locator(".xl-app table").waitFor({ timeout: 10_000 });
await must(await desk.locator(".xl-hit-cell").count(), "excel cell was not marked for the flag");

await page.locator("aside").first().locator("button").nth(1).click();
await page.waitForTimeout(200);
await must(
  await desk.getByText(/27 people|40 people|headcount/i).count(),
  "flag click did not update source",
);
await must(await desk.locator(".xl-hit-cell").count(), "excel cell lost its mark on the next flag");

await page.locator("main .slide-hl").first().click();
await page.waitForTimeout(200);
await must(await desk.getByText("northstar-financial-model").count(), "highlight click did not open source");
await must(await desk.getByRole("link", { name: "Open in new tab" }).count(), "source pane missing open in new tab");
const [sourcePreview] = await Promise.all([
  page.waitForEvent("popup"),
  desk.getByRole("link", { name: "Open in new tab" }).click(),
]);
await sourcePreview.waitForLoadState("domcontentloaded");
await must(sourcePreview.url().includes("/preview"), `source preview url: ${sourcePreview.url()}`);
await sourcePreview.close();

await desk.getByRole("button", { name: "Ask", exact: true }).first().click();
await page.getByLabel("Your question").waitFor();
await desk.getByRole("button", { name: "Ask", exact: true }).last().click();
await page.getByText(/310k|\$310/i).waitFor({ timeout: 60_000 });

if (failures.some((item) => /Unexpected end of JSON|SyntaxError/i.test(item))) {
  throw new Error(failures.join("\n"));
}

await page.screenshot({ path: "/tmp/night-desk-deal.png", fullPage: true });
console.log(
  JSON.stringify({
    canvases,
    highlights,
    iframe,
    flags,
    url: page.url(),
    dealId,
    pageErrors: failures,
    ok: true,
  }),
);
await browser.close();
