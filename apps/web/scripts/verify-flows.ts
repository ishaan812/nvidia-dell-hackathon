import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildNorthstar } from "../lib/diligence/sample";
import { runDeal } from "../lib/diligence/pipeline";
import { dirs } from "../lib/diligence/paths";
import { resolveExisting } from "../lib/diligence/files";
import { answerQuery } from "../lib/diligence/rag";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function localPipeline() {
  const folder = await buildNorthstar();
  const deal = await runDeal(folder, "Northstar Robotics");
  assert.equal(deal.status, "ready");
  assert.ok(deal.docs.length >= 4, `expected 4 docs, got ${deal.docs.length}`);
  assert.ok(path.isAbsolute(deal.docs[0].path), "doc paths must be absolute");
  const ids = deal.flags.map((f) => f.id).sort();
  for (const id of [
    "flag-arr",
    "flag-runway_months",
    "flag-headcount",
    "flag-founder_ownership_pct",
    "flag-tam",
  ]) {
    assert.ok(ids.includes(id), `missing ${id}: ${ids.join(",")}`);
  }
  const arr = deal.flags.find((f) => f.id === "flag-arr");
  assert.match(arr!.comment, /\$4\.2M/);
  assert.match(arr!.comment, /\$2\.8M/);
  assert.equal(arr!.page, 3);
  const burn = await answerQuery(deal, "what is their real burn?");
  assert.match(burn.answer, /\$310k/);
  const deck = resolveExisting(path.join(dirs().data, deal.id, "deck.pdf"), "northstar-deck.pdf");
  assert.ok(deck, "deck.pdf missing from deal folder");
  const magic = await readFile(deck);
  assert.equal(magic.subarray(0, 4).toString(), "%PDF");
  return deal.id;
}

async function httpFlows(dealId: string) {
  const deals = await fetch(`${BASE}/api/deals`).then((r) => r.json());
  assert.ok(deals.model?.ok, "ollama not reachable");
  assert.ok(deals.deals.some((d: { id: string }) => d.id === dealId));

  const one = await fetch(`${BASE}/api/deals/${dealId}`);
  assert.equal(one.status, 200);
  const body = await one.json();
  assert.equal(body.deal.company, "Northstar Robotics");
  assert.ok(body.deal.memo.bodyMarkdown.includes("Northstar"));

  const deck = await fetch(`${BASE}/api/deals/${dealId}/deck`);
  assert.equal(deck.status, 200, `deck HTTP ${deck.status}`);
  assert.match(deck.headers.get("content-type") ?? "", /pdf/);
  const bytes = new Uint8Array(await deck.arrayBuffer());
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "%PDF");
  assert.ok(bytes.byteLength > 1000);

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
  assert.equal(pdf.numPages, 8);

  const q = await fetch(`${BASE}/api/deals/${dealId}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "what's their real burn?" }),
  }).then((r) => r.json());
  assert.match(q.answer, /\$310k/);

  const sample = await fetch(`${BASE}/api/deals/sample`, { method: "POST" }).then((r) => r.json());
  assert.ok(sample.id);
  assert.ok(sample.flags >= 4);
  const sampleDeck = await fetch(`${BASE}/api/deals/${sample.id}/deck`);
  assert.equal(sampleDeck.status, 200);

  const form = new FormData();
  form.append("name", "Upload Northstar");
  const files = [
    "northstar-deck.pdf",
    "northstar-financial-model.xlsx",
    "northstar-cap-table.xlsx",
    "northstar-metrics.docx",
  ];
  for (const name of files) {
    const buf = await readFile(path.join(dirs().sample, name));
    form.append("files", new Blob([buf]), name);
  }
  const uploaded = await fetch(`${BASE}/api/deals/upload`, { method: "POST", body: form }).then((r) =>
    r.json(),
  );
  assert.ok(uploaded.id, `upload failed ${JSON.stringify(uploaded)}`);
  const uploadedDeal = await fetch(`${BASE}/api/deals/${uploaded.id}`).then((r) => r.json());
  assert.ok(uploadedDeal.deal.flags.length >= 4, "upload deal missing flags");
  const uploadedDeck = await fetch(`${BASE}/api/deals/${uploaded.id}/deck`);
  assert.equal(uploadedDeck.status, 200);

  const home = await fetch(`${BASE}/`);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Night Desk/);
  const desk = await fetch(`${BASE}/deals/${dealId}`);
  assert.equal(desk.status, 200);
  const deskHtml = await desk.text();
  assert.match(deskHtml, /Contradiction/);
  assert.match(deskHtml, /IC memo/);
}

async function main() {
  console.log("1. local pipeline");
  const id = await localPipeline();
  console.log(`   deal ${id}`);
  console.log("2. http flows");
  await httpFlows(id);
  console.log("OK all flows");
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
