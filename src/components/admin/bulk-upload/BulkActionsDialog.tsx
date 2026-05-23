"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface SchneiderResult {
  updated: number;
  created: number;
}

interface BulkActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSchneider: (discount: number, margin: number, updateExistingMargin: boolean) => void;
  loading: boolean;
  result: SchneiderResult | null;
}

const DEFAULT_DISCOUNT = 35;
const DEFAULT_MARGIN = 25;

export default function BulkActionsDialog({
  open,
  onOpenChange,
  onUpdateSchneider,
  loading,
  result,
}: BulkActionsDialogProps) {
  const t = useTranslations("adminDashboard");
  const [customEnabled, setCustomEnabled] = useState(false);
  const [discount, setDiscount] = useState(DEFAULT_DISCOUNT);
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [updateExistingMargin, setUpdateExistingMargin] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bulkUpload.bulkActionsModal.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Discount & Margin config */}
          <div className="rounded-md border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custom discount &amp; margin</span>
              <Switch
                checked={customEnabled}
                onCheckedChange={setCustomEnabled}
              />
            </div>
            <div className={`grid grid-cols-2 gap-4 ${customEnabled ? "" : "opacity-50"}`}>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Discount (%)
                </Label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={discount}
                    disabled={!customEnabled}
                    onChange={(e) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Margin — new items only (%)
                </Label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.1}
                    value={margin}
                    disabled={!customEnabled}
                    onChange={(e) =>
                      setMargin(parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Formula: <span className="font-mono">price / 1.2 × (1 − {discount}%) × (1 + {margin}%)</span>
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="updateExistingMargin"
                checked={updateExistingMargin}
                onChange={(e) => setUpdateExistingMargin(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
              <label htmlFor="updateExistingMargin" className="text-sm cursor-pointer select-none">
                Update margin on existing prices
              </label>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => onUpdateSchneider(discount, margin, updateExistingMargin)}
            disabled={loading}
          >
            {loading
              ? t("bulkUpload.bulkActionsModal.updating")
              : t("bulkUpload.bulkActionsModal.updateSchneider")}
          </Button>

          {result && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              <p className="font-medium">{t("bulkUpload.bulkActionsModal.done")}</p>
              <p className="text-muted-foreground">
                {t("bulkUpload.bulkActionsModal.updated")}:{" "}
                <span className="font-semibold text-foreground">{result.updated}</span>
                &nbsp;&middot;&nbsp;
                {t("bulkUpload.bulkActionsModal.created")}:{" "}
                <span className="font-semibold text-foreground">{result.created}</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
