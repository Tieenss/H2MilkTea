import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dsnvDataFallback from '@/data/DSNV.json';
export { getSafeStaffUuid } from './uuid';

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface DsnvStaffRow {
  username?: string;
  'Họ và Tên'?: string;
  'Phân quyền'?: string;
  Email?: string;
}

async function findDsnvStaff(
  supabase: ReturnType<typeof createAdminSupabaseClient> | any,
  lookupUsername: string,
  emailLower: string
): Promise<DsnvStaffRow | null> {
  const cleanUser = lookupUsername.toLowerCase().trim();
  const cleanEmail = emailLower.toLowerCase().trim();

  if (supabase && (cleanUser || cleanEmail)) {
    try {
      const orFilters = [
        cleanUser ? `username.ilike.${cleanUser}` : '',
        cleanEmail ? `Email.ilike.${cleanEmail}` : '',
      ].filter(Boolean).join(',');

      if (orFilters) {
        const { data } = await supabase
          .from('DSNV')
          .select('"Phân quyền", username, "Họ và Tên", Email')
          .or(orFilters)
          .maybeSingle();
        if (data) return data as DsnvStaffRow;
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra DSNV từ Supabase:', err);
    }
  }

  return (
    (dsnvDataFallback as DsnvStaffRow[]).find(
      (u) =>
        (cleanUser && u.username && u.username.toLowerCase() === cleanUser) ||
        (cleanEmail && u.Email && u.Email.toLowerCase() === cleanEmail)
    ) || null
  );
}

export async function getAuthenticatedStaff(cookieHeader = '') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookiePairs = cookieHeader.split(';').map((entry) => entry.trim()).filter(Boolean).flatMap((entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) return [];
    const rawValue = entry.slice(separator + 1);
    let value = rawValue;
    try { value = decodeURIComponent(rawValue); } catch { /* Keep the raw cookie if it contains malformed escaping. */ }
    return [{ name: entry.slice(0, separator), value }];
  });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookiePairs,
      setAll: () => {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const staffCookie = cookiePairs.find((c) => c.name === 'staffUser');
  let parsedStaffCookie: any = null;
  if (staffCookie && staffCookie.value) {
    try {
      parsedStaffCookie = JSON.parse(staffCookie.value);
    } catch {
      // Bỏ qua lỗi parse
    }
  }

  if (user) {
    const emailLower = String(user.email || '').toLowerCase().trim();
    const emailPrefix = emailLower.includes('@') ? emailLower.split('@')[0] : emailLower;
    const metaUsername = String(user.user_metadata?.username || '').toLowerCase().trim();
    const lookupUsername = metaUsername || emailPrefix;

    const dsnvRow = await findDsnvStaff(createAdminSupabaseClient(), lookupUsername, emailLower);

    // Chỉ dùng thông tin bổ sung từ staffUser cookie nếu cùng khớp tài khoản đang đăng nhập
    let matchedCookieInfo: any = null;
    if (parsedStaffCookie) {
      const cookieUser = String(parsedStaffCookie.username || '').toLowerCase().trim();
      const cookieEmail = String(parsedStaffCookie.email || '').toLowerCase().trim();
      if (
        (cookieUser && (cookieUser === lookupUsername || cookieUser === emailPrefix)) ||
        (cookieEmail && cookieEmail === emailLower)
      ) {
        matchedCookieInfo = parsedStaffCookie;
      }
    }

    const resolvedUsername = String(
      dsnvRow?.username || user.user_metadata?.username || matchedCookieInfo?.username || emailPrefix || ''
    ).trim();
    const resolvedName = String(
      dsnvRow?.['Họ và Tên'] ||
        matchedCookieInfo?.name ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        resolvedUsername ||
        user.email ||
        'Thu ngân'
    ).trim();
    const resolvedRole = String(
      dsnvRow?.['Phân quyền'] || user.user_metadata?.role || matchedCookieInfo?.role || 'Nhân viên'
    ).trim();

    return {
      id: user.id,
      email: user.email || dsnvRow?.Email || '',
      user_metadata: {
        ...(user.user_metadata || {}),
        username: resolvedUsername,
        name: resolvedName,
        fullName: resolvedName,
        role: resolvedRole,
      },
    };
  }

  // Fallback: Hỗ trợ xác thực nhân viên qua cookie staffUser hoặc authToken nếu phiên Supabase Auth hết hạn
  if (parsedStaffCookie) {
    const cookieUsername = String(parsedStaffCookie.username || 'staff').trim();
    const cookieEmail = String(parsedStaffCookie.email || `${cookieUsername}@h2.com`).trim();
    const dsnvRow = await findDsnvStaff(createAdminSupabaseClient(), cookieUsername, cookieEmail);

    const resolvedName = String(
      dsnvRow?.['Họ và Tên'] || parsedStaffCookie.name || parsedStaffCookie.username || 'Thu ngân'
    ).trim();
    return {
      id: String(cookieUsername || 'staff_pos'),
      email: String(dsnvRow?.Email || cookieEmail),
      user_metadata: {
        role: dsnvRow?.['Phân quyền'] || parsedStaffCookie.role || 'Thu ngân',
        name: resolvedName,
        fullName: resolvedName,
        username: dsnvRow?.username || cookieUsername || 'staff',
      },
    };
  }

  const authCookie = cookiePairs.find((c) => c.name === 'authToken');
  if (authCookie && authCookie.value) {
    return {
      id: 'staff_pos',
      email: 'staff@h2.com',
      user_metadata: { role: 'Thu ngân', name: 'Thu ngân' },
    };
  }

  return null;
}

export interface StaffRoleResult {
  role: string;
  isAdmin: boolean;
}

export async function getStaffRole(
  supabase: ReturnType<typeof createAdminSupabaseClient> | any,
  staff: { id: string; email: string; user_metadata?: Record<string, any> } | null
): Promise<StaffRoleResult> {
  if (!staff || !staff.email) {
    return { role: 'Khách', isAdmin: false };
  }

  const emailLower = staff.email.toLowerCase().trim();
  const username = (staff.user_metadata?.username || (emailLower.includes('@') ? emailLower.split('@')[0] : emailLower)).toLowerCase().trim();

  const dsnvUser = await findDsnvStaff(supabase, username, emailLower);
  if (dsnvUser) {
    const role = dsnvUser['Phân quyền'] || 'Nhân viên';
    const isAdmin = role.toLowerCase() === 'admin' || dsnvUser.username?.toLowerCase() === 'admin';
    return { role, isAdmin };
  }

  return { role: 'Nhân viên', isAdmin: false };
}
