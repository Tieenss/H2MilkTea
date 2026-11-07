'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  BookOpen,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Tag,
  Compass,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import defaultChunks from '@/data/project_knowledge_chunks.json';
import {
  retrieveProjectKnowledge,
  type ProjectKnowledgeChunk,
  type RetrievedChunk,
} from '@/lib/ai/ragEngine';
import toast from 'react-hot-toast';

interface RAGKnowledgeManagerProps {
  isAdmin: boolean;
}

const CATEGORIES = [
  'Tất cả',
  'POS Bán hàng',
  'Quản lý bàn',
  'Bếp KDS & Pha chế',
  'Kho & Định lượng',
  'Khách hàng & QR',
  'Bảo mật & Hóa đơn',
  'Cài đặt hệ thống',
];

const SAMPLE_TEST_QUERIES = [
  'cach tao ban nhanh theo khu vuc',
  'bat man hinh bep o dau',
  'dinh muc nguyen lieu tru kho',
  'chinh sach giam gia khach vip',
  'mat mang co tinh tien duoc khong',
];

export function RAGKnowledgeManager({ isAdmin }: RAGKnowledgeManagerProps) {
  const [chunks, setChunks] = useState<ProjectKnowledgeChunk[]>(
    defaultChunks as ProjectKnowledgeChunk[]
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // RAG Simulator state
  const [testQuery, setTestQuery] = useState('');
  const [testScope, setTestScope] = useState<'all' | 'staff' | 'customer'>('all');
  const [simulatedResults, setSimulatedResults] = useState<RetrievedChunk[]>([]);

  // Add / Edit form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState('POS Bán hàng');
  const [draftRoute, setDraftRoute] = useState('/pos');
  const [draftRoleScope, setDraftRoleScope] = useState<'all' | 'staff' | 'customer'>('all');
  const [draftKeywords, setDraftKeywords] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftSteps, setDraftSteps] = useState('');

  useEffect(() => {
    fetch('/api/ai/rag')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.chunks) && data.chunks.length > 0) {
          setChunks(data.chunks);
        } else {
          try {
            const localSaved = localStorage.getItem('h2_custom_rag_chunks');
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChunks(parsed);
              }
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Run instant client-side RAG simulation whenever testQuery changes
  useEffect(() => {
    if (!testQuery.trim()) {
      setSimulatedResults([]);
      return;
    }
    const results = retrieveProjectKnowledge(testQuery, {
      topK: 4,
      roleScope: testScope,
      customChunks: chunks,
    });
    setSimulatedResults(results);
  }, [testQuery, testScope, chunks]);

  const filteredChunks = useMemo(() => {
    if (selectedCategory === 'Tất cả') return chunks;
    return chunks.filter((c) => c.category === selectedCategory);
  }, [chunks, selectedCategory]);

  const persistChunks = async (nextChunks: ProjectKnowledgeChunk[]) => {
    setChunks(nextChunks);
    try {
      localStorage.setItem('h2_custom_rag_chunks', JSON.stringify(nextChunks));
    } catch {}

    setSaving(true);
    try {
      const res = await fetch('/api/ai/rag', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunks: nextChunks }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Đã cập nhật Kho Tri Thức RAG thành công!');
      } else {
        toast.success('Đã lưu Kho Tri Thức RAG trên trình duyệt cục bộ!');
      }
    } catch {
      toast.success('Đã lưu Kho Tri Thức RAG vào bộ nhớ cục bộ!');
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = () => {
    setIsAdding(false);
    setEditingId(null);
    setDraftTitle('');
    setDraftCategory('POS Bán hàng');
    setDraftRoute('/pos');
    setDraftRoleScope('all');
    setDraftKeywords('');
    setDraftContent('');
    setDraftSteps('');
  };

  const handleStartEdit = (chunk: ProjectKnowledgeChunk) => {
    setIsAdding(false);
    setEditingId(chunk.id);
    setDraftTitle(chunk.title);
    setDraftCategory(chunk.category);
    setDraftRoute(chunk.route || '/pos');
    setDraftRoleScope(chunk.roleScope || 'all');
    setDraftKeywords((chunk.keywords || []).join(', '));
    setDraftContent(chunk.content);
    setDraftSteps((chunk.steps || []).join('\n'));
  };

  const handleSaveDraft = () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error('Vui lòng nhập đầy đủ Tiêu đề và Nội dung tài liệu RAG!');
      return;
    }

    const keywords = draftKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const steps = draftSteps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId) {
      const updated = chunks.map((c) =>
        c.id === editingId
          ? {
              ...c,
              title: draftTitle.trim(),
              category: draftCategory,
              route: draftRoute.trim() || '/user-guide',
              roleScope: draftRoleScope,
              keywords,
              content: draftContent.trim(),
              steps,
            }
          : c
      );
      void persistChunks(updated);
    } else {
      const newChunk: ProjectKnowledgeChunk = {
        id: `rag-custom-${Date.now()}`,
        title: draftTitle.trim(),
        category: draftCategory,
        route: draftRoute.trim() || '/user-guide',
        sectionId: 'introduction',
        sectionTitle: draftCategory,
        roleScope: draftRoleScope,
        keywords,
        content: draftContent.trim(),
        steps,
        isActive: true,
      };
      void persistChunks([newChunk, ...chunks]);
    }
    resetDraft();
  };

  const handleToggleActive = (id: string, active: boolean) => {
    const updated = chunks.map((c) => (c.id === id ? { ...c, isActive: active } : c));
    void persistChunks(updated);
  };

  const handleDeleteChunk = (id: string) => {
    const updated = chunks.filter((c) => c.id !== id);
    void persistChunks(updated);
  };

  const getSourceBadgeColor = (sourceType: RetrievedChunk['sourceType']) => {
    switch (sourceType) {
      case 'project_doc':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'faq':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'recipe':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'bom_config':
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getSourceLabel = (sourceType: RetrievedChunk['sourceType']) => {
    switch (sourceType) {
      case 'project_doc':
        return '📘 Tài liệu Dự án';
      case 'faq':
        return '💬 FAQ Quán';
      case 'recipe':
        return '🧋 Sổ tay Barista';
      case 'bom_config':
        return '📦 Định mức Kho (BOM)';
    }
  };

  return (
    <Card className="border-indigo-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="bg-gradient-to-r from-indigo-50/70 to-purple-50/50 dark:from-slate-900 dark:to-slate-900 border-b border-indigo-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-indigo-950 dark:text-slate-100">
              <Database className="h-5 w-5 text-indigo-600" />
              Kho Tri Thức RAG Nội Bộ Dự Án (Anti-Hallucination Engine)
            </CardTitle>
            <CardDescription className="mt-1">
              Quản lý các đoạn tài liệu chuẩn (Knowledge Chunks) giúp Trợ lý AI tra cứu nhanh toàn bộ tính năng dự án mà không bịa đặt thông tin bên ngoài.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white dark:bg-slate-800 text-indigo-700 border-indigo-200 font-semibold">
              {chunks.filter((c) => c.isActive !== false).length} / {chunks.length} tài liệu đang bật
            </Badge>
            {isAdmin && !isAdding && !editingId && (
              <Button
                size="sm"
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Thêm tài liệu RAG
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* 1. TRÌNH MÔ PHỎNG & TEST TRUY XUẤT RAG TRỰC TIẾP */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Trình mô phỏng Truy xuất RAG (Test Hybrid Retrieval có dấu & không dấu)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Ngữ cảnh test:</span>
              {(['all', 'staff', 'customer'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setTestScope(sc)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    testScope === sc
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sc === 'all' ? 'Tất cả' : sc === 'staff' ? 'Nhân viên POS' : 'Khách hàng QR'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Gõ thử câu hỏi bất kỳ (VD: cach tao ban nhanh, bat man hinh bep o dau, dinh muc nguyen lieu...)"
              className="pl-9 bg-white dark:bg-slate-950 text-sm"
            />
            {testQuery && (
              <button
                type="button"
                onClick={() => setTestQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Gợi ý câu hỏi test nhanh */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Thử nhanh:</span>
            {SAMPLE_TEST_QUERIES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setTestQuery(sample)}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>

          {/* Kết quả truy xuất Top-K */}
          {testQuery.trim() && (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>
                  Kết quả Top-{simulatedResults.length} Chunks sẽ được nạp vào Prompt cho AI:
                </span>
                <span className="text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Chế độ Strict Grounding (Không bịa đặt)
                </span>
              </div>

              {simulatedResults.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Không tìm thấy đoạn tài liệu nào khớp với truy vấn này. AI sẽ trả lời rằng thông tin chưa được cấu hình trong hệ thống thay vì tự bịa đặt.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {simulatedResults.map((res, idx) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 shadow-2xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600">#{idx + 1}</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${getSourceBadgeColor(
                              res.sourceType
                            )}`}
                          >
                            {getSourceLabel(res.sourceType)}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {res.title}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Điểm khớp: {res.score}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line line-clamp-3">
                        {res.content}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                        <div>
                          Từ khóa khớp:{' '}
                          <span className="font-mono text-indigo-600">
                            {res.matchedTerms.slice(0, 6).join(', ')}
                          </span>
                        </div>
                        {res.route && (
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Route: {res.route}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. FORM THÊM / CHỈNH SỬA TÀI LIỆU RAG */}
        {(isAdding || editingId) && (
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-indigo-950 dark:text-slate-100 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                {editingId ? 'Chỉnh sửa Tài liệu Tri thức RAG' : 'Thêm Tài liệu Tri thức RAG mới vào Dự án'}
              </h4>
              <Button variant="ghost" size="sm" onClick={resetDraft}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tiêu đề tài liệu / Quy trình *</label>
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="VD: Quy trình kiểm kê kho cuối ca tối"
                  className="bg-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phân mục</label>
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'Tất cả').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Đường dẫn màn hình (Route)</label>
                <Input
                  value={draftRoute}
                  onChange={(e) => setDraftRoute(e.target.value)}
                  placeholder="/pos, /tables, /kitchen..."
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Đối tượng được phép tra cứu</label>
                <select
                  value={draftRoleScope}
                  onChange={(e) => setDraftRoleScope(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                >
                  <option value="all">Cả Nhân viên & Khách hàng</option>
                  <option value="staff">Chỉ Nội bộ (Nhân viên / Quản lý)</option>
                  <option value="customer">Chỉ Khách hàng QR</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Từ khóa (cách nhau dấu phẩy)</label>
                <Input
                  value={draftKeywords}
                  onChange={(e) => setDraftKeywords(e.target.value)}
                  placeholder="kiểm kê, lệch kho, cuối ca..."
                  className="bg-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nội dung kiến thức chuẩn (AI sẽ dựa vào đây để trả lời) *</label>
              <textarea
                rows={3}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Mô tả chi tiết tính năng, quy định hoặc câu trả lời chính xác..."
                className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Các bước hướng dẫn chi tiết (Mỗi bước 1 dòng - Tùy chọn)</label>
              <textarea
                rows={3}
                value={draftSteps}
                onChange={(e) => setDraftSteps(e.target.value)}
                placeholder={'Bước 1: Mở trang Kiểm kê kho (/inventory/stocktake)\nBước 2: Nhập số lượng thực tế...'}
                className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetDraft}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDraft}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editingId ? 'Lưu cập nhật' : 'Thêm vào Kho RAG'}
              </Button>
            </div>
          </div>
        )}

        {/* 3. BỘ LỌC DANH MỤC CHUNKS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const count =
              cat === 'Tất cả'
                ? chunks.length
                : chunks.filter((c) => c.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-black/5 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. DANH SÁCH CÁC KNOWLEDGE CHUNKS TRONG DỰ ÁN */}
        {loading ? (
          <div className="py-8 flex items-center justify-center text-sm text-slate-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải Kho Tri Thức RAG...
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  chunk.isActive !== false
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200">
                        {chunk.category}
                      </Badge>
                      {chunk.route && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Compass className="h-3 w-3 text-indigo-500" />
                          {chunk.route}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        {chunk.roleScope === 'staff'
                          ? '🔒 Nội bộ Staff/Admin'
                          : chunk.roleScope === 'customer'
                          ? '📱 Khách QR'
                          : '🌐 Toàn hệ thống'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 pt-0.5">
                      {chunk.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {chunk.content}
                    </p>

                    {chunk.steps && chunk.steps.length > 0 && (
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg space-y-1 mt-1.5">
                        {chunk.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {chunk.keywords && chunk.keywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1.5">
                        <Tag className="h-3 w-3 text-slate-400 mr-0.5" />
                        {chunk.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <Switch
                        checked={chunk.isActive !== false}
                        onCheckedChange={(checked) => handleToggleActive(chunk.id, checked)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(chunk)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChunk(chunk.id)}
                        className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
