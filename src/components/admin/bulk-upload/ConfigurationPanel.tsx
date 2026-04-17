"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Currency, UploadMode, Warehouse } from "../../../types/bulk-upload-types";

interface ConfigurationPanelProps {
  uploadMode: UploadMode;
  warehouses: Warehouse[];
  selectedWarehouse: string;
  isLoadingWarehouses: boolean;
  onWarehouseChange: (id: string) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  margin: number;
  onMarginChange: (margin: number) => void;
  marginEnabled: boolean;
  onMarginEnabledChange: (enabled: boolean) => void;
}
export default function ConfigurationPanel({
  uploadMode,
  warehouses,
  selectedWarehouse,
  isLoadingWarehouses,
  onWarehouseChange,
  currency,
  onCurrencyChange,
  margin,
  onMarginChange,
  marginEnabled,
  onMarginEnabledChange,
}: ConfigurationPanelProps) {
  if (uploadMode !== "prices") return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Warehouse</CardTitle>
          <CardDescription>Select target warehouse</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedWarehouse}
            onValueChange={onWarehouseChange}
            disabled={isLoadingWarehouses}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  isLoadingWarehouses ? "Loading..." : "Select warehouse"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price Currency</CardTitle>
          <CardDescription>Select currency for prices</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={currency}
            onValueChange={(value) => onCurrencyChange(value as Currency)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="PLN">PLN (zł)</SelectItem>
              <SelectItem value="UAH">UAH (₴)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className={marginEnabled ? "" : "opacity-50"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Margin (%)</CardTitle>
            <Switch checked={marginEnabled} onCheckedChange={onMarginEnabledChange} />
          </div>
          <CardDescription>Markup percentage applied to prices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={margin}
              onChange={(e) => onMarginChange(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!marginEnabled}
            />
            <span className="text-sm text-gray-500 font-medium">%</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
