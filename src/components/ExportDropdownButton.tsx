'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  Table,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  exportToFormattedExcel,
  exportToFormattedWord,
  exportToFormattedCSV,
  printFormattedA4,
  type FormattedExportOptions,
} from '@/utils/exportUtils';

interface ExportDropdownButtonProps extends FormattedExportOptions {
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportDropdownButton({
  label = 'Xuất báo cáo / In',
  variant = 'outline',
  size = 'sm',
  className = '',
  ...exportOptions
}: ExportDropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ensureHasData = () => {
    if (!Array.isArray(exportOptions.data) || exportOptions.data.length === 0) {
      toast.error('Chưa có dữ liệu để xuất!');
      return false;
    }
    return true;
  };

  const handleAction = (type: 'xlsx' | 'doc' | 'print' | 'csv') => {
    setOpen(false);
    if (!ensureHasData()) return;

    try {
      switch (type) {
        case 'xlsx':
          exportToFormattedExcel(exportOptions);
          toast.success('Đã xuất file Excel (.xlsx) định dạng chuẩn!');
          break;
        case 'doc':
          exportToFormattedWord(exportOptions);
          toast.success('Đã xuất file Word (.doc) biểu mẫu chuẩn A4!');
          break;
        case 'print':
          printFormattedA4(exportOptions);
          toast.success('Đã mở cửa sổ In biểu mẫu A4!');
          break;
        case 'csv':
          exportToFormattedCSV(exportOptions);
          toast.success('Đã xuất file CSV (.csv) mã hóa UTF-8!');
          break;
      }
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Lỗi khi xuất dữ liệu: ' + (err?.message || 'Không xác định'));
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{label}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Chọn định dạng xuất & in
          </div>

          <button
            type="button"
            onClick={() => handleAction('xlsx')}
            className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold">Xuất Excel (.xlsx)</div>
              <div className="text-[10.5px] text-gray-500">Bảng tính căn cột, tổng hợp đẹp</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAction('doc')}
            className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 font-medium transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <div className="font-bold">Xuất Word (.doc)</div>
              <div className="text-[10.5px] text-gray-500">Biểu mẫu A4 có khung ký duyệt</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAction('print')}
            className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 font-medium transition-colors"
          >
            <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <div className="font-bold">In biểu mẫu A4 / Lưu PDF</div>
              <div className="text-[10.5px] text-gray-500">Xem trước & in trực tiếp ra giấy</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAction('csv')}
            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-medium transition-colors border-t border-gray-100 dark:border-gray-800 mt-1 pt-2"
          >
            <Table className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <div className="font-bold">Xuất CSV (.csv)</div>
              <div className="text-[10.5px] text-gray-500">Dữ liệu thô chuẩn UTF-8 BOM</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
