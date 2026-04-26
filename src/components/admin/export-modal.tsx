"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import * as XLSX from "xlsx";
import type { Locale } from "@/i18n/routing";
import type { SupportedCurrency, ExchangeRate } from "@/helpers/currency";
import type { WarehouseInfo } from "@/helpers/db/category-data-queries";
import type { ExportField, ExportWarehousePrice, ExportItem } from "@/helpers/types/export";

// ─── Types ───────────────────────────────────────────────────────────────────

// Local aliases for convenience
type WarehousePrice = ExportWarehousePrice;
type Item = ExportItem;

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "ua", label: "Українська", flag: "🇺🇦" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];

const CURRENCIES: { value: SupportedCurrency; label: string; symbol: string }[] = [
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "PLN", label: "Polski złoty", symbol: "zł" },
  { value: "UAH", label: "Гривня", symbol: "₴" },
  { value: "USD", label: "US Dollar", symbol: "$" },
];

const BASE_EXPORT_FIELDS: ExportField[] = [
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
  // Meta
  { key: "metaKeyWords", label: "Meta Keywords", group: "meta" },
  { key: "metaDescription", label: "Meta Description", group: "meta" },
  { key: "discount", label: "Discount", group: "meta" },
  { key: "popularity", label: "Popularity", group: "meta" },
];

