'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
  details?: string[];
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState({ status: 'idle', progress: 0, message: '' });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState({ status: 'idle', progress: 0, message: '' });
    }
  }, []);

  const isValidFile = (file: File): boolean => {
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/json'];
    const validExtensions = ['.csv', '.xlsx', '.xls', '.json'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const hasValidType = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasValidSize = file.size <= maxSize;

    if (!hasValidType) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Invalid file type. Only CSV, XLSX, XLS, and JSON files are supported.',
      });
      return false;
    }

    if (!hasValidSize) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'File too large. Maximum file size is 10MB.',
      });
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState({ status: 'uploading', progress: 10, message: 'Uploading file...' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setUploadState({ status: 'uploading', progress: 30, message: 'Processing file...' });

      const response = await fetch('/api/admin/items/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadState({
          status: 'success',
          progress: 100,
          message: result.message,
          details: result.duplicates?.length > 0 
            ? [`Skipped ${result.duplicates.length} duplicate items: ${result.duplicates.join(', ')}`]
            : undefined
        });
        console.log("UploadState: ", uploadState);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setUploadState({
          status: 'error',
          progress: 0,
          message: result.error || 'Upload failed',
          details: result.details || []
        });
      }
    } catch (error: any) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Network error occurred',
        details: [error.message]
      });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadState({ status: 'idle', progress: 0, message: '' });
    onClose();
  };

  const downloadSampleFile = (type: 'csv' | 'xlsx' | 'json') => {
    const link = document.createElement('a');
    link.href = `/sample-data/items_sample.${type}`;
    link.download = `items_sample.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Items</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Sample Files */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Download Sample Files</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadSampleFile('csv')}
              >
                <Download className="w-4 h-4 mr-1" />
                CSV Sample
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadSampleFile('xlsx')}
              >
                <Download className="w-4 h-4 mr-1" />
                Excel Sample
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadSampleFile('json')}
              >
                <Download className="w-4 h-4 mr-1" />
                JSON Sample
              </Button>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input 
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-green-600" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm">
                    {isDragActive 
                      ? 'Drop the file here...'
                      : 'Drag & drop a file here, or click to select'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports CSV, XLSX, XLS, and JSON files (max 10MB)
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Progress */}
          {uploadState.status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{uploadState.message}</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadState.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success/Error Messages */}
          {uploadState.status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadState.message}
                {uploadState.details?.map((detail, index) => (
                  <div key={index} className="mt-1 text-xs text-gray-600">
                    {detail}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {uploadState.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadState.message}
                {uploadState.details && uploadState.details.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {uploadState.details.map((error, index) => (
                      <div key={index} className="text-xs mt-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || uploadState.status === 'uploading'}
            >
              {uploadState.status === 'uploading' ? 'Uploading...' : 'Upload Items'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
