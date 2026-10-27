'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  FileText,
  Upload,
  Check,
  Loader2,
  X,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import authUtils from '@/utils/authUtils';

export interface QuickInventoryItem {
  matchedId: string | null;
  isExisting: boolean;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warningThreshold: number;
  baseUnit: string;
  conversionFactor: number;
  selected: boolean;
}

interface AIInventoryQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMaterials: any[];
  onSuccess: () => void;
  defaultTransactionType?: 'Nhập kho' | 'Xuất kho';
}

async function compressReceiptImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function AIInventoryQuickModal({
  isOpen,
  onClose,
  currentMaterials,
  onSuccess,
  defaultTransactionType = 'Nhập kho',
}: AIInventoryQuickModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'scan'>('prompt');
  const [promptText, setPromptText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [transactionType, setTransactionType] = useState<'Nhập kho' | 'Xuất kho'>(defaultTransactionType);
  const [supplier, setSupplier] = useState('Nhà cung cấp tổng hợp H2');
  const [note, setNote] = useState('Nhập nhanh nguyên vật liệu bằng AI');
  const [items, setItems] = useState<QuickInventoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const PROMPT_SUGGESTIONS = [
    'Nhập 20kg Cà phê hạt Robusta giá 120k/kg, 30 hộp Sữa tươi không đường 1L giá 32k, 24 lon Sữa đặc có đường giá 28k',
    'Nhập thêm 15kg Trân châu đen Hoàng Kim giá 45k/kg, 10 chai Syrup Đào giá 95k/chai, 5kg Bột Matcha Nhật giá 220k',
    'Xuất kho 5kg Cà phê hạt Robusta, 10 hộp Sữa tươi không đường để pha chế ca sáng',
  ];

  const handleAnalyzeWithAI = async () => {
    if (activeTab === 'prompt' && !promptText.trim()) {
      toast.error('Vui lòng nhập mô tả danh sách nguyên vật liệu và số lượng!');
      return;
    }
    if (activeTab === 'scan' && !selectedImage) {
      toast.error('Vui lòng tải ảnh phiếu giao hàng / hóa đơn trước!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/inventory-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeTab === 'scan' ? 'scan_invoice' : 'prompt',
          prompt: promptText,
          imageBase64: selectedImage,
          currentMaterials,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể phân tích nguyên vật liệu');
      }

      setTransactionType(data.transactionType || 'Nhập kho');
      if (data.supplier) setSupplier(data.supplier);
      if (data.note) setNote(data.note);
      setItems(data.items || []);

      toast.success(`AI đã trích xuất ${data.items?.length || 0} mục nguyên vật liệu!`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gọi AI phân tích nguyên vật liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExistingMaterialsForQuickEntry = () => {
    const quickList: QuickInventoryItem[] = currentMaterials.slice(0, 12).map((m: any) => ({
      matchedId: m.IDNguyenLieu,
      isExisting: true,
      name: m['Tên nguyên liệu'],
      unit: m['Đơn vị tính'] || 'Kg',
      quantity: 10,
      unitPrice: 25000,
      totalPrice: 250000,
      warningThreshold: Number(m['Số lượng cảnh báo']) || 5,
      baseUnit: m['Đơn vị cơ sở'] || 'Gram',
      conversionFactor: Number(m['Hệ số quy đổi']) || 1000,
      selected: true,
    }));
    setItems(quickList);
    toast.success('Đã nạp danh sách nguyên liệu hiện có để nhập nhanh số lượng!');
  };

  const handleAddEmptyRow = () => {
    setItems((prev) => [
      ...prev,
      {
        matchedId: null,
        isExisting: false,
        name: '',
        unit: 'Kg',
        quantity: 5,
        unitPrice: 0,
        totalPrice: 0,
        warningThreshold: 5,
        baseUnit: 'Gram',
        conversionFactor: 1000,
        selected: true,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof QuickInventoryItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === 'name') {
        const matched = currentMaterials.find(
          (m: any) =>
            String(m['Tên nguyên liệu'] || '').trim().toLowerCase() === String(value || '').trim().toLowerCase()
        );
        item.matchedId = matched?.IDNguyenLieu || null;
        item.isExisting = Boolean(matched);
        if (matched?.['Đơn vị tính']) item.unit = matched['Đơn vị tính'];
      }

      if (field === 'quantity' || field === 'unitPrice') {
        const q = Math.max(0, Number(item.quantity) || 0);
        const p = Math.max(0, Number(item.unitPrice) || 0);
        item.quantity = q;
        item.unitPrice = p;
        item.totalPrice = Math.round(q * p);
      }

      next[index] = item;
      return next;
    });
  };

  const handleStepQuantity = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const newQty = Math.max(0, Math.round((Number(current.quantity) + delta) * 100) / 100);
      next[index] = {
        ...current,
        quantity: newQty,
        totalPrice: Math.round(newQty * (Number(current.unitPrice) || 0)),
      };
      return next;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }
    try {
      const compressed = await compressReceiptImage(file);
      setSelectedImage(compressed);
    } catch {
      toast.error('Không thể đọc file ảnh');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmSave = async () => {
    const selectedItems = items.filter((i) => i.selected && i.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 nguyên vật liệu hợp lệ!');
      return;
    }

    setIsLoading(true);
    try {
      const userData = authUtils.getUserData();
      const staffName = userData?.['Họ và Tên'] || userData?.username || 'Quản lý kho';

      const transactionDetails: any[] = [];
      let createdMaterialsCount = 0;

      for (const item of selectedItems) {
        let materialId = item.matchedId;

        // Nếu nguyên vật liệu chưa có trong danh mục NGUYENLIEU -> Tự động thêm mới
        if (!materialId) {
          const createRes = await authUtils.addNguyenLieu({
            'Tên nguyên liệu': item.name.trim(),
            'Đơn vị tính': item.unit || 'Kg',
            'Ghi chú': 'Thêm tự động qua Trợ lý AI Nhập kho',
            'Số lượng cảnh báo': String(item.warningThreshold || 5),
            'Đơn vị cơ sở': item.baseUnit || 'Gram',
            'Hệ số quy đổi': String(item.conversionFactor || 1000),
          });
          if (createRes && !Array.isArray(createRes) && createRes.data) {
            materialId = createRes.data.IDNguyenLieu;
            createdMaterialsCount++;
          }
        }

        if (materialId && item.quantity > 0) {
          const lineTotal = Math.round(item.quantity * (item.unitPrice || 0));
          transactionDetails.push({
            IDNguyenLieu: materialId,
            TenNguyenLieu: item.name.trim(),
            SoLuong: item.quantity,
            DonViTinh: item.unit || 'Kg',
            DonGia: item.unitPrice || 0,
            ThanhTien: lineTotal,
          });
        }
      }

      // Tạo phiếu Nhập kho / Xuất kho trong NHAPXUATKHO nếu có số lượng > 0
      if (transactionDetails.length > 0) {
        const totalAmount = transactionDetails.reduce((sum, d) => sum + (Number(d.ThanhTien) || 0), 0);
        await authUtils.addNhapXuatKho({
          LoaiGiaoDich: transactionType,
          NgayGiaoDich: authUtils.formatVNDateTime(new Date()),
          NhaCungCap: transactionType === 'Nhập kho' ? supplier : '',
          NhanVienThucHien: staffName,
          GhiChu: note || `${transactionType} nhanh bằng AI`,
          TongTien: totalAmount,
          TrangThai: 'Hoàn thành',
          ChiTiet: transactionDetails,
        });
      }

      toast.success(
        `Đã xử lý thành công ${selectedItems.length} mục (${createdMaterialsCount} danh mục mới, 1 phiếu ${transactionType.toLowerCase()} đã hoàn thành)!`
      );
      setItems([]);
      setPromptText('');
      setSelectedImage(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save AI inventory error:', err);
      toast.error(err.message || 'Có lỗi khi lưu dữ liệu nguyên vật liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedItems = items.filter((i) => i.selected);
  const grandTotal = selectedItems.reduce((sum, i) => sum + (Number(i.totalPrice) || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-white">
                  Trợ Lý AI Nhập Nhanh Nguyên Vật Liệu & Số Lượng Tồn Kho
                </DialogTitle>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Nhập câu lệnh tự nhiên, quét hóa đơn nhà cung cấp hoặc điền nhanh số lượng thủ công hàng loạt
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'prompt'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              1. Nhập văn bản / Dán danh sách
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scan'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              2. Quét ảnh Hóa đơn / Phiếu nhập
            </button>
            <button
              type="button"
              onClick={handleLoadExistingMaterialsForQuickEntry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400/90 hover:bg-amber-400 text-gray-900 ml-auto transition-all shadow-sm"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Nạp danh mục sẵn có để nhập tay nhanh
            </button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {activeTab === 'prompt' ? (
            <div className="space-y-3">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Nhập 20kg đường cát trắng giá 22k/kg, 15 hộp sữa tươi không đường 1L giá 32k, 5kg trân châu đen 45k..."
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptText(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isLoading || !promptText.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI đang bóc tách số lượng & đối chiếu kho...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                    Phân tích & Lập bảng nhập số lượng
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {!selectedImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer bg-teal-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-800">
                    Nhấp để tải ảnh Phiếu giao hàng / Hóa đơn nguyên vật liệu
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    AI sẽ tự động đọc tên nguyên liệu, đơn vị, số lượng và đơn giá nhập
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border">
                  <img
                    src={selectedImage}
                    alt="Receipt Preview"
                    className="h-20 w-32 object-contain rounded border bg-white"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">Đã chọn ảnh hóa đơn nhập hàng</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImage(null)}
                        className="h-7 text-xs text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAnalyzeWithAI}
                      disabled={isLoading}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 rounded-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          AI đang đọc hóa đơn...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Quét hóa đơn & Lập bảng số lượng
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BẢNG NHẬP SỐ LƯỢNG THỦ CÔNG & ĐỐI CHIẾU NGUYÊN LIỆU */}
          {items.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Loại giao dịch kho</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as 'Nhập kho' | 'Xuất kho')}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-white font-bold text-teal-800"
                  >
                    <option value="Nhập kho">Nhập kho (+ Tăng tồn)</option>
                    <option value="Xuất kho">Xuất kho (- Giảm tồn)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Nhà cung cấp</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Tên nhà cung cấp..."
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Ghi chú phiếu</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">
                  Bảng điều chỉnh số lượng nhanh ({selectedItems.length}/{items.length} mục được chọn)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddEmptyRow}
                  className="h-7 text-xs px-2.5"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Thêm dòng thủ công
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10 text-gray-700">
                    <tr>
                      <th className="p-2 text-center w-8">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && items.every((i) => i.selected)}
                          onChange={(e) => {
                            const c = e.target.checked;
                            setItems((prev) => prev.map((it) => ({ ...it, selected: c })));
                          }}
                          className="w-3.5 h-3.5 rounded text-teal-600"
                        />
                      </th>
                      <th className="p-2 text-left">Tên nguyên vật liệu</th>
                      <th className="p-2 text-center w-20">ĐVT</th>
                      <th className="p-2 text-center w-40">Số lượng (+/-)</th>
                      <th className="p-2 text-right w-32">Đơn giá (VNĐ)</th>
                      <th className="p-2 text-right w-28">Thành tiền</th>
                      <th className="p-2 text-center w-10">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((item, idx) => (
                      <tr key={idx} className={item.selected ? 'bg-teal-50/20' : 'opacity-50'}>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => handleUpdateItem(idx, 'selected', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-teal-600"
                          />
                        </td>
                        <td className="p-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              placeholder="Nhập tên nguyên liệu..."
                              className="w-full px-2 py-1 rounded border font-semibold"
                            />
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                item.isExisting
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {item.isExisting ? item.matchedId : 'Mới'}
                            </span>
                          </div>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                            className="w-full px-1.5 py-1 rounded border text-center"
                          />
                        </td>
                        <td className="p-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, -1)}
                              className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              ref={(el) => {
                                qtyInputRefs.current[idx] = el;
                              }}
                              type="number"
                              min={0}
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  qtyInputRefs.current[idx + 1]?.focus();
                                  qtyInputRefs.current[idx + 1]?.select();
                                }
                              }}
                              className="w-16 px-1.5 py-1 rounded border border-teal-400 text-center font-bold text-teal-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(idx, 1)}
                              className="p-1 rounded bg-teal-100 hover:bg-teal-200 text-teal-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={item.unitPrice > 0 ? item.unitPrice : ''}
                            placeholder="0"
                            onChange={(e) =>
                              handleUpdateItem(
                                idx,
                                'unitPrice',
                                e.target.value === '' ? 0 : Number(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1 rounded border text-right font-semibold"
                          />
                        </td>
                        <td className="p-1.5 text-right font-bold text-gray-800">
                          {(item.totalPrice || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-600">
                  Tổng giá trị phiếu {transactionType.toLowerCase()}:{' '}
                  <strong className="text-sm text-teal-700">{grandTotal.toLocaleString('vi-VN')}đ</strong>
                </div>

                <Button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isLoading || selectedItems.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Xác nhận Lưu & {transactionType} ({selectedItems.length} mục)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
