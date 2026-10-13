'use client';

import React, { useState } from 'react';
import { Upload, Download, X, Check, AlertCircle, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { formatNumber } from '../utils/formatters';

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
  'Tên nguyên liệu',
  'Đơn vị tính',
  'Đơn vị cơ sở',
  'Hệ số quy đổi',
  'Số lượng cảnh báo'
];

const OPTIONAL_COLUMNS = [
  'Ghi chú'
];

const SAMPLE_DATA = [
  {
    'Tên nguyên liệu': 'Cà phê hạt Robusta',
    'Đơn vị tính': 'Kg',
    'Đơn vị cơ sở': 'Gram',
    'Hệ số quy đổi': 1000,
    'Số lượng cảnh báo': 5,
    'Ghi chú': 'Hạt rang mộc, không tẩm ướp, dùng pha phin và pha máy.'
  },
  {
    'Tên nguyên liệu': 'Sữa tươi không đường',
    'Đơn vị tính': 'Hộp 1L',
    'Đơn vị cơ sở': 'Ml',
    'Hệ số quy đổi': 1000,
    'Số lượng cảnh báo': 10,
    'Ghi chú': 'Ưu tiên thương hiệu Vinamilk hoặc Dalatmilk.'
  },
  {
    'Tên nguyên liệu': 'Sữa đặc có đường',
    'Đơn vị tính': 'Lon',
    'Đơn vị cơ sở': 'Cái',
    'Hệ số quy đổi': 1,
    'Số lượng cảnh báo': 24,
    'Ghi chú': 'Thường dùng lon 380g, thương hiệu Ông Thọ.'
  },
  {
    'Tên nguyên liệu': 'Syrup Caramel',
    'Đơn vị tính': 'Chai 750ml',
    'Đơn vị cơ sở': 'Ml',
    'Hệ số quy đổi': 750,
    'Số lượng cảnh báo': 2,
    'Ghi chú': 'Thương hiệu Monin hoặc Torani.'
  },
  {
    'Tên nguyên liệu': 'Trà đen (Hồng trà)',
    'Đơn vị tính': 'Túi 500g',
    'Đơn vị cơ sở': 'Gram',
    'Hệ số quy đổi': 500,
    'Số lượng cảnh báo': 3,
    'Ghi chú': 'Dùng để pha trà sữa và trà trái cây.'
  },
  {
    'Tên nguyên liệu': 'Bột Matcha Nhật Bản',
    'Đơn vị tính': 'Túi 100g',
    'Đơn vị cơ sở': 'Gram',
    'Hệ số quy đổi': 100,
    'Số lượng cảnh báo': 5,
    'Ghi chú': 'Loại dùng cho pha chế (culinary grade).'
  },
  {
    'Tên nguyên liệu': 'Bột Frappe (Bột nền)',
    'Đơn vị tính': 'Túi 1Kg',
    'Đơn vị cơ sở': 'Gram',
    'Hệ số quy đổi': 1000,
    'Số lượng cảnh báo': 2,
    'Ghi chú': 'Giúp đồ uống đá xay không bị tách nước.'
  },
  {
    'Tên nguyên liệu': 'Chanh tươi không hạt',
    'Đơn vị tính': 'Kg',
    'Đơn vị cơ sở': 'Gram',
    'Hệ số quy đổi': 1000,
    'Số lượng cảnh báo': 2,
    'Ghi chú': 'Kiểm tra độ tươi và mọng nước khi nhập hàng.'
  },
  {
    'Tên nguyên liệu': 'Đường cát trắng',
    'Đơn vị tính': 'Kg',
    'Đơn vị cơ sở': 'Gram',
    'Hệ số quy đổi': 1000,
    'Số lượng cảnh báo': 10,
    'Ghi chú': 'Nấu thành nước đường để dễ hòa tan.'
  },
  {
    'Tên nguyên liệu': 'Ly nhựa PET 500ml',
    'Đơn vị tính': 'Cây 50 cái',
    'Đơn vị cơ sở': 'Cái',
    'Hệ số quy đổi': 50,
    'Số lượng cảnh báo': 20,
    'Ghi chú': 'Dùng cho các món mang đi (take-away).'
  },
  {
    'Tên nguyên liệu': 'Thùng carton đựng ly',
    'Đơn vị tính': 'Thùng',
    'Đơn vị cơ sở': 'Cái',
    'Hệ số quy đổi': 1000,
    'Số lượng cảnh báo': 5,
    'Ghi chú': 'Mỗi thùng chứa 20 cây ly (1000 ly).'
  },
  {
    'Tên nguyên liệu': 'Nắp ly nhựa có lỗ hút',
    'Đơn vị tính': 'Túi 100 cái',
    'Đơn vị cơ sở': 'Cái',
    'Hệ số quy đổi': 100,
    'Số lượng cảnh báo': 15,
    'Ghi chú': 'Phù hợp với ly 500ml và 700ml.'
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
    XLSX.utils.book_append_sheet(wb, ws, 'NguyenVatLieu');
    
    // Auto-adjust column widths
    const colWidths = Object.keys(SAMPLE_DATA[0]).map(key => ({
      wch: Math.max(
        key.length + 2,
        ...SAMPLE_DATA.map(row => String(row[key as keyof typeof row]).length + 2)
      )
    }));
    ws['!cols'] = colWidths;
    
    // Add header styling
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "E8F5E8" } },
        alignment: { horizontal: "center" }
      };
    }
    
    XLSX.writeFile(wb, 'mau_nguyen_vat_lieu_day_du.xlsx');
    toast.success('Đã tải xuống file mẫu thành công!');
  };

  const validateRow = (row: any, index: number) => {
    const errors: string[] = [];
    
    // Check required columns
    REQUIRED_COLUMNS.forEach(col => {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push(`Thiếu ${col}`);
      }
    });
    
    // Validate numeric fields
    if (row['Số lượng cảnh báo'] && isNaN(Number(row['Số lượng cảnh báo']))) {
      errors.push('Số lượng cảnh báo phải là số');
    }
    
    if (row['Số lượng cảnh báo'] && Number(row['Số lượng cảnh báo']) < 0) {
      errors.push('Số lượng cảnh báo không được âm');
    }

    if (row['Hệ số quy đổi'] && isNaN(Number(row['Hệ số quy đổi']))) {
      errors.push('Hệ số quy đổi phải là số');
    }
    
    if (row['Hệ số quy đổi'] && Number(row['Hệ số quy đổi']) <= 0) {
      errors.push('Hệ số quy đổi phải lớn hơn 0');
    }

    // Validate text length
    if (row['Tên nguyên liệu'] && String(row['Tên nguyên liệu']).length > 255) {
      errors.push('Tên nguyên liệu quá dài (tối đa 255 ký tự)');
    }

    if (row['Ghi chú'] && String(row['Ghi chú']).length > 1000) {
      errors.push('Ghi chú quá dài (tối đa 1000 ký tự)');
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

      // Check if required columns exist
      const headers = Object.keys(jsonData[0] as object);
      const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        toast.error(`File thiếu các cột bắt buộc: ${missingColumns.join(', ')}`);
        return;
      }

      const processedData = jsonData.map((row, index) => validateRow(row, index));
      const validRows = processedData.filter(row => row._isValid);
      const invalidRows = processedData.filter(row => !row._isValid);
      
      setPreviewData({
        validRows,
        invalidRows,
        headers
      });
      
      setStep('preview');
      
      if (validRows.length === 0) {
        toast.error('Không có dữ liệu hợp lệ để import!');
      } else if (invalidRows.length > 0) {
        toast.error(`Có ${invalidRows.length} dòng dữ liệu không hợp lệ!`);
      } else {
        toast.success(`Sẵn sàng import ${validRows.length} nguyên vật liệu!`);
      }
      
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
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File quá lớn! Vui lòng chọn file nhỏ hơn 10MB.');
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Định dạng file không hỗ trợ! Vui lòng chọn file Excel (.xlsx, .xls).');
        return;
      }
      
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File quá lớn! Vui lòng chọn file nhỏ hơn 10MB.');
        return;
      }
      
      setSelectedFile(file);
      processFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Import nguyên vật liệu từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên file Excel để import dữ liệu nguyên vật liệu với đầy đủ thông tin quy đổi đơn vị
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
                    Tải xuống file mẫu để xem định dạng dữ liệu chuẩn bao gồm đơn vị cơ sở và hệ số quy đổi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={generateSampleFile}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Tải xuống file mẫu đầy đủ
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    File mẫu bao gồm {SAMPLE_DATA.length} ví dụ với đầy đủ các trường thông tin
                  </p>
                </CardContent>
              </Card>

              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tải lên file Excel</CardTitle>
                  <CardDescription>
                    Chọn file Excel (.xlsx, .xls) chứa dữ liệu nguyên vật liệu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
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
                        Chọn file Excel
                      </label>
                    </Button>
                  </div>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>File đã chọn:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Required Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Cột bắt buộc</CardTitle>
                    <CardDescription>
                      File Excel phải có đầy đủ các cột sau (tên chính xác):
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {REQUIRED_COLUMNS.map(col => (
                        <div key={col} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800">{col}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">Cột tùy chọn</CardTitle>
                    <CardDescription>
                      Các cột không bắt buộc nhưng nên có:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {OPTIONAL_COLUMNS.map(col => (
                        <div key={col} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">{col}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Conversion Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    Hướng dẫn về quy đổi đơn vị
                  </CardTitle>
                  <CardDescription>
                    Cách điền thông tin đơn vị cơ sở và hệ số quy đổi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-purple-800">Ví dụ quy đổi thường gặp:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <span>1 Kg</span>
                          <span className="text-purple-600">=</span>
                          <span>1000 Gram</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <span>1 Lít</span>
                          <span className="text-purple-600">=</span>
                          <span>1000 Ml</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <span>1 Thùng</span>
                          <span className="text-purple-600">=</span>
                          <span>12 Hộp</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-purple-800">Lưu ý quan trọng:</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Đơn vị cơ sở là đơn vị nhỏ nhất để tính toán</li>
                        <li>• Hệ số quy đổi phải là số dương</li>
                        <li>• Công thức: 1 [Đơn vị tính] = [Hệ số] [Đơn vị cơ sở]</li>
                        <li>• Nếu đơn vị tính = đơn vị cơ sở thì hệ số = 1</li>
                      </ul>
                    </div>
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
                    Kiểm tra dữ liệu trước khi import vào hệ thống (có thể cuộn ngang để xem đầy đủ)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-full">
                  <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left whitespace-nowrap">STT</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Tên nguyên liệu</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Đơn vị tính</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Đơn vị cơ sở</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Hệ số QĐ</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">SL Cảnh báo</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Ghi chú</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Trạng thái</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...previewData.validRows, ...previewData.invalidRows].map((row, index) => (
                          <tr key={index} className={`border-t hover:bg-gray-25 ${!row._isValid ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-2">{row._rowIndex}</td>
                            <td className="px-3 py-2 font-medium max-w-xs truncate" title={row['Tên nguyên liệu']}>
                              {row['Tên nguyên liệu']}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline">{row['Đơn vị tính']}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary">{row['Đơn vị cơ sở']}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <Calculator className="h-3 w-3 text-blue-500" />
                                <span className="font-medium text-blue-600">
                                  {formatNumber(row['Hệ số quy đổi'])}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-orange-600 font-medium">
                              {formatNumber(row['Số lượng cảnh báo'])}
                            </td>
                            <td className="px-3 py-2 max-w-xs truncate" title={row['Ghi chú']}>
                              {row['Ghi chú'] || '-'}
                            </td>
                            <td className="px-3 py-2">
                              <Badge 
                                variant={row._isValid ? "default" : "destructive"}
                                className={row._isValid ? 'bg-green-100 text-green-800' : ''}
                              >
                                {row._isValid ? 'Hợp lệ' : 'Lỗi'}
                             </Badge>
                           </td>
                           <td className="px-3 py-2">
                             {row._errors?.length > 0 && (
                               <div className="text-red-600 text-xs max-w-xs">
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

             {/* Conversion Preview */}
             {previewData.validRows.length > 0 && (
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Calculator className="h-5 w-5 text-blue-600" />
                     Xem trước quy đổi đơn vị
                   </CardTitle>
                   <CardDescription>
                     Một số ví dụ quy đổi từ dữ liệu import
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {previewData.validRows.slice(0, 6).map((row, index) => (
                       <div key={index} className="p-3 bg-blue-50 rounded-lg">
                         <div className="font-medium text-blue-800 truncate" title={row['Tên nguyên liệu']}>
                           {row['Tên nguyên liệu']}
                         </div>
                         <div className="text-sm text-blue-600 mt-1">
                           1 {row['Đơn vị tính']} = {formatNumber(row['Hệ số quy đổi'])} {row['Đơn vị cơ sở']}
                         </div>
                         <div className="text-xs text-blue-500 mt-1">
                           Cảnh báo: {formatNumber(row['Số lượng cảnh báo'])} {row['Đơn vị tính']} 
                           = {formatNumber(row['Số lượng cảnh báo'] * row['Hệ số quy đổi'])} {row['Đơn vị cơ sở']}
                         </div>
                       </div>
                     ))}
                   </div>
                   {previewData.validRows.length > 6 && (
                     <p className="text-sm text-gray-500 mt-3 text-center">
                       Và {previewData.validRows.length - 6} nguyên vật liệu khác...
                     </p>
                   )}
                 </CardContent>
               </Card>
             )}
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
               disabled={isProcessing}
             >
               <X className="h-4 w-4 mr-2" />
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
               className="bg-green-600 hover:bg-green-700"
             >
               {isProcessing ? (
                 <>
                   <AlertCircle className="w-4 h-4 animate-spin mr-2" />
                   Đang xử lý...
                 </>
               ) : (
                 <>
                   <Check className="h-4 w-4 mr-2" />
                   Xác nhận import ({previewData.validRows.length} nguyên vật liệu)
                 </>
               )}
             </Button>
           )}
         </div>
       </div>
     </DialogContent>
   </Dialog>
 );
}