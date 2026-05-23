"use client";

import { useTranslations } from "next-intl";
import { GripVertical } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ColumnMapping,
  FieldType,
  TranslationField,
  UploadMode,
  mandatoryFields,
  optionalFields,
  translationFields,
  itemFields,
} from "../../../types/bulk-upload-types";

interface ColumnMappingCardProps {
  columnMapping: ColumnMapping;
  uploadMode: UploadMode;
  draggedLabel: FieldType | null;
  onLabelDragStart: (label: FieldType) => void;
  onLabelDragEnd: () => void;
  onRemoveMapping: (label: FieldType) => void;
}

export default function ColumnMappingCard({
  columnMapping,
  uploadMode,
  draggedLabel,
  onLabelDragStart,
  onLabelDragEnd,
  onRemoveMapping,
}: ColumnMappingCardProps) {
  const t = useTranslations("adminDashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bulkUpload.mapping.title")}</CardTitle>
        <CardDescription>{t("bulkUpload.mapping.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required fields */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-red-600">
            {t("bulkUpload.mapping.required")}
          </h4>
          <div className="flex flex-wrap gap-2">
            {(uploadMode === "descriptions"
              ? mandatoryFields.filter((f) => f.key === "articleId")
              : mandatoryFields
            ).map(({ key, label }) => (
              <div
                key={key}
                draggable
                onDragStart={() => onLabelDragStart(key)}
                onDragEnd={onLabelDragEnd}
                className={`px-3 py-2 rounded-lg border-2 cursor-move flex items-center gap-2 transition-colors ${
                  columnMapping[key] !== null
                    ? "bg-red-100 border-red-500 text-red-700"
                    : "bg-red-50 border-red-400 text-red-700 hover:bg-red-100"
                }`}
              >
                <GripVertical className="w-4 h-4" />
                <span className="font-medium whitespace-nowrap">{label}</span>
                {columnMapping[key] !== null && (
                  <button
                    onClick={() => onRemoveMapping(key)}
                    className="text-xs hover:text-red-800 font-bold ml-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Optional fields – prices mode only */}
        {uploadMode === "prices" && (
          <div>
            <h4 className="text-sm font-semibold mb-3 text-blue-600">
              {t("bulkUpload.mapping.optional")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {optionalFields.map(({ key, label }) => (
                <div
                  key={key}
                  draggable
                  onDragStart={() => onLabelDragStart(key)}
                  onDragEnd={onLabelDragEnd}
                  className={`px-3 py-2 rounded-lg border-2 cursor-move flex items-center gap-2 transition-colors ${
                    columnMapping[key] !== null
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <GripVertical className="w-4 h-4" />
                  <span className="font-medium whitespace-nowrap">{label}</span>
                  {columnMapping[key] !== null && (
                    <button
                      onClick={() => onRemoveMapping(key)}
                      className="text-xs hover:text-blue-800 font-bold ml-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Translation fields – descriptions mode only */}
        {uploadMode === "descriptions" && (
          <div>
            <h4 className="text-sm font-semibold mb-3 text-green-600">
              {t("bulkUpload.mapping.translation")}
            </h4>
            <div className="space-y-2">
              {(
                [
                  { group: "Name", prefix: "name" },
                  { group: "Description", prefix: "description" },
                  { group: "Specifications", prefix: "specifications" },
                  { group: "Meta Description", prefix: "metaDescription" },
                  { group: "Meta Keywords", prefix: "metaKeywords" },
                ] as const
              ).map(({ group, prefix }) => (
                <div key={group} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-green-700 font-semibold w-[130px] shrink-0">
                    {group}:
                  </span>
                  {(["pl", "ua", "en", "es"] as const).map((locale) => {
                    const key = `${prefix}_${locale}` as TranslationField;
                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={() => onLabelDragStart(key)}
                        onDragEnd={onLabelDragEnd}
                        className={`px-3 py-1.5 rounded-lg border-2 cursor-move flex items-center gap-1.5 transition-colors ${
                          columnMapping[key] !== null
                            ? "bg-green-100 border-green-500 text-green-700"
                            : "bg-green-50 border-green-400 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        <GripVertical className="w-3 h-3" />
                        <span className="font-medium text-xs">
                          {locale.toUpperCase()}
                        </span>
                        {columnMapping[key] !== null && (
                          <button
                            onClick={() => onRemoveMapping(key)}
                            className="text-xs hover:text-green-800 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Item fields – descriptions mode only */}
        {uploadMode === "descriptions" && (
          <div>
            <h4 className="text-sm font-semibold mb-3 text-purple-600">
              {t("bulkUpload.mapping.item")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {itemFields.map(({ key, label }) => (
                <div
                  key={key}
                  draggable
                  onDragStart={() => onLabelDragStart(key)}
                  onDragEnd={onLabelDragEnd}
                  className={`px-3 py-2 rounded-lg border-2 cursor-move flex items-center gap-2 transition-colors ${
                    columnMapping[key] !== null
                      ? "bg-purple-100 border-purple-500 text-purple-700"
                      : "bg-purple-50 border-purple-400 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  <GripVertical className="w-4 h-4" />
                  <span className="font-medium whitespace-nowrap">{label}</span>
                  {columnMapping[key] !== null && (
                    <button
                      onClick={() => onRemoveMapping(key)}
                      className="text-xs hover:text-purple-800 font-bold ml-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
