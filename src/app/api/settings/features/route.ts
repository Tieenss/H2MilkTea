import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';
import {
  DEFAULT_FEATURE_CONFIG,
  normalizeFeatureConfig,
  type SystemFeaturesPayload,
} from '@/lib/settings/featureFlags';

const SETTINGS_KEY = 'system_features_config';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    const roleInfo = staff && supabase ? await getStaffRole(supabase, staff) : { role: 'Nhân viên', isAdmin: false };

    if (!supabase) {
      return NextResponse.json({
        success: true,
        isAdmin: roleInfo.isAdmin,
        config: DEFAULT_FEATURE_CONFIG,
      });
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('value, updated_at, updated_by')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error || !data || !data.value) {
      return NextResponse.json({
        success: true,
        isAdmin: roleInfo.isAdmin,
        config: DEFAULT_FEATURE_CONFIG,
      });
    }

    const normalized = normalizeFeatureConfig({
      ...(data.value as Partial<SystemFeaturesPayload>),
      updatedAt: data.updated_at || (data.value as any)?.updatedAt,
      updatedBy: data.updated_by || (data.value as any)?.updatedBy,
    });

    return NextResponse.json({
      success: true,
      isAdmin: roleInfo.isAdmin,
      config: normalized,
    });
  } catch {
    return NextResponse.json({
      success: true,
      config: DEFAULT_FEATURE_CONFIG,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request.headers.get('cookie') || '');
    if (!staff) {
      return NextResponse.json(
        { success: false, error: 'Chưa xác thực phiên đăng nhập.' },
        { status: 401 }
      );
    }

    const supabase = createAdminSupabaseClient();
    const { role, isAdmin } = await getStaffRole(supabase, staff);
    const isSystemAdmin =
      isAdmin ||
      role.toLowerCase() === 'admin' ||
      role.toLowerCase() === 'quản trị viên';

    if (!isSystemAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chỉ Quản trị viên (Admin) mới có quyền thay đổi cài đặt chức năng hệ thống.',
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<SystemFeaturesPayload>;
    const now = new Date().toISOString();
    const payload = normalizeFeatureConfig({
      ...body,
      updatedAt: now,
      updatedBy: staff.user_metadata?.username || staff.email || staff.id,
    });

    if (supabase) {
      const { error } = await supabase.from('app_settings').upsert({
        key: SETTINGS_KEY,
        value: payload,
        updated_by: staff.id,
        updated_at: now,
      });

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: `Không thể lưu lên Supabase: ${error.message}`,
            config: payload,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      config: payload,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Lỗi xử lý lưu cài đặt chức năng.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
