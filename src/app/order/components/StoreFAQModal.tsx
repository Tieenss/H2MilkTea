'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, HelpCircle, Loader2, Sparkles, Wifi, X } from 'lucide-react';

interface StoreFAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  isActive: boolean;
  order: number;
}

interface StoreFAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

export function StoreFAQModal({ isOpen, onClose, initialCategory }: StoreFAQModalProps) {
  const [faqs, setFaqs] = useState<StoreFAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [copiedWifi, setCopiedWifi] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/ai/faq')
      .then((res) => res.json())
      .then((data) => {
        if (data.faqs && Array.isArray(data.faqs)) {
          // Chỉ lấy các câu hỏi đang active
          setFaqs(data.faqs.filter((f: StoreFAQItem) => f.isActive !== false));
        }
      })
      .catch((err) => console.error('Lỗi tải FAQ khách:', err))
      .finally(() => setLoading(false));

    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const categories = ['Tất cả', ...Array.from(new Set(faqs.map((f) => f.category)))];

  const displayedFaqs = faqs.filter(
    (f) => selectedCategory === 'Tất cả' || f.category === selectedCategory
  );

  function handleCopyWifi() {
    // Tìm mật khẩu wifi từ câu hỏi hoặc câu trả lời
    const wifiFaq = faqs.find((f) => f.question.toLowerCase().includes('wifi') || f.id.includes('wifi'));
    const pass = '88888888';
    navigator.clipboard.writeText(pass);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-4 px-5 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Tiện ích & Thông tin Quán</h3>
              <p className="text-[11px] text-gray-500">H2 MilkTea hân hạnh phục vụ quý khách</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="p-3 px-4 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span>Đang tải thông tin quán...</span>
            </div>
          ) : displayedFaqs.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              Chưa có thông tin cho danh mục này.
            </div>
          ) : (
            displayedFaqs.map((faq) => {
              const isWifi = faq.question.toLowerCase().includes('wifi') || faq.id.includes('wifi');
              return (
                <div
                  key={faq.id}
                  className="p-3.5 rounded-2xl bg-orange-50/40 border border-orange-100/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-orange-600 border border-orange-100">
                      {faq.category}
                    </span>
                    {isWifi && (
                      <button
                        onClick={handleCopyWifi}
                        className="text-[11px] font-medium text-orange-600 hover:text-orange-700 bg-white px-2.5 py-0.5 rounded-full border border-orange-200 shadow-xs flex items-center gap-1 active:scale-95 transition-all"
                      >
                        {copiedWifi ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Đã chép pass!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Chép pass Wifi</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 leading-snug">{faq.question}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-4 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-md shadow-orange-200 active:scale-98 transition-transform"
          >
            Đã hiểu, quay lại đặt món
          </button>
        </div>
      </div>
    </div>
  );
}
