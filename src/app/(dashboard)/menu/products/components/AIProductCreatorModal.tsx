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
  AlertTriangle,
  Wand2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import type { Product, ProductFormData } from '../types/product';

interface AIProductCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProducts: Product[];
  onAddProduct: (product: ProductFormData) => Promise<boolean | void>;
  onAddMultipleProducts?: (products: ProductFormData[]) => Promise<boolean | void>;
  generateProductId: () => string;
}

interface ScannedMenuItem {
  name: string;
  category: string;
  price: number;
  hasPrice?: boolean;
  costPrice: number;
  unit: string;
  image: string;
  isNew: boolean;
  selected: boolean;
}

const CATEGORIES = [
  'Trà sữa',
  'Trà trái cây',
  'Cà phê',
  'Đá xay',
  'Nước ép',
  'Bánh ngọt',
  'Ăn vặt',
];

const QUICK_PRICE_PRESETS = [20000, 25000, 28000, 30000, 35000, 40000];

// Nén & chuẩn hóa ảnh sang JPEG kích thước tối ưu <= 1600px để Gemini Vision đọc nhanh và không bị lỗi MIME/payload
async function normalizeAndCompressImage(file: File): Promise<string> {
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
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // Nền trắng cho ảnh PNG trong suốt
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function AIProductCreatorModal({
  isOpen,
  onClose,
  currentProducts,
  onAddProduct,
  onAddMultipleProducts,
  generateProductId,
}: AIProductCreatorModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'scan'>('prompt');
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Result from Prompt
  const [generatedProduct, setGeneratedProduct] = useState<{
    name: string;
    category: string;
    price: number;
    hasPrice?: boolean;
    costPrice: number;
    unit: string;
    description: string;
    image: string;
    recipeHint?: string;
    isDuplicateName?: boolean;
    existingProductId?: string | null;
  } | null>(null);

  // Result from Scan Menu
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scanItems, setScanItems] = useState<ScannedMenuItem[]>([]);
  const [scanSummary, setScanSummary] = useState<{
    totalDetected: number;
    existingCount: number;
  } | null>(null);
  const [viewFilter, setViewFilter] = useState<'new' | 'all'>('all');
  const [batchPriceInput, setBatchPriceInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const priceInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const PROMPT_SUGGESTIONS = [
    'Thêm món Trà xoài macchiato giá 35k size M, topping thạch dừa thanh mát',
    'Thêm Cà phê muối kem béo chuẩn vị Huế giá 28k',
    'Thêm Bún bò Huế đặc biệt (chưa có giá, để trống giá)',
    'Thêm Bánh sừng bò phô mai trứng muối giá 25k loại Bánh ngọt',
  ];

  // Xử lý tạo món từ Prompt
  const handleGeneratePrompt = async () => {
    if (!promptText.trim()) {
      toast.error('Vui lòng nhập mô tả món ăn!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/product-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'prompt',
          prompt: promptText,
          currentProducts,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tạo món bằng AI');
      }

      setGeneratedProduct(data.product);
      if (data.product?.isDuplicateName) {
        toast(`⚠️ Món "${data.product.name}" đã có trong menu (${data.product.existingProductId})!`, {
          icon: '⚠️',
        });
      } else {
        toast.success('AI đã trích xuất thông tin món thành công!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo món lúc này');
    } finally {
      setIsLoading(false);
    }
  };

  // Lưu món từ Prompt vào Menu
  const handleSavePromptProduct = async () => {
    if (!generatedProduct) return;
    if (!generatedProduct.name.trim()) {
      toast.error('Tên sản phẩm không được để trống!');
      return;
    }

    // Chặn trùng lặp tên sản phẩm (vd: thêm 2 lần bún bò huế)
    const normName = generatedProduct.name.trim().toLowerCase();
    const existingSameName = currentProducts.find(
      (p) => String(p['Tên sản phẩm'] || '').trim().toLowerCase() === normName
    );
    if (existingSameName) {
      toast.error(
        `Sản phẩm "${generatedProduct.name}" đã tồn tại trên hệ thống với mã ${existingSameName.IDSP}! Vui lòng kiểm tra lại để tránh thêm trùng.`
      );
      return;
    }

    const newId = generateProductId();
    const payload: ProductFormData = {
      IDSP: newId,
      'Tên sản phẩm': generatedProduct.name.trim(),
      'Loại sản phẩm': generatedProduct.category || 'Trà sữa',
      'Đơn giá': Number(generatedProduct.price) || 0,
      'Giá vốn': Number(generatedProduct.costPrice) || 0,
      'Đơn vị tính': generatedProduct.unit || 'Ly',
      'Mô tả': generatedProduct.description || '',
      'Hình ảnh': generatedProduct.image,
      'Trạng thái': 'Hoạt động',
    };

    setIsLoading(true);
    try {
      const added = await onAddProduct(payload);
      if (added !== false) {
        setGeneratedProduct(null);
        setPromptText('');
        onClose();
      }
    } catch {
      toast.error('Lỗi khi lưu sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  // Chọn ảnh để scan menu (tự động nén & chuẩn hóa JPEG)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }

    try {
      const compressedDataUrl = await normalizeAndCompressImage(file);
      setSelectedImage(compressedDataUrl);
      setScanItems([]);
      setScanSummary(null);
    } catch {
      toast.error('Không thể xử lý file ảnh đã chọn');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Xử lý Scan Menu từ ảnh
  const handleStartScanMenu = async () => {
    if (!selectedImage) {
      toast.error('Vui lòng tải ảnh thực đơn lên trước!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/product-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'scan_menu',
          imageBase64: selectedImage,
          currentProducts,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi scan menu');
      }

      const allList: ScannedMenuItem[] = Array.isArray(data.allProducts)
        ? data.allProducts
        : (data.newProducts || []).map((p: any) => ({ ...p, isNew: true, selected: true }));

      setScanItems(allList);
      setScanSummary({
        totalDetected: data.totalDetected || allList.length,
        existingCount: data.existingCount || 0,
      });

      const newCount = allList.filter((i) => i.isNew).length;
      setViewFilter(newCount > 0 ? 'new' : 'all');

      const missingPriceCount = allList.filter((i) => !i.price || i.price <= 0).length;
      if (missingPriceCount > 0) {
        toast.success(
          `Đã quét ${allList.length} món! Có ${missingPriceCount} món chưa có giá trên ảnh, bạn có thể nhập nhanh vào bảng hoặc để trống.`
        );
      } else {
        toast.success(`Đã quét thấy ${allList.length} món (${newCount} món mới chưa có trong quán)!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể quét menu lúc này');
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật từng trường của món trong bảng Scan
  const handleUpdateScanItem = (index: number, field: keyof ScannedMenuItem, value: any) => {
    setScanItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };
      if (field === 'price') {
        const numericPrice = Math.max(0, Number(value) || 0);
        current.price = numericPrice;
        current.hasPrice = numericPrice > 0;
        current.costPrice = numericPrice > 0 ? Math.round(numericPrice * 0.4) : 0;
      }
      next[index] = current;
      return next;
    });
  };

  const handleRemoveScanItem = (index: number) => {
    setScanItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Áp dụng giá hàng loạt
  const handleApplyBatchPrice = (onlyBlankPrices: boolean, customPrice?: number) => {
    const targetPrice = customPrice !== undefined ? customPrice : Number(batchPriceInput);
    if (isNaN(targetPrice) || targetPrice < 0) {
      toast.error('Vui lòng nhập mức giá hợp lệ!');
      return;
    }

    let updatedCount = 0;
    setScanItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item;
        if (onlyBlankPrices && item.price > 0) return item;
        updatedCount++;
        return {
          ...item,
          price: targetPrice,
          hasPrice: targetPrice > 0,
          costPrice: targetPrice > 0 ? Math.round(targetPrice * 0.4) : 0,
        };
      })
    );

    if (updatedCount > 0) {
      toast.success(`Đã áp dụng giá ${targetPrice.toLocaleString('vi-VN')}đ cho ${updatedCount} món!`);
    } else {
      toast('Không có món nào cần cập nhật giá theo điều kiện này.');
    }
  };

  // Lưu hàng loạt món đã chọn từ bảng Scan Menu
  const handleSaveScannedProducts = async () => {
    const toAdd = scanItems.filter((p) => p.selected && p.name.trim());

    if (toAdd.length === 0) {
      toast.error('Vui lòng tích chọn ít nhất 1 món để thêm vào menu!');
      return;
    }

    setIsLoading(true);
    try {
      // Để trống IDSP để hook useProducts.addMultipleProducts tự sinh mã tuần tự SP001, SP002... không trùng lặp
      const payloads: ProductFormData[] = toAdd.map((item) => ({
        IDSP: '',
        'Tên sản phẩm': item.name.trim(),
        'Loại sản phẩm': item.category || 'Trà sữa',
        'Đơn giá': Math.max(0, Number(item.price) || 0),
        'Giá vốn': Math.max(0, Number(item.costPrice) || 0),
        'Đơn vị tính': item.unit || 'Ly',
        'Hình ảnh': item.image,
        'Mô tả': 'Món được trích xuất tự động bằng AI từ bảng thực đơn.',
        'Trạng thái': 'Hoạt động',
      }));

      if (onAddMultipleProducts) {
        await onAddMultipleProducts(payloads);
      } else {
        for (const p of payloads) {
          await onAddProduct({ ...p, IDSP: generateProductId() });
        }
      }

      setSelectedImage(null);
      setScanItems([]);
      setScanSummary(null);
      onClose();
    } catch {
      toast.error('Lỗi khi lưu danh sách món vào thực đơn');
    } finally {
      setIsLoading(false);
    }
  };

  const visibleScanItems = scanItems
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => (viewFilter === 'new' ? item.isNew : true));

  const selectedCount = scanItems.filter((i) => i.selected).length;
  const blankPriceSelectedCount = scanItems.filter((i) => i.selected && (!i.price || i.price <= 0)).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                  Trợ Lý AI Thêm Sản Phẩm & Quét Thực Đơn Thông Minh
                </DialogTitle>
                <p className="text-xs text-purple-100 font-normal mt-0.5">
                  Tạo món bằng mô tả hoặc quét ảnh Menu kèm bảng nhập giá nhanh (hỗ trợ để trống giá)
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'prompt'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              1. Nhập Prompt mô tả món
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scan'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              2. Quét ảnh Menu & Nhập giá nhanh
            </button>
          </div>
        </DialogHeader>

        {/* Tab 1: Nhập Prompt */}
        {activeTab === 'prompt' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Mô tả món bạn muốn thêm (Tên món, loại, giá bán nếu có, hương vị):
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="vd: Thêm món Bún bò Huế (không ghi giá sẽ để trống để nhập sau) hoặc Trà dâu tây kem sữa giá 34k..."
                rows={3}
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Suggestions */}
            <div>
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Gợi ý mẫu:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptText(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGeneratePrompt}
              disabled={isLoading || !promptText.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI đang phân tích & kiểm tra trùng lặp...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                  Phân tích món bằng AI
                </>
              )}
            </Button>

            {/* Preview & Inline Edit Card */}
            {generatedProduct && (
              <div className="mt-4 p-4 rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/40 dark:to-purple-950/20 space-y-3">
                {generatedProduct.isDuplicateName && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Cảnh báo: Sản phẩm <strong>&ldquo;{generatedProduct.name}&rdquo;</strong> đã tồn tại trên hệ thống (Mã:{' '}
                      <strong>{generatedProduct.existingProductId}</strong>). Vui lòng đổi tên khác hoặc kiểm tra lại tránh trùng lặp!
                    </span>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <img
                    src={generatedProduct.image}
                    alt={generatedProduct.name}
                    className="w-20 h-20 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-sm"
                  />

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Tên sản phẩm
                      </label>
                      <input
                        type="text"
                        value={generatedProduct.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          const dup = currentProducts.find(
                            (p) => p['Tên sản phẩm']?.trim().toLowerCase() === newName.trim().toLowerCase()
                          );
                          setGeneratedProduct({
                            ...generatedProduct,
                            name: newName,
                            isDuplicateName: Boolean(dup),
                            existingProductId: dup?.IDSP || null,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          Phân loại
                        </label>
                        <select
                          value={generatedProduct.category}
                          onChange={(e) =>
                            setGeneratedProduct({ ...generatedProduct, category: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          Đơn vị tính
                        </label>
                        <input
                          type="text"
                          value={generatedProduct.unit}
                          onChange={(e) =>
                            setGeneratedProduct({ ...generatedProduct, unit: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Đơn giá bán (VNĐ){' '}
                        {(!generatedProduct.price || generatedProduct.price <= 0) && (
                          <span className="text-amber-600 font-semibold">(Đang để trống = 0đ)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={generatedProduct.price > 0 ? generatedProduct.price : ''}
                        placeholder="Để trống (0đ) hoặc nhập giá..."
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setGeneratedProduct({
                            ...generatedProduct,
                            price: val,
                            costPrice: val > 0 ? Math.round(val * 0.4) : 0,
                          });
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border ${
                          !generatedProduct.price || generatedProduct.price <= 0
                            ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/30'
                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
                        }`}
                      />
                      {(!generatedProduct.price || generatedProduct.price <= 0) && (
                        <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                          ⚠️ Đang để trống giá bán (Món sẽ được lưu với giá 0đ để cập nhật sau)
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-500 mr-0.5">Điền nhanh:</span>
                        {QUICK_PRICE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              setGeneratedProduct({
                                ...generatedProduct,
                                price: preset,
                                costPrice: Math.round(preset * 0.4),
                              })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 font-semibold"
                          >
                            {preset / 1000}k
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Giá vốn ước tính (VNĐ)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={generatedProduct.costPrice > 0 ? generatedProduct.costPrice : ''}
                        placeholder="0"
                        onChange={(e) =>
                          setGeneratedProduct({
                            ...generatedProduct,
                            costPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {generatedProduct.recipeHint && (
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-gray-900/60 border text-[11px] text-gray-600 dark:text-gray-300">
                    💡 <strong>Nguyên liệu gợi ý:</strong> {generatedProduct.recipeHint}
                  </div>
                )}

                <Button
                  onClick={handleSavePromptProduct}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Xác nhận & Lưu vào Menu quán
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scan Menu từ ảnh & Bảng nhập giá nhanh */}
        {activeTab === 'scan' && (
          <div className="p-5 space-y-4">
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
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-indigo-50/30 dark:bg-indigo-950/20 transition-colors"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Nhấp để tải lên ảnh thực đơn của quán
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hỗ trợ mọi định dạng JPG, PNG, WEBP. Ảnh sẽ được tự động tối ưu độ nét để AI đọc chính xác 100%.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border">
                <div className="relative rounded-lg overflow-hidden border h-24 w-36 bg-black/5 flex items-center justify-center shrink-0">
                  <img src={selectedImage} alt="Menu Preview" className="max-h-24 object-contain" />
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      Ảnh thực đơn đã sẵn sàng quét
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs px-2.5"
                      >
                        Đổi ảnh khác
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedImage(null);
                          setScanItems([]);
                          setScanSummary(null);
                        }}
                        className="h-7 text-xs px-2 text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={handleStartScanMenu}
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI đang đọc chữ trên Menu & lập bảng sản phẩm...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        {scanItems.length > 0 ? 'Quét lại ảnh Menu này' : 'Bắt đầu Quét & Tạo bảng nhập giá nhanh'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* BẢNG NHẬP GIÁ NHANH SẢN PHẨM QUÉT ĐƯỢC (1.b) */}
            {scanSummary && (
              <div className="space-y-3">
                {/* Thanh thống kê & bộ lọc */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewFilter('new')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        viewFilter === 'new'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Món mới chưa có ({scanItems.filter((i) => i.isNew).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        viewFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Tất cả món quét được ({scanItems.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-gray-600 dark:text-gray-300">
                      Đang chọn: <strong>{selectedCount} món</strong>
                    </span>
                    {blankPriceSelectedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-semibold">
                        {blankPriceSelectedCount} món để trống giá (0đ)
                      </span>
                    )}
                  </div>
                </div>

                {/* Thanh công cụ điền giá hàng loạt siêu tốc */}
                {scanItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      <Wand2 className="w-4 h-4 text-indigo-600" />
                      <span>Nhập giá hàng loạt:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={batchPriceInput}
                        onChange={(e) => setBatchPriceInput(e.target.value)}
                        placeholder="Nhập giá chung (vd: 30000)"
                        className="w-40 px-2.5 py-1 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-900 font-semibold"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyBatchPrice(true)}
                        className="h-7 text-[11px] px-2.5 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                      >
                        Điền cho món trống giá
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyBatchPrice(false)}
                        className="h-7 text-[11px] px-2.5 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                      >
                        Áp dụng tất cả món chọn
                      </Button>
                    </div>

                    <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                      <span className="text-[10.5px] text-gray-500 mr-1">Điền nhanh cho mục trống:</span>
                      {QUICK_PRICE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleApplyBatchPrice(true, preset)}
                          className="text-[10.5px] px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white font-bold transition-colors"
                        >
                          {preset / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bảng chỉnh sửa trực tiếp từng sản phẩm */}
                {visibleScanItems.length > 0 ? (
                  <div className="border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 text-gray-700 dark:text-gray-200">
                        <tr>
                          <th className="p-2 text-center w-8">
                            <input
                              type="checkbox"
                              checked={
                                visibleScanItems.length > 0 &&
                                visibleScanItems.every(({ item }) => item.selected)
                              }
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setScanItems((prev) =>
                                  prev.map((it) =>
                                    viewFilter === 'new' && !it.isNew ? it : { ...it, selected: checked }
                                  )
                                );
                              }}
                              className="w-3.5 h-3.5 rounded text-emerald-600"
                            />
                          </th>
                          <th className="p-2 text-left">Tên sản phẩm (Có thể sửa)</th>
                          <th className="p-2 text-left w-32">Phân loại</th>
                          <th className="p-2 text-left w-16">ĐVT</th>
                          <th className="p-2 text-left w-44">Đơn giá bán (VNĐ)</th>
                          <th className="p-2 text-left w-28">Giá vốn</th>
                          <th className="p-2 text-center w-10">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
                        {visibleScanItems.map(({ item, originalIndex }, rowIdx) => {
                          const isBlankPrice = !item.price || item.price <= 0;
                          return (
                            <tr
                              key={originalIndex}
                              className={`transition-colors ${
                                item.selected
                                  ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                                  : 'opacity-55 bg-gray-50/50 dark:bg-gray-900/40'
                              }`}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={(e) =>
                                    handleUpdateScanItem(originalIndex, 'selected', e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 rounded text-emerald-600"
                                />
                              </td>
                              <td className="p-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) =>
                                      handleUpdateScanItem(originalIndex, 'name', e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-semibold"
                                  />
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                      item.isNew
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                    }`}
                                  >
                                    {item.isNew ? 'Mới' : 'Đã có'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={item.category}
                                  onChange={(e) =>
                                    handleUpdateScanItem(originalIndex, 'category', e.target.value)
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                >
                                  {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) =>
                                    handleUpdateScanItem(originalIndex, 'unit', e.target.value)
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center"
                                />
                              </td>
                              <td className="p-1.5">
                                <div className="space-y-1">
                                  <input
                                    ref={(el) => {
                                      priceInputRefs.current[rowIdx] = el;
                                    }}
                                    type="number"
                                    min={0}
                                    step={1000}
                                    value={item.price > 0 ? item.price : ''}
                                    placeholder="Để trống (0đ)..."
                                    onChange={(e) =>
                                      handleUpdateScanItem(
                                        originalIndex,
                                        'price',
                                        e.target.value === '' ? 0 : Number(e.target.value)
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const nextInput = priceInputRefs.current[rowIdx + 1];
                                        if (nextInput) {
                                          nextInput.focus();
                                          nextInput.select();
                                        }
                                      }
                                    }}
                                    className={`w-full px-2 py-1 rounded border font-bold text-xs ${
                                      isBlankPrice
                                        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 placeholder:text-amber-600/80 placeholder:font-normal'
                                        : 'border-emerald-400 bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400'
                                    }`}
                                  />
                                  <div className="flex flex-wrap items-center gap-1">
                                    {isBlankPrice && (
                                      <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-medium">
                                        Trống giá (0đ)
                                      </span>
                                    )}
                                    {[20000, 25000, 30000, 35000, 40000].map((preset) => (
                                      <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handleUpdateScanItem(originalIndex, 'price', preset)}
                                        className="text-[9.5px] px-1 py-0.2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-gray-700 dark:text-gray-300 hover:text-emerald-700 font-semibold transition-colors"
                                        title={`Đặt giá ${preset.toLocaleString('vi-VN')}đ`}
                                      >
                                        {preset / 1000}k
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={item.costPrice > 0 ? item.costPrice : ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateScanItem(
                                      originalIndex,
                                      'costPrice',
                                      e.target.value === '' ? 0 : Number(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScanItem(originalIndex)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  title="Bỏ dòng này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-xl border">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Tất cả các món trong ảnh đều đã có trên hệ thống! Nhấn vào tab{' '}
                      <button
                        type="button"
                        onClick={() => setViewFilter('all')}
                        className="text-indigo-600 font-bold underline"
                      >
                        Tất cả món quét được ({scanItems.length})
                      </button>{' '}
                      nếu bạn vẫn muốn xem và chỉnh sửa.
                    </p>
                  </div>
                )}

                {scanItems.length > 0 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-gray-500">
                      💡 Mẹo: Nhấn phím <strong>Enter</strong> ở ô Đơn giá để nhảy nhanh xuống dòng tiếp theo. Món để trống giá sẽ lưu với giá 0đ để cập nhật sau.
                    </span>
                    <Button
                      onClick={handleSaveScannedProducts}
                      disabled={isLoading || selectedCount === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shrink-0"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Lưu {selectedCount} món đã chọn vào Menu
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
