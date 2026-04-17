"use client";

import { FileText } from "lucide-react";
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
  ParsedData,
  mandatoryFields,
  optionalFields,
  translationFields,
  itemFields,
} from "../../../types/bulk-upload-types";

interface DataPreviewCardProps {
  parsedData: ParsedData;
  columnMapping: ColumnMapping;
  draggedLabel: FieldType | null;
  onColumnDrop: (columnIndex: number) => void;
  onColumnDragOver: (e: React.DragEvent) => void;
}

export default function DataPreviewCard({
  parsedData,
  columnMapping,
  draggedLabel,
  onColumnDrop,
  onColumnDragOver,
}: DataPreviewCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Data Preview</CardTitle>
        <CardDescription>Total rows: {parsedData.rows.length}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="border rounded-lg overflow-hidden"
          style={{ maxHeight: "calc(100vh - 250px)", minHeight: "400px" }}
        >
          <div className="overflow-auto h-full">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {parsedData.headers.map((header, index) => {
                    const assignedLabel = Object.entries(columnMapping).find(
                      ([_, colIndex]) => colIndex === index,
                    )?.[0] as FieldType | undefined;

                    const isMandatory = mandatoryFields.some(
                      (f) => f.key === assignedLabel,
                    );
                    const isTranslation = translationFields.some(
                      (f) => f.key === assignedLabel,
                    );
                    const isItemField = itemFields.some(
                      (f) => f.key === assignedLabel,
                    );

                    return (
                      <th
                        key={index}
                        onDragOver={onColumnDragOver}
                        onDrop={() => onColumnDrop(index)}
                        className={`px-4 py-3 text-left font-medium border-b border-r whitespace-nowrap ${
                          assignedLabel && isMandatory
                            ? "bg-red-100 border-red-500"
                            : assignedLabel && isTranslation
                              ? "bg-green-100 border-green-500"
                              : assignedLabel && isItemField
                                ? "bg-purple-100 border-purple-500"
                                : assignedLabel
                                  ? "bg-blue-100 border-blue-500"
                                  : draggedLabel
                                    ? "bg-gray-100 hover:bg-gray-200 cursor-pointer"
                                    : "bg-gray-50"
                        }`}
                      >
                        <div className="space-y-1 min-w-[120px]">
                          <div className="font-normal text-gray-600">
                            {header || `Column ${index + 1}`}
                          </div>
                          {assignedLabel && (
                            <div
                              className={`text-xs font-semibold capitalize ${
                                isMandatory
                                  ? "text-red-700"
                                  : isTranslation
                                    ? "text-green-700"
                                    : isItemField
                                      ? "text-purple-700"
                                      : "text-blue-700"
                              }`}
                            >
                              →{" "}
                              {mandatoryFields.find((f) => f.key === assignedLabel)?.label ||
                                optionalFields.find((f) => f.key === assignedLabel)?.label ||
                                translationFields.find((f) => f.key === assignedLabel)?.label ||
                                itemFields.find((f) => f.key === assignedLabel)?.label}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {parsedData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2 border-r whitespace-nowrap"
                      >
                        {cell !== null && cell !== undefined ? String(cell) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DataPreviewEmpty() {
  return (
    <Card>
      <CardContent className="py-20 text-center">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Upload a file to see data preview</p>
      </CardContent>
    </Card>
  );
}
