"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Warehouse } from "@/db/schema";

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (warehouse: Omit<Warehouse, "id"> | Warehouse) => void;
  warehouse?: Warehouse | null;
}

export function WarehouseModal({
  isOpen,
  onClose,
  onSave,
  warehouse,
}: WarehouseModalProps) {
  const t = useTranslations('adminDashboard');
  const [formData, setFormData] = useState({
    name: warehouse?.name || "",
    countrySlug: warehouse?.countrySlug || "other",
    displayedName: warehouse?.displayedName || "",
    isVisible: warehouse?.isVisible ?? true,
    createdAt: warehouse?.createdAt || new Date(),
    updatedAt: warehouse?.updatedAt || new Date(),
    deliveryDaysPoland: warehouse?.deliveryDaysPoland ?? null,
    deliveryDaysUkraine: warehouse?.deliveryDaysUkraine ?? null,
    deliveryDaysEurope: warehouse?.deliveryDaysEurope ?? null,
  });

  useEffect(() => {
    setFormData({
      name: warehouse?.name || "",
      countrySlug: warehouse?.countrySlug || "other",
      displayedName: warehouse?.displayedName || "",
      isVisible: warehouse?.isVisible ?? true,
      createdAt: warehouse?.createdAt || new Date(),
      updatedAt: warehouse?.updatedAt || new Date(),
      deliveryDaysPoland: warehouse?.deliveryDaysPoland ?? null,
      deliveryDaysUkraine: warehouse?.deliveryDaysUkraine ?? null,
      deliveryDaysEurope: warehouse?.deliveryDaysEurope ?? null,
    });
  }, [warehouse, isOpen]);

  const [isLoading, setIsLoading] = useState(false);

  const countryOptions = [
    { value: "ua", label: "Ukraine" },
    { value: "es", label: "Spain" },
    { value: "pl", label: "Poland" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (warehouse) {
        // Edit existing warehouse
        onSave({
          ...warehouse,
          ...formData,
          createdAt:
            formData.createdAt instanceof Date
              ? formData.createdAt.toISOString()
              : formData.createdAt,
          updatedAt:
            formData.updatedAt instanceof Date
              ? formData.updatedAt.toISOString()
              : formData.updatedAt,
        });
      } else {
        // Create new warehouse
        onSave({
          ...formData,
          createdAt:
            formData.createdAt instanceof Date
              ? formData.createdAt.toISOString()
              : formData.createdAt,
          updatedAt:
            formData.updatedAt instanceof Date
              ? formData.updatedAt.toISOString()
              : formData.updatedAt,
        });
      }

      // Reset form
      setFormData({
        name: "",
        countrySlug: "other",
        displayedName: "",
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deliveryDaysPoland: Number(formData.deliveryDaysPoland),
        deliveryDaysUkraine: Number(formData.deliveryDaysUkraine),
        deliveryDaysEurope: Number(formData.deliveryDaysEurope),
      });
      onClose();
    } catch (error) {
      console.error("Error saving warehouse:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // setFormData({
    //   name: warehouse?.name || '',
    //   country: warehouse?.country || 'Other',
    //   displayedName: warehouse?.displayedName || '',
    //   isVisible: warehouse?.isVisible ?? true,
    //   createdAt: warehouse?.createdAt || new Date(),
    //   updatedAt: warehouse?.updatedAt || new Date(),
    // });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {warehouse ? t('warehouseModal.editTitle') : t('warehouseModal.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {warehouse ? t('warehouseModal.editDesc') : t('warehouseModal.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayedName" className="text-right">
                {t('warehouseModal.displayedName')}
              </Label>
              <Input
                id="displayedName"
                value={formData.displayedName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayedName: e.target.value,
                  }))
                }
                className="col-span-3"
                placeholder={t('warehouseModal.displayedNamePlaceholder')}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('warehouseModal.name')}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                placeholder={t('warehouseModal.namePlaceholder')}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="countrySlug" className="text-right">
                {t('warehouseModal.country')}
              </Label>
              <select
                id="countrySlug"
                value={formData.countrySlug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    countrySlug: e.target.value,
                  }))
                }
                className="col-span-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visible" className="text-right">
                {t('warehouseModal.visible')}
              </Label>
              <div className="col-span-3">
                <Switch
                  id="visible"
                  checked={formData.isVisible}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isVisible: checked }))
                  }
                />
              </div>
            </div>

            {/* Delivery days */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deliveryDaysPoland" className="text-right">
                {t('warehouseModal.deliveryPoland')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="deliveryDaysPoland"
                  type="number"
                  min={0}
                  value={formData.deliveryDaysPoland ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDaysPoland:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="w-full"
                  placeholder={t('warehouseModal.daysPlaceholder')}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {t('warehouseModal.days')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deliveryDaysUkraine" className="text-right">
                {t('warehouseModal.deliveryUkraine')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="deliveryDaysUkraine"
                  type="number"
                  min={0}
                  value={formData.deliveryDaysUkraine ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDaysUkraine:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="w-full"
                  placeholder={t('warehouseModal.daysPlaceholder')}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {t('warehouseModal.days')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deliveryDaysEurope" className="text-right">
                {t('warehouseModal.deliveryEurope')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="deliveryDaysEurope"
                  type="number"
                  min={0}
                  value={formData.deliveryDaysEurope ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDaysEurope:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="w-full"
                  placeholder={t('warehouseModal.daysPlaceholder')}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {t('warehouseModal.days')}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('warehouseModal.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('warehouseModal.saving') : warehouse ? t('warehouseModal.updateBtn') : t('warehouseModal.createBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
