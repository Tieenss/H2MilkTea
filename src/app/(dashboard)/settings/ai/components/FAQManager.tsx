'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Edit3, HelpCircle, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface StoreFAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  isActive: boolean;
  order: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Tiện ích': 'bg-blue-50 text-blue-700 border-blue-200',
  'Hoạt động': 'bg-purple-50 text-purple-700 border-purple-200',
  'Ưu đãi': 'bg-amber-50 text-amber-700 border-amber-200',
  'Thanh toán': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Chung': 'bg-slate-50 text-slate-700 border-slate-200',
};

interface FAQManagerProps {
  isAdmin: boolean;
}

export function FAQManager({ isAdmin }: FAQManagerProps) {
  const [faqs, setFaqs] = useState<StoreFAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreFAQItem | null>(null);
  const [formCategory, setFormCategory] = useState('Tiện ích');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    fetch('/api/ai/faq')
      .then(async (res) => {
        const data = await res.json();
        if (data.faqs) setFaqs(data.faqs);
      })
      .catch((err) => setError('Không thể tải danh sách FAQ: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleOpenAdd() {
    setEditingItem(null);
    setFormCategory('Tiện ích');
    setFormQuestion('');
    setFormAnswer('');
    setFormKeywords('');
    setFormActive(true);
    setIsDialogOpen(true);
  }

  function handleOpenEdit(item: StoreFAQItem) {
    setEditingItem(item);
    setFormCategory(item.category || 'Chung');
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormKeywords((item.keywords || []).join(', '));
    setFormActive(item.isActive);
    setIsDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!isAdmin) return;
    setFaqs((prev) => prev.filter((item) => item.id !== id));
  }

  function handleToggleActive(id: string, nextActive: boolean) {
    if (!isAdmin) return;
    setFaqs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: nextActive } : item))
    );
  }

  function handleSaveDialogItem() {
    const q = formQuestion.trim();
    const a = formAnswer.trim();
    if (!q || !a) return;

    const keywords = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (editingItem) {
      // Cập nhật câu hỏi hiện có
      setFaqs((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                category: formCategory,
                question: q,
                answer: a,
                keywords,
                isActive: formActive,
              }
            : item
        )
      );
    } else {
      // Thêm mới
      const newItem: StoreFAQItem = {
        id: `faq-${Date.now()}`,
        category: formCategory,
        question: q,
        answer: a,
        keywords,
        isActive: formActive,
        order: faqs.length + 1,
      };
      setFaqs((prev) => [...prev, newItem]);
    }

    setIsDialogOpen(false);
  }

  async function handleSaveAllToServer() {
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/ai/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi lưu danh sách FAQ.');
      }
      setFaqs(data.faqs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối khi lưu.');
    } finally {
      setSaving(false);
    }
  }

  const filteredFaqs = faqs.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.keywords || []).some((k) => k.toLowerCase().includes(q))
    );
  });

  const activeCount = faqs.filter((f) => f.isActive).length;

  return (
    <Card className="border-indigo-100 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5 text-indigo-600" /> Quản lý Câu hỏi thường gặp & Tiện ích Quán (FAQ)
            </CardTitle>
            <CardDescription className="mt-1">
              Chatbot AI sẽ dùng các câu hỏi này để trả lời thu ngân trên POS và giải đáp cho Khách hàng quét mã QR tại bàn.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="bg-indigo-50/60 text-indigo-700 border-indigo-200">
              {activeCount} / {faqs.length} đang bật
            </Badge>
            {isAdmin && (
              <Button
                onClick={handleOpenAdd}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Thêm FAQ mới
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tìm kiếm */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo câu hỏi, câu trả lời, chủ đề hoặc từ khóa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">{error}</p>}

        {/* Danh sách các câu hỏi */}
        {loading ? (
          <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-indigo-600" /> Đang tải danh sách câu hỏi...
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
            Không tìm thấy câu hỏi FAQ nào phù hợp.
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredFaqs.map((faq) => {
              const categoryColor = CATEGORY_COLORS[faq.category] || CATEGORY_COLORS['Chung'];
              return (
                <div
                  key={faq.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    faq.isActive ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-slate-50/80 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${categoryColor}`}>
                          {faq.category}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-800">{faq.question}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed pl-1">{faq.answer}</p>
                      {faq.keywords && faq.keywords.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 pl-1">
                          <span className="text-[11px] text-muted-foreground">Từ khóa:</span>
                          {faq.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hành động */}
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Switch
                        checked={faq.isActive}
                        onCheckedChange={(val) => handleToggleActive(faq.id, val)}
                        disabled={!isAdmin}
                        title={faq.isActive ? 'Bật hiển thị' : 'Đang tắt'}
                      />
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(faq)}
                            className="h-8 w-8 text-slate-600 hover:text-indigo-600"
                            title="Chỉnh sửa câu hỏi"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(faq.id)}
                            className="h-8 w-8 text-slate-600 hover:text-red-600"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nút lưu danh sách FAQ */}
        {isAdmin && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {saveSuccess && (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Đã lưu danh sách FAQ thành công!
                </span>
              )}
            </div>
            <Button
              onClick={handleSaveAllToServer}
              disabled={loading || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Lưu thay đổi FAQ
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal Thêm / Sửa FAQ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Chỉnh sửa Câu hỏi FAQ' : 'Thêm Câu hỏi FAQ mới'}</DialogTitle>
            <DialogDescription>
              Điền câu hỏi và câu trả lời chi tiết để Chatbot AI và khách hàng quét QR có thể tra cứu thông tin nhanh.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Chủ đề / Nhóm</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Tiện ích">Tiện ích (Wifi, Gửi xe, Nhà vệ sinh...)</option>
                <option value="Hoạt động">Hoạt động (Giờ mở cửa, Ngày lễ...)</option>
                <option value="Ưu đãi">Ưu đãi (Tích điểm, Giảm giá VIP...)</option>
                <option value="Thanh toán">Thanh toán (QR, Chuyển khoản, Thẻ...)</option>
                <option value="Chung">Chung / Quy định khác</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Câu hỏi <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="VD: Mật khẩu Wifi của quán là gì?"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Câu trả lời chi tiết <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="VD: Wifi: H2_MilkTea_Free, Pass: 88888888..."
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Từ khóa gợi nhớ (cách nhau bởi dấu phẩy)
              </label>
              <Input
                placeholder="wifi, pass wifi, mật khẩu, mạng"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Giúp AI nhận diện ngay câu hỏi khi khách hoặc thu ngân gõ tắt.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-700">Kích hoạt câu hỏi này</span>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveDialogItem}
              disabled={!formQuestion.trim() || !formAnswer.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {editingItem ? 'Cập nhật' : 'Thêm vào danh sách'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
