'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, GripVertical } from 'lucide-react';
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

type MandatoryField = 'articleId' | 'price' | 'quantity';
type OptionalField = 'badge' | 'brand' | 'promoCode' | 'promoStartDate' | 'promoEndDate' | 'promoPrice';
type FieldType = MandatoryField | OptionalField;

interface ColumnMapping {
  articleId: number | null;
  quantity: number | null;
  price: number | null;
  badge: number | null;
  brand: number | null;
  promoCode: number | null;
  promoStartDate: number | null;
  promoEndDate: number | null;
  promoPrice: number | null;
}

interface Warehouse {
  id: string;
  name: string;
  displayedName: string;
}

type Currency = 'EUR' | 'PLN' | 'UAH';

export default function BulkUploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    articleId: null,
    quantity: null,
    price: null,
    badge: null,
    brand: null,
    promoCode: null,
    promoStartDate: null,
    promoEndDate: null,
    promoPrice: null,
  });
  const [draggedLabel, setDraggedLabel] = useState<FieldType | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [margin, setMargin] = useState<number>(20);

  // Fetch warehouses when page loads
  useEffect(() => {
    fetchWarehouses();
  }, []);

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
      parseFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setUploadState({ status: 'idle', progress: 0, message: '' });
      parseFile(file);
    }
  }, []);

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
  const handleLabelDragStart = (label: FieldType) => {
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

  const removeColumnMapping = (label: FieldType) => {
    setColumnMapping(prev => ({
      ...prev,
      [label]: null,
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !parsedData) return;

    // Validate mandatory fields
    if (columnMapping.articleId === null || columnMapping.price === null || columnMapping.quantity === null) {
      toast.error('Please map all required fields: Article ID, Price, and Quantity');
      return;
    }
    if (!selectedWarehouse) {
      toast.error('Please select a warehouse');
      return;
    }

    setUploadState({ status: 'uploading', progress: 10, message: 'Processing data...' });

    try {
      // Map the data based on column assignments
      const items = parsedData.rows.map(row => {
        const item: any = {
          articleId: row[columnMapping.articleId!],
          price: parseFloat(row[columnMapping.price!]) || 0,
          quantity: parseInt(row[columnMapping.quantity!]) || 0,
          currency,
          margin,
        };

        // Add optional fields if mapped
        if (columnMapping.badge !== null && row[columnMapping.badge] !== undefined) {
          item.badge = row[columnMapping.badge];
        }
        if (columnMapping.brand !== null && row[columnMapping.brand] !== undefined) {
          item.brand = row[columnMapping.brand];
        }
        if (columnMapping.promoCode !== null && row[columnMapping.promoCode] !== undefined) {
          item.promoCode = row[columnMapping.promoCode];
        }
        if (columnMapping.promoPrice !== null && row[columnMapping.promoPrice] !== undefined) {
          item.promoPrice = parseFloat(row[columnMapping.promoPrice]) || 0;
        }
        if (columnMapping.promoStartDate !== null && row[columnMapping.promoStartDate] !== undefined) {
          item.promoStartDate = row[columnMapping.promoStartDate];
        }
        if (columnMapping.promoEndDate !== null && row[columnMapping.promoEndDate] !== undefined) {
          item.promoEndDate = row[columnMapping.promoEndDate];
        }

        return item;
      }).filter(item => item.articleId); // Filter out rows without articleId

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

      const warehouseName = warehouses.find(w => w.id === selectedWarehouse)?.name || 'warehouse';

      toast.success('Prices Updated!', {
        description: `Updated ${result.results?.updated || 0} and created ${result.results?.created || 0} items in ${warehouseName}`,
        duration: 5000,
      });

      // Reset form after success
      setTimeout(() => {
        setSelectedFile(null);
        setParsedData(null);
        setColumnMapping({
          articleId: null,
          quantity: null,
          price: null,
          badge: null,
          brand: null,
          promoCode: null,
          promoStartDate: null,
          promoEndDate: null,
          promoPrice: null,
        });
        setUploadState({ status: 'idle', progress: 0, message: '' });
      }, 3000);

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
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const hasValidType = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasValidSize = file.size <= maxSize;

    if (!hasValidType) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Invalid file type. Only CSV, XLSX, and XLS files are supported.',
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

  const mandatoryFields: { key: MandatoryField; label: string }[] = [
    { key: 'articleId', label: 'Article ID' },
    { key: 'price', label: 'Price' },
    { key: 'quantity', label: 'Quantity' },
  ];

  const optionalFields: { key: OptionalField; label: string }[] = [
    { key: 'badge', label: 'Badge' },
    { key: 'brand', label: 'Brand' },
    { key: 'promoCode', label: 'Promo Code' },
    { key: 'promoPrice', label: 'Promo Price' },
    { key: 'promoStartDate', label: 'Promo Start Date' },
    { key: 'promoEndDate', label: 'Promo End Date' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Upload</h1>
        <p className="text-gray-600">
          Upload CSV or Excel files to update item prices and inventory
        </p>
      </div>

      {/* Column Mapping Labels - Horizontal Layout */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>Drag labels to table headers below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-red-600">Required Fields</h4>
              <div className="flex flex-wrap gap-2">
                {mandatoryFields.map(({ key, label }) => (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => handleLabelDragStart(key)}
                    onDragEnd={handleLabelDragEnd}
                    className={`px-3 py-2 rounded-lg border-2 cursor-move flex items-center gap-2 transition-colors ${
                      columnMapping[key] !== null
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    <GripVertical className="w-4 h-4" />
                    <span className="font-medium whitespace-nowrap">{label}</span>
                    {columnMapping[key] !== null && (
                      <button
                        onClick={() => removeColumnMapping(key)}
                        className="text-xs hover:text-red-800 font-bold ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3 text-blue-600">Optional Fields</h4>
              <div className="flex flex-wrap gap-2">
                {optionalFields.map(({ key, label }) => (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => handleLabelDragStart(key)}
                    onDragEnd={handleLabelDragEnd}
                    className={`px-3 py-2 rounded-lg border-2 cursor-move flex items-center gap-2 transition-colors ${
                      columnMapping[key] !== null
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <GripVertical className="w-4 h-4" />
                    <span className="font-medium whitespace-nowrap">{label}</span>
                    {columnMapping[key] !== null && (
                      <button
                        onClick={() => removeColumnMapping(key)}
                        className="text-xs hover:text-blue-800 font-bold ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Warehouse Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Warehouse</CardTitle>
              <CardDescription>Select target warehouse</CardDescription>
            </CardHeader>
            <CardContent>
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
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Currency Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Price Currency</CardTitle>
              <CardDescription>Select currency for prices</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="PLN">PLN (zł)</SelectItem>
                  <SelectItem value="UAH">UAH (₴)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Margin */}
          <Card>
            <CardHeader>
              <CardTitle>Margin (%)</CardTitle>
              <CardDescription>Markup percentage applied to prices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={margin}
                  onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500 font-medium">%</span>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>CSV, XLSX, or XLS files (max 10MB)</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : selectedFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input 
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
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
                          ? 'Drop the file here...'
                          : 'Drag & drop or click to select'
                        }
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Data Preview */}
        <div className="lg:col-span-2 space-y-6">
          {parsedData ? (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Total rows: {parsedData.rows.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg overflow-hidden"
                  style={{
                    maxHeight: 'calc(100vh - 250px)',
                    minHeight: '400px',
                  }}
                >
                  <div className="overflow-auto h-full">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          {parsedData.headers.map((header, index) => {
                            const assignedLabel = Object.entries(columnMapping).find(
                              ([_, colIndex]) => colIndex === index
                            )?.[0] as FieldType | undefined;
                            
                            const isMandatory = mandatoryFields.some(f => f.key === assignedLabel);

                            return (
                              <th
                                key={index}
                                onDragOver={handleColumnDragOver}
                                onDrop={() => handleColumnDrop(index)}
                                className={`px-4 py-3 text-left font-medium border-b border-r whitespace-nowrap ${
                                  assignedLabel && isMandatory
                                    ? 'bg-red-100 border-red-500'
                                    : assignedLabel
                                    ? 'bg-blue-100 border-blue-500'
                                    : draggedLabel
                                    ? 'bg-gray-100 hover:bg-gray-200 cursor-pointer'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <div className="space-y-1 min-w-[120px]">
                                  <div className="font-normal text-gray-600">{header || `Column ${index + 1}`}</div>
                                  {assignedLabel && (
                                    <div className={`text-xs font-semibold capitalize ${
                                      isMandatory ? 'text-red-700' : 'text-blue-700'
                                    }`}>
                                      → {mandatoryFields.find(f => f.key === assignedLabel)?.label || 
                                          optionalFields.find(f => f.key === assignedLabel)?.label}
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
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Upload a file to see data preview</p>
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {uploadState.status === 'uploading' && (
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
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success/Error Messages */}
          {uploadState.status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{uploadState.message}</AlertDescription>
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

          {/* Upload Button */}
          {parsedData && (
            <div className="flex justify-end">
              <Button 
                onClick={handleUpload}
                disabled={
                  !selectedFile || 
                  uploadState.status === 'uploading' ||
                  !parsedData || 
                  columnMapping.articleId === null || 
                  columnMapping.price === null || 
                  columnMapping.quantity === null ||
                  !selectedWarehouse
                }
                size="lg"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {uploadState.status === 'uploading' ? 'Uploading...' : 'Upload Items'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
