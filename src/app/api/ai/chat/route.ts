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

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
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
    const body = await request.json() as {
      message?: unknown;
      history?: unknown;
      table?: unknown;
      cart?: unknown;
    };
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

    const history = Array.isArray(body.history)
      ? body.history.filter((turn): turn is ChatTurn => (
        typeof turn === 'object' && turn !== null
        && ((turn as ChatTurn).role === 'user' || (turn as ChatTurn).role === 'assistant')
        && typeof (turn as ChatTurn).content === 'string'
      )).slice(-10)
      : [];
    const currentCart = Array.isArray(body.cart) ? body.cart : [];
    const table = typeof body.table === 'string' ? body.table : 'Chưa chọn bàn';
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: [
                'Bạn là trợ lý POS H2 MilkTea.',
                'Phân tích câu lệnh tiếng Việt thành JSON gồm {"action":"add"|"remove"|"none","items":[...],"message":"..."}',
                'Mỗi item phải có productId, productName, quantity là số nguyên dương; note là chuỗi tùy chọn.',
                'Chỉ chọn productId có trong catalog. Nếu không chắc chắn, không thêm item và giải thích trong message.',
                'Nếu người dùng nói thêm/gọi món, action là add. Nếu nói bỏ/xóa/bớt món, action là remove.',
                'Chỉ được remove món đang có trong giỏ hiện tại. Nếu không đủ thông tin, action là none và hỏi lại.',
                'Không tự áp mã giảm giá, thanh toán, đổi bàn hoặc thực hiện hành động khác.',
                `Bàn hiện tại: ${table}`,
                `Giỏ hàng hiện tại: ${JSON.stringify(currentCart)}`,
                `Catalog: ${JSON.stringify(catalog)}`,
              ].join('\n'),
            }],
          },
          contents: [
            ...history.map((turn) => ({
              role: turn.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: turn.content }],
            })),
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    );
    clearTimeout(timeout);

    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(result.error?.message || 'Gemini không xử lý được yêu cầu.');
    }

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, '')) as {
      action?: 'add' | 'remove' | 'none';
      items?: ParsedItem[];
      message?: string;
    };
    const validIds = new Set(catalog.map((item) => item.id));
    const items = (Array.isArray(parsed.items) ? parsed.items : []).filter(
      (item) => validIds.has(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0,
    );

    return NextResponse.json({
      success: true,
      action: parsed.action || 'none',
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
