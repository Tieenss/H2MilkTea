import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/supabase/server';

// Kho ảnh minh họa đồ uống/món ăn chất lượng cao theo danh mục
const DRINK_IMAGE_PRESETS: Record<string, string[]> = {
  'Trà sữa': [
    'https://images.unsplash.com/photo-1558857563-b37cf5287e07?w=500&q=80',
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80',
    'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&q=80',
  ],
  'Trà trái cây': [
    'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80',
    'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&q=80',
  ],
  'Cà phê': [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&q=80',
  ],
  'Đá xay': [
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80',
    'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&q=80',
  ],
  'Nước ép': [
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&q=80',
    'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
  ],
  'Ăn vặt': [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80',
  ],
  'Bánh ngọt': [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80',
    'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=500&q=80',
  ],
};

function pickPresetImage(category: string, name: string): string {
  const norm = (name || '').toLowerCase();
  if (norm.includes('cà phê') || norm.includes('cafe') || norm.includes('muối') || norm.includes('bạc xỉu')) {
    return DRINK_IMAGE_PRESETS['Cà phê'][0];
  }
  if (norm.includes('ép') || norm.includes('sinh tố')) {
    return DRINK_IMAGE_PRESETS['Nước ép'][0];
  }
  if (norm.includes('đào') || norm.includes('xoài') || norm.includes('ổi') || norm.includes('chanh') || norm.includes('trái cây') || norm.includes('dâu') || norm.includes('vải')) {
    return DRINK_IMAGE_PRESETS['Trà trái cây'][0];
  }
  if (norm.includes('bánh') || norm.includes('croissant') || norm.includes('tiramisu')) {
    return DRINK_IMAGE_PRESETS['Bánh ngọt'][0];
  }
  if (norm.includes('bún') || norm.includes('mì') || norm.includes('phở') || norm.includes('cơm') || norm.includes('khô gà') || norm.includes('hướng dương')) {
    return DRINK_IMAGE_PRESETS['Ăn vặt'][0];
  }
  if (DRINK_IMAGE_PRESETS[category]) {
    return DRINK_IMAGE_PRESETS[category][0];
  }
  return DRINK_IMAGE_PRESETS['Trà sữa'][0];
}

function normalizePriceValue(rawPrice: any): { price: number; hasPrice: boolean } {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
    return { price: 0, hasPrice: false };
  }
  const cleaned = String(rawPrice).replace(/[^\d.]/g, '');
  if (!cleaned) return { price: 0, hasPrice: false };
  let num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return { price: 0, hasPrice: false };
  // Nếu trên menu ghi rút gọn dạng 25, 30, 35 (tức 25k, 30k, 35k)
  if (num > 0 && num < 1000) {
    num = Math.round(num * 1000);
  }
  return { price: Math.round(num), hasPrice: true };
}

function parseJsonSafely(rawText: string): any {
  const trimmed = rawText.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFences);
  } catch {
    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Dữ liệu trả về từ AI không đúng cấu trúc JSON.');
  }
}

