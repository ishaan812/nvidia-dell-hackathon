import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import ExcelJS from "exceljs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { dirs } from "./paths";

const W = 960;
const H = 540;
const ink = rgb(0.09, 0.11, 0.15);
const paper = rgb(0.96, 0.94, 0.9);
const copper = rgb(0.55, 0.37, 0.24);
const rule = rgb(0.78, 0.74, 0.68);

async function slide(
  pdf: PDFDocument,
  draw: (ctx: {
    page: ReturnType<PDFDocument["addPage"]>;
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  }) => void,
) {
  const page = pdf.addPage([W, H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: paper });
  page.drawRectangle({ x: 0, y: 0, width: 10, height: H, color: ink });
  draw({ page, font, bold });
}

export async function buildNorthstar(): Promise<string> {
  const folder = dirs().sample;
  await mkdir(folder, { recursive: true });

  const pdf = await PDFDocument.create();
  const slides: Parameters<typeof slide>[1][] = [
    ({ page, font, bold }) => {
      page.drawText("NORTHSTAR ROBOTICS", {
        x: 56,
        y: 310,
        size: 28,
        font: bold,
        color: ink,
      });
      page.drawText("Warehouse autonomy that pays for itself in two shifts.", {
        x: 56,
        y: 272,
        size: 14,
        font,
        color: ink,
      });
      page.drawText("Confidential  ·  Series A  ·  Pittsburgh  ·  September 2026", {
        x: 56,
        y: 48,
        size: 10,
        font,
        color: copper,
      });
    },
    ({ page, font, bold }) => {
      page.drawText("The floor still runs on radios and overtime.", {
        x: 56,
        y: 430,
        size: 20,
        font: bold,
        color: ink,
      });
      const lines = [
        "A mid-market 3PL spends 38% of warehouse opex on walking and rework.",
        "Existing AMRs force a full layout redesign. Northstar drops onto the existing floor.",
        "Pilot sites recover the hardware cost inside 11 weeks.",
      ];
      lines.forEach((line, i) => {
        page.drawText(line, { x: 56, y: 360 - i * 36, size: 13, font, color: ink });
      });
    },
    ({ page, font, bold }) => {
      page.drawText("Traction", { x: 56, y: 450, size: 20, font: bold, color: ink });
      page.drawText("$4.2M ARR", { x: 56, y: 360, size: 36, font: bold, color: ink });
      page.drawText("up 3.1x year over year, 14 paid sites, NRR 118%.", {
        x: 56,
        y: 320,
        size: 13,
        font,
        color: ink,
      });
      page.drawText("Logo retention 97%. Average contract 26 months.", {
        x: 56,
        y: 292,
        size: 13,
        font,
        color: ink,
      });
      page.drawLine({
        start: { x: 56, y: 250 },
        end: { x: 400, y: 250 },
        thickness: 0.6,
        color: rule,
      });
      page.drawText("Numbers on this slide are the ones we take to IC.", {
        x: 56,
        y: 220,
        size: 11,
        font,
        color: copper,
      });
    },
    ({ page, font, bold }) => {
      page.drawText("Team", { x: 56, y: 450, size: 20, font: bold, color: ink });
      page.drawText("40 people", { x: 56, y: 370, size: 32, font: bold, color: ink });
      page.drawText("across robotics, field ops, and a 9-person deployments bench.", {
        x: 56,
        y: 332,
        size: 13,
        font,
        color: ink,
      });
      page.drawText("Founders from CMU NREC and Amazon Robotics.", {
        x: 56,
        y: 300,
        size: 13,
        font,
        color: ink,
      });
    },
    ({ page, font, bold }) => {
      page.drawText("Use of proceeds", { x: 56, y: 450, size: 20, font: bold, color: ink });
      page.drawText("18 months of runway", {
        x: 56,
        y: 370,
        size: 28,
        font: bold,
        color: ink,
      });
      page.drawText("at the current plan, after a $22M Series A.", {
        x: 56,
        y: 332,
        size: 13,
        font,
        color: ink,
      });
      page.drawText("Hire field techs, finish the second-shift stack, open Dallas.", {
        x: 56,
        y: 300,
        size: 13,
        font,
        color: ink,
      });
    },
    ({ page, font, bold }) => {
      page.drawText("The raise", { x: 56, y: 450, size: 20, font: bold, color: ink });
      page.drawText("Raising $22M  ·  Founders 15%", {
        x: 56,
        y: 360,
        size: 24,
        font: bold,
        color: ink,
      });
      page.drawText("Founders retain 15% after the round on the cap table we walk.", {
        x: 56,
        y: 318,
        size: 13,
        font,
        color: ink,
      });
      page.drawText("Employee pool 12%. No secondary.", {
        x: 56,
        y: 290,
        size: 13,
        font,
        color: ink,
      });
    },
    ({ page, font, bold }) => {
      page.drawText("Market", { x: 56, y: 450, size: 20, font: bold, color: ink });
      page.drawText("$48B TAM", { x: 56, y: 360, size: 36, font: bold, color: ink });
      page.drawText("US and EU mid-market 3PL autonomy, 2026.", {
        x: 56,
        y: 320,
        size: 13,
        font,
        color: ink,
      });
      page.drawText("We take 4% in five years. SAM $6.1B. SOM $240M.", {
        x: 56,
        y: 292,
        size: 13,
        font,
        color: ink,
      });
    },
    ({ page, font, bold }) => {
      page.drawText("Appendix", { x: 56, y: 450, size: 20, font: bold, color: ink });
      page.drawText("Data room includes the operating model, cap table, and KPI one-pager.", {
        x: 56,
        y: 390,
        size: 13,
        font,
        color: ink,
      });
      page.drawText("Questions to night-desk@fund.local — or drop the folder on the blotter.", {
        x: 56,
        y: 360,
        size: 13,
        font,
        color: ink,
      });
    },
  ];
  for (const draw of slides) await slide(pdf, draw);
  await writeFile(path.join(folder, "northstar-deck.pdf"), await pdf.save());

  const model = new ExcelJS.Workbook();
  model.creator = "Night Desk sample";
  const summary = model.addWorksheet("Summary");
  summary.addRows([
    ["Metric", "Value"],
    ["ARR", 2_800_000],
    ["Monthly burn", 310_000],
    ["Cash on hand", 2_790_000],
    ["Runway months", 9],
    ["Headcount", 27],
    ["NRR", 118],
  ]);
  const pnl = model.addWorksheet("PnL");
  pnl.addRows([
    ["Line", "LTM"],
    ["Subscription revenue", 2_800_000],
    ["Hardware", 640_000],
    ["Gross profit", 2_110_000],
    ["Opex", 3_720_000],
    ["Net burn", 3_720_000 - 2_110_000],
  ]);
  const cash = model.addWorksheet("Cash");
  cash.addRows([
    ["Item", "USD"],
    ["Cash on hand", 2_790_000],
    ["Monthly burn", 310_000],
    ["Runway months", 9],
  ]);
  const hc = model.addWorksheet("Headcount");
  hc.addRows([
    ["Role", "Count"],
    ["Robotics", 11],
    ["Field ops", 8],
    ["Go-to-market", 5],
    ["G&A", 3],
    ["Headcount", 27],
  ]);
  await model.xlsx.writeFile(path.join(folder, "northstar-financial-model.xlsx"));

  const cap = new ExcelJS.Workbook();
  const capSheet = cap.addWorksheet("Fully diluted");
  capSheet.addRows([
    ["Holder", "Shares", "FD %"],
    ["Founders", 8_400_000, 0.084],
    ["Seed investors", 31_200_000, 0.312],
    ["Option pool", 12_000_000, 0.12],
    ["Series A (proposed)", 48_400_000, 0.484],
    ["Total", 100_000_000, 1],
    ["Founder ownership FD", 8.4],
    ["Founders FD %", 8.4],
  ]);
  await cap.xlsx.writeFile(path.join(folder, "northstar-cap-table.xlsx"));

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Northstar Robotics — operating metrics", bold: true, size: 28 })],
          }),
          new Paragraph({
            children: [
              new TextRun(
                "NRR 118%. Logo churn 1.1% quarterly. Gross margin 61% blended, 79% on software. No cohort exhibit is attached; NRR is a company-reported figure.",
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                "Payback on a full site install is 11 weeks in the two Pittsburgh pilots. Dallas is not yet live.",
              ),
            ],
          }),
        ],
      },
    ],
  });
  await writeFile(path.join(folder, "northstar-metrics.docx"), await Packer.toBuffer(doc));

  await writeFile(
    path.join(folder, "GROUND_TRUTH.md"),
    `# Northstar ground truth

Planted contradictions (must flag):

1. ARR — deck $4.2M vs model $2.8M
2. Runway — deck 18 months vs cash/burn = 9 months
3. Headcount — deck 40 people vs model 27
4. Founder ownership — deck 15% vs cap table 8.4% FD

Unsupported:

5. $48B TAM — no market study in the room
`,
  );

  return folder;
}
