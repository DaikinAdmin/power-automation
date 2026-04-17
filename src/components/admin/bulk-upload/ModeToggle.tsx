"use client";

import { useTranslations } from "next-intl";
import { UploadMode } from "../../../types/bulk-upload-types";

interface ModeToggleProps {
  uploadMode: UploadMode;
  onModeChange: (mode: UploadMode) => void;
}

export default function ModeToggle({ uploadMode, onModeChange }: ModeToggleProps) {
  const t = useTranslations("adminDashboard");

  return (
    <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
      <button
        onClick={() => onModeChange("prices")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          uploadMode === "prices"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        {t("bulkUpload.modes.prices")}
      </button>
      <button
        onClick={() => onModeChange("descriptions")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          uploadMode === "descriptions"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        {t("bulkUpload.modes.descriptions")}
      </button>
    </div>
  );
}
