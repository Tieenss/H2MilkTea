import { NextRequest, NextResponse } from 'next/server';
import menuData from '@/data/DMHH.json';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { checkSecurityGuardrails } from '@/lib/ai/security';
import { extractNoteAndOptions } from '@/lib/ai/ruleEngine';
import {
  parseDrinkCustomization,
  buildMergedToppingNote,
  detectServiceCallReason,
} from '@/lib/ai/customerDrinkParser';
import {
  retrieveProjectKnowledge,
  buildSelectiveRagPrompt,
  type ProjectKnowledgeChunk,
} from '@/lib/ai/ragEngine';
import { expandAliasesWithDict } from '@/lib/ai/aliases';

// Rate limiting: 15 yêu cầu / phút / IP khách
const customerRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (customerRateLimitMap.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) return false;
  timestamps.push(now);
  customerRateLimitMap.set(ip, timestamps);
  return true;
}

interface ProductItem {
  IDSP: string;
  'Tên sản phẩm': string;
  'Đơn giá': number | string;
  'Loại sản phẩm': string;
  'Hình ảnh'?: string;
  'Trạng thái'?: string;
}

export interface SuggestedProductPayload {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  quantity?: number;
  size?: 'S' | 'M' | 'L';
  sugar?: string;
  ice?: string;
  toppings?: string[];
  note?: string;
  isOrderMatch?: boolean;
}

// Chuẩn hóa chuỗi tiếng Việt để so khớp tương đồng cao
function normalizeText(val: string, customAliases?: Record<string, string>): string {
  const expanded = customAliases ? expandAliasesWithDict(val, customAliases) : val;
  return expanded
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/chân trâu|chan trau/g, 'tran chau')
    .replace(/\bcf\b|\bcafe\b/g, 'ca phe')
    .replace(/\bts\b/g, 'tra sua')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Tìm sản phẩm khớp nhất từ văn bản bằng Fuzzy/Token Matching
function matchProduct(
  query: string,
  catalog: ProductItem[],
  customAliases?: Record<string, string>
): { product: ProductItem; score: number } | null {
  const normQ = normalizeText(query, customAliases);
  if (!normQ) return null;

  let bestProduct: ProductItem | null = null;
  let highestScore = 0;

  for (const prod of catalog) {
    const normName = normalizeText(prod['Tên sản phẩm']);
    if (normName === normQ) {
      return { product: prod, score: 1.0 };
    }

    if (normName.includes(normQ) || normQ.includes(normName)) {
      const score = 0.85 + (normName.length / (normName.length + Math.abs(normName.length - normQ.length))) * 0.1;
      if (score > highestScore) {
        highestScore = score;
        bestProduct = prod;
      }
      continue;
    }

    const qTokens = new Set(normQ.split(' ').filter(Boolean));
    const nameTokens = new Set(normName.split(' ').filter(Boolean));
    const intersection = [...qTokens].filter((t) => nameTokens.has(t)).length;
    const tokenScore = qTokens.size > 0 ? intersection / Math.max(qTokens.size, nameTokens.size) : 0;

    if (tokenScore > 0.55 && tokenScore > highestScore) {
      highestScore = tokenScore;
      bestProduct = prod;
    }
  }

  return bestProduct && highestScore >= 0.55 ? { product: bestProduct, score: highestScore } : null;
}

// Bóc tách JSON an toàn từ phản hồi của LLM
function extractJsonFromText(text: string): any | null {
  try {
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    const raw = match ? match[1].trim() : text.trim();
    return JSON.parse(raw);
  } catch {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
    return null;
  }
}

