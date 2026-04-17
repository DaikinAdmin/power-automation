"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { UploadState } from "../../../types/bulk-upload-types";

interface UploadStatusProps {
  uploadState: UploadState;
}

export default function UploadStatus({ uploadState }: UploadStatusProps) {
  if (uploadState.status === "uploading") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{uploadState.message}</span>
              <span>{uploadState.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (uploadState.status === "success") {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>{uploadState.message}</AlertDescription>
      </Alert>
    );
  }

  if (uploadState.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {uploadState.message}
          {uploadState.details && uploadState.details.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto">
              {uploadState.details
                .filter((error): error is string => Boolean(error))
                .map((error, index) => (
                  <div key={index} className="text-xs mt-1">
                    • {error}
                  </div>
                ))}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
