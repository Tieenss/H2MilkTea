import { NextRequest, NextResponse } from 'next/server';
import menuData from '@/data/DMHH.json';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

interface CatalogItem {
  id: string;
  name: string;
  price: number;
}

interface ParsedItem {
  productId: string;
  productName: string;
  quantity: number;
  note?: string;
}

export async function POST(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Thiếu GEMINI_API_KEY trên server.' }, { status: 503 });
  }

  try {
    const body = await request.json() as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ success: false, error: 'Cần nhập câu lệnh món.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: liveProducts } = supabase
      ? await supabase.from('DMHH').select('IDSP, Tên sản phẩm, Đơn giá, Trạng thái')
      : { data: null };
    const catalog: CatalogItem[] = (liveProducts?.length ? liveProducts : menuData)
      .filter((product) => product['Trạng thái'] === 'Hoạt động')
      .map((product) => ({
        id: String(product.IDSP),
        name: String(product['Tên sản phẩm']),
        price: Number(product['Đơn giá']) || 0,
      }));

    if (catalog.length === 0) {
      return NextResponse.json({ success: false, error: 'Chưa tải được danh sách món đang bán.' }, { status: 503 });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: [
                'Bạn là trợ lý POS H2 MilkTea.',
                'Phân tích câu lệnh tiếng Việt thành JSON chỉ gồm {"items":[...],"message":"..."}',
                'Mỗi item phải có productId, productName, quantity là số nguyên dương; note là chuỗi tùy chọn.',
                'Chỉ chọn productId có trong catalog. Nếu không chắc chắn, không thêm item và giải thích trong message.',
                'Không tự áp mã giảm giá, thanh toán, đổi bàn hoặc thực hiện hành động khác.',
                `Catalog: ${JSON.stringify(catalog)}`,
              ].join('\n'),
            }],
          },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    );

    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(result.error?.message || 'Gemini không xử lý được yêu cầu.');
    }

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, '')) as {
      items?: ParsedItem[];
      message?: string;
    };
    const validIds = new Set(catalog.map((item) => item.id));
    const items = (Array.isArray(parsed.items) ? parsed.items : []).filter(
      (item) => validIds.has(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0,
    );

    return NextResponse.json({
      success: true,
      items,
      message: parsed.message || (items.length ? 'Đã nhận diện món. Vui lòng xác nhận.' : 'Chưa nhận diện được món.'),
    });
  } catch (error) {
    console.error('Gemini POS chat failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể xử lý câu lệnh AI.' },
      { status: 502 },
    );
  }
}
