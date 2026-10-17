import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dsnvDataFallback from '@/data/DSNV.json';

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, email: user.email || '', user_metadata: user.user_metadata };
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
  const username = emailLower.includes('@') ? emailLower.split('@')[0] : emailLower;

  // 1. Nhận diện trực tiếp nếu username là 'admin' hoặc email bắt đầu bằng admin@ hoặc user_metadata role là admin
  if (
    username === 'admin' ||
    emailLower.startsWith('admin@') ||
    staff.user_metadata?.role?.toLowerCase() === 'admin' ||
    staff.user_metadata?.['Phân quyền'] === 'Admin'
  ) {
    return { role: 'Admin', isAdmin: true };
  }

  // 2. Tra cứu bảng DSNV trên Supabase (tìm theo username hoặc Email)
  if (supabase) {
    try {
      const { data } = await supabase
        .from('DSNV')
        .select('"Phân quyền", username, Email')
        .or(`username.eq.${username},Email.eq.${emailLower},Email.ilike.%${username}%`)
        .maybeSingle();

      if (data) {
        const role = data['Phân quyền'] || 'Nhân viên';
        const isAdmin = role === 'Admin' || data.username?.toLowerCase() === 'admin';
        return { role, isAdmin };
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra DSNV từ Supabase:', err);
    }
  }

  // 3. Fallback đối chiếu với file dữ liệu DSNV.json
  const fallbackUser = (dsnvDataFallback as Array<{ username?: string; Email?: string; 'Phân quyền'?: string }>).find(
    (u) =>
      (u.username && u.username.toLowerCase() === username) ||
      (u.Email && (u.Email.toLowerCase() === emailLower || u.Email.toLowerCase().startsWith(`${username}@`)))
  );

  if (fallbackUser) {
    const role = fallbackUser['Phân quyền'] || 'Nhân viên';
    const isAdmin = role === 'Admin' || fallbackUser.username?.toLowerCase() === 'admin';
    return { role, isAdmin };
  }

  return { role: 'Nhân viên', isAdmin: false };
}

