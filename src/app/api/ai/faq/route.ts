import { NextRequest, NextResponse } from 'next/server';
import defaultFaqs from '@/data/store_faq.json';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';

export interface StoreFAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  isActive: boolean;
  order: number;
}

const FAQ_SETTINGS_KEY = 'store_custom_faq';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    const { isAdmin } = await getStaffRole(supabase, staff);

    if (supabase) {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', FAQ_SETTINGS_KEY)
        .maybeSingle();

      if (data && Array.isArray(data.value)) {
        return NextResponse.json({
          success: true,
          isAdmin,
          faqs: data.value as StoreFAQItem[],
        });
      }
    }

    return NextResponse.json({
      success: true,
      isAdmin,
      faqs: defaultFaqs as StoreFAQItem[],
    });
  } catch (error) {
    console.error('Lỗi khi tải FAQ:', error);
    return NextResponse.json({
      success: true,
      isAdmin: false,
      faqs: defaultFaqs as StoreFAQItem[],
    });
  }
}

export async function PUT(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) {
    return NextResponse.json({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Không thể kết nối cơ sở dữ liệu.' }, { status: 503 });
  }

  const { isAdmin } = await getStaffRole(supabase, staff);
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Chỉ Admin mới có quyền cập nhật FAQ quán.' }, { status: 403 });
  }

  try {
    const body = await request.json() as { faqs?: unknown };
    if (!body || !Array.isArray(body.faqs)) {
      return NextResponse.json({ success: false, error: 'Dữ liệu FAQ không hợp lệ.' }, { status: 400 });
    }

    // Chuẩn hóa và làm sạch dữ liệu
    const cleanedFaqs: StoreFAQItem[] = body.faqs
      .filter((item): item is Record<string, any> => item && typeof item === 'object')
      .map((item, index) => {
        const question = typeof item.question === 'string' ? item.question.trim() : '';
        const answer = typeof item.answer === 'string' ? item.answer.trim() : '';
        const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Chung';
        const keywords = Array.isArray(item.keywords)
          ? item.keywords.map((k: any) => String(k).trim()).filter(Boolean)
          : [];

        return {
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `faq-${Date.now()}-${index}`,
          category,
          question,
          answer,
          keywords,
          isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
          order: typeof item.order === 'number' ? item.order : index + 1,
        };
      })
      .filter((item) => item.question && item.answer);

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase.from('app_settings').upsert({
      key: FAQ_SETTINGS_KEY,
      value: cleanedFaqs,
      updated_by: staff.id,
      updated_at: now,
    });

    if (upsertError) {
      console.error('Lỗi khi lưu FAQ vào Supabase:', upsertError);
      return NextResponse.json({ success: false, error: 'Không thể lưu cài đặt FAQ.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      faqs: cleanedFaqs,
    });
  } catch (err) {
    console.error('Lỗi phân tích payload FAQ:', err);
    return NextResponse.json({ success: false, error: 'Lỗi xử lý yêu cầu.' }, { status: 500 });
  }
}
