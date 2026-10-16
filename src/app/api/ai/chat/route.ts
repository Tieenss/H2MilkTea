import { NextRequest, NextResponse } from 'next/server';
import menuData from '@/data/DMHH.json';
import tableData from '@/data/DSBAN.json';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';
import { resolveTableFromMessage, TableInfo } from '@/lib/ai/table';
import { getKnowledgeBasePrompt } from '@/lib/ai/knowledge';
import { resolveProduct, toActiveCatalog } from '@/lib/ai/catalog';

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
    
    // 1. Kiểm tra setting bật/tắt toàn hệ thống
    const { data: setting } = supabase
      ? await supabase.from('app_settings').select('value').eq('key', 'ai_assistant_enabled').maybeSingle()
      : { data: null };
    if (setting && setting.value === false) {
      return NextResponse.json({ success: false, error: 'Chatbot đang được Admin tắt.' }, { status: 403 });
    }

    // 2. Lấy thông tin phân quyền nhân viên
    const { role: staffRole, isAdmin } = await getStaffRole(supabase, staff);

    // 3. Tải danh mục món ăn (DMHH)
    const { data: liveProducts } = supabase
      ? await supabase.from('DMHH').select('IDSP, Tên sản phẩm, Đơn giá, Trạng thái, Loại sản phẩm, Đơn vị tính')
      : { data: null };
    const rawProducts = liveProducts?.length ? liveProducts : menuData;
    const activeCatalogProducts = toActiveCatalog(rawProducts);
    const catalog: CatalogItem[] = activeCatalogProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
    }));

    if (catalog.length === 0) {
      return NextResponse.json({ success: false, error: 'Chưa tải được danh sách món đang bán.' }, { status: 503 });
    }

    // 4. Tải danh sách bàn (DSBAN)
    const { data: liveTables } = supabase
      ? await supabase.from('DSBAN').select('IDBAN, Tên bàn, Trạng thái, Sức chứa tối đa')
      : { data: null };
    const rawTables = liveTables?.length ? liveTables : tableData;
    const tables: TableInfo[] = (rawTables as Array<{ IDBAN?: string; 'Tên bàn'?: string; 'Trạng thái'?: string }>)
      .filter((t) => t['Trạng thái'] === 'Đang hoạt động' || !t['Trạng thái'])
      .map((t) => ({
        id: String(t.IDBAN || ''),
        name: String(t['Tên bàn'] || ''),
      }))
      .filter((t) => t.id && t.name);

    // Pre-resolve bàn từ câu lệnh người dùng nếu có
    const preResolvedTable = resolveTableFromMessage(message, tables);

    const history = Array.isArray(body.history)
      ? body.history.filter((turn): turn is ChatTurn => (
        typeof turn === 'object' && turn !== null
        && ((turn as ChatTurn).role === 'user' || (turn as ChatTurn).role === 'assistant')
        && typeof (turn as ChatTurn).content === 'string'
      )).slice(-10)
      : [];
    const currentCart = Array.isArray(body.cart) ? body.cart : [];
    const table = typeof body.table === 'string' ? body.table : 'Chưa chọn bàn';
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const candidateModels = Array.from(new Set([
      primaryModel,
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ]));

    const knowledgePrompt = getKnowledgeBasePrompt();

    const payload = JSON.stringify({
      systemInstruction: {
        parts: [{
          text: [
            'Bạn là trợ lý AI thông minh cho hệ thống POS H2 MilkTea.',
            `Nhân viên đang đăng nhập: vai trò "${staffRole}" (Quyền Admin: ${isAdmin ? 'Có' : 'Không'}).`,
            '',
            'Bạn có các nhiệm vụ sau:',
            '1. HỖ TRỢ GỌI MÓN VÀ CHỌN BÀN (action: "add" | "remove" | "select_table"):',
            '   - Phân tích câu lệnh tiếng Việt thành JSON gồm action, targetTable, items, message.',
            '   - Nếu người dùng có nhắc đến bàn (ví dụ: "cho bàn 3", "vào bàn 02", "khách mua về"), gán targetTable tương ứng.',
            '   - Nếu người dùng CHỈ muốn chuyển bàn hoặc mở bàn (ví dụ: "mở bàn 3", "chuyển sang bàn 2"), action là "select_table", items là [].',
            '   - Nếu nói thêm/gọi món, action là "add". Nếu nói bỏ/xóa/bớt món, action là "remove".',
            '   - Mỗi item phải có productId, productName, quantity (số nguyên từ 1 đến 10); note là chuỗi tùy chọn.',
            '   - Chỉ chọn productId có trong catalog. Nếu món không có trong catalog, không thêm món và giải thích trong message quán không có, gợi ý món tương đương.',
            '   - Nếu số lượng > 10 ly, giải thích trong message cần quản lý xác nhận số lượng lớn.',
            '',
            '2. HỎI ĐÁP NGHIỆP VỤ & HƯỚNG DẪN SỬ DỤNG (action: "qa"):',
            '   - Nếu người dùng hỏi cách sử dụng phần mềm, cách thêm món mới, sửa giá, phím tắt, cài máy in, xử lý lỗi...',
            '   - Đặt action = "qa", targetTable = null, items = [].',
            '   - Trả lời bằng tiếng Việt rõ ràng, từng bước dễ hiểu dựa trên CẨM NANG HƯỚNG DẪN SỬ DỤNG bên dưới.',
            '',
            '3. PHÂN QUYỀN AN TOÀN (Context-Aware):',
            '   - Nếu nhân viên không phải Admin mà yêu cầu các chức năng quản trị cấp cao (như xem báo cáo doanh thu tài chính, cấu hình hệ thống), đặt action = "none" và giải thích tài khoản hiện tại không có quyền.',
            '',
            `Bàn hiện tại: ${table}`,
            `Giỏ hàng hiện tại: ${JSON.stringify(currentCart)}`,
            `Danh sách Bàn hợp lệ: ${JSON.stringify(tables.map((t) => ({ id: t.id, name: t.name })))}`,
            `Catalog món hợp lệ: ${JSON.stringify(catalog)}`,
            '',
            knowledgePrompt,
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
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    });

    let result: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    } | null = null;
    let lastError: Error | null = null;

    for (const currentModel of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: payload,
          },
        );
        clearTimeout(timeout);

        const data = await response.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          error?: { message?: string };
        };

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          result = data;
          break;
        }

        console.warn(`Gemini model ${currentModel} returned status ${response.status} (${data.error?.message}), trying fallback...`);
        lastError = new Error(data.error?.message || `Model ${currentModel} gặp lỗi ${response.status}`);
      } catch (err) {
        clearTimeout(timeout);
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.warn(`Gemini model ${currentModel} timeout, trying fallback...`);
        } else {
          console.warn(`Gemini model ${currentModel} failed:`, err);
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Các model AI hiện đang bận hoặc quá tải. Vui lòng thử lại sau.');
    }

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, '')) as {
      action?: 'add' | 'remove' | 'select_table' | 'qa' | 'none';
      targetTable?: { id: string; name: string } | null;
      items?: ParsedItem[];
      message?: string;
    };

    const action = parsed.action || 'none';
    const validIds = new Map(catalog.map((item) => [item.id, item]));

    // Server-side validation cho items
    let validatedItems: ParsedItem[] = [];
    if (action === 'add' || action === 'remove') {
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      validatedItems = rawItems
        .map((item) => {
          let matched = validIds.get(item.productId);
          if (!matched && item.productName) {
            const resolution = resolveProduct(item.productName, activeCatalogProducts);
            if (resolution.status === 'resolved') {
              matched = validIds.get(resolution.product.id);
            }
          }
          if (matched && Number.isInteger(item.quantity) && item.quantity > 0) {
            return {
              productId: matched.id,
              productName: matched.name,
              quantity: Math.min(item.quantity, 10), // Giới hạn an toàn tối đa 10 ly
              note: item.note || '',
            };
          }
          return null;
        })
        .filter((item): item is ParsedItem => item !== null);
    }

    // Kết hợp kết quả nhận diện bàn
    let resolvedTargetTable: TableInfo | null = parsed.targetTable && parsed.targetTable.id
      ? parsed.targetTable
      : (preResolvedTable ? preResolvedTable.table : null);

    // Nếu bàn chỉ định không tồn tại trong danh sách bàn
    if (resolvedTargetTable && !tables.some((t) => t.id === resolvedTargetTable?.id)) {
      resolvedTargetTable = null;
    }

    return NextResponse.json({
      success: true,
      action,
      targetTable: resolvedTargetTable,
      items: validatedItems,
      message: parsed.message || (
        action === 'qa'
          ? 'Đã trả lời hướng dẫn.'
          : validatedItems.length
            ? 'Đã nhận diện món. Vui lòng xác nhận.'
            : action === 'select_table' && resolvedTargetTable
              ? `Chuyển sang ${resolvedTargetTable.name}.`
              : 'Chưa nhận diện được yêu cầu.'
      ),
    });
  } catch (error) {
    console.error('Gemini POS chat failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể xử lý câu lệnh AI.' },
      { status: 502 },
    );
  }
}
