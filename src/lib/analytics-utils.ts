import type {
  FinancialReportData,
  InventoryReportData,
  InventoryColumnKey,
} from "@/types/analytics";
import * as XLSX from "xlsx";

export function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

export function monthLabel(year: number, month: number) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

// ─── Column-aware cell getter ─────────────────────────────────────────────────

export type ExportColumnSpec = {
  key: InventoryColumnKey;
  label: string;
  format?: "price" | "percent" | "integer";
};

function cellValue(
  row: InventoryReportData["rows"][number],
  key: InventoryColumnKey,
): string | number {
  const v = (row as unknown as Record<string, unknown>)[key];
  if (v === null || v === undefined) return "";
  return typeof v === "number" ? v : String(v);
}

// ─── PDF font loader ─────────────────────────────────────────────────────────

const FONT_FAMILY = "CustomTimes";

async function loadFont(doc: any): Promise<void> {
  const res = await fetch("/fonts/NotoSans.ttf");
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  doc.addFileToVFS("NotoSans.ttf", base64);
  doc.addFont("NotoSans.ttf", FONT_FAMILY, "normal");
  doc.setFont(FONT_FAMILY);
}

// ─── Financial exports ────────────────────────────────────────────────────────

export function exportFinancialExcel(data: FinancialReportData, title: string) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["Metric", "Value"],
    ["Total Orders", data.summary.totalOrders],
    ["Total Net", data.summary.totalNet],
    ["Total VAT", data.summary.totalVat],
    ["Total Gross", data.summary.totalGross],
    ["Avg. Order Value", data.summary.avgOrderValue],
    ["Period", `${data.dateFrom} — ${data.dateTo}`],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryData),
    "Summary",
  );

  const statusData = [
    ["Status", "Count", "Net", "VAT", "Gross"],
    ...data.byStatus.map((r) => [
      r.status,
      r.count,
      r.totalNet,
      r.totalVat,
      r.totalGross,
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(statusData),
    "By Status",
  );

  const monthlyData = [
    ["Month/Year", "Orders", "Net", "VAT", "Gross"],
    ...data.monthly.map((r) => [
      monthLabel(r.year, r.month),
      r.totalOrders,
      r.totalNet,
      r.totalVat,
      r.totalGross,
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(monthlyData),
    "Monthly",
  );

  XLSX.writeFile(wb, `${title}.xlsx`);
}

export async function exportFinancialPdf(
  data: FinancialReportData,
  title: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  await loadFont(doc);

  // Тепер doc.setFont вже встановлено всередині loadFont
  doc.setFontSize(16);
  doc.text(title, 14, 16);

  doc.setFontSize(10);
  doc.text(`Період: ${data.dateFrom} — ${data.dateTo}`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [["Метрика", "Значення"]],
    body: [
      ["Усього замовлень", String(data.summary.totalOrders)],
      // ...
    ],
    theme: "grid",
    styles: { font: FONT_FAMILY }, // Шрифт для контенту
    headStyles: { font: FONT_FAMILY }, // ШРИФТ ДЛЯ ШАПКИ
  });

  const afterSummary = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("By Order Status", 14, afterSummary);
  autoTable(doc, {
    startY: afterSummary + 4,
    head: [["Status", "Count", "Net", "VAT", "Gross"]],
    body: data.byStatus.map((r) => [
      r.status,
      r.count,
      fmt(r.totalNet),
      fmt(r.totalVat),
      fmt(r.totalGross),
    ]),
    theme: "grid",
    styles: { font: FONT_FAMILY },
  });

  const afterStatus = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Monthly Trend", 14, afterStatus);
  autoTable(doc, {
    startY: afterStatus + 4,
    head: [["Month", "Orders", "Net", "VAT", "Gross"]],
    body: data.monthly.map((r) => [
      monthLabel(r.year, r.month),
      r.totalOrders,
      fmt(r.totalNet),
      fmt(r.totalVat),
      fmt(r.totalGross),
    ]),
    theme: "grid",
    styles: { font: FONT_FAMILY },
  });

  doc.save(`${title}.pdf`);
}

// ─── Inventory exports ────────────────────────────────────────────────────────

export function exportInventoryExcel(
  data: InventoryReportData,
  title: string,
  columns: ExportColumnSpec[],
) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["Metric", "Value"],
    ["Total Positions", data.summary.totalProducts],
    ["Total Stock Value", data.summary.totalStockValue],
    ["Zero Stock Items", data.summary.zeroStockCount],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryData),
    "Summary",
  );

  // Inventory sheet — only selected columns
  const header = columns.map((c) => c.label);
  const body = data.rows.map((row) =>
    columns.map((c) => {
      const v = cellValue(row, c.key);
      if (typeof v === "number") return v; // keep numeric for Excel formatting
      return v;
    }),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([header, ...body]),
    "Inventory",
  );

  XLSX.writeFile(wb, `${title}.xlsx`);
}

export async function exportInventoryPdf(
  data: InventoryReportData,
  title: string,
  columns: ExportColumnSpec[],
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait" });
  await loadFont(doc);
  doc.setFontSize(16);
  doc.text(title, 14, 16);

  const head = [columns.map((c) => c.label)];
  const body = data.rows.map((row) =>
    columns.map((c) => {
      const v = cellValue(row, c.key);
      if (typeof v === "number") {
        if (c.format === "integer") return String(v);
        if (c.format === "percent") return `${v.toFixed(1)}%`;
        return fmt(v);
      }
      return v;
    }),
  );

  autoTable(doc, {
    startY: 22,
    head,
    body,
    theme: "grid",
    styles: { fontSize: 7, font: FONT_FAMILY, fontStyle: "normal" },
    headStyles: { font: FONT_FAMILY, fontStyle: "normal", fillColor: [219, 37, 37] },
  });

  doc.save(`${title}.pdf`);
}