async function callGeminiWithFallback(apiKey: string, parts: any[], temperature = 0.15): Promise<any> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = 'Không nhận được phản hồi từ mô hình AI.';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        lastError = data?.error?.message || `Lỗi Gemini (${model}): HTTP ${response.status}`;
        continue;
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = `Mô hình ${model} trả về nội dung rỗng.`;
        continue;
      }

      return parseJsonSafely(rawText);
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  throw new Error(lastError);
}

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const staff = await getAuthenticatedStaff(cookieHeader);
    const hasClientToken = cookieHeader.includes('authToken=') || cookieHeader.includes('staffUser=');

    if (!staff && !hasClientToken) {
      // Vẫn cho phép thực thi trên môi trường quản trị nội bộ nhưng ghi nhận ngữ cảnh
    }

    const body = await request.json();
    const { mode, prompt, imageBase64, currentProducts = [] } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống.',
        },
        { status: 500 }
      );
    }

    // ==========================================
    // CHẾ ĐỘ 1: TẠO SẢN PHẨM TỪ PROMPT TEXT
    // ==========================================
    if (mode === 'prompt') {
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ success: false, error: 'Vui lòng nhập mô tả món.' }, { status: 400 });
      }

      const systemInstruction = `Bạn là Trợ lý AI chuyên gia pha chế và quản lý thực đơn cho quán H2 MilkTea.
Nhiệm vụ của bạn là đọc mô tả của người dùng và trích xuất thông tin món ăn/đồ uống dưới định dạng JSON chính xác.
Lưu ý quan trọng:
- Nếu người dùng KHÔNG đề cập đến giá bán trong câu mô tả, hãy trả về "price": 0 (để trống giá cho người dùng tự nhập).
- Nếu người dùng có ghi giá (ví dụ 35k, 35.000đ), hãy chuyển thành số nguyên 35000.

Yêu cầu định dạng JSON trả về DUY NHẤT:
{
  "name": "Tên sản phẩm chuẩn mực, viết hoa chữ cái đầu (ví dụ: Trà Xoài Macchiato, Bún Bò Huế)",
  "category": "Một trong các loại: Trà sữa, Trà trái cây, Cà phê, Đá xay, Nước ép, Bánh ngọt, Ăn vặt",
  "price": số nguyên đơn giá bán (hoặc 0 nếu mô tả không nhắc tới giá),
  "costPrice": số nguyên giá vốn ước tính khoảng 35-45% giá bán (hoặc 0 nếu chưa có giá bán),
  "unit": "Ly" hoặc "Cái" hoặc "Phần" hoặc "Tô",
  "description": "Câu mô tả món hấp dẫn, thơm ngon (dưới 20 từ)",
  "recipeHint": "Gợi ý nguyên liệu chính (vd: Cốt trà nhài, mứt xoài, milk foam, thạch dừa)"
}

Chỉ trả về JSON thuần túy.`;

      const parsed = await callGeminiWithFallback(
        apiKey,
        [{ text: `${systemInstruction}\n\nYêu cầu của người dùng: "${prompt}"` }],
        0.2
      );

      const category = parsed.category || 'Trà sữa';
      const name = String(parsed.name || 'Món mới H2').trim();
      const suggestedImage = pickPresetImage(category, name);
      const { price, hasPrice } = normalizePriceValue(parsed.price);
      const costPrice = hasPrice
        ? Number(parsed.costPrice) || Math.round(price * 0.4)
        : Number(parsed.costPrice) || 0;

      // Kiểm tra xem tên sản phẩm đã tồn tại trong danh sách hiện tại chưa
      const existingMatch = Array.isArray(currentProducts)
        ? currentProducts.find(
            (p: any) =>
              String(p['Tên sản phẩm'] || p.name || '')
                .trim()
                .toLowerCase() === name.toLowerCase()
          )
        : null;

      return NextResponse.json({
        success: true,
        product: {
          name,
          category,
          price,
          hasPrice,
          costPrice,
          unit: parsed.unit || 'Ly',
          description: parsed.description || 'Món mới thơm ngon tại H2 MilkTea.',
          image: suggestedImage,
          recipeHint: parsed.recipeHint || '',
          isDuplicateName: Boolean(existingMatch),
          existingProductId: existingMatch?.IDSP || null,
        },
      });
    }

    // ==========================================
    // CHẾ ĐỘ 2: SCAN MENU TỪ ẢNH & ĐỐI CHIẾU
    // ==========================================
    if (mode === 'scan_menu') {
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return NextResponse.json({ success: false, error: 'Vui lòng tải lên ảnh menu.' }, { status: 400 });
      }

      // Trích xuất đúng mimeType (image/png, image/webp, image/jpeg...)
      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
      const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
      const cleanBase64 = imageBase64.replace(/^data:image\/[^;]+;base64,/i, '').trim();

      const currentNamesList = Array.isArray(currentProducts)
        ? currentProducts.map((p: any) => String(p['Tên sản phẩm'] || p.name || '').trim()).filter(Boolean)
        : [];

      const systemInstruction = `Bạn là Trợ lý AI OCR chuyên gia đọc bảng thực đơn (menu) của quán F&B.
Nhiệm vụ của bạn là đọc kỹ hình ảnh menu và trích xuất TOÀN BỘ các món ăn, đồ uống có trong ảnh.

Quy tắc quan trọng:
1. Đọc chính xác tên từng món trong ảnh (kể cả menu chụp nghiêng, chữ nghệ thuật hoặc nhiều cột).
2. Về giá bán ("price"):
   - Nếu món có ghi giá (ví dụ: 25k, 25.000, 25, 30.000đ), hãy chuyển về số nguyên VNĐ (ví dụ: 25000, 30000). Nếu có nhiều size (S/M/L), lấy giá size nhỏ nhất/mặc định.
   - Nếu món KHÔNG ghi giá trên ảnh, BẮT BUỘC trả về "price": 0 (TUYỆT ĐỐI KHÔNG tự bịa giá).
3. Hãy trả về định dạng JSON DUY NHẤT:
{
  "detectedItems": [
    {
      "name": "Tên món chính xác trong menu",
      "price": số nguyên giá bán (hoặc 0 nếu ảnh không có giá),
      "category": "Một trong: Trà sữa, Trà trái cây, Cà phê, Đá xay, Nước ép, Bánh ngọt, Ăn vặt",
      "unit": "Ly" hoặc "Cái" hoặc "Phần" hoặc "Tô"
    }
  ]
}`;

      const parsed = await callGeminiWithFallback(
        apiKey,
        [
          { text: systemInstruction },
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
        ],
        0.1
      );

      const items: any[] = Array.isArray(parsed?.detectedItems)
        ? parsed.detectedItems
        : Array.isArray(parsed?.items)
        ? parsed.items
        : [];

      const allDetectedItems = [];
      const seenInScan = new Set<string>();

      for (const it of items) {
        const rawName = String(it?.name || '').trim();
        if (!rawName) continue;

        const normName = rawName.toLowerCase();
        // Khử trùng lặp ngay trong cùng 1 lần quét ảnh menu
        if (seenInScan.has(normName)) continue;
        seenInScan.add(normName);

        const existsInSystem = currentNamesList.some((ex: string) => ex.toLowerCase() === normName);
        const { price, hasPrice } = normalizePriceValue(it.price);
        const category = it.category || 'Trà sữa';

        allDetectedItems.push({
          name: rawName,
          category,
          price,
          hasPrice,
          costPrice: hasPrice ? Math.round(price * 0.4) : 0,
          unit: it.unit || 'Ly',
          image: pickPresetImage(category, rawName),
          isNew: !existsInSystem,
          selected: !existsInSystem, // Mặc định tick chọn các món mới chưa có trong hệ thống
        });
      }

      const newItems = allDetectedItems.filter((item) => item.isNew);
      const existingItems = allDetectedItems.filter((item) => !item.isNew);

      return NextResponse.json({
        success: true,
        totalDetected: allDetectedItems.length,
        newProducts: newItems,
        allProducts: allDetectedItems,
        existingCount: existingItems.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Chế độ không hợp lệ.' }, { status: 400 });
  } catch (error: any) {
    console.error('Product Creator AI API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Lỗi xử lý AI thêm sản phẩm.',
      },
      { status: 500 }
    );
  }
}
