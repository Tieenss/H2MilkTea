'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Coffee,
  Edit3,
  Flame,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import defaultRecipes from '@/data/store_recipes.json';
import type { StoreRecipeNote } from '@/lib/ai/knowledge';

const STORAGE_KEY = 'h2_store_custom_recipes';

const CATEGORIES = ['Tất cả', 'Trà sữa', 'Trà trái cây', 'Cà phê', 'Nước ép'] as const;

interface RecipeNotesManagerProps {
  isAdmin: boolean;
}

export function RecipeNotesManager({ isAdmin }: RecipeNotesManagerProps) {
  const [recipes, setRecipes] = useState<StoreRecipeNote[]>(defaultRecipes as StoreRecipeNote[]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<string>('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<StoreRecipeNote | null>(null);
  const [formProductName, setFormProductName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Trà sữa');
  const [formIngredients, setFormIngredients] = useState<string>('');
  const [formFormulaNote, setFormFormulaNote] = useState<string>('');
  const [formAllergens, setFormAllergens] = useState<string>('');
  const [formCaffeineLevel, setFormCaffeineLevel] = useState<StoreRecipeNote['caffeineLevel']>('Trung bình');
  const [formCalories, setFormCalories] = useState<string>('');
  const [formDietaryAdvice, setFormDietaryAdvice] = useState<string>('');
  const [formKeywords, setFormKeywords] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipes(parsed);
        }
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage
    }
  }, []);

  function persistRecipes(nextList: StoreRecipeNote[], message = 'Đã lưu sổ tay công thức!') {
    setRecipes(nextList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore storage error
    }
    setSavedNotice(message);
    setTimeout(() => setSavedNotice(''), 3000);
  }

  function handleResetDefault() {
    if (!isAdmin) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setRecipes(defaultRecipes as StoreRecipeNote[]);
    setSavedNotice('Đã khôi phục công thức mặc định của quán!');
    setTimeout(() => setSavedNotice(''), 3000);
  }

  function handleOpenAdd() {
    setEditingItem(null);
    setFormProductName('');
    setFormCategory('Trà sữa');
    setFormIngredients('');
    setFormFormulaNote('');
    setFormAllergens('Sữa đặc (Lactose), Kem béo');
    setFormCaffeineLevel('Trung bình');
    setFormCalories('300 - 380 kcal (Size M)');
    setFormDietaryAdvice('');
    setFormKeywords('');
    setIsDialogOpen(true);
  }

  function handleOpenEdit(item: StoreRecipeNote) {
    setEditingItem(item);
    setFormProductName(item.productName);
    setFormCategory(item.category);
    setFormIngredients(item.ingredients);
    setFormFormulaNote(item.formulaNote);
    setFormAllergens((item.allergens || []).join(', '));
    setFormCaffeineLevel(item.caffeineLevel || 'Trung bình');
    setFormCalories(item.caloriesEstimate);
    setFormDietaryAdvice(item.dietaryAdvice);
    setFormKeywords((item.keywords || []).join(', '));
    setIsDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!isAdmin) return;
    const nextList = recipes.filter((r) => r.id !== id);
    persistRecipes(nextList, 'Đã xóa công thức khỏi sổ tay.');
  }

  function handleSaveModal() {
    const productName = formProductName.trim();
    const ingredients = formIngredients.trim();
    const formulaNote = formFormulaNote.trim();
    if (!productName || !ingredients || !formulaNote) return;

    const allergens = formAllergens
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const keywords = formKeywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingItem) {
      const nextList = recipes.map((r) =>
        r.id === editingItem.id
          ? {
              ...r,
              productName,
              category: formCategory,
              ingredients,
              formulaNote,
              allergens: allergens.length > 0 ? allergens : ['Không chứa sữa (Lactose-free)'],
              caffeineLevel: formCaffeineLevel,
              caloriesEstimate: formCalories.trim() || '250 kcal',
              dietaryAdvice: formDietaryAdvice.trim(),
              keywords,
            }
          : r
      );
      persistRecipes(nextList, 'Đã cập nhật công thức & cảnh báo dị ứng!');
    } else {
      const newItem: StoreRecipeNote = {
        id: `recipe-${Date.now()}`,
        productName,
        category: formCategory,
        ingredients,
        formulaNote,
        allergens: allergens.length > 0 ? allergens : ['Không chứa sữa (Lactose-free)'],
        caffeineLevel: formCaffeineLevel,
        caloriesEstimate: formCalories.trim() || '250 kcal',
        dietaryAdvice: formDietaryAdvice.trim() || 'Phù hợp dùng lạnh hoặc giảm đường theo khẩu vị.',
        keywords,
      };
      persistRecipes([newItem, ...recipes], 'Đã thêm công thức mới vào sổ tay AI!');
    }

    setIsDialogOpen(false);
  }

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (selectedCategory !== 'Tất cả' && r.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.productName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.ingredients.toLowerCase().includes(q) ||
        r.formulaNote.toLowerCase().includes(q) ||
        r.dietaryAdvice.toLowerCase().includes(q) ||
        (r.allergens || []).some((a) => a.toLowerCase().includes(q)) ||
        (r.keywords || []).some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [recipes, selectedCategory, searchQuery]);

  function getAllergenBadgeStyle(allergen: string) {
    const lower = allergen.toLowerCase();
    if (lower.includes('không chứa') || lower.includes('lactose-free') || lower.includes('vegan') || lower.includes('thuần chay')) {
      return {
        isSafe: true,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (lower.includes('gluten') || lower.includes('đậu nành')) {
      return {
        isSafe: false,
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    }
    return {
      isSafe: false,
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  function getCaffeineBadgeClass(level: StoreRecipeNote['caffeineLevel']) {
    switch (level) {
      case 'Không':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Thấp':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Trung bình':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cao':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-emerald-600" /> Sổ tay Công thức, Thành phần & Cảnh báo Dị ứng (P2)
            </CardTitle>
            <CardDescription className="mt-1">
              Cung cấp định lượng pha chế chuẩn Barista (Size M/L), cảnh báo dị ứng (Lactose, Gluten), mức Caffeine và Calo để Trợ lý AI tư vấn chính xác.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge variant="outline" className="bg-emerald-50/70 text-emerald-700 border-emerald-200">
              {recipes.length} công thức chuẩn
            </Badge>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefault}
                  className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  title="Khôi phục bộ công thức gốc"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Mặc định
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Thêm công thức
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bộ lọc nhóm & thanh tìm kiếm */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm món, lactose, gluten, calo, bà bầu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {savedNotice && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Danh sách công thức */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
            Không tìm thấy công thức hoặc thông tin dị ứng nào phù hợp với từ khóa.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredRecipes.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{item.productName}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${getCaffeineBadgeClass(
                        item.caffeineLevel
                      )}`}
                    >
                      <Coffee className="h-3 w-3" /> Caffeine: {item.caffeineLevel}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200 font-medium flex items-center gap-1">
                      <Flame className="h-3 w-3" /> {item.caloriesEstimate}
                    </span>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 w-7 text-slate-500 hover:text-emerald-600"
                          title="Chỉnh sửa công thức"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 text-slate-500 hover:text-red-600"
                          title="Xóa công thức"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Thành phần & Định lượng Barista */}
                <div className="grid sm:grid-cols-2 gap-2.5 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block mb-0.5">Thành phần nguyên liệu:</span>
                    <p className="text-slate-600 leading-relaxed">{item.ingredients}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-800 block mb-0.5">Định lượng chuẩn Barista (Size M/L):</span>
                    <p className="text-slate-600 leading-relaxed">{item.formulaNote}</p>
                  </div>
                </div>

                {/* Cảnh báo dị ứng & lời khuyên dinh dưỡng */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-600">Dị ứng / Đặc tính:</span>
                    {(item.allergens || []).map((al, i) => {
                      const style = getAllergenBadgeStyle(al);
                      return (
                        <span
                          key={i}
                          className={`text-[11px] px-2 py-0.5 rounded-md border font-medium inline-flex items-center gap-1 ${style.className}`}
                        >
                          {style.isSafe ? (
                            <ShieldCheck className="h-3 w-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          )}
                          {al}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {item.dietaryAdvice && (
                  <p className="text-[11px] text-slate-500 italic border-l-2 border-emerald-400 pl-2">
                    💡 Tư vấn AI: {item.dietaryAdvice}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal Thêm / Chỉnh sửa Công thức */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Chỉnh sửa Công thức & Cảnh báo Dị ứng' : 'Thêm Công thức & Ghi chú Dị ứng mới'}
            </DialogTitle>
            <DialogDescription>
              Thông tin này được tiêm trực tiếp vào bộ nhớ Trợ lý AI để hỗ trợ Barista tra cứu định lượng và tư vấn khách dị ứng/ăn kiêng.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Tên món / Nhóm món <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="VD: Trà sữa Ô long kem trứng nướng"
                  value={formProductName}
                  onChange={(e) => setFormProductName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Danh mục</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-9 text-sm rounded-md border border-input bg-background px-2.5"
                >
                  <option value="Trà sữa">Trà sữa</option>
                  <option value="Trà trái cây">Trà trái cây</option>
                  <option value="Cà phê">Cà phê</option>
                  <option value="Nước ép">Nước ép</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Thành phần nguyên liệu <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="VD: Cốt trà Ô long 120ml, bột sữa 25g, kem trứng 40ml..."
                value={formIngredients}
                onChange={(e) => setFormIngredients(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Định lượng pha chế chuẩn Barista (Size M/L) <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="VD: Size M: 120ml trà + 20ml đường; Size L: 160ml trà + 30ml đường. Lắc đều 8 giây."
                value={formFormulaNote}
                onChange={(e) => setFormFormulaNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Mức Caffeine</label>
                <select
                  value={formCaffeineLevel}
                  onChange={(e) => setFormCaffeineLevel(e.target.value as StoreRecipeNote['caffeineLevel'])}
                  className="w-full h-9 text-sm rounded-md border border-input bg-background px-2.5"
                >
                  <option value="Không">Không (0% Caffeine)</option>
                  <option value="Thấp">Thấp</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Cao">Cao</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Năng lượng ước tính (Calo)</label>
                <Input
                  placeholder="VD: 320 - 400 kcal (Size M)"
                  value={formCalories}
                  onChange={(e) => setFormCalories(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Cảnh báo dị ứng (cách nhau bằng dấu phẩy)
              </label>
              <Input
                placeholder="VD: Sữa đặc (Lactose), Kem béo, Gluten (Bánh Oreo) hoặc Không chứa sữa (Lactose-free)"
                value={formAllergens}
                onChange={(e) => setFormAllergens(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Lời khuyên tư vấn dinh dưỡng</label>
              <Input
                placeholder="VD: Khách dị ứng sữa bò nên chuyển sang Trà đào cam sả..."
                value={formDietaryAdvice}
                onChange={(e) => setFormDietaryAdvice(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Từ khóa tra cứu nhanh</label>
              <Input
                placeholder="VD: trân châu đường đen, lactose, ít calo"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveModal}
              disabled={!formProductName.trim() || !formIngredients.trim() || !formFormulaNote.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editingItem ? 'Cập nhật công thức' : 'Lưu vào sổ tay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
