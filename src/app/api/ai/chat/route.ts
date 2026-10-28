import { NextRequest, NextResponse } from 'next/server';
import menuData from '@/data/DMHH.json';
import tableData from '@/data/DSBAN.json';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';
import { toActiveCatalog } from '@/lib/ai/catalog';
import { processAiPipeline } from '@/lib/ai/pipeline';
import type { TableInfo } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const body = await request.json() as {
      message?: unknown;
      history?: unknown;
      table?: unknown;
      cart?: unknown;
      pathname?: unknown;
      pageContext?: unknown;
      tables?: unknown;
    };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ success: false, error: 'Cần nhập câu lệnh món.' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    
    // 1. Kiểm tra setting bật/tắt toàn hệ thống, FAQ và Alias tùy biến của quán
    let customFaqs: any = null;
    let customAliases: Record<string, string> | undefined = undefined;

    if (supabase) {
      const [settingRes, faqRes, aliasRes] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'ai_assistant_enabled').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'store_custom_faq').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'store_custom_aliases').maybeSingle(),
      ]);

      if (settingRes.data && settingRes.data.value === false) {
        return NextResponse.json({ success: false, error: 'Chatbot đang được Admin tắt.' }, { status: 403 });
      }

      if (faqRes.data && Array.isArray(faqRes.data.value)) {
        customFaqs = faqRes.data.value;
      }

      if (aliasRes.data && typeof aliasRes.data.value === 'object' && aliasRes.data.value !== null) {
        customAliases = aliasRes.data.value as Record<string, string>;
      }
    }

    // 2. Lấy thông tin phân quyền nhân viên
    const { role: staffRole, isAdmin } = await getStaffRole(supabase, staff);

    // 3. Tải danh mục món ăn (DMHH)
    const { data: liveProducts } = supabase
      ? await supabase.from('DMHH').select('IDSP, Tên sản phẩm, Đơn giá, Trạng thái, Loại sản phẩm, Đơn vị tính')
      : { data: null };
    const rawProducts = liveProducts?.length ? liveProducts : menuData;
    const activeCatalogProducts = toActiveCatalog(rawProducts);

    if (activeCatalogProducts.length === 0) {
      return NextResponse.json({ success: false, error: 'Chưa tải được danh sách món đang bán.' }, { status: 503 });
    }

    // 4. Tải danh sách bàn (DSBAN)
    let tables: TableInfo[] = [];

    // Nếu client truyền danh sách bàn thực tế (vừa cập nhật / đổi tên bàn trong Quản lý bàn)
    if (Array.isArray(body.tables) && body.tables.length > 0) {
      tables = (body.tables as any[])
        .map((t) => ({
          id: String(t.id || t.IDBAN || ''),
          name: String(t.name || t['Tên bàn'] || ''),
        }))
        .filter((t) => t.id && t.name);
    }

    if (tables.length === 0) {
      const { data: liveTables } = supabase
        ? await supabase.from('DSBAN').select('IDBAN, Tên bàn, Trạng thái, Sức chứa tối đa')
        : { data: null };
      const rawTables = liveTables?.length ? liveTables : tableData;
      tables = (rawTables as Array<{ IDBAN?: string; 'Tên bàn'?: string; 'Trạng thái'?: string }>)
        .filter((t) => t['Trạng thái'] === 'Đang hoạt động' || !t['Trạng thái'])
        .map((t) => ({
          id: String(t.IDBAN || ''),
          name: String(t['Tên bàn'] || ''),
        }))
        .filter((t) => t.id && t.name);
    }

    // 5. Thực thi qua AI Pipeline an toàn
    const history = Array.isArray(body.history)
      ? body.history.filter((turn): turn is { role: 'user' | 'assistant'; content: string } => (
          typeof turn === 'object' && turn !== null
          && ((turn as any).role === 'user' || (turn as any).role === 'assistant')
          && typeof (turn as any).content === 'string'
        )).slice(-6)
      : [];

    const result = await processAiPipeline({
      rawMessage: message,
      history,
      currentTable: typeof body.table === 'string' ? body.table : undefined,
      currentCart: Array.isArray(body.cart) ? body.cart : [],
      currentRoute: typeof body.pathname === 'string' ? body.pathname : undefined,
      pageContext: typeof body.pageContext === 'string' ? body.pageContext : undefined,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staffRole,
        isAdmin,
      },
      catalog: activeCatalogProducts,
      tables,
      customFaqs,
      customAliases,
      apiKey,
    });

    if (!result.success && result.error) {
      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      action: result.action,
      targetTable: result.targetTable,
      items: result.items,
      message: result.message,
      logId: result.logId,
      source: result.source,
      isBlocked: result.isBlocked,
      blockedReason: result.blockedReason,
    });
  } catch (error) {
    console.error('Gemini POS chat pipeline failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể xử lý câu lệnh AI.' },
      { status: 500 },
    );
  }
}
