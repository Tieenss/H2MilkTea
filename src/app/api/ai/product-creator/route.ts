import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/supabase/server';

// Kho ảnh minh họa đồ uống chất lượng cao theo danh mục
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
  if (norm.includes('cà phê') || norm.includes('cafe') || norm.includes('muối')) {
    return DRINK_IMAGE_PRESETS['Cà phê'][0];
  }
  if (norm.includes('đào') || norm.includes('xoài') || norm.includes('ổi') || norm.includes('chanh') || norm.includes('trái cây') || norm.includes('dâu')) {
    return DRINK_IMAGE_PRESETS['Trà trái cây'][0];
  }
  if (norm.includes('bánh') || norm.includes('croissant')) {
    return DRINK_IMAGE_PRESETS['Bánh ngọt'][0];
  }
  if (DRINK_IMAGE_PRESETS[category]) {
    return DRINK_IMAGE_PRESETS[category][0];
  }
  return DRINK_IMAGE_PRESETS['Trà sữa'][0];
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập quyền quản lý để sử dụng AI.' }, { status: 401 });
    }

    const body = await request.json();
    const { mode, prompt, imageBase64, currentProducts = [] } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống.',
      }, { status: 500 });
    }

    // ==========================================
    // CHẾ ĐỘ 1: TẠO SẢN PHẨM TỪ PROMPT TEXT
    // ==========================================
    if (mode === 'prompt') {
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ success: false, error: 'Vui lòng nhập mô tả món.' }, { status: 400 });
      }

      const systemInstruction = `Bạn là Trợ lý AI chuyên gia pha chế và quản lý menu cho quán trà sữa H2 MilkTea.
Nhiệm vụ của bạn là đọc mô tả của người dùng và trích xuất ra thông tin món ăn/đồ uống dưới định dạng JSON chính xác.

Yêu cầu định dạng JSON trả về DUY NHẤT:
{
  "name": "Tên sản phẩm chuẩn mực, viết hoa chữ cái đầu (ví dụ: Trà Xoài Macchiato)",
  "category": "Một trong các loại: Trà sữa, Trà trái cây, Cà phê, Đá xay, Bánh ngọt, Ăn vặt",
  "price": số nguyên đơn giá bán (vd: 32000),
  "costPrice": số nguyên giá vốn ước tính thường khoảng 35-45% giá bán (vd: 12000),
  "unit": "Ly" hoặc "Cái" hoặc "Phần",
  "description": "Câu mô tả món hấp dẫn, thơm ngon (dưới 20 từ)",
  "recipeHint": "Gợi ý nguyên liệu chính (vd: Cốt trà nhài, mứt xoài, milk foam, thạch dừa)"
}

Chỉ trả về JSON thuần túy, không có markdown code block backticks.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nYêu cầu của người dùng: "${prompt}"` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Không nhận được phản hồi từ mô hình AI.');
      }

      const parsed = JSON.parse(rawText);
      const category = parsed.category || 'Trà sữa';
      const name = parsed.name || 'Món mới H2';
      const suggestedImage = pickPresetImage(category, name);

      return NextResponse.json({
        success: true,
        product: {
          name,
          category,
          price: Number(parsed.price) || 30000,
          costPrice: Number(parsed.costPrice) || 12000,
          unit: parsed.unit || 'Ly',
          description: parsed.description || 'Món đồ uống mới thơm ngon của quán.',
          image: suggestedImage,
          recipeHint: parsed.recipeHint || '',
        },
      });
    }

    // ==========================================
    // CHẾ ĐỘ 2: SCAN MENU TỪ ẢNH & ĐỐI CHIẾU
    // ==========================================
    if (mode === 'scan_menu') {
      if (!imageBase64) {
        return NextResponse.json({ success: false, error: 'Vui lòng tải lên ảnh menu.' }, { status: 400 });
      }

      // Làm sạch base64 nếu có data:image/...;base64,
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

      const currentNamesList = Array.isArray(currentProducts)
        ? currentProducts.map((p: any) => p['Tên sản phẩm'] || p.name || '').filter(Boolean)
        : [];

      const systemInstruction = `Bạn là Trợ lý AI OCR chuyên gia đọc bảng thực đơn của quán F&B.
Nhiệm vụ của bạn là nhận diện TOÀN BỘ các món ăn, đồ uống có trong hình ảnh menu được cung cấp.

Danh sách các món ĐÃ CÓ trên hệ thống quán:
${JSON.stringify(currentNamesList)}

Hãy phân tích và trả về định dạng JSON DUY NHẤT:
{
  "detectedItems": [
    {
      "name": "Tên món chính xác trong menu",
      "price": số nguyên giá bán (nếu menu ghi 30k thì là 30000),
      "category": "Một trong: Trà sữa, Trà trái cây, Cà phê, Đá xay, Bánh ngọt, Ăn vặt",
      "unit": "Ly" hoặc "Cái" hoặc "Phần"
    }
  ]
}

Chỉ trả về JSON thuần túy, không có text dư thừa.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemInstruction },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('AI không nhận diện được chữ trong ảnh menu.');
      }

      const parsed = JSON.parse(rawText);
      const items: any[] = Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [];

      // Đối chiếu với danh mục hiện tại để phân loại món mới
      const newItems = [];
      const existingItems = [];

      for (const it of items) {
        const normName = String(it.name || '').trim().toLowerCase();
        const exists = currentNamesList.some((ex: string) => ex.trim().toLowerCase() === normName);

        const itemPayload = {
          name: it.name,
          category: it.category || 'Trà sữa',
          price: Number(it.price) || 28000,
          costPrice: Math.round((Number(it.price) || 28000) * 0.4),
          unit: it.unit || 'Ly',
          image: pickPresetImage(it.category || 'Trà sữa', it.name),
          isNew: !exists,
        };

        if (exists) {
          existingItems.push(itemPayload);
        } else {
          newItems.push(itemPayload);
        }
      }

      return NextResponse.json({
        success: true,
        totalDetected: items.length,
        newProducts: newItems,
        existingCount: existingItems.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Chế độ không hợp lệ.' }, { status: 400 });
  } catch (error: any) {
    console.error('Product Creator AI API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi xử lý AI thêm sản phẩm.',
    }, { status: 500 });
  }
}
