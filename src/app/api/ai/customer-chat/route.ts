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

    // Rule-based FAQ & Fallback nhanh khi khách hỏi về Wifi, Giờ mở cửa, Khuyến mãi
    const lower = message.toLowerCase();
    if (lower.includes('wifi') || lower.includes('mật khẩu') || lower.includes('pass')) {
      return NextResponse.json({
        success: true,
        message: '📶 Wifi của quán: "H2 MilkTea 5G" · Mật khẩu: 88888888 (Tốc độ cao miễn phí). Chúc bạn có trải nghiệm tuyệt vời!',
        suggestedProducts: [],
      });
    }

    if (lower.includes('giờ mở cửa') || lower.includes('mở cửa') || lower.includes('đóng cửa') || lower.includes('mấy giờ')) {
      return NextResponse.json({
        success: true,
        message: '⏰ Quán mở cửa từ 07:00 đến 22:30 tất cả các ngày trong tuần. Bạn có thể ghé thưởng thức trà sữa bất cứ lúc nào!',
        suggestedProducts: [],
      });
    }

    if (lower.includes('thanh toán') || lower.includes('chuyển khoản')) {
      return NextResponse.json({
        success: true,
        message: '💳 Quán nhận thanh toán bằng tiền mặt và chuyển khoản QR ngân hàng tại quầy thu ngân khi bạn nhận món nhé!',
        suggestedProducts: [],
      });
    }

    // Gợi ý sản phẩm thông minh theo ngữ cảnh
    let matchedProducts: ProductItem[] = [];

    if (lower.includes('ít ngọt') || lower.includes('thanh mát') || lower.includes('giải nhiệt') || lower.includes('trái cây')) {
      matchedProducts = activeProducts.filter((p) => p['Loại sản phẩm'] === 'Trà trái cây').slice(0, 3);
    } else if (lower.includes('cà phê') || lower.includes('cafe') || lower.includes('tỉnh táo')) {
      matchedProducts = activeProducts.filter((p) => p['Loại sản phẩm'] === 'Cà phê').slice(0, 3);
    } else if (lower.includes('ăn vặt') || lower.includes('bánh')) {
      matchedProducts = activeProducts.filter((p) => ['Ăn vặt', 'Bánh ngọt'].includes(p['Loại sản phẩm'])).slice(0, 3);
    } else if (lower.includes('hot') || lower.includes('bán chạy') || lower.includes('ngon nhất') || lower.includes('gợi ý')) {
      matchedProducts = activeProducts.filter((p) =>
        p['Tên sản phẩm'].toLowerCase().includes('nướng') ||
        p['Tên sản phẩm'].toLowerCase().includes('đào') ||
        p['Tên sản phẩm'].toLowerCase().includes('muối') ||
        p['Loại sản phẩm'] === 'Trà sữa'
      ).slice(0, 3);
    }

    // Nếu có Gemini API Key, gọi mô hình AI để phản hồi tự nhiên và chuyên nghiệp
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const productCatalogSummary = activeProducts
          .map((p) => `- ${p['Tên sản phẩm']} (${p['Loại sản phẩm']}, ${Number(p['Đơn giá']).toLocaleString('vi-VN')}đ)`)
          .join('\n');

        const systemPrompt = `Bạn là Trợ lý ảo tư vấn gọi món thân thiện của quán H2 MilkTea.
Hãy trả lời khách hàng một cách vui vẻ, lịch sự, hoàn thành trọn vẹn câu nói bằng tiếng Việt (từ 2 đến 4 câu đầy đủ ý nghĩa, tuyệt đối không ngắt câu dở chừng).
Tư vấn món phù hợp theo sở thích khách hàng dựa trên thực đơn sau:
${productCatalogSummary}
Nếu khách hỏi về đường, đá, size: Quán có Size M (chuẩn), Size L (+5.000đ), mức đường 0%-30%-50%-70%-100%, mức đá vừa/ít/không đá.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nLịch sử chat gần nhất: ${JSON.stringify(history.slice(-4))}\n\nKhách hàng hỏi: "${message}"` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        });

        const data = await response.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (aiText) {
          // Tìm thêm sản phẩm xuất hiện trong câu trả lời của AI
          if (matchedProducts.length === 0) {
            matchedProducts = activeProducts.filter((p) =>
              aiText.toLowerCase().includes(p['Tên sản phẩm'].toLowerCase())
            ).slice(0, 3);
          }

          return NextResponse.json({
            success: true,
            message: aiText.trim(),
            suggestedProducts: matchedProducts.map((p) => ({
              id: p.IDSP,
              name: p['Tên sản phẩm'],
              price: Number(p['Đơn giá']),
              image: p['Hình ảnh'],
              category: p['Loại sản phẩm'],
            })),
          });
        }
      } catch (geminiError) {
        console.warn('Customer AI Gemini call failed, falling back to rule-based:', geminiError);
      }
    }

    // Fallback thông minh khi không có API key hoặc Gemini quá tải
    let fallbackReply = 'Xin chào bạn! H2 MilkTea có rất nhiều món ngon. Bạn thích trà sữa đậm vị béo ngậy, trà trái cây thanh mát hay cà phê tỉnh táo?';
    if (matchedProducts.length > 0) {
      const names = matchedProducts.map((p) => p['Tên sản phẩm']).join(', ');
      fallbackReply = `Dạ quán xin gợi ý cho bạn các món rất được yêu thích: ${names}. Bạn có thể bấm chọn ngay bên dưới để thử nhé!`;
    }

    return NextResponse.json({
      success: true,
      message: fallbackReply,
      suggestedProducts: matchedProducts.map((p) => ({
        id: p.IDSP,
        name: p['Tên sản phẩm'],
        price: Number(p['Đơn giá']),
        image: p['Hình ảnh'],
        category: p['Loại sản phẩm'],
      })),
    });
  } catch (error) {
    console.error('Customer chat error:', error);
    return NextResponse.json({
      success: false,
      error: 'Không thể kết nối đến trợ lý ảo. Vui lòng thử lại sau giây lát!',
    }, { status: 500 });
  }
}
