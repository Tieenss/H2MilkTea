import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
  return { id: user.id, email: user.email || '' };
}
