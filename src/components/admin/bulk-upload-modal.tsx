'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type FileType = 'ARA' | 'Omron' | 'Pilz' | 'Schneider' | 'Encon';

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('Encon');
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

    setUploadState({ status: 'uploading', progress: 0, message: 'Preparing upload...' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileType', fileType);

      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 70); // 0-70% for upload
          setUploadState({ 
            status: 'uploading', 
            progress: percentComplete, 
            message: `Uploading file... ${percentComplete}%` 
          });
        }
      });

      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState({ status: 'uploading', progress: 85, message: 'Processing data...' });
          
          const result = JSON.parse(xhr.responseText);
          
          setUploadState({
            status: 'success',
            progress: 100,
            message: result.message,
            details: result.duplicates?.length > 0 
              ? [`Skipped ${result.duplicates.length} duplicate items: ${result.duplicates.join(', ')}`]
              : undefined
          });
          
          // Show detailed success toast with statistics
          // The API returns: { results: { created, updated, errors }, message }
          const created = result.results?.created || result.created || 0;
          const updated = result.results?.updated || result.updated || 0;
          const totalRecords = created + updated;
          const stats: string[] = [];
          
          if (totalRecords > 0) {
            stats.push(`Total: ${totalRecords} record${totalRecords !== 1 ? 's' : ''} uploaded`);
          }
          if (created > 0) {
            stats.push(`New: ${created} created`);
          }
          if (updated > 0) {
            stats.push(`Updated: ${updated} (prices moved to history)`);
          }
          
          if (stats.length > 0) {
            toast.success('Bulk Upload Completed!', {
              description: (
                <div className="space-y-1">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-sm">{stat}</div>
                  ))}
                </div>
              ),
              duration: 10000,
            });
          } else {
            toast.success('Bulk Upload Completed!', {
              description: result.message || 'Upload completed successfully',
              duration: 10000,
            });
          }
          
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 2000);
        } else {
          const result = JSON.parse(xhr.responseText);
          setUploadState({
            status: 'error',
            progress: 0,
            message: result.error || 'Upload failed',
            details: result.details || []
          });
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        setUploadState({
          status: 'error',
          progress: 0,
          message: 'Network error occurred',
          details: ['Failed to connect to server']
        });
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        setUploadState({
          status: 'error',
          progress: 0,
          message: 'Upload cancelled',
          details: []
        });
      });

      // Send the request
      xhr.open('POST', '/api/admin/items/bulk-upload');
      xhr.send(formData);

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
          {/* File Type Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Select File Type</h3>
            <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARA">ARA (Siemens, Phoenix, Harting, etc.)</SelectItem>
                <SelectItem value="Omron">Omron-2025</SelectItem>
                <SelectItem value="Pilz">Pilz</SelectItem>
                <SelectItem value="Schneider">Schneider-2024-25</SelectItem>
                <SelectItem value="Encon">Encon (Default Format)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {fileType === 'ARA' && 'Multiple sheets: Siemens, Phoenix, MURRELEKTRONIC, SICK, HARTING'}
              {fileType === 'Omron' && 'Sheet: Hoja1'}
              {fileType === 'Pilz' && 'Sheet: Price List SE'}
              {fileType === 'Schneider' && 'Sheet: Hoja1 (starts from row 3)'}
              {fileType === 'Encon' && 'Default format with all columns'}
            </p>
          </div>

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
                {uploadState.details && uploadState.details.length > 0 && (
                  uploadState.details
                    .filter((detail): detail is string => Boolean(detail))
                    .map((detail, index) => (
                      <div key={index} className="mt-1 text-xs text-gray-600">
                        {detail}
                      </div>
                    ))
                )}
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
