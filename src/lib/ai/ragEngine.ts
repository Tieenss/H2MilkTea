/**
 * In-App Hybrid RAG Engine cho H2 MilkTea POS
 * Hỗ trợ tìm kiếm đa nguồn (Tài liệu dự án, FAQ quán, Sổ tay công thức Barista, Định mức nguyên liệu BOM)
 * với khả năng khớp cả Tiếng Việt có dấu & không dấu, xếp hạng Top-K và chống bịa đặt (Strict Grounding).
 */

import defaultChunks from '@/data/project_knowledge_chunks.json';
import defaultStoreFaqs from '@/data/store_faq.json';
import defaultRecipes from '@/data/store_recipes.json';
import cauhinhData from '@/data/CAUHINH.json';
import dmhhData from '@/data/DMHH.json';
import nguyenlieuData from '@/data/NGUYENLIEU.json';
import {
  POS_KNOWLEDGE_BASE,
  formatCitation,
  type StoreFAQItem,
  type StoreRecipeNote,
} from './knowledge';

export interface ProjectKnowledgeChunk {
  id: string;
  category: string;
  title: string;
  route?: string;
  sectionId: string;
  sectionTitle: string;
  roleScope?: 'all' | 'staff' | 'customer';
  keywords: string[];
  content: string;
  steps?: string[];
  isActive?: boolean;
}

export interface RetrievedChunk {
  id: string;
  sourceType: 'project_doc' | 'faq' | 'recipe' | 'bom_config' | 'menu_public';
  title: string;
  category: string;
  content: string;
  score: number;
  citation?: string;
  route?: string;
  matchedTerms: string[];
}

export interface RagRetrievalOptions {
  topK?: number;
  minScore?: number;
  roleScope?: 'all' | 'staff' | 'customer';
  customChunks?: ProjectKnowledgeChunk[] | null;
  customFaqs?: StoreFAQItem[] | null;
  customRecipes?: StoreRecipeNote[] | null;
}

const STOP_WORDS = new Set([
  'la', 'gi', 'o', 'dau', 'nhu', 'the', 'nao', 'cach', 'lam', 'sao',
  'cho', 'toi', 'minh', 'em', 'anh', 'chi', 'hoi', 've', 'cua', 'quan',
  'co', 'khong', 'duoc', 'thi', 'va', 'hoac', 'nhung', 'cac', 'mot', 'nhung',
]);

/**
 * Chuẩn hóa văn bản tiếng Việt về dạng không dấu chữ thường để tìm kiếm bất chấp dấu câu
 */
export function normalizeRagText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách từ khóa có nghĩa từ câu truy vấn
 */
