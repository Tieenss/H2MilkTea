import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dsnvFallback from '@/data/DSNV.json';

export const dynamic = 'force-dynamic';

/**
 * Chuẩn hóa số điện thoại về dạng chuẩn (ví dụ +84901234567 -> 0901234567) để so sánh
 */
function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Đồng bộ mật khẩu mới lên tất cả tài khoản Supabase Auth liên kết với nhân viên
 * (bao gồm cả username@h2.com và email thật trong DSNV)
 */
export async function syncPasswordToSupabaseAuth(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  username: string,
  realEmail: string | undefined,
  newPassword: string,
  fullName?: string,
  role?: string
) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const h2Email = cleanUser.includes('@') ? cleanUser : `${cleanUser}@h2.com`;
  const targetEmails = new Set<string>([h2Email]);
  if (realEmail && String(realEmail).includes('@')) {
    targetEmails.add(String(realEmail).trim().toLowerCase());
  }

  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingUsers = listData?.users || [];

  for (const email of targetEmails) {
    const matched = existingUsers.find(
      (u: any) =>
        String(u.email || '').trim().toLowerCase() === email ||
        (u.user_metadata?.username &&
          String(u.user_metadata.username).trim().toLowerCase() === cleanUser &&
          email === h2Email)
    );

    if (matched) {
      await admin.auth.admin.updateUserById(matched.id, {
        password: newPassword,
        email_confirm: true,
      });
    } else {
      // Nếu tài khoản Auth chưa tồn tại cho email này thì tự động tạo để đăng nhập được cả bằng username lẫn email
      await admin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          username: cleanUser,
          full_name: fullName || cleanUser,
          role: role || 'Nhân viên',
        },
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tên đăng nhập tài khoản.' },
        { status: 400 }
      );
    }

    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập mật khẩu hiện tại!' },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập đầy đủ 2 lần mật khẩu mới!' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự!' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu mới nhập 2 lần không khớp nhau!' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const cleanUserLower = username.toLowerCase();

    // 1. Tìm thông tin nhân viên trong bảng DSNV
    let staffRow: any = null;
    if (admin) {
      const { data } = await admin
        .from('DSNV')
        .select('*')
        .or(`username.ilike.${cleanUserLower},Email.ilike.${cleanUserLower}`)
        .maybeSingle();
      if (data) staffRow = data;
    }

    if (!staffRow) {
      staffRow = (dsnvFallback as any[]).find(
        (u) =>
          String(u.username || '').trim().toLowerCase() === cleanUserLower ||
          String(u.Email || '').trim().toLowerCase() === cleanUserLower
      );
    }

    // 2. Kiểm tra mật khẩu hiện tại
    let isCurrentPasswordValid = false;

    // 2a. Kiểm tra với cột password trong bảng DSNV (nếu có)
    if (staffRow && staffRow.password && String(staffRow.password) === currentPassword) {
      isCurrentPasswordValid = true;
    }

    // 2b. Nếu trong DSNV không khớp (hoặc đã đổi trên Supabase Auth), thử xác thực qua Supabase Auth
    if (!isCurrentPasswordValid) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && anonKey) {
        const tempClient = createSupabaseClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const candidateEmails = new Set<string>([
          cleanUserLower.includes('@') ? cleanUserLower : `${cleanUserLower}@h2.com`,
        ]);
        if (staffRow?.Email) {
          candidateEmails.add(String(staffRow.Email).trim().toLowerCase());
        }

        for (const email of candidateEmails) {
          const { data: signInData, error: signInErr } = await tempClient.auth.signInWithPassword({
            email,
            password: currentPassword,
          });
          if (!signInErr && signInData?.user) {
            isCurrentPasswordValid = true;
            break;
          }
        }
      }
    }

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu hiện tại không chính xác!' },
        { status: 401 }
      );
    }

    // 3. Cập nhật mật khẩu mới vào bảng DSNV và Supabase Auth
    const targetUsername = staffRow?.username || username;
    if (admin) {
      await admin
        .from('DSNV')
        .update({ password: newPassword })
        .eq('username', targetUsername);

      await syncPasswordToSupabaseAuth(
        admin,
        targetUsername,
        staffRow?.Email,
        newPassword,
        staffRow?.['Họ và Tên'],
        staffRow?.['Phân quyền']
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
    });
  } catch (error: any) {
    console.error('[POST /api/auth/change-password] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi máy chủ khi đổi mật khẩu.' },
      { status: 500 }
    );
  }
}
