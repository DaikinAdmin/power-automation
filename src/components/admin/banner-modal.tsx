"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

interface Banner {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  device: string;
  locale: string;
  sortOrder: number | null;
  isActive: boolean | null;
  updatedAt: Date | null;
}

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (banner: Partial<Banner>) => Promise<void>;
  banner: Banner | null;
  currentPosition: string;
  currentDevice: string;
  currentLocale: string;
}

const POSITIONS = [
  { value: "home_top", label: "Home - Top" },
  { value: "home_middle", label: "Home - Middle" },
  { value: "home_bottom", label: "Home - Bottom" },
  { value: "catalog_sidebar", label: "Catalog - Sidebar" },
  { value: "catalog_top", label: "Catalog - Top" },
  { value: "promo", label: "Promo Section" },
  { value: "category_top", label: "Category - Top" },
];

const DEVICES = [
  { value: "ultrawide", label: "Ultrawide" },
  { value: "desktop", label: "Desktop" },
  { value: "laptop", label: "Laptop" },
  { value: "mobile", label: "Mobile" },
];

const LOCALES = [
  { value: "pl", label: "🇵🇱 Polski" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "ua", label: "🇺🇦 Українська" },
];

export function BannerModal({
  isOpen,
  onClose,
  onSave,
  banner,
  currentPosition,
  currentDevice,
  currentLocale,
}: BannerModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    position: currentPosition,
    device: currentDevice,
    locale: currentLocale,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title || "",
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl || "",
        position: banner.position,
        device: banner.device,
        locale: banner.locale,
        isActive: banner.isActive ?? true,
      });
    } else {
      setFormData({
        title: "",
        imageUrl: "",
        linkUrl: "",
        position: currentPosition,
        device: currentDevice,
        locale: currentLocale,
        isActive: true,
      });
    }
  }, [banner, isOpen, currentPosition, currentDevice, currentLocale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl.trim()) {
      alert("Please provide an image URL");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving banner:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {banner ? "Edit Banner" : "Create New Banner"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter banner title"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                placeholder="https://example.com/banner.jpg"
                required
              />
              {formData.imageUrl && (
                <div className="relative mt-2 h-40 w-full overflow-hidden rounded-lg border bg-gray-50">
                  <Image
                    src={formData.imageUrl}
                    alt="Banner preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              )}
            </div>

            {/* Link URL */}
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL (Optional)</Label>
              <Input
                id="linkUrl"
                value={formData.linkUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkUrl: e.target.value })
                }
                placeholder="https://example.com/promo"
                type="url"
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.position}
                onValueChange={(value) =>
                  setFormData({ ...formData, position: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device */}
            <div className="space-y-2">
              <Label htmlFor="device">Device</Label>
              <Select
                value={formData.device}
                onValueChange={(value) =>
                  setFormData({ ...formData, device: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICES.map((dev) => (
                    <SelectItem key={dev.value} value={dev.value}>
                      {dev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Locale */}
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Select
                value={formData.locale}
                onValueChange={(value) =>
                  setFormData({ ...formData, locale: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-base">
                  Active
                </Label>
                <div className="text-sm text-gray-500">
                  Show this banner to visitors
                </div>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : banner
                  ? "Update Banner"
                  : "Create Banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
