// components/InvoiceDetailsModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatInvoiceDate, getStatusColor } from '../utils/invoiceFormatters';
import { printReceipt } from '../utils/invoicePrint';
import type { Invoice, InvoiceDetail } from '../types/invoice';

interface InvoiceDetailsModalProps {
  invoice: Invoice | null;
  details: InvoiceDetail[];
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  details,
  isOpen,
  onClose,
  onPrint
}) => {
  if (!invoice) return null;

  const finalTotal = Number( invoice['Tổng tiền']) + Number( invoice['VAT']) - Number( invoice['Giảm giá']);

  const handlePrint = () => {
    printReceipt(invoice, details);
  };

  const handleExportPDF = () => {
    // Implement PDF export functionality
    console.log('Export PDF functionality');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Chi tiết hóa đơn {invoice.IDHOADON}
            </DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm">
                <Printer className="w-4 h-4 mr-2" />
                In hóa đơn
              </Button>
              <Button onClick={handleExportPDF} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Xuất PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh]">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold mb-3">Thông tin hóa đơn</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mã hóa đơn:</span>
                  <span className="font-medium">{invoice.IDHOADON}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày tạo:</span>
                  <span>{formatInvoiceDate(invoice['Ngày'])}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bàn:</span>
                  <span className="font-medium">{invoice.IDBAN}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái:</span>
                  <Badge className={getStatusColor(invoice['Trạng thái'])}>
                    {invoice['Trạng thái']}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Thông tin khách hàng</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Khách hàng:</span>
                  <span className="font-medium">{invoice['Khách hàng']}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nhân viên:</span>
                  <span>{invoice['Nhân viên']}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thanh toán:</span>
                  <Badge variant="outline">{invoice['Loại thanh toán']}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái bàn:</span>
                  <span>{invoice['Trạng thái sử dụng bàn']}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Chi tiết sản phẩm</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Đơn vị tính</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail) => (
                  <TableRow key={detail.IDHOADONDETAIL}>
                    <TableCell className="font-medium">
                      {detail['Tên sản phẩm']}
                    </TableCell>
                    <TableCell>{detail['Đơn vị tính']}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(detail['Đơn giá'])}
                    </TableCell>
                    <TableCell className="text-center">
                      {detail['Số lượng']}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(detail['Thành tiền'])}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {detail['Ghi chú'] || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Invoice Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Tổng kết thanh toán</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tổng tiền hàng:</span>
                <span>{formatCurrency(invoice['Tổng tiền'])}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (10%):</span>
                <span>{formatCurrency(invoice['VAT'])}</span>
              </div>
              {invoice['Giảm giá'] > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(invoice['Giảm giá'])}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-blue-600">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Khách trả:</span>
                <span>{formatCurrency(invoice['Khách trả'])}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tiền thừa:</span>
                <span>{formatCurrency(invoice['Tiền thừa'])}</span>
              </div>
            </div>

            {invoice['Ghi chú'] && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Ghi chú:</span>
                  <p className="mt-1 text-gray-600">{invoice['Ghi chú']}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};