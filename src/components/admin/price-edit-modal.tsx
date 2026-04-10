"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemPrice } from "@/helpers/types/item";
import type { Warehouse, Badge } from "@/db/schema";

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceEntry: ItemPrice;
  onSave: (updatedPriceEntry: ItemPrice) => void;
}

export function PriceEditModal({
  isOpen,
  onClose,
  priceEntry,
  onSave,
}: PriceEditModalProps) {
  const t = useTranslations('adminDashboard');
  const badgeLabels: Record<string, string> = {
    ABSENT: t('priceModal.badgeNone'),
    NEW_ARRIVALS: t('priceModal.badgeNew'),
    BESTSELLER: t('priceModal.badgeBest'),
    HOT_DEALS: t('priceModal.badgeHot'),
    LIMITED_EDITION: t('priceModal.badgeLimited'),
  };
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState<ItemPrice>({
    id: "",
    itemSlug: "",
    warehouseId: "",
    price: 0,
    quantity: 0,
    promotionPrice: null,
    promoStartDate: null,
    promoEndDate: null,
    promoCode: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    badge: "ABSENT",
    margin: 20,
    initialPrice: null,
    initialCurrency: null,
    history: [],
    warehouse: {
      id: "",
      name: "",
      displayedName: "",
      isVisible: true,
      countrySlug: "other",
      deliveryDaysPoland: null,
      deliveryDaysUkraine: null,
      deliveryDaysEurope: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  useEffect(() => {
    if (formData.initialPrice && formData.margin) {
      const calculated = formData.initialPrice * (1 + formData.margin / 100);
      setFormData((prev: any) => ({
        ...prev,
        price: parseFloat(calculated.toFixed(2)),
      }));
    }
  }, [formData.initialPrice, formData.margin]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (priceEntry && isOpen) {
      setFormData({
        ...priceEntry,
        badge: priceEntry.badge || "ABSENT",
      });
    }
  }, [priceEntry, isOpen]);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/admin/warehouses");
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const handleSave = () => {
    if (!formData.warehouseId || formData.price <= 0 || formData.quantity < 0) {
      alert("Please fill in all required fields");
      return;
    }

    const warehouse = warehouses.find((w) => w.id === formData.warehouseId);

    const updatedPriceEntry = {
      ...formData,
      warehouse: warehouse || formData.warehouse,
    };

    onSave(updatedPriceEntry);
    onClose();
  };

  const handleCancel = () => {
    setFormData(priceEntry);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('priceModal.title')}</DialogTitle>
          <DialogDescription>
            {t('priceModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('priceModal.warehouse')}</Label>
              <select
                value={formData.warehouseId}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    warehouseId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
                required
              >
                <option value="">{t('priceModal.warehousePlaceholder')}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.displayedName || warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t('priceModal.price')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                className="mt-1"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label>{t('priceModal.quantity')}</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
                className="mt-1"
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label>{t('priceModal.promoPrice')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.promotionPrice || ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    promotionPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>{t('priceModal.badge')}</Label>
              <select
                value={formData.badge || "ABSENT"}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    badge: e.target.value as Badge,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
              >
                {badgeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {badgeLabels[option.value] ?? option.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t('priceModal.promoCode')}</Label>
              <Input
                value={formData.promoCode || ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    promoCode: e.target.value,
                  }))
                }
                className="mt-1"
                placeholder={t('priceModal.promoCodePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('priceModal.promoEndDate')}</Label>
              <Input
                type="date"
                value={
                  formData.promoEndDate
                    ? new Date(formData.promoEndDate)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    promoEndDate: e.target.value
                      ? new Date(e.target.value)
                      : null,
                  }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t('priceModal.margin')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.margin ?? 20}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    margin: parseFloat(e.target.value) || 0,
                  }))
                }
                className="mt-1"
                placeholder="20"
              />
            </div>

            <div>
              <Label>{t('priceModal.initialPrice')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.initialPrice ?? ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    initialPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>{t('priceModal.initialCurrency')}</Label>
              <select
                value={formData.initialCurrency ?? ""}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    initialCurrency: e.target.value || null,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
              >
                <option value="">{t('priceModal.currencyPlaceholder')}</option>
                <option value="EUR">EUR</option>
                <option value="PLN">PLN</option>
                <option value="UAH">UAH</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {t('priceModal.cancel')}
          </Button>
          <Button onClick={handleSave}>{t('priceModal.saveBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
const badgeOptions = [
  { value: "ABSENT" },
  { value: "NEW_ARRIVALS" },
  { value: "BESTSELLER" },
  { value: "HOT_DEALS" },
  { value: "LIMITED_EDITION" },
];
