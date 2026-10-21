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
  RefreshCw,
  Layers,
  ArrowRight,
  HelpCircle,
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
    costPrice: number;
    unit: string;
    description: string;
    image: string;
    recipeHint?: string;
  } | null>(null);

  // Result from Scan Menu
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<{
    totalDetected: number;
    newProducts: Array<{
      name: string;
      category: string;
      price: number;
      costPrice: number;
      unit: string;
      image: string;
      selected?: boolean;
    }>;
    existingCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prompt templates gợi ý nhanh
  const PROMPT_SUGGESTIONS = [
    'Thêm món Trà xoài macchiato giá 35k size M, topping thạch dừa thanh mát',
    'Thêm Cà phê muối kem béo chuẩn vị Huế giá 28k',
    'Thêm Trà sữa nướng trân châu hoàng kim 32.000đ béo ngậy đậm vị trà',
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tạo món bằng AI');
      }

      setGeneratedProduct(data.product);
      toast.success('AI đã trích xuất thông tin món thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo món lúc này');
    } finally {
      setIsLoading(false);
    }
  };

  // Lưu món từ Prompt vào Menu
  const handleSavePromptProduct = async () => {
    if (!generatedProduct) return;

    const newId = generateProductId();
    const payload: ProductFormData = {
      IDSP: newId,
      'Tên sản phẩm': generatedProduct.name,
      'Loại sản phẩm': generatedProduct.category,
      'Đơn giá': generatedProduct.price,
      'Giá vốn': generatedProduct.costPrice,
      'Đơn vị tính': generatedProduct.unit,
      'Mô tả': generatedProduct.description,
      'Hình ảnh': generatedProduct.image,
      'Trạng thái': 'Hoạt động',
    };

    setIsLoading(true);
    try {
      await onAddProduct(payload);
      toast.success(`Đã thêm món "${generatedProduct.name}" vào menu thành công!`);
      setGeneratedProduct(null);
      setPromptText('');
      onClose();
    } catch {
      toast.error('Lỗi khi lưu sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  // Chọn ảnh để scan menu
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
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

      setScanResults({
        totalDetected: data.totalDetected,
        existingCount: data.existingCount,
        newProducts: (data.newProducts || []).map((p: any) => ({ ...p, selected: true })),
      });
      toast.success(`Đã quét thấy ${data.totalDetected} món (${data.newProducts?.length || 0} món mới chưa có trong quán)!`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể quét menu lúc này');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle chọn món trong danh sách scan
  const handleToggleSelectNewProduct = (index: number) => {
    if (!scanResults) return;
    const updated = [...scanResults.newProducts];
    updated[index].selected = !updated[index].selected;
    setScanResults({ ...scanResults, newProducts: updated });
  };

  // Lưu hàng loạt món mới từ scan menu
  const handleSaveScannedProducts = async () => {
    if (!scanResults) return;
    const toAdd = scanResults.newProducts.filter((p) => p.selected);

    if (toAdd.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 món mới để thêm!');
      return;
    }

    setIsLoading(true);
    try {
      const payloads: ProductFormData[] = toAdd.map((item, idx) => ({
        IDSP: `SP${Date.now().toString().slice(-4)}${idx}`,
        'Tên sản phẩm': item.name,
        'Loại sản phẩm': item.category,
        'Đơn giá': item.price,
        'Giá vốn': item.costPrice,
        'Đơn vị tính': item.unit,
        'Hình ảnh': item.image,
        'Mô tả': 'Món mới được trích xuất tự động bằng AI từ menu quán.',
        'Trạng thái': 'Hoạt động',
      }));

      if (onAddMultipleProducts) {
        await onAddMultipleProducts(payloads);
      } else {
        for (const p of payloads) {
          await onAddProduct(p);
        }
      }

      toast.success(`Đã thêm thành công ${payloads.length} món mới vào menu quán!`);
      setSelectedImage(null);
      setScanResults(null);
      onClose();
    } catch {
      toast.error('Lỗi khi thêm danh sách món mới');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                  Trợ Lý AI Thêm Sản Phẩm Thông Minh
                </DialogTitle>
                <p className="text-xs text-purple-100 font-normal mt-0.5">
                  Tạo món nhanh bằng Prompt hoặc Scan ảnh Menu giấy tự đối chiếu
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'prompt'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              1. Nhập Prompt mô tả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scan'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              2. Scan ảnh Menu quán
            </button>
          </div>
        </DialogHeader>

        {/* Tab 1: Nhập Prompt */}
        {activeTab === 'prompt' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Mô tả món bạn muốn thêm (Tên, giá, loại, topping, hương vị):
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="vd: Thêm món Trà dâu tây kem sữa tuyết giá 34k size M, loại Trà trái cây, topping thạch củ năng giòn ngon..."
                rows={3}
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Suggestions */}
            <div>
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                <span>Gợi ý mẫu:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptText(s)}
                    className="text-[10.5px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors text-left"
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
                  AI đang trích xuất & tìm ảnh phù hợp...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                  Trích xuất thông tin món với AI
                </>
              )}
            </Button>

            {/* Preview Generated Product Card */}
            {generatedProduct && (
              <div className="mt-4 p-4 rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/40 dark:to-purple-950/20 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={generatedProduct.image}
                      alt={generatedProduct.name}
                      className="w-16 h-16 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-sm"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                        {generatedProduct.category}
                      </span>
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-1">
                        {generatedProduct.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                        {generatedProduct.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {generatedProduct.price.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Vốn ước tính: {generatedProduct.costPrice.toLocaleString('vi-VN')}đ
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Xác nhận & Lưu vào Menu quán
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scan Menu từ ảnh */}
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
                  Chụp ảnh bảng menu hoặc tải file ảnh JPG, PNG để AI tự đối chiếu món
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border max-h-52 bg-black/5 flex items-center justify-center">
                  <img src={selectedImage} alt="Menu Preview" className="max-h-52 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setScanResults(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  onClick={handleStartScanMenu}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI đang phân tích ảnh menu & đối chiếu...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Bắt đầu Quét & Đối chiếu Menu
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Scan Results View */}
            {scanResults && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl font-medium">
                  <span>
                    Tổng phát hiện: <strong>{scanResults.totalDetected} món</strong>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Đã có: {scanResults.existingCount} món
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Mới chưa có: {scanResults.newProducts.length} món
                  </span>
                </div>

                {scanResults.newProducts.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {scanResults.newProducts.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleSelectNewProduct(idx)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          p.selected
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-gray-200 dark:border-gray-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                          />
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {p.name}
                            </h5>
                            <span className="text-[10.5px] text-gray-500">{p.category}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {p.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-center text-gray-500 py-3">
                    Tất cả các món trong ảnh menu đã có sẵn trên hệ thống quán của bạn!
                  </p>
                )}

                {scanResults.newProducts.length > 0 && (
                  <Button
                    onClick={handleSaveScannedProducts}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md"
                  >
                    Thêm các món đã chọn vào Menu quán
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
