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
  sourceType: 'project_doc' | 'faq' | 'recipe' | 'bom_config';
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
      merged.push({
        id: topic.id,
        category: topic.sectionTitle,
        title: topic.title,
        route: `/user-guide#${topic.sectionId}`,
        sectionId: topic.sectionId,
        sectionTitle: topic.sectionTitle,
        roleScope: 'all',
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

  const candidates: RetrievedChunk[] = [];

  // Nguồn 1: Project Knowledge Chunks (Tài liệu hệ thống & Hướng dẫn nghiệp vụ)
  const projectChunks = getMergedProjectChunks(options?.customChunks);
  for (const chunk of projectChunks) {
    if (roleScope === 'customer' && chunk.roleScope === 'staff') {
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
        citation: formatCitation(chunk.sectionTitle || chunk.category, chunk.sectionId || 'introduction'),
        route: chunk.route,
        matchedTerms,
      });
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

  // Nguồn 3: Store Recipes & Allergens (Sổ tay Công thức Barista, Dị ứng, Calo, Caffeine)
  const recipes =
    Array.isArray(options?.customRecipes) && options!.customRecipes.length > 0
      ? options!.customRecipes
      : (defaultRecipes as StoreRecipeNote[]);

  const isDietaryQuery =
    /(di ung|lactose|sua|gluten|cong thuc|pha che|dinh luong|thanh phan|calo|kcal|an kieng|giam can|tieu duong|caffeine|mat ngu|say ca phe|ba bau|mang thai|tre em)/i.test(
      queryNorm
    );

  for (const r of recipes) {
    const bodyText = `${r.ingredients} ${r.formulaNote} ${(r.allergens || []).join(' ')} Caffeine: ${r.caffeineLevel} Calo: ${r.caloriesEstimate} ${r.dietaryAdvice}`;
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
      candidates.push({
        id: `recipe-${r.id}`,
        sourceType: 'recipe',
        title: `Công thức & Dinh dưỡng: ${r.productName}`,
        category: `Sổ tay Barista - ${r.category}`,
        content:
          `Món: ${r.productName} (${r.category})\n` +
          `- Thành phần: ${r.ingredients}\n` +
          `- Định lượng chuẩn Barista: ${r.formulaNote}\n` +
          `- Cảnh báo dị ứng: ${(r.allergens || []).join(', ')}\n` +
          `- Mức Caffeine: ${r.caffeineLevel} | Calo: ${r.caloriesEstimate}\n` +
          `- Tư vấn: ${r.dietaryAdvice}`,
        score,
        citation: formatCitation('Menu & Sản phẩm', 'menu'),
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

  if (retrievedChunks.length === 0) {
    return {
      prompt: [
        'QUY TẮC CHỐNG BỊA ĐẶT (STRICT GROUNDING):',
        '- Chỉ trả lời dựa trên dữ liệu thực đơn, bàn và tính năng có thật của hệ thống H2 MilkTea POS.',
        '- Nếu người dùng hỏi thông tin không có trong hệ thống, hãy lịch sự thông báo thông tin đó chưa được cấu hình thay vì tự suy diễn.',
      ].join('\n'),
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
    '3. Nếu tài liệu có mục "Trích dẫn bắt buộc", hãy giữ nguyên dòng trích dẫn đó ở cuối câu trả lời.',
    '',
    formattedChunks,
    '=== KẾT THÚC KHO TRI THỨC RAG ===',
  ].join('\n');

  return {
    prompt,
    retrievedChunks,
    bestCitation: bestDocChunk?.citation,
  };
}
