import { createAdminSupabaseClient } from './server';

export interface OtpRecord {
  username: string;
  email: string;
  phone: string;
  method: 'email' | 'phone';
  contact: string;
  otp: string;
  usedSupabaseOtp?: boolean;
  verified: boolean;
  expiresAt: number;
  createdAt: number;
}

// Bộ nhớ đệm trong RAM phòng trường hợp chạy local/test
export const memoryOtpStore = new Map<string, OtpRecord>();

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
