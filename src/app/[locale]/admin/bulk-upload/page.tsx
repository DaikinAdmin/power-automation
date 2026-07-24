"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Zap, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import BulkActionsDialog from "@/components/admin/bulk-upload/BulkActionsDialog";
import ModeToggle from "@/components/admin/bulk-upload/ModeToggle";
import ColumnMappingCard from "@/components/admin/bulk-upload/ColumnMappingCard";
import FileUploadCard from "@/components/admin/bulk-upload/FileUploadCard";
import ConfigurationPanel from "@/components/admin/bulk-upload/ConfigurationPanel";
import DataPreviewCard, { DataPreviewEmpty } from "@/components/admin/bulk-upload/DataPreviewCard";
import UploadStatus from "@/components/admin/bulk-upload/UploadStatus";
import {
  UploadState,
  ParsedData,
  FieldType,
  TranslationField,
  ColumnMapping,
  Warehouse,
  Currency,
  UploadMode,
  EMPTY_COLUMN_MAPPING,
} from "@/types/bulk-upload-types";

export default function BulkUploadPage() {
  const t = useTranslations('adminDashboard');
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(EMPTY_COLUMN_MAPPING);
  const [draggedLabel, setDraggedLabel] = useState<FieldType | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [currencyEnabled, setCurrencyEnabled] = useState<boolean>(false);
  const [margin, setMargin] = useState<number>(20);
  const [marginEnabled, setMarginEnabled] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("prices");
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [schneiderResult, setSchneiderResult] = useState<{ updated: number; created: number } | null>(null);
  const [schneiderLoading, setSchneiderLoading] = useState(false);

  const handleUpdateSchneiderPrices = async (discount: number, margin: number, updateExistingMargin: boolean) => {
    setSchneiderLoading(true);
    setSchneiderResult(null);
    try {
      const res = await fetch("/api/admin/partnerse/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount, margin, updateExistingMargin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSchneiderResult({ updated: data.updated, created: data.created });
    } catch (err: any) {
      toast.error("Failed to update Schneider prices", { description: err.message });
    } finally {
      setSchneiderLoading(false);
    }
  };

  const handleModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    setSelectedFile(null);
    setParsedData(null);
    setColumnMapping(EMPTY_COLUMN_MAPPING);
    setUploadState({ status: "idle", progress: 0, message: "" });
  };

  // Fetch warehouses when page loads
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setIsLoadingWarehouses(true);
    try {
      const response = await fetch("/api/admin/warehouses");
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
        if (data.length > 0) {
          setSelectedWarehouse(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
      toast.error("Failed to load warehouses");
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState({ status: "idle", progress: 0, message: "" });
      parseFile(file);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidFile(file)) {
        setSelectedFile(file);
        setUploadState({ status: "idle", progress: 0, message: "" });
        parseFile(file);
      }
    },
    [],
  );

  const parseFile = async (file: File) => {
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv") {
        await parseCSV(file);
      } else if (extension === "xlsx" || extension === "xls") {
        await parseExcel(file);
      }
    } catch (error) {
      console.error("Failed to parse file:", error);
      toast.error("Failed to parse file");
    }
  };

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length === 0) return;

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return values;
    });

    setParsedData({ headers, rows });
  };

  const parseExcel = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: "",
      blankrows: false,
    }) as any[][];

    if (data.length === 0) return;

    const headers = data[0].map((h) => String(h || "").trim());
    const rows = data
      .slice(1)
      .filter((row) => row.some((cell) => cell !== undefined && cell !== ""));

    setParsedData({ headers, rows });
  };

  // Drag and drop handlers for column mapping
  const handleLabelDragStart = (label: FieldType) => {
    setDraggedLabel(label);
  };

  const handleLabelDragEnd = () => {
    setDraggedLabel(null);
  };

  const handleColumnDrop = (columnIndex: number) => {
    if (draggedLabel) {
      setColumnMapping((prev) => ({
        ...prev,
        [draggedLabel]: columnIndex,
      }));
      setDraggedLabel(null);
    }
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeColumnMapping = (label: FieldType) => {
    setColumnMapping((prev) => ({
      ...prev,
      [label]: null,
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !parsedData) return;

    // Validate mandatory fields
    if (columnMapping.articleId === null) {
      toast.error("Please map the Article ID field");
      return;
    }
    if (uploadMode === "prices") {
      if (!selectedWarehouse) {
        toast.error("Please select a warehouse");
        return;
      }
    }

    setUploadState({
      status: "uploading",
      progress: 10,
      message: "Processing data...",
    });

    try {
      // Returns the trimmed cell value, or undefined if the column isn't
      // mapped or the cell is blank — a blank cell means "leave this field
      // untouched", and must never be coerced into "", 0, or false.
      const cellValue = (row: any[], col: number | null): string | undefined => {
        if (col === null) return undefined;
        const raw = row[col];
        if (raw === undefined || raw === null) return undefined;
        const str = String(raw).trim();
        return str === "" ? undefined : str;
      };

      // Map the data based on column assignments
      const items = parsedData.rows
        .map((row) => {
          const rowMargin =
            columnMapping.margin !== null
              ? parseFloat(row[columnMapping.margin]) || 0
              : 0;
          const rowInitialCurrency =
            columnMapping.initialCurrency !== null &&
            row[columnMapping.initialCurrency]
              ? String(row[columnMapping.initialCurrency]).trim()
              : null;
          const item: any = {
            articleId: row[columnMapping.articleId!],
          };

          if (rowInitialCurrency) {
            item.currency = rowInitialCurrency;
          } else if (currencyEnabled) {
            item.currency = currency;
          }

          if (columnMapping.price !== null) {
            const parsed = parseFloat(row[columnMapping.price]);
            if (!isNaN(parsed)) item.initialPrice = parsed;
          }

          if (columnMapping.quantity !== null) {
            const parsed = parseInt(row[columnMapping.quantity]);
            if (!isNaN(parsed)) item.quantity = parsed;
          }

          if (rowMargin > 0) {
            item.margin = rowMargin;
          } else if (marginEnabled) {
            item.margin = margin;
          }

          // Add optional fields if mapped — a blank cell must leave the
          // field untouched rather than clearing it (only an explicit 0
          // deactivates promoPrice / promoDiscountPercent, see below).
          const badgeCell = cellValue(row, columnMapping.badge);
          if (badgeCell !== undefined) item.badge = badgeCell;

          const brandCell = cellValue(row, columnMapping.brand);
          if (brandCell !== undefined) item.brand = brandCell;

          const promoCodeCell = cellValue(row, columnMapping.promoCode);
          if (promoCodeCell !== undefined) item.promoCode = promoCodeCell;

          // promoPrice and promoDiscountPercent are mutually exclusive: an
          // explicit promo price is written straight to the DB as-is,
          // otherwise a discount % is applied on top of the
          // initialPrice+margin price (computed server-side). Setting
          // either one to 0 deactivates the active promo/discount; leaving
          // the cell blank changes nothing.
          const promoPriceCell = cellValue(row, columnMapping.promoPrice);
          if (promoPriceCell !== undefined) {
            const parsed = parseFloat(promoPriceCell);
            if (!isNaN(parsed)) item.promoPrice = parsed;
          }
          const promoDiscountPercentCell = cellValue(
            row,
            columnMapping.promoDiscountPercent,
          );
          if (promoDiscountPercentCell !== undefined) {
            const parsed = parseFloat(promoDiscountPercentCell);
            if (!isNaN(parsed)) item.promoDiscountPercent = parsed;
          }

          const promoStartDateCell = cellValue(row, columnMapping.promoStartDate);
          if (promoStartDateCell !== undefined) item.promoStartDate = promoStartDateCell;

          const promoEndDateCell = cellValue(row, columnMapping.promoEndDate);
          if (promoEndDateCell !== undefined) item.promoEndDate = promoEndDateCell;

          // Build translations object from mapped translation columns
          const translations: Record<
            string,
            {
              name?: string;
              description?: string;
              specifications?: string;
              metaDescription?: string;
              metaKeywords?: string;
            }
          > = {};
          const transLocales = ["pl", "ua", "en", "es"] as const;
          for (const locale of transLocales) {
            const nameCol = columnMapping[`name_${locale}` as TranslationField];
            const descCol =
              columnMapping[`description_${locale}` as TranslationField];
            const specsCol =
              columnMapping[`specifications_${locale}` as TranslationField];
            const metaDescCol =
              columnMapping[`metaDescription_${locale}` as TranslationField];
            const metaKwCol =
              columnMapping[`metaKeywords_${locale}` as TranslationField];
            if (
              nameCol !== null ||
              descCol !== null ||
              specsCol !== null ||
              metaDescCol !== null ||
              metaKwCol !== null
            ) {
              translations[locale] = {};
              if (nameCol !== null && row[nameCol] !== undefined)
                translations[locale].name = String(row[nameCol]);
              if (descCol !== null && row[descCol] !== undefined)
                translations[locale].description = String(row[descCol]);
              if (specsCol !== null && row[specsCol] !== undefined)
                translations[locale].specifications = String(row[specsCol]);
              if (metaDescCol !== null && row[metaDescCol] !== undefined)
                translations[locale].metaDescription = String(row[metaDescCol]);
              if (metaKwCol !== null && row[metaKwCol] !== undefined)
                translations[locale].metaKeywords = String(row[metaKwCol]);
            }
          }
          if (Object.keys(translations).length > 0) {
            item.translations = translations;
          }
          const sellerCell = cellValue(row, columnMapping.seller);
          if (sellerCell !== undefined) item.seller = sellerCell;

          const imageUrlCell = cellValue(row, columnMapping.imageUrl);
          if (imageUrlCell !== undefined) item.imageUrl = imageUrlCell;

          const aliasCell = cellValue(row, columnMapping.alias);
          if (aliasCell !== undefined) item.alias = aliasCell;

          const isDisplayedCell = cellValue(row, columnMapping.isDisplayed);
          if (isDisplayedCell !== undefined) {
            const val = isDisplayedCell.toLowerCase();
            item.isDisplayed = val === "true" || val === "1" || val === "yes";
          }

          const categorySlugCell = cellValue(row, columnMapping.categorySlug);
          if (categorySlugCell !== undefined) item.categorySlug = categorySlugCell;

          if (
            columnMapping.grossWeight !== null &&
            row[columnMapping.grossWeight] !== undefined
          ) {
            const parsed = parseFloat(row[columnMapping.grossWeight]);
            if (!isNaN(parsed)) item.grossWeight = parsed;
          }
          if (
            columnMapping.heightPacking !== null &&
            row[columnMapping.heightPacking] !== undefined
          ) {
            const parsed = parseFloat(row[columnMapping.heightPacking]);
            if (!isNaN(parsed)) item.heightPacking = parsed;
          }
          if (
            columnMapping.widthPacking !== null &&
            row[columnMapping.widthPacking] !== undefined
          ) {
            const parsed = parseFloat(row[columnMapping.widthPacking]);
            if (!isNaN(parsed)) item.widthPacking = parsed;
          }
          if (
            columnMapping.lengthPacking !== null &&
            row[columnMapping.lengthPacking] !== undefined
          ) {
            const parsed = parseFloat(row[columnMapping.lengthPacking]);
            if (!isNaN(parsed)) item.lengthPacking = parsed;
          }

          return item;
        })
        .filter((item) => item.articleId); // Filter out rows without articleId

      setUploadState({
        status: "uploading",
        progress: 30,
        message: "Uploading to server...",
      });

      const endpoint =
        uploadMode === "descriptions"
          ? "/api/admin/items/bulk-update-descriptions"
          : "/api/admin/items/bulk-update-prices";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          uploadMode === "descriptions"
            ? { items }
            : { items, warehouseId: selectedWarehouse },
        ),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();

      setUploadState({
        status: "success",
        progress: 100,
        message: result.message || "Upload completed successfully",
      });

      const warehouseName =
        warehouses.find((w) => w.id === selectedWarehouse)?.name || "warehouse";

      const toastTitle =
        uploadMode === "descriptions"
          ? "Descriptions Updated!"
          : "Prices Updated!";
      toast.success(toastTitle, {
        description:
          uploadMode === "descriptions"
            ? `Updated ${result.results?.updated || 0} and created ${result.results?.created || 0} items`
            : `Updated ${result.results?.updated || 0} and created ${result.results?.created || 0} items in ${warehouseName}`,
        duration: 5000,
      });

      // Reset form after success
      setTimeout(() => {
        setSelectedFile(null);
        setParsedData(null);
        setColumnMapping(EMPTY_COLUMN_MAPPING);
        setUploadState({ status: "idle", progress: 0, message: "" });
      }, 3000);
    } catch (error: any) {
      setUploadState({
        status: "error",
        progress: 0,
        message: error.message || "Upload failed",
      });
      toast.error("Upload Failed", {
        description: error.message,
      });
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const hasValidType =
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const hasValidSize = file.size <= maxSize;

    if (!hasValidType) {
      setUploadState({
        status: "error",
        progress: 0,
        message:
          "Invalid file type. Only CSV, XLSX, and XLS files are supported.",
      });
      return false;
    }

    if (!hasValidSize) {
      setUploadState({
        status: "error",
        progress: 0,
        message: "File too large. Maximum file size is 10MB.",
      });
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('bulkUpload.title')}</h1>
          <p className="text-gray-600">
            {t('bulkUpload.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setBulkActionsOpen(true); setSchneiderResult(null); }}>
            <Zap className="mr-2 h-4 w-4" />
            {t('bulkUpload.bulkActions')}
          </Button>
        </div>
      </div>

      <BulkActionsDialog
        open={bulkActionsOpen}
        onOpenChange={setBulkActionsOpen}
        onUpdateSchneider={handleUpdateSchneiderPrices}
        loading={schneiderLoading}
        result={schneiderResult}
      />

      <ModeToggle uploadMode={uploadMode} onModeChange={handleModeChange} />

      {parsedData && (
        <ColumnMappingCard
          columnMapping={columnMapping}
          uploadMode={uploadMode}
          draggedLabel={draggedLabel}
          onLabelDragStart={handleLabelDragStart}
          onLabelDragEnd={handleLabelDragEnd}
          onRemoveMapping={removeColumnMapping}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <ConfigurationPanel
            uploadMode={uploadMode}
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            isLoadingWarehouses={isLoadingWarehouses}
            onWarehouseChange={setSelectedWarehouse}
            currency={currency}
            onCurrencyChange={setCurrency}
            currencyEnabled={currencyEnabled}
            onCurrencyEnabledChange={setCurrencyEnabled}
            margin={margin}
            onMarginChange={setMargin}
            marginEnabled={marginEnabled}
            onMarginEnabledChange={setMarginEnabled}
          />
          <FileUploadCard
            selectedFile={selectedFile}
            isDragActive={isDragActive}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {parsedData ? (
            <DataPreviewCard
              parsedData={parsedData}
              columnMapping={columnMapping}
              draggedLabel={draggedLabel}
              onColumnDrop={handleColumnDrop}
              onColumnDragOver={handleColumnDragOver}
            />
          ) : (
            <DataPreviewEmpty />
          )}

          <UploadStatus uploadState={uploadState} />

          {parsedData && (
            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={
                  !selectedFile ||
                  uploadState.status === "uploading" ||
                  !parsedData ||
                  columnMapping.articleId === null
                }
                size="lg"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {uploadState.status === "uploading"
                  ? t("bulkUpload.uploadingBtn")
                  : t("bulkUpload.uploadBtn")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
