import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';

export interface AISettingsConfig {
  enabled: boolean;
  autoSubmitVoice: boolean;
  voiceSilenceTimeoutMs: number;
  maxItemQuantity: number;
}

const DEFAULT_SETTINGS: AISettingsConfig = {
  enabled: true,
  autoSubmitVoice: true,
  voiceSilenceTimeoutMs: 1500,
  maxItemQuantity: 10,
};

async function getContext(request: NextRequest) {
  const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
  if (!staff) return { staff: null, supabase: null, isAdmin: false };

  const supabase = createAdminSupabaseClient();
  if (!supabase) return { staff, supabase: null, isAdmin: false };

  const { isAdmin } = await getStaffRole(supabase, staff);
  return { staff, supabase, isAdmin };
}

export async function GET(request: NextRequest) {
  const { staff, supabase, isAdmin } = await getContext(request);
  if (!staff || !supabase) return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 401 });

  // Đọc cài đặt chi tiết hoặc fallback về ai_assistant_enabled
  const { data: configData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ai_assistant_settings')
    .maybeSingle();

  if (configData && typeof configData.value === 'object' && configData.value !== null) {
    const val = configData.value as Partial<AISettingsConfig>;
    return NextResponse.json({
      success: true,
      isAdmin,
      settings: {
        enabled: typeof val.enabled === 'boolean' ? val.enabled : true,
        autoSubmitVoice: typeof val.autoSubmitVoice === 'boolean' ? val.autoSubmitVoice : true,
        voiceSilenceTimeoutMs: typeof val.voiceSilenceTimeoutMs === 'number' ? val.voiceSilenceTimeoutMs : 1500,
        maxItemQuantity: typeof val.maxItemQuantity === 'number' ? val.maxItemQuantity : 10,
      },
    });
  }

  // Fallback đọc key cũ
  const { data: legacyData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ai_assistant_enabled')
    .maybeSingle();

  return NextResponse.json({
    success: true,
    isAdmin,
    settings: {
      ...DEFAULT_SETTINGS,
      enabled: legacyData?.value !== false,
    },
  });
}

export async function PUT(request: NextRequest) {
  const { staff, supabase, isAdmin } = await getContext(request);
  if (!staff || !supabase) return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ success: false, error: 'Chỉ Admin mới được đổi cài đặt chatbot.' }, { status: 403 });

  const body = await request.json() as Partial<AISettingsConfig> & { enabled?: unknown };

  // Hỗ trợ cả payload cũ { enabled: boolean } và payload mới { settings: AISettingsConfig }
  const nextSettings: AISettingsConfig = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
    autoSubmitVoice: typeof body.autoSubmitVoice === 'boolean' ? body.autoSubmitVoice : true,
    voiceSilenceTimeoutMs: typeof body.voiceSilenceTimeoutMs === 'number' ? body.voiceSilenceTimeoutMs : 1500,
    maxItemQuantity: typeof body.maxItemQuantity === 'number' && body.maxItemQuantity > 0 ? body.maxItemQuantity : 10,
  };

  const now = new Date().toISOString();

  // Lưu cả 2 key để bảo đảm tương thích ngược tuyệt đối
  await Promise.all([
    supabase.from('app_settings').upsert({
      key: 'ai_assistant_settings',
      value: nextSettings,
      updated_by: staff.id,
      updated_at: now,
    }),
    supabase.from('app_settings').upsert({
      key: 'ai_assistant_enabled',
      value: nextSettings.enabled,
      updated_by: staff.id,
      updated_at: now,
    }),
  ]);

  return NextResponse.json({ success: true, isAdmin: true, settings: nextSettings });
}
