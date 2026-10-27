'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CopyCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Product } from '../types/product';

interface DuplicateProductCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemoveDuplicateIndices: (indices: number[]) => Promise<boolean>;
}

interface DuplicateGroup {
  key: string;
  reason: 'duplicate_id' | 'duplicate_name' | 'similar_name';
  reasonLabel: string;
  items: Array<{
    product: Product;
    index: number;
  }>;
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function DuplicateProductCheckerModal({
  isOpen,
  onClose,
  products,
  onRemoveDuplicateIndices,
}: DuplicateProductCheckerModalProps) {
  const [selectedIndicesToRemove, setSelectedIndicesToRemove] = useState<Set<number>>(new Set());
  const [isCleaning, setIsCleaning] = useState(false);

  // Phân tích các nhóm trùng lặp: Trùng mã IDSP, Trùng tên chính xác, hoặc Trùng tên bỏ dấu
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const groups: DuplicateGroup[] = [];
    const byId = new Map<string, Array<{ product: Product; index: number }>>();
    const byExactName = new Map<string, Array<{ product: Product; index: number }>>();
    const byNormalizedName = new Map<string, Array<{ product: Product; index: number }>>();

    products.forEach((product, index) => {
      const idKey = String(product.IDSP || '').trim().toUpperCase();
      if (idKey) {
        if (!byId.has(idKey)) byId.set(idKey, []);
        byId.get(idKey)!.push({ product, index });
      }

      const exactNameKey = String(product['Tên sản phẩm'] || '').trim().toLowerCase();
      if (exactNameKey) {
        if (!byExactName.has(exactNameKey)) byExactName.set(exactNameKey, []);
        byExactName.get(exactNameKey)!.push({ product, index });
      }

      const normNameKey = removeVietnameseTones(String(product['Tên sản phẩm'] || ''));
      if (normNameKey) {
        if (!byNormalizedName.has(normNameKey)) byNormalizedName.set(normNameKey, []);
        byNormalizedName.get(normNameKey)!.push({ product, index });
      }
    });

    const indicesGrouped = new Set<string>();

    // 1. Trùng mã IDSP
    byId.forEach((items, idKey) => {
      if (items.length > 1) {
        const sig = items.map((i) => i.index).sort().join(',');
        indicesGrouped.add(sig);
        groups.push({
          key: `id_${idKey}`,
          reason: 'duplicate_id',
          reasonLabel: `Trùng mã sản phẩm (${idKey})`,
          items,
        });
      }
    });

    // 2. Trùng tên sản phẩm chính xác
    byExactName.forEach((items) => {
      if (items.length > 1) {
        const sig = items.map((i) => i.index).sort().join(',');
        if (!indicesGrouped.has(sig)) {
          indicesGrouped.add(sig);
          groups.push({
            key: `name_${items[0].product['Tên sản phẩm']}`,
            reason: 'duplicate_name',
            reasonLabel: `Trùng tên sản phẩm ("${items[0].product['Tên sản phẩm']}")`,
            items,
          });
        }
      }
    });

    // 3. Tương tự tên (khi bỏ dấu tiếng Việt)
    byNormalizedName.forEach((items, normKey) => {
      if (items.length > 1) {
        const sig = items.map((i) => i.index).sort().join(',');
        if (!indicesGrouped.has(sig)) {
          indicesGrouped.add(sig);
          groups.push({
            key: `sim_${normKey}`,
            reason: 'similar_name',
            reasonLabel: `Tên gần giống nhau ("${items.map((i) => i.product['Tên sản phẩm']).join(' / ')}")`,
            items,
          });
        }
      }
    });

    return groups;
  }, [products]);

  // Mặc định đánh dấu xóa các bản sao từ vị trí thứ 2 trở đi trong mỗi nhóm
  useEffect(() => {
    if (!isOpen) return;
    const autoSelect = new Set<number>();
    duplicateGroups.forEach((group) => {
      group.items.slice(1).forEach((entry) => {
        autoSelect.add(entry.index);
      });
    });
    setSelectedIndicesToRemove(autoSelect);
  }, [isOpen, duplicateGroups]);

  const toggleIndex = (idx: number) => {
    setSelectedIndicesToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleCleanSelected = async () => {
    const indices = Array.from(selectedIndicesToRemove);
    if (indices.length === 0) return;
    setIsCleaning(true);
    try {
      const ok = await onRemoveDuplicateIndices(indices);
      if (ok) {
        setSelectedIndicesToRemove(new Set());
      }
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
              <CopyCheck className="w-5 h-5 text-white" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-white">
                Kiểm Tra & Dọn Dẹp Sản Phẩm Trùng Lặp
              </DialogTitle>
              <p className="text-xs text-amber-100 mt-0.5">
                Tự động phát hiện các món bị trùng mã IDSP hoặc trùng tên sản phẩm để xử lý nhanh
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Thanh trạng thái tổng quan */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
            <div className="flex items-center gap-3">
              <span>
                Tổng sản phẩm hiện tại: <strong>{products.length} món</strong>
              </span>
              <span>•</span>
              <span
                className={
                  duplicateGroups.length > 0
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : 'text-emerald-600 dark:text-emerald-400 font-bold'
                }
              >
                Nhóm trùng lặp phát hiện: {duplicateGroups.length} nhóm
              </span>
            </div>

            {duplicateGroups.length > 0 && (
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                Đã chọn xóa: <strong>{selectedIndicesToRemove.size} bản ghi dư thừa</strong>
              </span>
            )}
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="py-10 text-center space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Thực đơn hoàn toàn sạch sẽ, không có sản phẩm trùng lặp!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Tất cả {products.length} sản phẩm trong hệ thống đều có mã IDSP và tên sản phẩm duy nhất.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {duplicateGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-xl border border-amber-200 dark:border-amber-800/60 overflow-hidden bg-white dark:bg-gray-950 shadow-sm"
                >
                  <div className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{group.reasonLabel}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        group.reason === 'duplicate_id'
                          ? 'border-red-400 text-red-700 bg-red-50'
                          : 'border-amber-400 text-amber-700 bg-amber-50'
                      }
                    >
                      {group.items.length} bản ghi
                    </Badge>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.items.map(({ product, index }, idxInGroup) => {
                      const isMarkedForDelete = selectedIndicesToRemove.has(index);
                      return (
                        <div
                          key={`${product.IDSP}_${index}`}
                          onClick={() => toggleIndex(index)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs ${
                            isMarkedForDelete
                              ? 'bg-red-50/60 dark:bg-red-950/25'
                              : 'bg-emerald-50/30 dark:bg-emerald-950/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isMarkedForDelete}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                  {product.IDSP}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {product['Tên sản phẩm']}
                                </span>
                                <span className="text-gray-500">({product['Loại sản phẩm']})</span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Đơn giá: <strong>{Number(product['Đơn giá'] || 0).toLocaleString('vi-VN')}đ</strong> • ĐVT:{' '}
                                {product['Đơn vị tính']} • Dòng #{index + 1}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isMarkedForDelete ? (
                              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200 font-bold text-[11px] flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Sẽ xóa bản trùng này
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold text-[11px]">
                                {idxInGroup === 0 ? 'Giữ lại (Bản gốc)' : 'Giữ lại'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs">
              Đóng
            </Button>

            {duplicateGroups.length > 0 && (
              <Button
                type="button"
                onClick={handleCleanSelected}
                disabled={isCleaning || selectedIndicesToRemove.size === 0}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xóa {selectedIndicesToRemove.size} sản phẩm trùng đã chọn
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
