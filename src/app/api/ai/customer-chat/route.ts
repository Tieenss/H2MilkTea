import { NextRequest, NextResponse } from 'next/server';
import menuData from '@/data/DMHH.json';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

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
  size?: 'M' | 'L';
  isOrderMatch?: boolean;
}

// Chuẩn hóa chuỗi tiếng Việt để so khớp tương đồng cao
function normalizeText(val: string): string {
  return val
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
function matchProduct(query: string, catalog: ProductItem[]): { product: ProductItem; score: number } | null {
  const normQ = normalizeText(query);
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
    const intersection = [...qTokens].filter(t => nameTokens.has(t)).length;
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

    const supabase = createAdminSupabaseClient();
    let catalog: ProductItem[] = menuData as ProductItem[];

    if (supabase) {
      const { data } = await supabase.from('DMHH').select('*');
      if (data && data.length > 0) {
        catalog = data as ProductItem[];
      }
    }

    const activeProducts = catalog.filter((p) => !p['Trạng thái'] || p['Trạng thái'] === 'Hoạt động');

    // Rule-based FAQ nhanh cho các câu hỏi cố định
    const lower = message.toLowerCase();
    if (lower.includes('wifi') || lower.includes('mật khẩu') || lower.includes('pass wifi')) {
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

    // Tận dụng Gemini Flash với Structured Extraction
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const productListString = activeProducts
          .map((p) => `ID:${p.IDSP} | ${p['Tên sản phẩm']} | ${p['Loại sản phẩm']} | ${Number(p['Đơn giá'])}đ`)
          .join('\n');

        const systemPrompt = `Bạn là Trợ lý ảo tư vấn và tiếp nhận gọi món thông minh của quán H2 MilkTea.
Khách hàng có thể hỏi tư vấn HOẶC đưa ra yêu cầu gọi món (ví dụ: "cho tôi thêm 1 cafe sữa tươi và 3 chân trâu đường đen", "lấy cho mình 2 trà đào").

DANH SÁCH MENU CỦA QUÁN:
${productListString}

HƯỚNG DẪN XỬ LÝ:
1. Xác định ý định của khách:
   - "ORDER_ADD": Khi khách muốn gọi món, thêm món vào bàn, muốn lấy món (chứa từ: "cho tôi", "thêm", "lấy", "đặt", số lượng...).
   - "RECOMMENDATION": Khi khách muốn gợi ý theo sở thích (ít ngọt, thanh mát, bán chạy, cà phê, ăn vặt...).
   - "FAQ_GENERAL": Khi khách hỏi chung.
2. Với ORDER_ADD:
   - Bóc tách chính xác từng món khách muốn gọi, số lượng (quantity - số nguyên >= 1), và tên món tương ứng khớp trong menu.
   - Sửa lỗi chính tả tiếng Việt: "chân trâu" -> "trân châu", "cf" -> "cà phê", "đường đen" -> "Trà sữa trân châu đường đen", v.v.
3. Câu trả lời (message):
   - Trả lời tự nhiên, nhiệt tình, xác nhận đúng tên món và số lượng khách đã chọn.
   - Hỏi nhẹ nhàng về mức đường/đá/size nếu là đồ uống có thể chọn (Size M chuẩn, Size L +5k).

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT:
{
  "message": "Câu trả lời thân thiện bằng tiếng Việt gửi khách hàng",
  "intent": "ORDER_ADD" | "RECOMMENDATION" | "FAQ_GENERAL",
  "detectedItems": [
    {
      "productName": "Tên món khớp trong menu quán",
      "quantity": 1,
      "size": "M" | "L"
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
            const detectedItems: Array<{ productName: string; quantity?: number; size?: 'M' | 'L' }> = Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [];
            const suggestedNames: string[] = Array.isArray(parsed.suggestedProductNames) ? parsed.suggestedProductNames : [];

            const matchedSuggestions: SuggestedProductPayload[] = [];
            const addedIds = new Set<string>();

            // 1. Nạp các món đã được bóc tách từ yêu cầu đặt món
            for (const item of detectedItems) {
              const matched = matchProduct(item.productName, activeProducts);
              if (matched && !addedIds.has(matched.product.IDSP)) {
                addedIds.add(matched.product.IDSP);
                matchedSuggestions.push({
                  id: matched.product.IDSP,
                  name: matched.product['Tên sản phẩm'],
                  price: Number(matched.product['Đơn giá']),
                  image: matched.product['Hình ảnh'],
                  category: matched.product['Loại sản phẩm'],
                  quantity: Math.max(1, Number(item.quantity || 1)),
                  size: item.size === 'L' ? 'L' : 'M',
                  isOrderMatch: true,
                });
              }
            }

            // 2. Nạp thêm các món được gợi ý phụ (nếu chưa có trong danh sách)
            for (const name of suggestedNames) {
              if (matchedSuggestions.length >= 4) break;
              const matched = matchProduct(name, activeProducts);
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
                  isOrderMatch: false,
                });
              }
            }

            return NextResponse.json({
              success: true,
              message: aiMessage.trim(),
              intent: parsed.intent || 'GENERAL',
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
    let extractedItems: SuggestedProductPayload[] = [];
    const usedIds = new Set<string>();

    const cleanMessage = message
      .replace(/^(?:cho tôi|cho em|cho mình|lấy cho|lấy|thêm|đặt|muốn gọi|gọi)\s+/gi, '')
      .trim();

    // Tách theo các liên từ phân tách món: " và ", " với ", ",", "+", " rồi ", " thêm "
    const segments = cleanMessage.split(/\s*(?:,|và|\+|\bvới\b|\btiếp\b|\brồi\b|\bthêm\b)\s*/i).filter(Boolean);

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

      const matched = matchProduct(queryName, activeProducts);
      if (matched && !usedIds.has(matched.product.IDSP)) {
        usedIds.add(matched.product.IDSP);
        extractedItems.push({
          id: matched.product.IDSP,
          name: matched.product['Tên sản phẩm'],
          price: Number(matched.product['Đơn giá']),
          image: matched.product['Hình ảnh'],
          category: matched.product['Loại sản phẩm'],
          quantity: qty,
          size: 'M',
          isOrderMatch: true,
        });
      }
    }

    // Nếu không khớp theo segment, thử tìm tên món trực tiếp xuất hiện trong câu
    if (extractedItems.length === 0) {
      for (const prod of activeProducts) {
        const normName = normalizeText(prod['Tên sản phẩm']);
        const normMsg = normalizeText(message);
        if (normMsg.includes(normName) && !usedIds.has(prod.IDSP)) {
          usedIds.add(prod.IDSP);
          extractedItems.push({
            id: prod.IDSP,
            name: prod['Tên sản phẩm'],
            price: Number(prod['Đơn giá']),
            image: prod['Hình ảnh'],
            category: prod['Loại sản phẩm'],
            quantity: 1,
            size: 'M',
            isOrderMatch: true,
          });
          if (extractedItems.length >= 3) break;
        }
      }
    }

    // Nếu vẫn chưa có món cụ thể, gợi ý theo sở thích tổng quát (bán chạy, thanh mát)
    if (extractedItems.length === 0) {
      if (lower.includes('ít ngọt') || lower.includes('thanh mát') || lower.includes('trái cây')) {
        activeProducts.filter(p => p['Loại sản phẩm'] === 'Trà trái cây').slice(0, 3).forEach(p => {
          extractedItems.push({
            id: p.IDSP,
            name: p['Tên sản phẩm'],
            price: Number(p['Đơn giá']),
            image: p['Hình ảnh'],
            category: p['Loại sản phẩm'],
            quantity: 1,
            size: 'M',
            isOrderMatch: false,
          });
        });
      } else {
        // Gợi ý các món best sellers
        activeProducts.slice(0, 3).forEach(p => {
          extractedItems.push({
            id: p.IDSP,
            name: p['Tên sản phẩm'],
            price: Number(p['Đơn giá']),
            image: p['Hình ảnh'],
            category: p['Loại sản phẩm'],
            quantity: 1,
            size: 'M',
            isOrderMatch: false,
          });
        });
      }
    }

    let replyText = 'Xin chào bạn! H2 MilkTea rất hân hạnh được phục vụ bạn.';
    if (extractedItems.length > 0) {
      const summary = extractedItems.map(it => `${it.quantity || 1}x ${it.name}`).join(', ');
      replyText = `Mình đã tìm thấy các món bạn yêu cầu: ${summary}. Bạn có thể nhấn chọn bên dưới để thêm ngay vào giỏ hàng nhé!`;
    }

    return NextResponse.json({
      success: true,
      message: replyText,
      intent: extractedItems.some(i => i.isOrderMatch) ? 'ORDER_ADD' : 'RECOMMENDATION',
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
