import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/supabase/server';
import menuData from '@/data/DMHH.json';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Thiếu OPENAI_API_KEY trên server.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json() as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Cần nhập câu lệnh món.' },
        { status: 400 },
      );
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
      return NextResponse.json(
        { success: false, error: 'Chưa tải được danh sách món đang bán.' },
        { status: 503 },
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'Bạn là trợ lý POS H2 MilkTea.',
              'Phân tích câu lệnh tiếng Việt thành JSON chỉ gồm {"items":[...],"message":"..."} .',
              'Mỗi item phải có productId, productName, quantity là số nguyên dương; note là chuỗi tùy chọn.',
              'Chỉ chọn productId có trong catalog. Nếu không chắc chắn, không thêm item và giải thích trong message.',
              'Không tự áp mã giảm giá, thanh toán, đổi bàn hoặc thực hiện hành động khác.',
              `Catalog: ${JSON.stringify(catalog)}`,
            ].join('\n'),
          },
          { role: 'user', content: message },
        ],
      }),
    });

    const result = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(result.error?.message || 'OpenAI không xử lý được yêu cầu.');
    }

    const parsed = JSON.parse(result.choices?.[0]?.message?.content || '{}') as {
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
    console.error('AI POS chat failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể xử lý câu lệnh AI.' },
      { status: 502 },
    );
  }
}
