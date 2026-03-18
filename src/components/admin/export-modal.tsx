"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

type Locale = "pl" | "ua" | "en" | "es";

interface ExportField {
  key: string;
  label: string;
  group: "basic" | "pricing" | "meta" | "category";
}

interface WarehousePrice {
  warehouseSlug: string;
  price: number;
  quantity: number;
  promotionPrice: number | null;
  badge: string;
  margin: number;
  warehouse: { displayedName: string; name: string };
}

interface Item {
  articleId: string;
  slug: string;
  isDisplayed: boolean;
  sellCounter: number;
  categorySlug: string;
  brandSlug: string;
  warrantyType: string;
  warrantyLength: number;
  createdAt: string;
  updatedAt: string;
  details: {
    locale: string;
    itemName: string;
    description: string;
    specifications: string;
    seller: string;
    discount: number | null;
    popularity: number | null;
    metaKeyWords: string;
    metaDescription: string;
  };
  prices: WarehousePrice[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "ua", label: "Українська", flag: "🇺🇦" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];

const EXPORT_FIELDS: ExportField[] = [
  // Basic
  { key: "articleId", label: "Article ID", group: "basic" },
  { key: "slug", label: "Slug", group: "basic" },
  { key: "brandSlug", label: "Brand", group: "basic" },
  { key: "categorySlug", label: "Category", group: "basic" },
  { key: "isDisplayed", label: "Is Displayed", group: "basic" },
  { key: "warrantyType", label: "Warranty Type", group: "basic" },
  { key: "warrantyLength", label: "Warranty Length (months)", group: "basic" },
  { key: "sellCounter", label: "Sell Counter", group: "basic" },
  { key: "createdAt", label: "Created At", group: "basic" },
  { key: "updatedAt", label: "Updated At", group: "basic" },
  // Details
  { key: "itemName", label: "Item Name", group: "basic" },
  { key: "description", label: "Description", group: "basic" },
  { key: "specifications", label: "Specifications", group: "basic" },
  { key: "seller", label: "Seller", group: "basic" },
  // Pricing
  { key: "prices_warehouse1", label: "warehouse-2 Price", group: "pricing" },
  { key: "prices_qty1", label: "warehouse-2 Qty", group: "pricing" },
  { key: "prices_warehouse2", label: "warehouse-3 Price", group: "pricing" },
  { key: "prices_qty2", label: "warehouse-3 Qty", group: "pricing" },
  { key: "prices_warehouse3", label: "warehouse-4 Price", group: "pricing" },
  { key: "prices_qty3", label: "warehouse-4 Qty", group: "pricing" },
  // Meta
  { key: "metaKeyWords", label: "Meta Keywords", group: "meta" },
  { key: "metaDescription", label: "Meta Description", group: "meta" },
  { key: "discount", label: "Discount", group: "meta" },
  { key: "popularity", label: "Popularity", group: "meta" },
];

const FIELD_GROUPS = [
  { id: "basic", label: "Basic Info & Details" },
  { id: "pricing", label: "Pricing & Stock" },
  { id: "meta", label: "SEO & Meta" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flattenItem(item: Item, selectedFields: Set<string>): Record<string, unknown> {
  const warehouseByDisplay: Record<string, WarehousePrice> = {};
  for (const p of item.prices) {
    warehouseByDisplay[p.warehouse.displayedName] = p;
  }

  const all: Record<string, unknown> = {
    articleId: item.articleId,
    slug: item.slug,
    brandSlug: item.brandSlug,
    categorySlug: item.categorySlug,
    isDisplayed: item.isDisplayed,
    warrantyType: item.warrantyType,
    warrantyLength: item.warrantyLength,
    sellCounter: item.sellCounter,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    itemName: item.details.itemName,
    description: item.details.description,
    specifications: item.details.specifications,
    seller: item.details.seller,
    prices_warehouse1: warehouseByDisplay["warehouse-2"]?.price ?? "",
    prices_qty1: warehouseByDisplay["warehouse-2"]?.quantity ?? "",
    prices_warehouse2: warehouseByDisplay["warehouse-3"]?.price ?? "",
    prices_qty2: warehouseByDisplay["warehouse-3"]?.quantity ?? "",
    prices_warehouse3: warehouseByDisplay["warehouse-4"]?.price ?? "",
    prices_qty3: warehouseByDisplay["warehouse-4"]?.quantity ?? "",
    metaKeyWords: item.details.metaKeyWords,
    metaDescription: item.details.metaDescription,
    discount: item.details.discount ?? "",
    popularity: item.details.popularity ?? "",
  };

  const result: Record<string, unknown> = {};
  for (const field of EXPORT_FIELDS) {
    if (selectedFields.has(field.key)) {
      result[field.label] = all[field.key] ?? "";
    }
  }
  return result;
}

async function fetchLocaleItems(locale: Locale): Promise<Item[]> {
  const res = await fetch(`/api/public/items/${locale}`);
  if (!res.ok) throw new Error(`Failed to fetch locale: ${locale}`);
  return res.json();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [selectedLocales, setSelectedLocales] = useState<Set<Locale>>(new Set(["pl"]));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(EXPORT_FIELDS.map((f) => f.key))
  );
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");

  const toggleLocale = (locale: Locale) => {
    setSelectedLocales((prev) => {
      const next = new Set(prev);
      if (next.has(locale)) {
        if (next.size === 1) return prev; // always keep at least one
        next.delete(locale);
      } else {
        next.add(locale);
      }
      return next;
    });
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    const groupFields = EXPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSelected = groupFields.every((k) => selectedFields.has(k));
    setSelectedFields((prev) => {
      const next = new Set(prev);
      groupFields.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const selectAllFields = () => setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.key)));
  const clearAllFields = () => setSelectedFields(new Set());

  const handleExport = useCallback(async () => {
    if (selectedFields.size === 0) {
      setError("Select at least one field to export.");
      return;
    }
    setIsExporting(true);
    setError("");

    try {
      const localesArray = Array.from(selectedLocales);
      const allRows: (Record<string, unknown> & { _locale?: string })[] = [];

      for (const locale of localesArray) {
        setProgress(`Fetching ${locale.toUpperCase()}…`);
        const items = await fetchLocaleItems(locale);
        for (const item of items) {
          const row = flattenItem(item, selectedFields);
          if (localesArray.length > 1) row["Locale"] = locale.toUpperCase();
          allRows.push(row);
        }
      }

      setProgress("Building file…");
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "csv") {
        if (localesArray.length > 1) {
          // Multi-locale → ZIP with one CSV per locale (simple multi-file download)
          for (const locale of localesArray) {
            const localeRows = allRows.filter((r) => r["Locale"] === locale.toUpperCase() || localesArray.length === 1);
            const ws = XLSX.utils.json_to_sheet(localeRows);
            const csv = XLSX.utils.sheet_to_csv(ws);
            downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `export_${locale}_${timestamp}.csv`);
          }
        } else {
          const ws = XLSX.utils.json_to_sheet(allRows);
          const csv = XLSX.utils.sheet_to_csv(ws);
          downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `export_${localesArray[0]}_${timestamp}.csv`);
        }
      } else {
        const wb = XLSX.utils.book_new();
        if (localesArray.length > 1) {
          for (const locale of localesArray) {
            const localeRows = allRows.filter((r) => r["Locale"] === locale.toUpperCase());
            // Remove redundant Locale column per sheet
            const cleanRows = localeRows.map(({ Locale: _l, ...rest }) => rest);
            const ws = XLSX.utils.json_to_sheet(cleanRows);
            autoFitColumns(ws, cleanRows);
            XLSX.utils.book_append_sheet(wb, ws, locale.toUpperCase());
          }
        } else {
          const ws = XLSX.utils.json_to_sheet(allRows);
          autoFitColumns(ws, allRows);
          XLSX.utils.book_append_sheet(wb, ws, localesArray[0].toUpperCase());
        }
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        downloadBlob(new Blob([buf], { type: "application/octet-stream" }), `export_${localesArray.join("_")}_${timestamp}.xlsx`);
      }

      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setIsExporting(false);
      setProgress("");
    }
  }, [selectedLocales, selectedFields, format, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,20,40,0.4)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
          maxHeight: "90vh",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-9 h-9 rounded-xl text-lg"
              style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}
            >
              ↓
            </span>
            <div>
              <h2 className="font-semibold" style={{ fontSize: 16, letterSpacing: -0.3, color: "#111827" }}>
                Export Items
              </h2>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                Select locales, fields and format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ color: "#9ca3af", background: "#f3f4f6" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Locales */}
          <Section title="Locales" subtitle="Data will be fetched per locale">
            <div className="flex flex-wrap gap-2">
              {LOCALES.map(({ value, label, flag }) => {
                const active = selectedLocales.has(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleLocale(value)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: active ? "rgba(22,163,74,0.08)" : "#f9fafb",
                      border: `1.5px solid ${active ? "#16a34a" : "#e5e7eb"}`,
                      color: active ? "#16a34a" : "#6b7280",
                    }}
                  >
                    <span>{flag}</span>
                    <span>{label}</span>
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: active ? "rgba(22,163,74,0.7)" : "#d1d5db" }}
                    >
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedLocales.size > 1 && (
              <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
                📊 Each locale will be a separate sheet (XLSX) or file (CSV).
              </p>
            )}
          </Section>

          {/* Fields */}
          <Section
            title="Fields"
            subtitle={`${selectedFields.size} of ${EXPORT_FIELDS.length} selected`}
            action={
              <div className="flex gap-2">
                <PillButton onClick={selectAllFields}>All</PillButton>
                <PillButton onClick={clearAllFields}>None</PillButton>
              </div>
            }
          >
            <div className="space-y-4">
              {FIELD_GROUPS.map(({ id, label }) => {
                const groupFields = EXPORT_FIELDS.filter((f) => f.group === id);
                const allChecked = groupFields.every((f) => selectedFields.has(f.key));
                const someChecked = groupFields.some((f) => selectedFields.has(f.key));
                return (
                  <div key={id}>
                    {/* Group header */}
                    <button
                      className="flex items-center gap-2 mb-2 w-full text-left"
                      onClick={() => toggleGroup(id)}
                    >
                      <Checkbox checked={allChecked} indeterminate={!allChecked && someChecked} />
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>
                        {label}
                      </span>
                    </button>
                    {/* Fields grid */}
                    <div className="grid grid-cols-2 gap-1 pl-5">
                      {groupFields.map((field) => (
                        <button
                          key={field.key}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-sm"
                          style={{
                            background: selectedFields.has(field.key) ? "#f0fdf4" : "transparent",
                            color: selectedFields.has(field.key) ? "#15803d" : "#9ca3af",
                          }}
                          onClick={() => toggleField(field.key)}
                        >
                          <Checkbox checked={selectedFields.has(field.key)} />
                          <span style={{ fontSize: 13 }}>{field.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Format */}
          <Section title="Format">
            <div className="flex gap-3">
              {(["xlsx", "csv"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm uppercase tracking-wider transition-all"
                  style={{
                    background: format === f ? "#f0fdf4" : "#f9fafb",
                    border: `1.5px solid ${format === f ? "#16a34a" : "#e5e7eb"}`,
                    color: format === f ? "#16a34a" : "#9ca3af",
                  }}
                >
                  {f === "xlsx" ? "📊 Excel (.xlsx)" : "📄 CSV (.csv)"}
                </button>
              ))}
            </div>
          </Section>

          {error && (
            <p className="px-4 py-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
        >
          <span className="text-sm" style={{ color: "#9ca3af" }}>
            {isExporting ? (
              <span style={{ color: "#16a34a" }}>{progress}</span>
            ) : (
              `${selectedLocales.size} locale${selectedLocales.size > 1 ? "s" : ""} · ${selectedFields.size} fields`
            )}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "#f3f4f6", color: "#6b7280" }}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedFields.size === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                background: isExporting || selectedFields.size === 0 ? "#bbf7d0" : "#16a34a",
                color: isExporting || selectedFields.size === 0 ? "#86efac" : "#ffffff",
                cursor: isExporting || selectedFields.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              {isExporting ? (
                <>
                  <SpinnerIcon />
                  Exporting…
                </>
              ) : (
                <>↓ Export {format.toUpperCase()}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function PillButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
      style={{ background: "#f3f4f6", color: "#6b7280" }}
    >
      {children}
    </button>
  );
}

function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded transition-all"
      style={{
        background: checked || indeterminate ? "#16a34a" : "transparent",
        border: `1.5px solid ${checked || indeterminate ? "#16a34a" : "#d1d5db"}`,
        fontSize: 10,
        color: "#ffffff",
      }}
    >
      {indeterminate ? "–" : checked ? "✓" : ""}
    </span>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const colWidths = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...data.map((row) => String(row[h] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws["!cols"] = colWidths;
}