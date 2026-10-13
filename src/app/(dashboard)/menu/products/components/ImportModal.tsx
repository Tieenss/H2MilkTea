// components/ImportModal.tsx
'use client';

import React, { useState } from 'react';
import { Upload, Download, X, Check, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any[]) => void;
}

interface PreviewData {
  validRows: any[];
  invalidRows: any[];
  headers: string[];
}

const REQUIRED_COLUMNS = [
  'Tên sản phẩm',
  'Loại sản phẩm',
  'Đơn vị tính',
  'Giá vốn',
  'Đơn giá'
];

const SAMPLE_DATA = [
  {
    'Tên sản phẩm': 'iPhone 15 Pro',
    'Loại sản phẩm': 'Điện thoại',
    'Đơn vị tính': 'Cái',
    'Giá vốn': 25000000,
    'Đơn giá': 30000000,
    'Mô tả': 'iPhone 15 Pro 128GB',
    'Trạng thái': 'Hoạt động'
  },
  {
    'Tên sản phẩm': 'Samsung Galaxy S24',
    'Loại sản phẩm': 'Điện thoại',
    'Đơn vị tính': 'Cái',
    'Giá vốn': 22000000,
    'Đơn giá': 26000000,
    'Mô tả': 'Samsung Galaxy S24 256GB',
    'Trạng thái': 'Hoạt động'
  },
  {
    'Tên sản phẩm': 'MacBook Pro M3',
    'Loại sản phẩm': 'Laptop',
    'Đơn vị tính': 'Cái',
    'Giá vốn': 45000000,
    'Đơn giá': 52000000,
    'Mô tả': 'MacBook Pro 14inch M3 512GB',
    'Trạng thái': 'Hoạt động'
  }
];

export function ImportModal({ isOpen, onClose, onConfirm }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const generateSampleFile = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    
    // Tự động điều chỉnh độ rộng cột
    const colWidths = Object.keys(SAMPLE_DATA[0]).map(key => ({
      wch: Math.max(key.length, ...SAMPLE_DATA.map(row => String(row[key as keyof typeof row]).length)) + 2
    }));
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, 'mau_san_pham.xlsx');
    toast.success('Đã tải xuống file mẫu thành công!');
  };

  const validateRow = (row: any, index: number) => {
    const errors: string[] = [];
    
    // Kiểm tra các cột bắt buộc
    REQUIRED_COLUMNS.forEach(col => {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push(`Thiếu ${col}`);
      }
    });
    
    // Kiểm tra định dạng số
    if (row['Giá vốn'] && isNaN(Number(row['Giá vốn']))) {
      errors.push('Giá vốn phải là số');
    }
    
    if (row['Đơn giá'] && isNaN(Number(row['Đơn giá']))) {
      errors.push('Đơn giá phải là số');
    }
    
    // Kiểm tra giá vốn < đơn giá
    if (row['Giá vốn'] && row['Đơn giá'] && Number(row['Giá vốn']) >= Number(row['Đơn giá'])) {
      errors.push('Giá vốn phải nhỏ hơn đơn giá');
    }

    return {
      ...row,
      _rowIndex: index + 1,
      _errors: errors,
      _isValid: errors.length === 0
    };
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        toast.error('File Excel trống!');
        return;
      }

      // Validate dữ liệu
      const processedData = jsonData.map((row, index) => validateRow(row, index));
      const validRows = processedData.filter(row => row._isValid);
      const invalidRows = processedData.filter(row => !row._isValid);
      
      setPreviewData({
        validRows,
        invalidRows,
        headers: Object.keys(jsonData[0] as object)
      });
      
      setStep('preview');
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      processFile(file);
    }
  };

  const handleConfirm = () => {
    if (previewData && previewData.validRows.length > 0) {
      onConfirm(previewData.validRows);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setStep('upload');
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Import dữ liệu từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên file Excel để import dữ liệu sản phẩm vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Download Sample */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                    File mẫu
                  </CardTitle>
                  <CardDescription>
                    Tải xuống file mẫu để xem định dạng dữ liệu chuẩn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={generateSampleFile}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Tải xuống file mẫu
                  </Button>
                </CardContent>
              </Card>

              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tải lên file Excel</CardTitle>
                  <CardDescription>
                    Chọn file Excel (.xlsx, .xls) chứa dữ liệu sản phẩm
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Kéo thả file vào đây hoặc click để chọn
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Hỗ trợ file: .xlsx, .xls (tối đa 10MB)
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="excel-upload"
                    />
                    <Button asChild>
                      <label htmlFor="excel-upload" className="cursor-pointer">
                        Chọn file
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Required Columns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cột bắt buộc</CardTitle>
                  <CardDescription>
                    File Excel cần có các cột sau (tên chính xác):
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {REQUIRED_COLUMNS.map(col => (
                      <div key={col} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <Check className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">{col}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'preview' && previewData && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Tổng số dòng</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {previewData.validRows.length + previewData.invalidRows.length}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Hợp lệ</p>
                        <p className="text-2xl font-bold text-green-600">
                          {previewData.validRows.length}
                        </p>
                      </div>
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Lỗi</p>
                        <p className="text-2xl font-bold text-red-600">
                          {previewData.invalidRows.length}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <Card className="flex-1 overflow-hidden">
                <CardHeader>
                  <CardTitle>Xem trước dữ liệu</CardTitle>
                  <CardDescription>
                    Kiểm tra dữ liệu trước khi import vào hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-full">
                  <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">STT</th>
                          <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                          <th className="px-4 py-2 text-left">Loại</th>
                          <th className="px-4 py-2 text-left">Đơn vị</th>
                          <th className="px-4 py-2 text-left">Giá vốn</th>
                          <th className="px-4 py-2 text-left">Đơn giá</th>
                          <th className="px-4 py-2 text-left">Trạng thái</th>
                          <th className="px-4 py-2 text-left">Lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...previewData.validRows, ...previewData.invalidRows].map((row, index) => (
                          <tr key={index} className={`border-t ${!row._isValid ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-2">{row._rowIndex}</td>
                            <td className="px-4 py-2 font-medium">{row['Tên sản phẩm']}</td>
                            <td className="px-4 py-2">{row['Loại sản phẩm']}</td>
                            <td className="px-4 py-2">{row['Đơn vị tính']}</td>
                            <td className="px-4 py-2">
                              {row['Giá vốn'] ? formatCurrency(Number(row['Giá vốn'])) : ''}
                            </td>
                            <td className="px-4 py-2">
                              {row['Đơn giá'] ? formatCurrency(Number(row['Đơn giá'])) : ''}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                row._isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {row._isValid ? 'Hợp lệ' : 'Lỗi'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {row._errors?.length > 0 && (
                                <div className="text-red-600 text-xs">
                                  {row._errors.join(', ')}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
              >
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            {step === 'preview' && previewData && previewData.validRows.length > 0 && (
              <Button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Đang xử lý...' : `Xác nhận import (${previewData.validRows.length} sản phẩm)`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}