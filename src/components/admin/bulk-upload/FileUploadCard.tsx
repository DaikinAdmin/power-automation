"use client";

import { FileText, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FileUploadCardProps {
  selectedFile: File | null;
  isDragActive: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FileUploadCard({
  selectedFile,
  isDragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
}: FileUploadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>CSV, XLSX, or XLS files (max 10MB)</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : selectedFile
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="w-10 h-10 mx-auto text-green-600" />
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-gray-400" />
                <p className="text-sm">
                  {isDragActive
                    ? "Drop the file here..."
                    : "Drag & drop or click to select"}
                </p>
              </div>
            )}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
