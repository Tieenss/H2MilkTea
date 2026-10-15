import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

async function getContext(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return { staff: null, supabase: null, isAdmin: false };

  const supabase = createAdminSupabaseClient();
  if (!supabase) return { staff, supabase: null, isAdmin: false };
  const { data } = await supabase
    .from('DSNV')
    .select('"Phân quyền"')
    .eq('Email', staff.email)
    .maybeSingle();
  return { staff, supabase, isAdmin: data?.['Phân quyền'] === 'Admin' };
}

export async function GET(request: NextRequest) {
  const { staff, supabase } = await getContext(request);
  if (!staff || !supabase) return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 401 });
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'ai_assistant_enabled').maybeSingle();
  if (error) return NextResponse.json({ success: false, error: 'Không đọc được cài đặt chatbot.' }, { status: 500 });
  return NextResponse.json({ success: true, enabled: data?.value !== false });
}

export async function PUT(request: NextRequest) {
  const { staff, supabase, isAdmin } = await getContext(request);
  if (!staff || !supabase) return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ success: false, error: 'Chỉ Admin mới được đổi cài đặt chatbot.' }, { status: 403 });
  const body = await request.json() as { enabled?: unknown };
  if (typeof body.enabled !== 'boolean') return NextResponse.json({ success: false, error: 'Giá trị bật/tắt không hợp lệ.' }, { status: 400 });
  const { error } = await supabase.from('app_settings').upsert({
    key: 'ai_assistant_enabled',
    value: body.enabled,
    updated_by: staff.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ success: false, error: 'Không lưu được cài đặt chatbot.' }, { status: 500 });
  return NextResponse.json({ success: true, enabled: body.enabled });
}
