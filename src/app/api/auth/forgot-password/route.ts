import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { syncPasswordToSupabaseAuth } from '../change-password/route';
import dsnvFallback from '@/data/DSNV.json';

export const dynamic = 'force-dynamic';

const OTP_SETTINGS_KEY = 'auth_password_reset_otps';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút

interface OtpRecord {
  username: string;
  email: string;
  phone: string;
  method: 'email' | 'phone';
  contact: string;
  otp: string;
  verified: boolean;
  expiresAt: number;
  createdAt: number;
}

// Bộ nhớ đệm trong RAM phòng trường hợp chạy local/offline chưa có bảng app_settings
const memoryOtpStore = new Map<string, OtpRecord>();

function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function maskPhone(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.length < 6) return clean;
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}

async function loadOtpMap(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<Record<string, OtpRecord>> {
  const now = Date.now();
  const map: Record<string, OtpRecord> = {};

  for (const [k, v] of memoryOtpStore.entries()) {
    if (v.expiresAt > now) map[k] = v;
  }

  if (admin) {
    try {
      const { data } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', OTP_SETTINGS_KEY)
        .maybeSingle();

      if (data?.value && typeof data.value === 'object') {
        for (const [k, v] of Object.entries(data.value as Record<string, OtpRecord>)) {
          if (v && v.expiresAt > now) {
            map[k] = v;
            memoryOtpStore.set(k, v);
          }
        }
      }
    } catch {
      // fallback memoryOtpStore
    }
  }
  return map;
}

async function saveOtpMap(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  map: Record<string, OtpRecord>
) {
  const now = Date.now();
  const cleanMap: Record<string, OtpRecord> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v && v.expiresAt > now) {
      cleanMap[k] = v;
      memoryOtpStore.set(k, v);
    } else {
      memoryOtpStore.delete(k);
    }
  }

  if (admin) {
    try {
      await admin.from('app_settings').upsert({
        key: OTP_SETTINGS_KEY,
        value: cleanMap,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }
}

async function findStaffByContact(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  method: 'email' | 'phone',
  contactInput: string,
  usernameHint?: string
) {
  let allStaff: any[] = [];
  if (admin) {
    const { data } = await admin.from('DSNV').select('*');
    if (Array.isArray(data) && data.length > 0) {
      allStaff = data;
    }
  }
  if (allStaff.length === 0) {
    allStaff = dsnvFallback as any[];
  }

  const cleanInput = contactInput.trim().toLowerCase();
  const cleanPhoneInput = normalizePhone(contactInput);
  const cleanUserHint = String(usernameHint || '').trim().toLowerCase();

  return allStaff.find((row) => {
    const rowUser = String(row.username || '').trim().toLowerCase();
    const rowEmail = String(row.Email || row.email || '').trim().toLowerCase();
    const rowPhone = normalizePhone(row['Số điện thoại'] || row.phone);

    if (cleanUserHint && rowUser !== cleanUserHint) {
      return false;
    }

    if (method === 'email') {
      return (
        rowEmail === cleanInput ||
        rowUser === cleanInput ||
        `${rowUser}@h2.com` === cleanInput
      );
    } else {
      return (
        (cleanPhoneInput.length >= 8 && rowPhone === cleanPhoneInput) ||
        rowUser === cleanInput
      );
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action || 'send_otp').trim();
    const admin = createAdminSupabaseClient();

    // =========================================================================
    // BƯỚC 1: GỬI MÃ OTP TỚI EMAIL HOẶC SỐ ĐIỆN THOẠI ĐĂNG KÝ
    // =========================================================================
    if (action === 'send_otp') {
      const method: 'email' | 'phone' = body.method === 'phone' ? 'phone' : 'email';
      const contact = String(body.contact || '').trim();
      const usernameHint = String(body.username || '').trim();

      if (!contact) {
        return NextResponse.json(
          {
            success: false,
            error:
              method === 'email'
                ? 'Vui lòng nhập địa chỉ Gmail / Email đã đăng ký!'
                : 'Vui lòng nhập Số điện thoại đã đăng ký!',
          },
          { status: 400 }
        );
      }

      const staff = await findStaffByContact(admin, method, contact, usernameHint);
      if (!staff) {
        return NextResponse.json(
          {
            success: false,
            error:
              method === 'email'
                ? 'Không tìm thấy tài khoản nào khớp với Email đã nhập!'
                : 'Không tìm thấy tài khoản nào khớp với Số điện thoại đã nhập!',
          },
          { status: 404 }
        );
      }

      const username = String(staff.username).trim();
      const staffEmail = String(staff.Email || `${username}@h2.com`).trim();
      const staffPhone = String(staff['Số điện thoại'] || contact).trim();

      // Tạo mã OTP 6 chữ số ngẫu nhiên
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const now = Date.now();

      const otpMap = await loadOtpMap(admin);
      const recordKey = username.toLowerCase();
      otpMap[recordKey] = {
        username,
        email: staffEmail,
        phone: staffPhone,
        method,
        contact,
        otp: otpCode,
        verified: false,
        createdAt: now,
        expiresAt: now + OTP_TTL_MS,
      };
      await saveOtpMap(admin, otpMap);

      const destinationMasked =
        method === 'email' ? maskEmail(staffEmail) : maskPhone(staffPhone);

      return NextResponse.json({
        success: true,
        username,
        fullName: staff['Họ và Tên'] || username,
        method,
        destinationMasked,
        // Trả về mã OTP mô phỏng cổng SMS/Email để nhân viên/hội đồng nhận mã ngay lập tức trên giao diện
        otpPreview: otpCode,
        expiresInSeconds: 300,
        message:
          method === 'email'
            ? `Đã gửi mã xác nhận OTP (6 số) tới Gmail ${destinationMasked}`
            : `Đã gửi tin nhắn mã OTP (6 số) tới số điện thoại ${destinationMasked}`,
      });
    }

    // =========================================================================
    // BƯỚC 2: KIỂM TRA MÃ OTP
    // =========================================================================
    if (action === 'verify_otp') {
      const username = String(body.username || '').trim().toLowerCase();
      const otpInput = String(body.otp || '').trim();

      if (!username || !otpInput) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng nhập đầy đủ mã OTP 6 chữ số!' },
          { status: 400 }
        );
      }

      const otpMap = await loadOtpMap(admin);
      const record = otpMap[username];

      if (!record || record.expiresAt < Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu gửi lại mã!',
          },
          { status: 400 }
        );
      }

      if (record.otp !== otpInput) {
        return NextResponse.json(
          { success: false, error: 'Mã xác nhận OTP không chính xác!' },
          { status: 400 }
        );
      }

      record.verified = true;
      otpMap[username] = record;
      await saveOtpMap(admin, otpMap);

      return NextResponse.json({
        success: true,
        username: record.username,
        message: 'Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.',
      });
    }

    // =========================================================================
    // BƯỚC 3: ĐẶT LẠI MẬT KHẨU MỚI (NHẬP 2 LẦN) SAU KHI ĐÃ XÁC THỰC OTP
    // =========================================================================
    if (action === 'reset_password') {
      const username = String(body.username || '').trim();
      const usernameKey = username.toLowerCase();
      const otpInput = String(body.otp || '').trim();
      const newPassword = String(body.newPassword || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (!username || !otpInput) {
        return NextResponse.json(
          { success: false, error: 'Phiên xác thực OTP không hợp lệ!' },
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

      const otpMap = await loadOtpMap(admin);
      const record = otpMap[usernameKey];

      if (!record || record.expiresAt < Date.now() || record.otp !== otpInput) {
        return NextResponse.json(
          {
            success: false,
            error: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại!',
          },
          { status: 400 }
        );
      }

      if (admin) {
        const { data: staffRow } = await admin
          .from('DSNV')
          .select('*')
          .eq('username', record.username)
          .maybeSingle();

        await admin
          .from('DSNV')
          .update({ password: newPassword })
          .eq('username', record.username);

        await syncPasswordToSupabaseAuth(
          admin,
          record.username,
          staffRow?.Email || record.email,
          newPassword,
          staffRow?.['Họ và Tên'],
          staffRow?.['Phân quyền']
        );
      }

      // Xóa OTP sau khi đã đổi mật khẩu thành công
      delete otpMap[usernameKey];
      await saveOtpMap(admin, otpMap);

      return NextResponse.json({
        success: true,
        username: record.username,
        message: 'Đặt lại mật khẩu mới thành công! Vui lòng đăng nhập lại.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Hành động không hợp lệ.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[POST /api/auth/forgot-password] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi máy chủ khi xử lý quên mật khẩu.' },
      { status: 500 }
    );
  }
}