function pickProductsByNames(
  names: string[],
  activeProducts: ProductItem[],
  customOverrides?: Partial<SuggestedProductPayload>
): SuggestedProductPayload[] {
  const results: SuggestedProductPayload[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const matched = matchProduct(name, activeProducts);
    if (matched && !seen.has(matched.product.IDSP)) {
      seen.add(matched.product.IDSP);
      results.push({
        id: matched.product.IDSP,
        name: matched.product['Tên sản phẩm'],
        price: Number(matched.product['Đơn giá']),
        image: matched.product['Hình ảnh'],
        category: matched.product['Loại sản phẩm'],
        quantity: 1,
        size: 'M',
        sugar: '100% đường',
        ice: '100% đá',
        toppings: [],
        note: '',
        isOrderMatch: false,
        ...customOverrides,
      });
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Bạn gửi câu hỏi hơi nhanh. Vui lòng chờ 30 giây nhé!',
      }, { status: 429 });
    }

    const body = await request.json();
    const message = String(body.message || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    // 1. Chống DoS / Token Exhaustion: Giới hạn độ dài câu hỏi tối đa 500 ký tự
    if (message.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'Câu hỏi quá dài (tối đa 500 ký tự). Vui lòng rút gọn câu hỏi nhé!',
      }, { status: 400 });
    }

    // 2. Chặn Prompt Injection và các hành vi vi phạm an toàn
    const security = checkSecurityGuardrails(message);
    if (security.violated) {
      return NextResponse.json({
        success: true,
        message: security.reason || 'Yêu cầu không phù hợp với trợ lý gọi món của quán.',
        intent: 'FAQ_GENERAL',
        suggestedProducts: [],
      });
    }

    const supabase = createAdminSupabaseClient();
    let catalog: ProductItem[] = menuData as ProductItem[];
    let customFaqs: any = null;
    let customAliases: Record<string, string> | undefined = undefined;
    let customRagChunks: ProjectKnowledgeChunk[] | null = null;

    if (supabase) {
      const [dmhhRes, faqRes, aliasRes, ragRes] = await Promise.all([
        supabase.from('DMHH').select('*'),
        supabase.from('app_settings').select('value').eq('key', 'store_custom_faq').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'store_custom_aliases').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'store_custom_rag_chunks').maybeSingle(),
      ]);

      if (dmhhRes.data && dmhhRes.data.length > 0) {
        catalog = dmhhRes.data as ProductItem[];
      }
      if (faqRes.data && Array.isArray(faqRes.data.value)) {
        customFaqs = faqRes.data.value;
      }
      if (aliasRes.data && typeof aliasRes.data.value === 'object' && aliasRes.data.value !== null) {
        customAliases = aliasRes.data.value as Record<string, string>;
      }
      if (ragRes.data && Array.isArray(ragRes.data.value)) {
        customRagChunks = ragRes.data.value as ProjectKnowledgeChunk[];
      }
    }

    const activeProducts = catalog.filter((p) => !p['Trạng thái'] || p['Trạng thái'] === 'Hoạt động');

    // 2.5. Nhận diện yêu cầu gọi phục vụ tại bàn (Service Call Trigger)
    const serviceCallReason = detectServiceCallReason(message);
    if (serviceCallReason) {
      return NextResponse.json({
        success: true,
        intent: 'SERVICE_CALL',
        serviceCallReason,
        message: `🔔 Mình đã nhận thấy bạn cần hỗ trợ: "${serviceCallReason}". Bạn hãy nhấn nút **"Gửi yêu cầu tới quầy ngay"** bên dưới để chuông báo vang lên tại màn hình nhân viên thu ngân nhé!`,
        suggestedProducts: [],
      });
    }

    // 2.6. Tra cứu FAQ / RAG dành cho khách hàng (ưu tiên dữ liệu động từ /settings/ai)
    const lower = message.toLowerCase();
    const isOrderLike = /^(?:cho|thêm|lấy|gọi|đặt|muốn\s+gọi)\s+/i.test(message);

    if (!isOrderLike) {
      const customerRagHits = retrieveProjectKnowledge(message, {
        topK: 1,
        minScore: 7,
        roleScope: 'customer',
        customChunks: customRagChunks,
        customFaqs,
      });

      // Nếu khớp trực tiếp với một câu hỏi FAQ của quán (như Wifi, Giờ mở cửa, Thanh toán, Tích điểm)
      if (customerRagHits.length > 0 && customerRagHits[0].sourceType === 'faq') {
        return NextResponse.json({
          success: true,
          intent: 'FAQ_GENERAL',
          message: customerRagHits[0].content,
          suggestedProducts: [],
        });
      }
    }

    const isWifiQuery =
      /(pass(word)?\s*wifi|mật\s*khẩu\s*wifi|pass\s*mạng|wifi\s*(quán|mật khẩu|pass|là gì)|xin\s*pass\b)/i.test(message) ||
      (lower.includes('wifi') && (lower.includes('pass') || lower.includes('mật khẩu') || lower.includes('mạng') || lower.includes('cho xin') || lower.includes('là gì')));
    if (isWifiQuery) {
      return NextResponse.json({
        success: true,
        message: '📶 Wifi của quán: "H2 MilkTea 5G" · Mật khẩu: 88888888 (Tốc độ cao miễn phí). Chúc bạn có trải nghiệm tuyệt vời!',
        suggestedProducts: [],
      });
    }

    if (lower.includes('giờ mở cửa') || lower.includes('mở cửa') || lower.includes('đóng cửa') || (lower.includes('mấy giờ') && lower.includes('đóng'))) {
      return NextResponse.json({
        success: true,
        message: '⏰ Quán mở cửa từ 07:00 đến 22:30 tất cả các ngày trong tuần. Bạn có thể ghé thưởng thức trà sữa bất cứ lúc nào!',
        suggestedProducts: [],
      });
    }

    if (lower.includes('thanh toán') && (lower.includes('như thế nào') || lower.includes('chuyển khoản'))) {
      return NextResponse.json({
        success: true,
        message: '💳 Quán nhận thanh toán bằng tiền mặt và chuyển khoản QR ngân hàng tại quầy thu ngân khi bạn nhận món nhé!',
        suggestedProducts: [],
      });
    }

    // 3. Tư vấn chuyên sâu về Dị ứng sữa / Lactose, Mất ngủ / Caffeine, Ăn kiêng / Calo & Thành phần
    if (/(dị\s*ứng\s*sữa|lactose|không\s*uống\s*được\s*sữa|kiêng\s*sữa)/i.test(message)) {
      const dairyFreeSuggestions = pickProductsByNames(
        ['Trà đào cam sả', 'Trà chanh', 'Ép dưa hấu', 'Nước ép cam'],
        activeProducts
      );
      return NextResponse.json({
        success: true,
        intent: 'RECOMMENDATION',
        message:
          '🌿 Nếu bạn bị dị ứng sữa hoặc bất dung nạp lactose, bạn nên tránh các dòng Trà sữa, Bạc xỉu, Sữa chua và lớp phủ Kem cheese. Mình gợi ý bạn các món Trà trái cây thanh mát và Nước ép tươi nguyên chất 100% không chứa sữa như: Trà đào cam sả, Hồng trà chanh (Trà chanh), Nước ép dưa hấu và Nước ép cam nhé!',
        suggestedProducts: dairyFreeSuggestions,
      });
    }

    if (/(mất\s*ngủ|caffeine|cafein|say\s*trà|say\s*cà\s*phê|say\s*cafe|buổi\s*tối)/i.test(message)) {
      const caffeineFreeSuggestions = pickProductsByNames(
        ['Ép dưa hấu', 'Nước ép cam', 'Trà sữa trân châu đường đen', 'Sinh tố bơ'],
        activeProducts
      );
      return NextResponse.json({
        success: true,
        intent: 'RECOMMENDATION',
        message:
          '🌙 Lưu ý: Các món Cà phê và Hồng trà đậm vị có chứa caffeine có thể gây mất ngủ hoặc say trà/cà phê khi uống vào buổi tối. Mình gợi ý bạn chọn Nước ép dưa hấu, Nước ép cam hoặc Sữa tươi trân châu đường đen (dòng sữa tươi không chứa cốt trà/cà phê) để yên tâm ngon giấc nhé!',
        suggestedProducts: caffeineFreeSuggestions,
      });
    }

    if (/(ít\s*calo|calo\s*thấp|ăn\s*kiêng|giảm\s*cân|healthy|tiểu\s*đường)/i.test(message)) {
      const healthySuggestions = pickProductsByNames(
        ['Trà đào cam sả', 'Trà chanh', 'Ép dưa hấu', 'Nước ép cam'],
        activeProducts,
        { sugar: '30% đường' }
      );
      return NextResponse.json({
        success: true,
        intent: 'RECOMMENDATION',
        message:
          '🥗 Với chế độ ăn kiêng, giảm cân, healthy hoặc tiểu đường, bạn nên chọn mức 0% đường hoặc 30% đường và ưu tiên các món trà thanh mát hoặc nước ép nguyên chất ít calo như Trà đào cam sả, Trà chanh, Nước ép dưa hấu, Nước ép cam nhé!',
        suggestedProducts: healthySuggestions,
      });
    }

    if (/(thành\s*phần|nguyên\s*liệu|công\s*thức|làm\s*từ\s*gì)/i.test(message)) {
      const matchedProd = matchProduct(
        message.replace(/(thành\s*phần|nguyên\s*liệu|công\s*thức|làm\s*từ\s*gì|của|món|ly|có\s*gì)/gi, ' '),
        activeProducts,
        customAliases
      );
      const prodName = matchedProd ? matchedProd.product['Tên sản phẩm'] : 'các món đồ uống tại H2 MilkTea';
      let ingredientDesc =
        'được pha chế từ nguyên liệu tươi sạch trong ngày: cốt trà ủ lạnh chuẩn vị, sữa thơm béo hoặc trái cây tươi nguyên chất 100%, kết hợp cùng các loại topping nấu mới mỗi ca.';
      if (/đào\s*cam\s*sả/i.test(prodName) || /đào\s*cam\s*sả/i.test(message)) {
        ingredientDesc =
          'gồm cốt hồng trà/trà lài ủ lạnh thanh mát, kết hợp cùng đào miếng ngâm giòn ngọt, lát cam vàng tươi, nước cốt cam và sả cây đập dập thơm dịu.';
      } else if (/trà\s*sữa/i.test(prodName) || /trà\s*sữa/i.test(message)) {
        ingredientDesc =
          'gồm cốt hồng trà hoặc trà ô long nguyên lá ủ nhiệt độ chuẩn, hòa quyện với sữa thơm béo và trân châu/topping dẻo dai nấu mới trong ngày.';
      } else if (/cà\s*phê|cafe|bạc\s*xỉu/i.test(prodName) || /cà\s*phê|cafe|bạc\s*xỉu/i.test(message)) {
        ingredientDesc =
          'được chiết xuất từ hạt cà phê Robusta & Arabica rang mộc nguyên chất, kết hợp cùng sữa đặc, sữa tươi hoặc lớp kem muối/cốt dừa béo ngậy.';
      } else if (/ép|sinh\s*tố/i.test(prodName) || /ép|sinh\s*tố/i.test(message)) {
        ingredientDesc =
          'sử dụng 100% trái cây tươi tuyển chọn trong ngày, ép nguyên chất giữ trọn vitamin tự nhiên và hoàn toàn không dùng chất bảo quản.';
      }

      const suggestions = matchedProd
        ? [
            {
              id: matchedProd.product.IDSP,
              name: matchedProd.product['Tên sản phẩm'],
              price: Number(matchedProd.product['Đơn giá']),
              image: matchedProd.product['Hình ảnh'],
              category: matchedProd.product['Loại sản phẩm'],
              quantity: 1,
              size: 'M' as const,
              sugar: '100% đường',
              ice: '100% đá',
              toppings: [],
              note: '',
              isOrderMatch: false,
            },
          ]
        : [];

      return NextResponse.json({
        success: true,
        intent: 'FAQ_GENERAL',
        message: `📋 Về thành phần nguyên liệu: Món ${prodName} ${ingredientDesc}`,
        suggestedProducts: suggestions,
      });
    }

    // Tận dụng Gemini Flash với Structured Extraction + Selective Customer RAG Context
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const productListString = activeProducts
          .map((p) => `ID:${p.IDSP} | ${p['Tên sản phẩm']} | ${p['Loại sản phẩm']} | ${Number(p['Đơn giá'])}đ`)
          .join('\n');

        const { prompt: customerRagContext } = buildSelectiveRagPrompt(message, {
          topK: 3,
          roleScope: 'customer',
          customChunks: customRagChunks,
          customFaqs,
        });

        const systemPrompt = `Bạn là Trợ lý ảo tư vấn và tiếp nhận gọi món thông minh của quán H2 MilkTea.
Khách hàng có thể hỏi tư vấn HOẶC đưa ra yêu cầu gọi món (ví dụ: "cho tôi thêm 1 cafe sữa tươi và 3 chân trâu đường đen", "lấy cho mình 2 trà đào ít ngọt ít đá thêm trân châu trắng").

DANH SÁCH MENU CỦA QUÁN:
${productListString}

${customerRagContext}

HƯỚNG DẪN XỬ LÝ:
1. Xác định ý định của khách:
   - "ORDER_ADD": Khi khách muốn gọi món, thêm món vào bàn, muốn lấy món (chứa từ: "cho tôi", "thêm", "lấy", "đặt", số lượng...). CHỈ DÙNG khi món khách gọi THỰC SỰ CÓ TRONG MENU QUÁN.
   - "RECOMMENDATION": Khi khách muốn gợi ý theo sở thích (dị ứng sữa/lactose, mất ngủ/caffeine, ăn kiêng/ít calo/giảm cân) HOẶC khi khách hỏi các món KHÔNG CÓ TRONG MENU QUÁN.
   - "FAQ_GENERAL": Khi khách hỏi chung thông tin quán, giờ mở cửa, thanh toán, wifi, thành phần nguyên liệu/công thức đồ uống.
2. Tư vấn sức khỏe & thành phần:
   - Dị ứng sữa / lactose: khuyên tránh trà sữa, kem cheese; gợi ý Trà đào cam sả, Hồng trà chanh, Nước ép dưa hấu, Nước ép cam.
   - Mất ngủ / caffeine / buổi tối: cảnh báo Cà phê & Hồng trà đậm có caffeine; gợi ý Nước ép dưa hấu, Nước ép cam, Sữa tươi trân châu đường đen.
   - Ăn kiêng / ít calo / giảm cân / tiểu đường: gợi ý chọn 0% đường hoặc 30% đường, ưu tiên trà thanh mát hoặc nước ép nguyên chất.
   - Thành phần / công thức: giải thích rõ nguyên liệu tươi sạch của món khách hỏi.
3. Với ORDER_ADD:
   - Bóc tách chính xác từng món khách muốn gọi, số lượng (quantity - số nguyên >= 1), và tên món tương ứng khớp trong menu.
   - Bóc tách tùy chọn:
     + size: "S", "M" (chuẩn) hoặc "L".
     + sugar: "100% đường" (mặc định), "70% đường", "50% đường", "30% đường" (ít đường/ít ngọt), "0% đường" (không đường).
     + ice: "100% đá" (mặc định), "70% đá", "50% đá", "30% đá" (ít đá), "0% đá" (không đá), "đá riêng", "Nóng".
     + toppings: mảng các topping khách gọi thêm (ví dụ: ["Trân châu đen", "Kem cheese"]).
     + note: Ghi chú phụ nếu có.

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT:
{
  "message": "Câu trả lời thân thiện bằng tiếng Việt gửi khách hàng",
  "intent": "ORDER_ADD" | "RECOMMENDATION" | "FAQ_GENERAL",
  "detectedItems": [
    {
      "productName": "Tên món khớp trong menu quán",
      "quantity": 1,
      "size": "S" | "M" | "L",
      "sugar": "100% đường" | "70% đường" | "50% đường" | "30% đường" | "0% đường",
      "ice": "100% đá" | "70% đá" | "50% đá" | "30% đá" | "0% đá" | "đá riêng" | "Nóng",
      "toppings": ["Trân châu đen"],
      "note": "Ghi chú thêm nếu có"
    }
  ],
  "suggestedProductNames": ["Tên món 1", "Tên món 2"]
}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nLịch sử chat gần nhất: ${JSON.stringify(history.slice(-4))}\n\nTin nhắn của khách: "${message}"` }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              maxOutputTokens: 900,
            },
          }),
        });

        const geminiData = await geminiRes.json();
        const rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawContent) {
          const parsed = extractJsonFromText(rawContent);
          if (parsed && typeof parsed === 'object') {
            const aiMessage = parsed.message || 'H2 MilkTea đã ghi nhận yêu cầu của bạn!';
            const detectedItems: Array<{
              productName: string;
              quantity?: number;
              size?: 'S' | 'M' | 'L';
              sugar?: string;
              ice?: string;
              toppings?: string[];
              note?: string;
            }> = Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [];
            const suggestedNames: string[] = Array.isArray(parsed.suggestedProductNames) ? parsed.suggestedProductNames : [];

            const matchedSuggestions: SuggestedProductPayload[] = [];
            const addedIds = new Set<string>();

            // 1. Nạp các món đã được bóc tách từ yêu cầu đặt món
            for (const item of detectedItems) {
              const matched = matchProduct(item.productName, activeProducts, customAliases);
              if (matched && !addedIds.has(matched.product.IDSP)) {
                addedIds.add(matched.product.IDSP);
                const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(matched.product['Loại sản phẩm']);
                const itemToppings = isFood
                  ? []
                  : Array.isArray(item.toppings)
                  ? item.toppings.map(String)
                  : [];
                matchedSuggestions.push({
                  id: matched.product.IDSP,
                  name: matched.product['Tên sản phẩm'],
                  price: Number(matched.product['Đơn giá']),
                  image: matched.product['Hình ảnh'],
                  category: matched.product['Loại sản phẩm'],
                  quantity: Math.max(1, Number(item.quantity || 1)),
                  size: item.size === 'L' ? 'L' : item.size === 'S' ? 'S' : 'M',
                  sugar: isFood ? '' : (item.sugar || '100% đường'),
                  ice: isFood ? '' : (item.ice || '100% đá'),
                  toppings: itemToppings,
                  note: buildMergedToppingNote(itemToppings, item.note),
                  isOrderMatch: true,
                });
              }
            }

            // 2. Nạp thêm các món được gợi ý phụ (nếu chưa có trong danh sách)
            for (const name of suggestedNames) {
              if (matchedSuggestions.length >= 4) break;
              const matched = matchProduct(name, activeProducts, customAliases);
              if (matched && !addedIds.has(matched.product.IDSP)) {
                addedIds.add(matched.product.IDSP);
                matchedSuggestions.push({
                  id: matched.product.IDSP,
                  name: matched.product['Tên sản phẩm'],
                  price: Number(matched.product['Đơn giá']),
                  image: matched.product['Hình ảnh'],
                  category: matched.product['Loại sản phẩm'],
                  quantity: 1,
                  size: 'M',
                  sugar: '100% đường',
                  ice: '100% đá',
                  toppings: [],
                  note: '',
                  isOrderMatch: false,
                });
              }
            }

            // Chuẩn hóa intent: Chỉ cho phép ORDER_ADD khi có ít nhất 1 món thực sự khớp trong menu
            const hasOrderMatch = matchedSuggestions.some((s) => s.isOrderMatch);
            const finalIntent = hasOrderMatch
              ? (parsed.intent || 'ORDER_ADD')
              : (parsed.intent === 'ORDER_ADD' ? 'RECOMMENDATION' : (parsed.intent || 'GENERAL'));

            return NextResponse.json({
              success: true,
              message: aiMessage.trim(),
              intent: finalIntent,
              suggestedProducts: matchedSuggestions,
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini Structured Call failed, using intelligent local matching:', geminiErr);
      }
    }

    // Fallback thông minh cục bộ khi không có API key hoặc lỗi mạng:
    // Tự động phân tích câu của khách để tìm món và số lượng bằng Segmentation & Fuzzy Match
    const extractedItems: SuggestedProductPayload[] = [];
    const usedIds = new Set<string>();

    const cleanMessage = message
      .replace(/^(?:cho tôi|cho em|cho mình|lấy cho|lấy|thêm|đặt|muốn gọi|gọi)\s+/gi, '')
      .trim();

    // Tách theo các liên từ phân tách món nhưng không cắt vào phần topping phía sau chữ "thêm"/"kèm"/"topping"
    const segments = cleanMessage
      .split(/\s*(?:,|và|\+|\bvới\b|\btiếp\b|\brồi\b)(?!\s*(?:trân\s*châu|kem\s*cheese|kem\s*phô\s*mai|thạch|pudding|sương\s*sáo|đào\s*miếng|hạt\s*đác|flan|oreo))\s*/i)
      .filter(Boolean);

    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed || trimmed.length < 2) continue;

      // Tìm số lượng ở đầu cụm (vd: "3 ly...", "3 chân trâu...", "1...")
      const leadingQty = trimmed.match(/^(\d+)\s*(?:ly|cốc|phần|cái|dĩa)?\s*(.*)$/i);
      let qty = 1;
      let queryName = trimmed;

      if (leadingQty) {
        qty = parseInt(leadingQty[1], 10) || 1;
        queryName = leadingQty[2].trim() || trimmed;
      } else {
        // Tìm số lượng ở cuối cụm (vd: "trà đào 2 ly", "trà sữa 3")
        const trailingQty = trimmed.match(/^(.*?)\s+(\d+)\s*(?:ly|cốc|phần|cái|dĩa)?$/i);
        if (trailingQty) {
          qty = parseInt(trailingQty[2], 10) || 1;
          queryName = trailingQty[1].trim();
        }
      }

      const custom = parseDrinkCustomization(trimmed);
      const optionsExtracted = extractNoteAndOptions(queryName);

      // Loại bỏ các từ khóa modifier (đường, đá, size, topping) ra khỏi queryName để tìm món chính xác
      const cleanProdQuery = (optionsExtracted.cleanText || queryName)
        .replace(/(?:^|\s)(?:ít|không|nửa|nhiều|100%|70%|50%|30%|0%)\s*(?:đường|ngọt|đá)(?=\s|$)/gi, ' ')
        .replace(/(?:^|\s)(?:size|ly|cỡ)\s*(?:[sml]|lớn|vừa|nhỏ|lon|vua|nho)(?=\s|$)/gi, ' ')
        .trim();

      const matched = matchProduct(cleanProdQuery || queryName, activeProducts, customAliases);
      if (matched && !usedIds.has(matched.product.IDSP)) {
        usedIds.add(matched.product.IDSP);
        const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(matched.product['Loại sản phẩm']);
        extractedItems.push({
          id: matched.product.IDSP,
          name: matched.product['Tên sản phẩm'],
          price: Number(matched.product['Đơn giá']),
          image: matched.product['Hình ảnh'],
          category: matched.product['Loại sản phẩm'],
          quantity: qty,
          size: custom.size,
          sugar: isFood ? '' : custom.sugar,
          ice: isFood ? '' : custom.ice,
          toppings: isFood ? [] : custom.toppings,
          note: buildMergedToppingNote(isFood ? [] : custom.toppings, ''),
          isOrderMatch: true,
        });
      }
    }

    // Nếu không khớp theo segment, thử tìm tên món trực tiếp xuất hiện trong câu
    if (extractedItems.length === 0) {
      for (const prod of activeProducts) {
        const normName = normalizeText(prod['Tên sản phẩm']);
        const normMsg = normalizeText(message, customAliases);
        if (normMsg.includes(normName) && !usedIds.has(prod.IDSP)) {
          usedIds.add(prod.IDSP);
          const isFood = ['Ăn vặt', 'Bánh ngọt'].includes(prod['Loại sản phẩm']);
          const custom = parseDrinkCustomization(message);
          extractedItems.push({
            id: prod.IDSP,
            name: prod['Tên sản phẩm'],
            price: Number(prod['Đơn giá']),
            image: prod['Hình ảnh'],
            category: prod['Loại sản phẩm'],
            quantity: 1,
            size: custom.size,
            sugar: isFood ? '' : custom.sugar,
            ice: isFood ? '' : custom.ice,
            toppings: isFood ? [] : custom.toppings,
            note: buildMergedToppingNote(isFood ? [] : custom.toppings, ''),
            isOrderMatch: true,
          });
          if (extractedItems.length >= 3) break;
        }
      }
    }

    // Nếu vẫn chưa có món cụ thể, gợi ý theo sở thích tổng quát (bán chạy, thanh mát)
    if (extractedItems.length === 0) {
      if (lower.includes('ít ngọt') || lower.includes('thanh mát') || lower.includes('trái cây')) {
        activeProducts.filter((p) => p['Loại sản phẩm'] === 'Trà trái cây' || p['Loại sản phẩm'] === 'Trà').slice(0, 3).forEach((p) => {
          extractedItems.push({
            id: p.IDSP,
            name: p['Tên sản phẩm'],
            price: Number(p['Đơn giá']),
            image: p['Hình ảnh'],
            category: p['Loại sản phẩm'],
            quantity: 1,
            size: 'M',
            sugar: '100% đường',
            ice: '100% đá',
            toppings: [],
            note: '',
            isOrderMatch: false,
          });
        });
      } else {
        // Gợi ý các món best sellers
        activeProducts.slice(0, 3).forEach((p) => {
          extractedItems.push({
            id: p.IDSP,
            name: p['Tên sản phẩm'],
            price: Number(p['Đơn giá']),
            image: p['Hình ảnh'],
            category: p['Loại sản phẩm'],
            quantity: 1,
            size: 'M',
            sugar: '100% đường',
            ice: '100% đá',
            toppings: [],
            note: '',
            isOrderMatch: false,
          });
        });
      }
    }

    let replyText = 'Xin chào bạn! H2 MilkTea rất hân hạnh được phục vụ bạn.';
    if (extractedItems.length > 0) {
      const summary = extractedItems.map((it) => `${it.quantity || 1}x ${it.name}`).join(', ');
      replyText = `Mình đã tìm thấy các món bạn yêu cầu: ${summary}. Bạn có thể nhấn chọn bên dưới để thêm ngay vào giỏ hàng nhé!`;
    }

    const hasOrderMatch = extractedItems.some((i) => i.isOrderMatch);
    const finalIntent = hasOrderMatch ? 'ORDER_ADD' : 'RECOMMENDATION';

    return NextResponse.json({
      success: true,
      message: replyText,
      intent: finalIntent,
      suggestedProducts: extractedItems,
    });
  } catch (error) {
    console.error('Customer chat error:', error);
    return NextResponse.json({
      success: false,
      error: 'Không thể kết nối đến trợ lý ảo. Vui lòng thử lại sau giây lát!',
    }, { status: 500 });
  }
}
