'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, Download, GripVertical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from 'xlsx';

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

interface ParsedData {
  headers: string[];
  rows: any[][];
}

interface ColumnMapping {
  articleId: number | null;
  quantity: number | null;
  price: number | null;
}

interface Warehouse {
  id: string;
  name: string;
  displayedName: string;
}

type FileType = 'Generic' | 'ARA' | 'Omron' | 'Pilz' | 'Schneider' | 'Encon';

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('Generic');
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    articleId: null,
    quantity: null,
    price: null,
  });
  const [draggedLabel, setDraggedLabel] = useState<keyof ColumnMapping | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  // Fetch warehouses when modal opens
  useEffect(() => {
    if (isOpen && fileType === 'Generic') {
      fetchWarehouses();
    }
  }, [isOpen, fileType]);

  const fetchWarehouses = async () => {
    setIsLoadingWarehouses(true);
    try {
      const response = await fetch('/api/admin/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
        if (data.length > 0) {
          setSelectedWarehouse(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      toast.error('Failed to load warehouses');
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

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
      
      // Parse file if Generic type and CSV/Excel
      if (fileType === 'Generic') {
        parseFile(file);
      }
    }
  }, [fileType]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState({ status: 'idle', progress: 0, message: '' });
      
      // Parse file if Generic type and CSV/Excel
      if (fileType === 'Generic') {
        parseFile(file);
      }
    }
  }, [fileType]);

  const parseFile = async (file: File) => {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv') {
        await parseCSV(file);
      } else if (extension === 'xlsx' || extension === 'xls') {
        await parseExcel(file);
      }
    } catch (error) {
      console.error('Failed to parse file:', error);
      toast.error('Failed to parse file');
    }
  };

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return values;
    });

    setParsedData({ headers, rows });
  };

  const parseExcel = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (data.length === 0) return;

    const headers = data[0].map(h => String(h || '').trim());
    const rows = data.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

    setParsedData({ headers, rows });
  };

  // Drag and drop handlers for column mapping
  const handleLabelDragStart = (label: keyof ColumnMapping) => {
    setDraggedLabel(label);
  };

  const handleLabelDragEnd = () => {
    setDraggedLabel(null);
  };

  const handleColumnDrop = (columnIndex: number) => {
    if (draggedLabel) {
      setColumnMapping(prev => ({
        ...prev,
        [draggedLabel]: columnIndex,
      }));
      setDraggedLabel(null);
    }
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeColumnMapping = (label: keyof ColumnMapping) => {
    setColumnMapping(prev => ({
      ...prev,
      [label]: null,
    }));
  };

  const handleGenericUpload = async () => {
    if (!parsedData || columnMapping.articleId === null || columnMapping.price === null || columnMapping.quantity === null) {
      return;
    }

    setUploadState({ status: 'uploading', progress: 10, message: 'Processing data...' });

    try {
      // Map the data based on column assignments
      const items = parsedData.rows.map(row => ({
        articleId: row[columnMapping.articleId!],
        price: parseFloat(row[columnMapping.price!]) || 0,
        quantity: parseInt(row[columnMapping.quantity!]) || 0,
      })).filter(item => item.articleId); // Filter out rows without articleId

      setUploadState({ status: 'uploading', progress: 30, message: 'Uploading to server...' });

      const response = await fetch('/api/admin/items/bulk-update-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          warehouseId: selectedWarehouse,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      setUploadState({
        status: 'success',
        progress: 100,
        message: result.message || 'Upload completed successfully',
      });

      toast.success('Prices Updated!', {
        description: `Updated ${result.updated || items.length} items in ${warehouses.find(w => w.id === selectedWarehouse)?.name}`,
        duration: 5000,
      });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);

    } catch (error: any) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: error.message || 'Upload failed',
      });
      toast.error('Upload Failed', {
        description: error.message,
      });
    }
  };

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

    // For Generic type, validate column mapping and warehouse
    if (fileType === 'Generic') {
      if (columnMapping.articleId === null || columnMapping.price === null || columnMapping.quantity === null) {
        toast.error('Please map all required columns: Article ID, Price, and Quantity');
        return;
      }
      if (!selectedWarehouse) {
        toast.error('Please select a warehouse');
        return;
      }
      await handleGenericUpload();
      return;
    }

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
    setParsedData(null);
    setColumnMapping({ articleId: null, quantity: null, price: null });
    setDraggedLabel(null);
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
      <DialogContent className={`${fileType === 'Generic' && parsedData ? 'max-w-7xl' : 'max-w-2xl'} max-h-[90vh] flex flex-col`}>
        <DialogHeader>
          <DialogTitle>Bulk Upload Items</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* File Type Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Select File Type</h3>
            <Select value={fileType} onValueChange={(value) => {
              setFileType(value as FileType);
              setParsedData(null);
              setColumnMapping({ articleId: null, quantity: null, price: null });
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Generic">Generic (Map columns manually)</SelectItem>
                <SelectItem value="ARA">ARA (Siemens, Phoenix, Harting, etc.)</SelectItem>
                <SelectItem value="Omron">Omron-2025</SelectItem>
                <SelectItem value="Pilz">Pilz</SelectItem>
                <SelectItem value="Schneider">Schneider-2024-25</SelectItem>
                <SelectItem value="Encon">Encon (Default Format)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {fileType === 'Generic' && 'Upload any CSV/Excel file and map columns manually'}
              {fileType === 'ARA' && 'Multiple sheets: Siemens, Phoenix, MURRELEKTRONIC, SICK, HARTING'}
              {fileType === 'Omron' && 'Sheet: Hoja1'}
              {fileType === 'Pilz' && 'Sheet: Price List SE'}
              {fileType === 'Schneider' && 'Sheet: Hoja1 (starts from row 3)'}
              {fileType === 'Encon' && 'Default format with all columns'}
            </p>
          </div>

          {/* Sample Files */}
          {fileType !== 'Generic' && (
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
          )}

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

          {/* Warehouse Selection for Generic type */}
          {fileType === 'Generic' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Select Warehouse</h3>
              <Select 
                value={selectedWarehouse} 
                onValueChange={setSelectedWarehouse}
                disabled={isLoadingWarehouses}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingWarehouses ? "Loading..." : "Select warehouse"} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.displayedName || warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Column Mapping for Generic type */}
          {fileType === 'Generic' && parsedData && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Map Columns</h3>
                <p className="text-xs text-gray-500">Drag labels to the corresponding column headers in the table below</p>
                
                {/* Draggable Labels */}
                <div className="flex gap-2 flex-wrap">
                  {(['articleId', 'price', 'quantity'] as const).map((label) => (
                    <div
                      key={label}
                      draggable
                      onDragStart={() => handleLabelDragStart(label)}
                      onDragEnd={handleLabelDragEnd}
                      className={`px-3 py-2 rounded-lg border-2 cursor-move flex items-center gap-2 transition-colors ${
                        columnMapping[label] !== null
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <GripVertical className="w-4 h-4" />
                      <span className="font-medium capitalize whitespace-nowrap">
                        {label === 'articleId' ? 'Article ID' : label}
                      </span>
                      {columnMapping[label] !== null && (
                        <button
                          onClick={() => removeColumnMapping(label)}
                          className="ml-1 text-xs hover:text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div 
                  className="overflow-auto"
                  style={{
                    maxHeight: 'min(60vh, 500px)',
                    minHeight: '300px',
                  }}
                >
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {parsedData.headers.map((header, index) => {
                          const assignedLabel = Object.entries(columnMapping).find(
                            ([_, colIndex]) => colIndex === index
                          )?.[0] as keyof ColumnMapping | undefined;

                          return (
                            <th
                              key={index}
                              onDragOver={handleColumnDragOver}
                              onDrop={() => handleColumnDrop(index)}
                              className={`px-4 py-3 text-left font-medium border-b border-r whitespace-nowrap ${
                                assignedLabel
                                  ? 'bg-green-100 border-green-500'
                                  : draggedLabel
                                  ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className="space-y-1 min-w-[120px]">
                                <div className="font-normal text-gray-600">{header || `Column ${index + 1}`}</div>
                                {assignedLabel && (
                                  <div className="text-xs font-semibold text-green-700 capitalize">
                                    → {assignedLabel === 'articleId' ? 'Article ID' : assignedLabel}
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
                            <td key={cellIndex} className="px-4 py-2 border-r whitespace-nowrap">
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                  Total rows: {parsedData.rows.length}
                </div>
              </div>
            </div>
          )}

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
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
              onClick={handleUpload}
              disabled={
                !selectedFile || 
                uploadState.status === 'uploading' ||
                (fileType === 'Generic' && (
                  !parsedData || 
                  columnMapping.articleId === null || 
                  columnMapping.price === null || 
                  columnMapping.quantity === null ||
                  !selectedWarehouse
                ))
              }
            >
              {uploadState.status === 'uploading' ? 'Uploading...' : 'Upload Items'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
