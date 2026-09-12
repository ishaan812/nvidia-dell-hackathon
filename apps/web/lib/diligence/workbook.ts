import ExcelJS from "exceljs";
import path from "node:path";
import type { WorkbookCell, WorkbookGrid, WorkbookSheet } from "./types";

function cellText(cell: ExcelJS.Cell): string {
  if (cell.value == null || cell.value === "") return "";
  const text = cell.text?.replace(/\s+/g, " ").trim();
  if (text) return text;
  const value = cell.value;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (value && typeof value === "object" && "result" in value) {
    const result = (value as { result?: unknown }).result;
    return result == null ? "" : String(result);
  }
  return "";
}

function fillOf(cell: ExcelJS.Cell): string | undefined {
  const fill = cell.fill;
  if (!fill || fill.type !== "pattern") return undefined;
  const argb = fill.fgColor?.argb;
  if (!argb || argb.length < 6) return undefined;
  return `#${argb.slice(-6)}`;
}

function sheetToGrid(sheet: ExcelJS.Worksheet, fallbackName: string): WorkbookSheet {
  const colCount = Math.min(Math.max(sheet.actualColumnCount || sheet.columnCount || 1, 1), 40);
  const rowCount = Math.min(Math.max(sheet.actualRowCount || sheet.rowCount || 1, 1), 200);
  const columns = Array.from({ length: colCount }, (_, index) => {
    const width = sheet.getColumn(index + 1).width;
    return { width: Math.round((width ?? 12) * 9) };
  });
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = sheet.getRow(rowIndex + 1);
    const cells: WorkbookCell[] = Array.from({ length: colCount }, (__, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const master = cell.isMerged && cell.master && cell.master !== cell;
      return {
        text: master ? "" : cellText(cell),
        align:
          cell.alignment?.horizontal === "right" || typeof cell.value === "number" ? "right" : undefined,
        bold: Boolean(cell.font?.bold) || rowIndex === 0,
        fill: fillOf(cell),
      };
    });
    return { cells };
  });
  return { name: sheet.name || fallbackName, columns, rows };
}

export async function readWorkbookGrid(filePath: string, filename: string): Promise<WorkbookGrid> {
  const workbook = new ExcelJS.Workbook();
  if (/\.csv$/i.test(filename)) {
    const sheet = await workbook.csv.readFile(filePath);
    const name = path.basename(filename, path.extname(filename)) || "Sheet";
    return { filename, sheets: [{ ...sheetToGrid(sheet, name), name }] };
  }
  await workbook.xlsx.readFile(filePath);
  return {
    filename,
    sheets: workbook.worksheets.map((sheet) => sheetToGrid(sheet, sheet.name)),
  };
}