const FIELD_GROUPS = [
  { id: "basic" },
  { id: "meta" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function convertPrice(price: number, fromCurrency: string, toCurrency: SupportedCurrency, rates: ExchangeRate[]): number {
  const from = (fromCurrency || "EUR") as SupportedCurrency;
  if (from === toCurrency) return price;
  // Normalize to EUR first, then to target
  const fromRate = from === "EUR" ? 1 : (rates.find((r) => r.from === "EUR" && r.to === from)?.rate ?? null);
  const toRate = toCurrency === "EUR" ? 1 : (rates.find((r) => r.from === "EUR" && r.to === toCurrency)?.rate ?? null);
  if (fromRate === null || toRate === null) return price; // rate not configured — return as-is
  return Math.round((price / fromRate) * toRate * 100) / 100;
}

function flattenItem(
  item: Item,
  selectedFields: Set<string>,
  warehouses: WarehouseInfo[],
  selectedWarehouses: Set<string>,
  convertCurrency: SupportedCurrency | null,
  exchangeRates: ExchangeRate[],
): Record<string, unknown> {
  const warehouseByName: Record<string, WarehousePrice> = {};
  for (const p of item.prices) {
    warehouseByName[p.warehouse.displayedName] = p;
  }

  const result: Record<string, unknown> = {};

  // Base fields
  for (const field of BASE_EXPORT_FIELDS) {
    if (!selectedFields.has(field.key)) continue;
    const map: Record<string, unknown> = {
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
      metaKeyWords: item.details.metaKeyWords,
      metaDescription: item.details.metaDescription,
      discount: item.details.discount ?? "",
      popularity: item.details.popularity ?? "",
    };
    result[field.label] = map[field.key] ?? "";
  }

  // Per-warehouse columns: Initial Price, Initial Currency, Qty, Margin, Price With VAT (EUR), Price Without VAT (EUR)
  // + optionally converted prices
  for (const w of warehouses) {
    if (!selectedWarehouses.has(w.id)) continue;
    const p = warehouseByName[w.displayedName];
    const n = w.displayedName;
    const srcCurrency = p?.initialPriceCurrency || "EUR";
    result[`${n} - Вхідна ціна`] = p?.initialPrice ?? "";
    result[`${n} - Вхідна валюта`] = srcCurrency;
    result[`${n} - К-сть`] = p?.quantity ?? "";
    result[`${n} - Маржа %`] = p?.margin ?? "";
    result[`${n} - Ціна з ПДВ (${srcCurrency})`] = p?.priceWithVAT ?? "";
    result[`${n} - Ціна без ПДВ (${srcCurrency})`] = p?.priceWithoutVAT ?? "";

    if (convertCurrency && convertCurrency !== srcCurrency) {
      const sym = convertCurrency;
      result[`${n} - Ціна з ПДВ (${sym})`] =
        p?.priceWithVAT != null ? convertPrice(p.priceWithVAT, srcCurrency, convertCurrency, exchangeRates) : "";
      result[`${n} - Ціна без ПДВ (${sym})`] =
        p?.priceWithoutVAT != null ? convertPrice(p.priceWithoutVAT, srcCurrency, convertCurrency, exchangeRates) : "";
    }
  }

  return result;
}

async function fetchLocaleItems(locale: Locale, vatPct: number): Promise<Item[]> {
  const res = await fetch(`/api/admin/items/export?locale=${locale}&vat=${vatPct}`);
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
  const t = useTranslations('adminDashboard');
  const [selectedLocales, setSelectedLocales] = useState<Set<Locale>>(new Set(["pl"]));
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(BASE_EXPORT_FIELDS.map((f) => f.key))
  );
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [convertCurrency, setConvertCurrency] = useState<SupportedCurrency | null>(null);
  const [vatPct, setVatPct] = useState<number>(23);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/admin/warehouses")
      .then((r) => r.json())
      .then((data: WarehouseInfo[]) => {
        setWarehouses(data);
        setSelectedWarehouses(new Set(data.map((w) => w.id)));
      })
      .catch(() => {});
    fetch("/api/admin/currency-exchange")
      .then((r) => r.json())
      .then((data: ExchangeRate[]) => setExchangeRates(data))
      .catch(() => {});
  }, [isOpen]);

  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");

  const toggleLocale = (locale: Locale) => {
    setSelectedLocales((prev) => {
      const next = new Set(prev);
      if (next.has(locale)) {
        if (next.size === 1) return prev;
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
    const groupFields = BASE_EXPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSelected = groupFields.every((k) => selectedFields.has(k));
    setSelectedFields((prev) => {
      const next = new Set(prev);
      groupFields.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const toggleWarehouse = (id: string) => {
    setSelectedWarehouses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFields = () => setSelectedFields(new Set(BASE_EXPORT_FIELDS.map((f) => f.key)));
  const clearAllFields = () => setSelectedFields(new Set());

  const handleExport = useCallback(async () => {
    if (selectedFields.size === 0) {
      setError(t('exportModal.selectFieldError'));
      return;
    }
    setIsExporting(true);
    setError("");

    try {
      const localesArray = Array.from(selectedLocales);
      const allRows: (Record<string, unknown> & { _locale?: string })[] = [];

      for (const locale of localesArray) {
        setProgress(`Fetching ${locale.toUpperCase()}…`);
        const items = await fetchLocaleItems(locale, vatPct);
        for (const item of items) {
          const row = flattenItem(item, selectedFields, warehouses, selectedWarehouses, convertCurrency, exchangeRates);
          if (localesArray.length > 1) row["Locale"] = locale.toUpperCase();
          allRows.push(row);
        }
      }

      setProgress("Building file…");
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "csv") {
        if (localesArray.length > 1) {
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
  }, [selectedLocales, selectedFields, selectedWarehouses, warehouses, format, convertCurrency, exchangeRates, vatPct, onClose]);

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
                {t('exportModal.title')}
              </h2>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                {t('exportModal.subtitle')}
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
          <Section title={t('exportModal.sectionLocales')} subtitle={t('exportModal.localesSubtitle')}>
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
                {t('exportModal.localesNote')}
              </p>
            )}
          </Section>

          {/* Warehouses */}
          <Section title="Склади" subtitle={`Вибрано ${selectedWarehouses.size} з ${warehouses.length}`}>
            {warehouses.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Завантаження…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {warehouses.map((w) => {
                  const active = selectedWarehouses.has(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWarehouse(w.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: active ? "rgba(22,163,74,0.08)" : "#f9fafb",
                        border: `1.5px solid ${active ? "#16a34a" : "#e5e7eb"}`,
                        color: active ? "#16a34a" : "#6b7280",
                      }}
                    >
                      <Checkbox checked={active} />
                      <span>{w.displayedName || w.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2" style={{ fontSize: 12, color: "#9ca3af" }}>
              Колонки: Вхідна ціна · Вхідна валюта · К-сть · Маржа · Ціна з ПДВ (EUR) · Ціна без ПДВ (EUR)
            </p>
          </Section>

          {/* VAT % */}
          <Section title="ПДВ %" subtitle="Застосовується до ціни EUR для розрахунку ціни з ПДВ">
            <div className="flex items-center gap-3">
              {[0, 20, 23].map((v) => (
                <button
                  key={v}
                  onClick={() => setVatPct(v)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: vatPct === v ? "rgba(22,163,74,0.08)" : "#f9fafb",
                    border: `1.5px solid ${vatPct === v ? "#16a34a" : "#e5e7eb"}`,
                    color: vatPct === v ? "#16a34a" : "#6b7280",
                  }}
                >
                  {v}%
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={vatPct}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0 && v <= 100) setVatPct(v);
                  }}
                  className="w-16 px-2 py-1.5 rounded-lg text-sm text-center"
                  style={{ border: "1.5px solid #e5e7eb", color: "#374151", background: "#f9fafb" }}
                />
                <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
              </div>
            </div>
          </Section>

          {/* Currency Conversion */}
          <Section
            title="Конвертація цін"
            subtitle={
              convertCurrency
                ? `Додаткові колонки у ${convertCurrency} (за курсом адмін-панелі)`
                : "Опціонально: додати конвертовані ціни"
            }
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConvertCurrency(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: convertCurrency === null ? "rgba(22,163,74,0.08)" : "#f9fafb",
                  border: `1.5px solid ${convertCurrency === null ? "#16a34a" : "#e5e7eb"}`,
                  color: convertCurrency === null ? "#16a34a" : "#6b7280",
                }}
              >
                Без конвертації
              </button>
              {CURRENCIES.filter((c) => c.value !== "EUR").map(({ value, label, symbol }) => {
                const active = convertCurrency === value;
                const hasRate = exchangeRates.some((r) => r.from === "EUR" && r.to === value);
                return (
                  <button
                    key={value}
                    onClick={() => setConvertCurrency(value)}
                    disabled={!hasRate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: active ? "rgba(22,163,74,0.08)" : "#f9fafb",
                      border: `1.5px solid ${active ? "#16a34a" : "#e5e7eb"}`,
                      color: active ? "#16a34a" : hasRate ? "#6b7280" : "#d1d5db",
                      cursor: hasRate ? "pointer" : "not-allowed",
                    }}
                    title={hasRate ? undefined : `Курс EUR → ${value} не налаштовано`}
                  >
                    <span>{symbol}</span>
                    <span>{label}</span>
                    <span className="text-xs uppercase tracking-widest" style={{ color: active ? "rgba(22,163,74,0.7)" : hasRate ? "#d1d5db" : "#e5e7eb" }}>
                      {value}
                    </span>
                    {!hasRate && <span style={{ fontSize: 10, color: "#fbbf24" }}>⚠</span>}
                  </button>
                );
              })}
            </div>
            {convertCurrency && (
              <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
                Буде додано: Ціна з ПДВ ({convertCurrency}), Ціна без ПДВ ({convertCurrency}) для кожного складу
              </p>
            )}
          </Section>

          {/* Fields */}
          <Section
            title={t('exportModal.sectionFields')}
            subtitle={t('exportModal.fieldsSubtitle', { selected: selectedFields.size, total: BASE_EXPORT_FIELDS.length })}
            action={
              <div className="flex gap-2">
                <PillButton onClick={selectAllFields}>{t('exportModal.selectAll')}</PillButton>
                <PillButton onClick={clearAllFields}>{t('exportModal.selectNone')}</PillButton>
              </div>
            }
          >
            <div className="space-y-4">
              {FIELD_GROUPS.map(({ id }) => {
                const groupFields = BASE_EXPORT_FIELDS.filter((f) => f.group === id);
                const allChecked = groupFields.every((f) => selectedFields.has(f.key));
                const someChecked = groupFields.some((f) => selectedFields.has(f.key));
                const groupLabel = id === 'basic' ? t('exportModal.groups.basic') : t('exportModal.groups.meta');
                return (
                  <div key={id}>
                    {/* Group header */}
                    <button
                      className="flex items-center gap-2 mb-2 w-full text-left"
                      onClick={() => toggleGroup(id)}
                    >
                      <Checkbox checked={allChecked} indeterminate={!allChecked && someChecked} />
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>
                        {groupLabel}
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
          <Section title={t('exportModal.sectionFormat')}>
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
              selectedLocales.size > 1
                ? t('exportModal.footerStatsPlural', { locales: selectedLocales.size, fields: selectedFields.size })
                : t('exportModal.footerStats', { locales: selectedLocales.size, fields: selectedFields.size })
            )}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "#f3f4f6", color: "#6b7280" }}
            >
              {t('exportModal.cancel')}
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
                  {t('exportModal.exporting')}
                </>
              ) : (
                <>{t('exportModal.exportBtn', { format: format.toUpperCase() })}</>
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