export function tokenizeRagQuery(query: string): string[] {
  const norm = normalizeRagText(query);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

const CUSTOMER_PUBLIC_LEGACY_IDS = new Set([
  'customer-points',
  'qr-ordering',
  'allergy-and-recipes',
]);

const INTERNAL_BLOCKED_ROUTES = [
  '/user-guide#pos',
  '/user-guide#shortcuts',
  '/user-guide#settings',
  '/user-guide#orders',
  '/user-guide#reports',
  '/user-guide#troubleshooting',
  '/user-guide#login',
  '/user-guide#introduction',
  '/user-guide#menu',
  '/tables',
  '/pos',
  '/kitchen',
  '/inventory',
  '/menu/cauhinhnguyenlieu',
  '/menu/products',
  '/orders',
  '/reports',
  '/receipt-settings',
  '/settings',
  '/nhanvien',
  '/settingdata',
];

const INTERNAL_BLOCKED_IDS = new Set([
  'rag-pos-overview',
  'rag-tables-bulk-and-area',
  'rag-pos-table-transfer-and-presence',
  'rag-kitchen-kds-and-feature-toggle',
  'rag-printer-and-labels',
  'rag-inventory-and-bom-config',
  'rag-invoice-security-and-offline',
  'rag-ai-settings-and-rag-manager',
  'introduction',
  'login',
  'add-product',
  'edit-price',
  'shortcuts',
  'printer-setup',
  'table-management',
  'order-management',
  'reports',
  'troubleshooting',
  'bulk-tables-and-areas',
  'kitchen-kds-mobile',
]);

const INTERNAL_SENSITIVE_PATTERN =
  /(gia von|cauhinh|dinh muc tru kho|dinh muc nguyen lieu|bom\b|phim tat|f1\b|f3\b|f4\b|f5\b|esc\b|may in nhiet|k80|k57|huy hoa don|doanh thu noi bo|bao cao doanh thu|mat khau nhan vien|man hinh bep|kds\b|tao ban nhanh|chuyen ban|kiem ke kho|nhap xuat kho|sop noi bo|kill switch|audit log|sepay webhook|ngan hang thu huong)/i;

/**
 * Kiểm tra xem một knowledge chunk có được phép hiển thị ở phạm vi Khách hàng QR (`customer`) hay không.
 * Loại bỏ 100% hướng dẫn vận hành nội bộ POS, shortcuts, quản lý bàn, SOP nhân viên, doanh thu nội bộ và BOM/CAUHINH.
 */
export function isCustomerAllowedChunk(chunk: ProjectKnowledgeChunk): boolean {
  if (!chunk || chunk.isActive === false) return false;
  if (chunk.roleScope === 'staff') return false;
  if (INTERNAL_BLOCKED_IDS.has(chunk.id)) return false;

  const route = String(chunk.route || '').trim().toLowerCase();
  if (
    route &&
    INTERNAL_BLOCKED_ROUTES.some((blocked) => route === blocked || route.startsWith(`${blocked}/`) || route.startsWith(`${blocked}?`))
  ) {
    return false;
  }

  const combinedNorm = normalizeRagText(
    [chunk.title, chunk.category, chunk.content, ...(chunk.steps || [])].join(' ')
  );
  if (INTERNAL_SENSITIVE_PATTERN.test(combinedNorm)) {
    return false;
  }

  return true;
}

/**
 * Hợp nhất danh sách Chunks mặc định của dự án và POS_KNOWLEDGE_BASE
 */
export function getMergedProjectChunks(
  customChunks?: ProjectKnowledgeChunk[] | null
): ProjectKnowledgeChunk[] {
  const byId = new Map<string, ProjectKnowledgeChunk>();
  for (const defChunk of defaultChunks as ProjectKnowledgeChunk[]) {
    if (defChunk && defChunk.id) {
      byId.set(defChunk.id, defChunk);
    }
  }
  if (Array.isArray(customChunks)) {
    for (const c of customChunks) {
      if (c && c.id) {
        byId.set(c.id, {
          ...byId.get(c.id),
          ...c,
          sectionId: c.sectionId || 'introduction',
          sectionTitle: c.sectionTitle || c.category || 'Tài liệu dự án',
        });
      }
    }
  }
  const baseChunks = Array.from(byId.values());

  const existingIds = new Set(baseChunks.map((c) => c.id));
  const merged = [...baseChunks];

  for (const topic of POS_KNOWLEDGE_BASE) {
    const legacyId = `legacy-${topic.id}`;
    if (!existingIds.has(legacyId) && !existingIds.has(topic.id)) {
      const stepsText = topic.steps ? topic.steps.join(' ') : '';
      const shortcutsText = topic.shortcuts
        ? Object.entries(topic.shortcuts)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')
        : '';
      const isCustomerPublic = CUSTOMER_PUBLIC_LEGACY_IDS.has(topic.id);
      merged.push({
        id: topic.id,
        category: topic.sectionTitle,
        title: topic.title,
        route: `/user-guide#${topic.sectionId}`,
        sectionId: topic.sectionId,
        sectionTitle: topic.sectionTitle,
        roleScope: isCustomerPublic ? 'all' : 'staff',
        keywords: topic.keywords,
        content: [topic.summary, shortcutsText].filter(Boolean).join(' '),
        steps: topic.steps || (stepsText ? [stepsText] : undefined),
        isActive: true,
      });
    }
  }

  return merged.filter((c) => c.isActive !== false);
}

/**
 * Tạo các Chunks công khai cho khách hàng từ danh mục Menu & Topping (chỉ gồm Tên, Loại, Giá bán, Mô tả - KHÔNG lộ Giá vốn/BOM).
 */
function buildPublicCustomerMenuChunks(): Array<RetrievedChunk & { keywords: string[] }> {
  const activeItems = (dmhhData as Array<Record<string, any>>).filter((p) => {
    const status = String(p['Trạng thái'] || '').toLowerCase();
    return p['Tên sản phẩm'] && !status.includes('ngừng');
  });

  const byCategory = new Map<string, Array<{ name: string; price: number; unit: string; desc: string }>>();
  for (const p of activeItems) {
    const category = String(p['Loại sản phẩm'] || 'Đồ uống').trim();
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push({
      name: String(p['Tên sản phẩm']).trim(),
      price: Number(p['Đơn giá']) || 0,
      unit: String(p['Đơn vị tính'] || 'Ly').trim(),
      desc: String(p['Mô tả'] || '').trim(),
    });
  }

  const results: Array<RetrievedChunk & { keywords: string[] }> = [];
  for (const [category, items] of byCategory.entries()) {
    const lines = items.map(
      (it) =>
        `• ${it.name}: ${it.price.toLocaleString('vi-VN')}đ/${it.unit}${it.desc ? ` (${it.desc})` : ''}`
    );
    results.push({
      id: `menu-public-${normalizeRagText(category).replace(/\s+/g, '-')}`,
      sourceType: 'menu_public',
      title: `Menu & Giá bán nhóm ${category}`,
      category: `Menu đồ uống - ${category}`,
      content: `Danh sách món thuộc nhóm ${category} đang phục vụ:\n${lines.join('\n')}`,
      score: 0,
      route: '/order/menu',
      matchedTerms: [],
      keywords: [
        'menu',
        'thực đơn',
        'giá bán',
        'bao nhiêu tiền',
        category.toLowerCase(),
        ...items.map((it) => it.name.toLowerCase()),
      ],
    });
  }

  results.push({
    id: 'menu-public-toppings',
    sourceType: 'menu_public',
    title: 'Danh sách Topping & Tùy chỉnh Size / Đường / Đá',
    category: 'Topping & Tùy chỉnh món',
    content:
      'Quán hỗ trợ tùy chỉnh miễn phí mức đường (0%, 30%, 50%, 70%, 100%) và mức đá (0%, 30%, 50%, 70%, 100%, Nóng). ' +
      'Size L cộng thêm phụ thu theo từng món. Các loại topping phổ biến gồm: Trân châu đen, Trân châu trắng, Kem cheese, Pudding trứng, Thạch củ năng.',
    score: 0,
    route: '/order/menu',
    matchedTerms: [],
    keywords: ['topping', 'trân châu', 'kem cheese', 'pudding', 'thạch củ năng', 'size m', 'size l', 'đường', 'đá'],
  });

  return results;
}

/**
 * Tạo các Chunks định mức nguyên liệu thực tế từ bảng CAUHINH + DMHH + NGUYENLIEU
 */
function buildBomKnowledgeChunks(): RetrievedChunk[] {
  const productMap = new Map<string, string>();
  for (const p of dmhhData as Array<Record<string, any>>) {
    if (p.IDSP && p['Tên sản phẩm']) {
      productMap.set(String(p.IDSP), String(p['Tên sản phẩm']));
    }
  }

  const ingredientMap = new Map<string, { name: string; unit: string }>();
  for (const nvl of nguyenlieuData as Array<Record<string, any>>) {
    if (nvl.IDNguyenLieu) {
      ingredientMap.set(String(nvl.IDNguyenLieu), {
        name: String(nvl['Tên nguyên liệu'] || nvl.IDNguyenLieu),
        unit: String(nvl['Đơn vị tính'] || 'Kg'),
      });
    }
  }

  const byProduct = new Map<string, { productName: string; lines: string[] }>();
  for (const cfg of cauhinhData as Array<Record<string, any>>) {
    if (cfg['Trạng thái'] && cfg['Trạng thái'] !== 'Hoạt động') continue;
    const spId = String(cfg.IDSP || '');
    const nvlId = String(cfg.IDNguyenLieu || '');
    if (!spId || !nvlId) continue;

    const prodName = cfg['Tên sản phẩm'] || productMap.get(spId) || spId;
    const ingInfo = ingredientMap.get(nvlId);
    const ingName = cfg['Tên nguyên liệu'] || ingInfo?.name || nvlId;
    const qty = cfg['Số lượng cần'] || '0.01';
    const unit = cfg['Đơn vị sử dụng'] || ingInfo?.unit || 'đơn vị';

    if (!byProduct.has(spId)) {
      byProduct.set(spId, { productName: prodName, lines: [] });
    }
    byProduct.get(spId)!.lines.push(`${ingName}: ${qty} ${unit}`);
  }

  const results: RetrievedChunk[] = [];
  for (const [spId, info] of byProduct.entries()) {
    results.push({
      id: `bom-${spId}`,
      sourceType: 'bom_config',
      title: `Định mức tiêu hao nguyên liệu kho (BOM): ${info.productName} (${spId})`,
      category: 'Kho & Định lượng',
      content: `Món ${info.productName} (Mã ${spId}) có cấu hình trừ kho tự động gồm: ${info.lines.join(', ')}. Quản lý có thể điều chỉnh tại trang /menu/cauhinhnguyenlieu.`,
      score: 0,
      citation: formatCitation('Quản lý Kho & Định mức', 'menu'),
      route: '/menu/cauhinhnguyenlieu',
      matchedTerms: [],
    });
  }
  return results;
}

/**
 * Tính điểm tương đồng Hybrid (Phrase Match + Keyword Match + Token Overlap) hỗ trợ không dấu
 */
function scoreCandidate(
  queryRaw: string,
  queryNorm: string,
  queryTokens: string[],
  title: string,
  category: string,
  keywords: string[],
  bodyText: string
): { score: number; matchedTerms: string[] } {
  const matchedTerms: string[] = [];
  let score = 0;

  const normTitle = normalizeRagText(title);
  const normCategory = normalizeRagText(category);
  const normBody = normalizeRagText(bodyText);

  // 1. Khớp cụm từ trực tiếp trên tiêu đề
  if (normTitle && queryNorm.length >= 4 && normTitle.includes(queryNorm)) {
    score += 12;
    matchedTerms.push(title);
  }

  // 2. Khớp danh sách keywords (cả có dấu và không dấu)
  for (const kw of keywords) {
    if (!kw) continue;
    const normKw = normalizeRagText(kw);
    if (!normKw) continue;
    if (queryNorm.includes(normKw)) {
      score += normKw.includes(' ') ? 7 : 4;
      matchedTerms.push(kw);
    }
  }

  // 3. Khớp từng token trong Title, Category và Body (BM25-style field weighting)
  for (const token of queryTokens) {
    let tokenMatched = false;
    if (normTitle.includes(token)) {
      score += 3.0;
      tokenMatched = true;
    }
    if (normCategory.includes(token)) {
      score += 1.5;
      tokenMatched = true;
    }
    if (normBody.includes(token)) {
      score += 1.0;
      tokenMatched = true;
    }
    if (tokenMatched && !matchedTerms.includes(token)) {
      matchedTerms.push(token);
    }
  }

  return { score: Number(score.toFixed(2)), matchedTerms };
}

/**
 * Truy xuất Top-K Chunks tri thức từ toàn bộ dự án (RAG Retrieval)
 */
export function retrieveProjectKnowledge(
  query: string,
  options?: RagRetrievalOptions
): RetrievedChunk[] {
  const topK = options?.topK ?? 5;
  const roleScope = options?.roleScope ?? 'all';
  const queryNorm = normalizeRagText(query);
  const queryTokens = tokenizeRagQuery(query);

  if (!queryNorm) return [];

  const isCustomerInternalProbe =
    roleScope === 'customer' &&
    /(gia von|nhap nguyen lieu|cauhinh|dinh muc|tru kho|bom\b|noi bo|doanh thu|mat khau nhan vien|phim tat|sop\b|huy hoa don|may in|tao ban|chuyen ban|kiem ke|man hinh bep|kds\b)/i.test(
      queryNorm
    );

  // Nếu khách hàng QR cố tình dò hỏi dữ liệu nội bộ (giá vốn, BOM, doanh thu, SOP nhân viên...), trả về rỗng hoàn toàn
  if (isCustomerInternalProbe) {
    return [];
  }

  const candidates: RetrievedChunk[] = [];

  // Nguồn 1: Project Knowledge Chunks (Tài liệu hệ thống & Hướng dẫn nghiệp vụ)
  const projectChunks = getMergedProjectChunks(options?.customChunks);
  for (const chunk of projectChunks) {
    if (roleScope === 'customer' && !isCustomerAllowedChunk(chunk)) {
      continue;
    }
    const fullText = [
      chunk.content,
      ...(chunk.steps || []),
      chunk.route || '',
    ].join(' ');

    const { score, matchedTerms } = scoreCandidate(
      query,
      queryNorm,
      queryTokens,
      chunk.title,
      chunk.category,
      chunk.keywords || [],
      fullText
    );

    if (score > 0) {
      candidates.push({
        id: chunk.id,
        sourceType: 'project_doc',
        title: chunk.title,
        category: chunk.category,
        content:
          chunk.content +
          (chunk.steps && chunk.steps.length > 0
            ? `\nCác bước thực hiện:\n- ${chunk.steps.join('\n- ')}`
            : ''),
        score,
        citation:
          roleScope === 'customer'
            ? undefined
            : formatCitation(chunk.sectionTitle || chunk.category, chunk.sectionId || 'introduction'),
        route: roleScope === 'customer' ? undefined : chunk.route,
        matchedTerms,
      });
    }
  }

  // Nguồn 1b: Menu công khai, Giá bán & Topping dành cho Khách hàng QR
  if (roleScope === 'customer') {
    const publicMenuChunks = buildPublicCustomerMenuChunks();
    for (const mc of publicMenuChunks) {
      const { score, matchedTerms } = scoreCandidate(
        query,
        queryNorm,
        queryTokens,
        mc.title,
        mc.category,
        mc.keywords,
        mc.content
      );
      if (score > 0) {
        candidates.push({
          id: mc.id,
          sourceType: 'menu_public',
          title: mc.title,
          category: mc.category,
          content: mc.content,
          score,
          route: mc.route,
          matchedTerms,
        });
      }
    }
  }

  // Nguồn 2: Store FAQs (Tiện ích quán: Wifi, Giờ mở cửa, Gửi xe, Tích điểm...)
  const faqs =
    Array.isArray(options?.customFaqs) && options!.customFaqs.length > 0
      ? options!.customFaqs.filter((f) => f.isActive !== false)
      : (defaultStoreFaqs as StoreFAQItem[]).filter((f) => f.isActive !== false);

  for (const faq of faqs) {
    const { score, matchedTerms } = scoreCandidate(
      query,
      queryNorm,
      queryTokens,
      faq.question,
      faq.category,
      faq.keywords || [],
      faq.answer
    );
    if (score > 0) {
      candidates.push({
        id: `faq-${faq.id}`,
        sourceType: 'faq',
        title: faq.question,
        category: `FAQ - ${faq.category}`,
        content: `Câu hỏi: ${faq.question}\nTrả lời: ${faq.answer}`,
        score: score + 1.5, // Ưu tiên FAQ khi khớp trực tiếp câu hỏi tiện ích
        matchedTerms,
      });
    }
  }

  // Nguồn 3: Store Recipes & Allergens (Ở chế độ customer chỉ trả thông tin dị ứng/calo/caffeine công khai, KHÔNG trả định lượng pha chế Barista)
  const recipes =
    Array.isArray(options?.customRecipes) && options!.customRecipes.length > 0
      ? options!.customRecipes
      : (defaultRecipes as StoreRecipeNote[]);

  const isDietaryQuery =
    /(di ung|lactose|sua|gluten|thanh phan|calo|kcal|an kieng|giam can|tieu duong|caffeine|mat ngu|say ca phe|ba bau|mang thai|tre em)/i.test(
      queryNorm
    );

  for (const r of recipes) {
    const bodyText =
      roleScope === 'customer'
        ? `${(r.allergens || []).join(' ')} Caffeine: ${r.caffeineLevel} Calo: ${r.caloriesEstimate} ${r.dietaryAdvice}`
        : `${r.ingredients} ${r.formulaNote} ${(r.allergens || []).join(' ')} Caffeine: ${r.caffeineLevel} Calo: ${r.caloriesEstimate} ${r.dietaryAdvice}`;

    let { score, matchedTerms } = scoreCandidate(
      query,
      queryNorm,
      queryTokens,
      r.productName,
      r.category,
      [...(r.keywords || []), ...(r.allergens || [])],
      bodyText
    );

    if (isDietaryQuery) {
      if (
        /(khong sua|di ung sua|lactose)/i.test(queryNorm) &&
        r.allergens.some((a) => normalizeRagText(a).includes('khong chua sua') || normalizeRagText(a).includes('lactose'))
      ) {
        score += 5;
        matchedTerms.push('lactose-free');
      }
      if (
        /(mat ngu|ba bau|tre em|khong caffeine|say)/i.test(queryNorm) &&
        (r.caffeineLevel === 'Không' || r.caffeineLevel === 'Thấp')
      ) {
        score += 5;
        matchedTerms.push('low-caffeine');
      }
      if (/(an kieng|giam can|it calo|tieu duong)/i.test(queryNorm)) {
        score += 3;
      }
    }

    if (score > 0) {
      const publicRecipeContent =
        `Món: ${r.productName} (${r.category})\n` +
        `- Cảnh báo dị ứng: ${(r.allergens || []).join(', ')}\n` +
        `- Mức Caffeine: ${r.caffeineLevel} | Calo: ${r.caloriesEstimate}\n` +
        `- Tư vấn: ${r.dietaryAdvice}`;

      const staffRecipeContent =
        `Món: ${r.productName} (${r.category})\n` +
        `- Thành phần: ${r.ingredients}\n` +
        `- Định lượng chuẩn Barista: ${r.formulaNote}\n` +
        `- Cảnh báo dị ứng: ${(r.allergens || []).join(', ')}\n` +
        `- Mức Caffeine: ${r.caffeineLevel} | Calo: ${r.caloriesEstimate}\n` +
        `- Tư vấn: ${r.dietaryAdvice}`;

      candidates.push({
        id: `recipe-${r.id}`,
        sourceType: 'recipe',
        title:
          roleScope === 'customer'
            ? `Thông tin dinh dưỡng & dị ứng: ${r.productName}`
            : `Công thức & Dinh dưỡng: ${r.productName}`,
        category:
          roleScope === 'customer'
            ? `Dinh dưỡng & Dị ứng - ${r.category}`
            : `Sổ tay Barista - ${r.category}`,
        content: roleScope === 'customer' ? publicRecipeContent : staffRecipeContent,
        score,
        citation: roleScope === 'customer' ? undefined : formatCitation('Menu & Sản phẩm', 'menu'),
        matchedTerms,
      });
    }
  }

  // Nguồn 4: Định mức tiêu hao nguyên liệu BOM (Chỉ dành cho Staff/Admin khi hỏi định mức kho)
  if (roleScope !== 'customer' && /(dinh muc|nguyen lieu|tru kho|bom|cauhinh|cong thuc kho)/i.test(queryNorm)) {
    const bomChunks = buildBomKnowledgeChunks();
    for (const bom of bomChunks) {
      const { score, matchedTerms } = scoreCandidate(
        query,
        queryNorm,
        queryTokens,
        bom.title,
        bom.category,
        ['định mức', 'nguyên liệu', 'trừ kho', 'cấu hình'],
        bom.content
      );
      if (score > 0) {
        candidates.push({ ...bom, score, matchedTerms });
      }
    }
  }

  const minScore = options?.minScore ?? 2.0;
  return candidates
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Xây dựng khối ngữ cảnh RAG chọn lọc (Selective Top-K Grounding) để đưa vào System Prompt của LLM
 */
export function buildSelectiveRagPrompt(
  query: string,
  options?: RagRetrievalOptions
): {
  prompt: string;
  retrievedChunks: RetrievedChunk[];
  bestCitation?: string;
} {
  const retrievedChunks = retrieveProjectKnowledge(query, {
    ...options,
    topK: options?.topK ?? 5,
  });

  const bestDocChunk = retrievedChunks.find((c) => c.sourceType === 'project_doc' && c.citation);
  const customerIsolationNote =
    options?.roleScope === 'customer'
      ? '- TUYỆT ĐỐI KHÔNG tiết lộ giá vốn, công thức định lượng pha chế nội bộ (CAUHINH/BOM), doanh thu cửa hàng, phím tắt POS hay hướng dẫn vận hành nhân viên.'
      : '';

  if (retrievedChunks.length === 0) {
    return {
      prompt: [
        'QUY TẮC CHỐNG BỊA ĐẶT (STRICT GROUNDING):',
        '- Chỉ trả lời dựa trên dữ liệu thực đơn, bàn và tính năng có thật của hệ thống H2 MilkTea POS.',
        customerIsolationNote,
        '- Nếu người dùng hỏi thông tin không có trong hệ thống hoặc thuộc dữ liệu nội bộ không được phép chia sẻ, hãy lịch sự từ chối / thông báo thông tin đó chưa được cấu hình thay vì tự suy diễn.',
      ]
        .filter(Boolean)
        .join('\n'),
      retrievedChunks: [],
    };
  }

  const formattedChunks = retrievedChunks
    .map(
      (chunk, idx) =>
        `[TÀI LIỆU TRUY XUẤT #${idx + 1} | Nguồn: ${chunk.category} | Độ khớp: ${chunk.score}]\n` +
        `Tiêu đề: ${chunk.title}\n` +
        `Nội dung: ${chunk.content}` +
        (chunk.citation ? `\nTrích dẫn bắt buộc nếu dùng: ${chunk.citation}` : '')
    )
    .join('\n\n');

  const prompt = [
    '=== KHO TRI THỨC NỘI BỘ DỰ ÁN H2 MILKTEA (RETRIEVED RAG CONTEXT) ===',
    'QUY TẮC NGHIÊM NGẶT (ANTI-HALLUCINATION):',
    '1. Khi trả lời câu hỏi hướng dẫn sử dụng, quy trình vận hành, thông tin quán hoặc thành phần đồ uống, BẠN BẮT BUỘC CHỈ SỬ DỤNG thông tin trong các [TÀI LIỆU TRUY XUẤT] dưới đây.',
    '2. TUYỆT ĐỐI KHÔNG tự bịa đặt phím tắt, đường dẫn trang, mật khẩu wifi, giờ mở cửa hay tính năng không nằm trong tài liệu.',
    customerIsolationNote ? `3. ${customerIsolationNote.replace(/^- /, '')}` : '',
    '4. Nếu tài liệu có mục "Trích dẫn bắt buộc", hãy giữ nguyên dòng trích dẫn đó ở cuối câu trả lời.',
    '',
    formattedChunks,
    '=== KẾT THÚC KHO TRI THỨC RAG ===',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    prompt,
    retrievedChunks,
    bestCitation: bestDocChunk?.citation,
  };
}
