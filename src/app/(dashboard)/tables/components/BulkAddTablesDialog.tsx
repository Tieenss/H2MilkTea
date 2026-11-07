'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Layers, Loader2, AlertCircle, CheckCircle, Compass, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Table, TableFormData } from '../types/table';
import { TABLE_AREA_OPTIONS } from '../utils/constants';
import toast from 'react-hot-toast';

interface BulkAddTablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTables: Table[];
  onSubmit: (newTables: TableFormData[]) => Promise<void>;
  initialConfig?: {
    prefix?: string;
    from?: number;
    to?: number;
    area?: string;
    capacity?: number;
  };
}

export const BulkAddTablesDialog: React.FC<BulkAddTablesDialogProps> = ({
  open,
  onOpenChange,
  existingTables,
  onSubmit,
  initialConfig
}) => {
  const [prefix, setPrefix] = useState(initialConfig?.prefix || 'BAN');
  const [namePrefix, setNamePrefix] = useState('Bàn ');
  const [fromNum, setFromNum] = useState<number>(initialConfig?.from || 1);
  const [toNum, setToNum] = useState<number>(initialConfig?.to || 15);
  const [padZero, setPadZero] = useState(true);
  const [area, setArea] = useState<string>(initialConfig?.area || 'Phòng hát');
  const [capacity, setCapacity] = useState<number>(initialConfig?.capacity || 4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialConfig when provided (e.g. from AI assistant)
  React.useEffect(() => {
    if (initialConfig) {
      if (initialConfig.prefix) setPrefix(initialConfig.prefix);
      if (initialConfig.from) setFromNum(initialConfig.from);
      if (initialConfig.to) setToNum(initialConfig.to);
      if (initialConfig.area) setArea(initialConfig.area);
      if (initialConfig.capacity) setCapacity(initialConfig.capacity);
    }
  }, [initialConfig]);

  // Existing table IDs map for duplicate detection
  const existingIdSet = useMemo(() => {
    return new Set(existingTables.map(t => (t.IDBAN || '').toLowerCase().trim()));
  }, [existingTables]);

  // Generate preview list
  const previewTables = useMemo(() => {
    const from = Math.min(Math.max(1, fromNum || 1), 999);
    const to = Math.min(Math.max(from, toNum || 1), 999);
    
    // Safety limit: max 100 tables in 1 bulk operation
    const safeTo = Math.min(to, from + 99);

    const list: Array<{ id: string; name: string; isDuplicate: boolean }> = [];
    for (let i = from; i <= safeTo; i++) {
      const numStr = padZero && i < 10 ? `0${i}` : `${i}`;
      const cleanPrefix = prefix.trim() || 'BAN';
      const cleanNamePrefix = namePrefix.trim() ? `${namePrefix.trim()} ` : '';
      
      const id = `${cleanPrefix}${numStr}`;
      const name = `${cleanNamePrefix}${numStr}`.trim();
      const isDuplicate = existingIdSet.has(id.toLowerCase());

      list.push({ id, name, isDuplicate });
    }
    return list;
  }, [prefix, namePrefix, fromNum, toNum, padZero, existingIdSet]);

  const duplicateCount = useMemo(() => {
    return previewTables.filter(t => t.isDuplicate).length;
  }, [previewTables]);

  const handleSubmit = async () => {
    if (previewTables.length === 0) {
      toast.error('Vui lòng nhập khoảng số hợp lệ');
      return;
    }

    if (duplicateCount > 0) {
      toast.error(`Có ${duplicateCount} mã bàn bị trùng lặp với hệ thống. Vui lòng đổi tiền tố hoặc dải số!`);
      return;
    }

    try {
      setIsSubmitting(true);
      const tablesToCreate: TableFormData[] = previewTables.map(p => ({
        IDBAN: p.id,
        'Tên bàn': p.name,
        'Sức chứa tối đa': capacity,
        'Trạng thái': 'Đang hoạt động',
        'Khu vực': area.trim() || 'Quầy'
      }));

      await onSubmit(tablesToCreate);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating bulk tables:', err);
      toast.error(err?.message || 'Có lỗi xảy ra khi tạo bàn hàng loạt');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick preset area helper
  const handleSelectArea = (selectedArea: string) => {
    setArea(selectedArea);
    if (selectedArea === 'Phòng hát') {
      setPrefix('PH');
      setNamePrefix('Phòng VIP ');
    } else if (selectedArea === 'Vườn') {
      setPrefix('V');
      setNamePrefix('Bàn Vườn ');
    } else if (selectedArea === 'Quầy') {
      setPrefix('Q');
      setNamePrefix('Quầy ');
    } else if (selectedArea === 'Mang về') {
      setPrefix('MV');
      setNamePrefix('Mang về ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-slate-100">
                Tạo bàn nhanh hàng loạt
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-slate-400">
                Tự động sinh mã bàn (vd: BAN01 - BAN15), gán theo khu vực và cấu hình sức chứa trong 1 thao tác.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
          {/* Preset quick selection */}
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <Label className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5" />
              Chọn nhanh theo khu vực:
            </Label>
            <div className="flex flex-wrap gap-2">
              {TABLE_AREA_OPTIONS.map((areaOption) => {
                const isSelected = area === areaOption;
                return (
                  <button
                    key={areaOption}
                    type="button"
                    onClick={() => handleSelectArea(areaOption)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                      isSelected
                        ? "bg-indigo-600 text-white shadow-indigo-200"
                        : "bg-white text-gray-700 hover:bg-indigo-50 border border-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    )}
                  >
                    <span>
                      {areaOption === 'Phòng hát' && '🎤'}
                      {areaOption === 'Quầy' && '☕'}
                      {areaOption === 'Vườn' && '🌿'}
                      {areaOption === 'Mang về' && '🛍️'}
                    </span>
                    <span>{areaOption}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tiền tố mã bàn */}
            <div className="space-y-1.5">
              <Label htmlFor="bulkPrefix" className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                Tiền tố mã bàn (ID) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bulkPrefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="VD: BAN, PH, V, Q"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-gray-500">Mã sẽ được ghép thành: {prefix}{padZero ? '01' : '1'}...</p>
            </div>

            {/* Tiền tố tên hiển thị */}
            <div className="space-y-1.5">
              <Label htmlFor="bulkNamePrefix" className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                Tiền tố tên bàn hiển thị
              </Label>
              <Input
                id="bulkNamePrefix"
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                placeholder="VD: Bàn , Phòng VIP , Quầy "
                className="text-sm"
              />
              <p className="text-[11px] text-gray-500">Tên hiển thị: {namePrefix}{padZero ? '01' : '1'}...</p>
            </div>
          </div>

          {/* Dải số bàn */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="bulkFrom" className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                Từ số <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bulkFrom"
                type="number"
                min="1"
                max="999"
                value={fromNum}
                onChange={(e) => setFromNum(parseInt(e.target.value) || 1)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkTo" className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                Đến số <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bulkTo"
                type="number"
                min={fromNum}
                max="999"
                value={toNum}
                onChange={(e) => setToNum(parseInt(e.target.value) || fromNum)}
                className="text-sm"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center h-10 px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={padZero}
                  onChange={(e) => setPadZero(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Độn số 0 (01, 02...)</span>
              </label>
            </div>
          </div>

          {/* Khu vực & Sức chứa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulkAreaInput" className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                Tên Khu vực gán cho các bàn <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bulkAreaInput"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Chọn hoặc gõ tên khu vực..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkCapacityInput" className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                Sức chứa mỗi bàn (Người)
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    id="bulkCapacityInput"
                    type="number"
                    min="1"
                    max="50"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 4)}
                    className="pl-9 text-sm"
                  />
                </div>
                <div className="flex gap-1">
                  {[2, 4, 6, 8].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setCapacity(cap)}
                      className={cn(
                        "px-2 py-1 text-xs rounded border font-medium",
                        capacity === cap
                          ? "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                          : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 bg-gray-50/70 dark:bg-slate-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Xem trước ({previewTables.length} bàn sẽ được tạo)</span>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300">
                Khu vực: {area || 'Chưa đặt'}
              </Badge>
            </div>

            {duplicateCount > 0 && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Phát hiện {duplicateCount} mã bàn bị trùng lặp:</strong>
                  <p className="mt-0.5 text-[11px]">
                    Các mã bàn màu đỏ bên dưới đã tồn tại trong cơ sở dữ liệu. Vui lòng đổi tiền tố hoặc dải số bắt đầu.
                  </p>
                </div>
              </div>
            )}

            <div className="max-h-36 overflow-y-auto p-2 bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800 flex flex-wrap gap-1.5">
              {previewTables.map((t) => (
                <span
                  key={t.id}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border",
                    t.isDuplicate
                      ? "bg-red-50 text-red-700 border-red-300 font-semibold line-through"
                      : "bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                  )}
                  title={t.isDuplicate ? `Mã ${t.id} đã tồn tại` : `Sẵn sàng tạo: ${t.name}`}
                >
                  <span className="font-mono">{t.id}</span>
                  <span className="text-gray-400">→</span>
                  <span>{t.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>

          <Button
            type="button"
            disabled={isSubmitting || previewTables.length === 0 || duplicateCount > 0}
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tạo {previewTables.length} bàn...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Tạo ngay {previewTables.length} bàn
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
