"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Zap, Download } from "lucide-react";
import ExportModal from "@/components/admin/export-modal";
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
  const [margin, setMargin] = useState<number>(20);
  const [marginEnabled, setMarginEnabled] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("prices");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
            currency: rowInitialCurrency || currency,
          };

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

          // Add optional fields if mapped
          if (
            columnMapping.badge !== null &&
            row[columnMapping.badge] !== undefined
          ) {
            item.badge = row[columnMapping.badge];
          }
          if (
            columnMapping.brand !== null &&
            row[columnMapping.brand] !== undefined
          ) {
            item.brand = row[columnMapping.brand];
          }
          if (
            columnMapping.promoCode !== null &&
            row[columnMapping.promoCode] !== undefined
          ) {
            item.promoCode = row[columnMapping.promoCode];
          }
          if (
            columnMapping.promoPrice !== null &&
            row[columnMapping.promoPrice] !== undefined
          ) {
            item.promoPrice = parseFloat(row[columnMapping.promoPrice]) || 0;
          }
          if (
            columnMapping.promoStartDate !== null &&
            row[columnMapping.promoStartDate] !== undefined
          ) {
            item.promoStartDate = row[columnMapping.promoStartDate];
          }
          if (
            columnMapping.promoEndDate !== null &&
            row[columnMapping.promoEndDate] !== undefined
          ) {
            item.promoEndDate = row[columnMapping.promoEndDate];
          }

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
          if (
            columnMapping.seller !== null &&
            row[columnMapping.seller] !== undefined
          ) {
            item.seller = String(row[columnMapping.seller]);
          }
          if (
            columnMapping.imageUrl !== null &&
            row[columnMapping.imageUrl] !== undefined
          ) {
            item.imageUrl = String(row[columnMapping.imageUrl]);
          }
          if (
            columnMapping.alias !== null &&
            row[columnMapping.alias] !== undefined
          ) {
            item.alias = String(row[columnMapping.alias]);
          }
          if (
            columnMapping.isDisplayed !== null &&
            row[columnMapping.isDisplayed] !== undefined
          ) {
            const val = String(row[columnMapping.isDisplayed])
              .toLowerCase()
              .trim();
            item.isDisplayed = val === "true" || val === "1" || val === "yes";
          }
          if (
            columnMapping.categorySlug !== null &&
            row[columnMapping.categorySlug] !== undefined
          ) {
            item.categorySlug = String(row[columnMapping.categorySlug]).trim();
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
          <Button
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            {t('bulkUpload.exportItems')}
          </Button>
          <Button variant="outline" onClick={() => { setBulkActionsOpen(true); setSchneiderResult(null); }}>
            <Zap className="mr-2 h-4 w-4" />
            {t('bulkUpload.bulkActions')}
          </Button>
        </div>
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

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
                  columnMapping.articleId === null ||
                  (uploadMode === "prices" &&
                    (columnMapping.price === null ||
                      columnMapping.quantity === null ||
                      !selectedWarehouse))
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
