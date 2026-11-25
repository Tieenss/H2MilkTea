import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { syncPasswordToSupabaseAuth } from '../change-password/route';
import dsnvFallback from '@/data/DSNV.json';

export const dynamic = 'force-dynamic';

const OTP_SETTINGS_KEY = 'auth_password_reset_otps';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút

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

function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

function toInternationalPhone(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.startsWith('0')) {
    return '+84' + clean.slice(1);
  }
  return clean.startsWith('+') ? clean : `+${clean}`;
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

function buildOtpHtmlEmail(fullName: string, username: string, otpCode: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px;">H2 MilkTea POS</h1>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Xác thực khôi phục mật khẩu tài khoản</p>
      </div>
      <div style="padding: 24px; color: #1e293b; background: #ffffff;">
        <p style="margin-top: 0;">Xin chào <b>${fullName}</b> (Tài khoản: <b>${username}</b>),</p>
        <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Đây là mã xác nhận OTP (6 chữ số) của bạn:</p>
        <div style="margin: 24px 0; padding: 18px; background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; text-align: center;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0369a1; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #64748b;">Mã này có hiệu lực trong vòng <b>5 phút</b>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
    </div>
  `;
}

/**
 * Gửi Email OTP thực tế qua:
 * 1. Gmail SMTP (Nodemailer) nếu cấu hình SMTP_EMAIL/GMAIL_USER + SMTP_APP_PASSWORD/GMAIL_APP_PASSWORD
 * 2. Resend API nếu cấu hình RESEND_API_KEY
 * 3. Supabase Auth Built-in Email OTP (`signInWithOtp`) nếu chưa cấu hình SMTP riêng
 */
async function sendRealEmailOtp(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  targetEmail: string,
  fullName: string,
  username: string,
  otpCode: string
): Promise<{ sent: boolean; provider: 'smtp' | 'resend' | 'supabase_auth' | 'none'; error?: string }> {
  const smtpUser = process.env.SMTP_EMAIL || process.env.GMAIL_USER || process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  // 1. Ưu tiên Gmail SMTP / Custom SMTP qua Nodemailer
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"H2 MilkTea POS" <${smtpUser}>`,
        to: targetEmail,
        subject: `[H2 MilkTea] Mã xác nhận OTP khôi phục mật khẩu: ${otpCode}`,
        html: buildOtpHtmlEmail(fullName, username, otpCode),
      });

      return { sent: true, provider: 'smtp' };
    } catch (smtpErr: any) {
      console.warn('[ForgotPassword] Lỗi gửi qua SMTP, chuyển sang fallback:', smtpErr?.message);
    }
  }

  // 2. Thử Resend API nếu có RESEND_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'H2 MilkTea <onboarding@resend.dev>',
          to: [targetEmail],
          subject: `[H2 MilkTea] Mã xác nhận OTP khôi phục mật khẩu: ${otpCode}`,
          html: buildOtpHtmlEmail(fullName, username, otpCode),
        }),
      });
      if (res.ok) {
        return { sent: true, provider: 'resend' };
      }
    } catch (resendErr: any) {
      console.warn('[ForgotPassword] Lỗi gửi qua Resend:', resendErr?.message);
    }
  }

  // 3. Sử dụng Supabase Auth Email OTP có sẵn của project Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey && !process.env.VITEST) {
    try {
      // Đảm bảo email này đã có user trên Supabase Auth để Supabase gửi được OTP
      if (admin) {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const exists = listData?.users?.some(
          (u: any) => String(u.email || '').trim().toLowerCase() === targetEmail.toLowerCase()
        );
        if (!exists) {
          await admin.auth.admin.createUser({
            email: targetEmail,
            password: 'TempPassword123!',
            email_confirm: true,
            user_metadata: { username, full_name: fullName },
          });
        }
      }

      const publicClient = createSupabaseClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: otpError } = await publicClient.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (!otpError) {
        return { sent: true, provider: 'supabase_auth' };
      }
      return { sent: false, provider: 'none', error: otpError.message };
    } catch (sbErr: any) {
      return { sent: false, provider: 'none', error: sbErr?.message };
    }
  }

  return { sent: true, provider: 'none' };
}

/**
 * Gửi SMS OTP thực tế qua:
 * 1. SpeedSMS API (SPEEDSMS_ACCESS_TOKEN)
 * 2. Twilio SMS API (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER)
 * 3. Custom SMS Webhook (SMS_WEBHOOK_URL - hỗ trợ TextBee / eSMS / Zalo ZNS Webhook)
 */
async function sendRealSmsOtp(
  phone: string,
  otpCode: string,
  username: string
): Promise<{ sent: boolean; provider: 'speedsms' | 'twilio' | 'webhook' | 'none' }> {
  const smsContent = `[H2 MilkTea] Ma xac nhan OTP khoi phuc mat khau tai khoan ${username} cua ban la: ${otpCode} (hieu luc 5 phut).`;
  const cleanPhone = normalizePhone(phone);
  const intlPhone = toInternationalPhone(phone);

  // 1. SpeedSMS.vn
  const speedSmsToken = process.env.SPEEDSMS_ACCESS_TOKEN;
  if (speedSmsToken) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${speedSmsToken}:x`).toString('base64');
      const res = await fetch('https://api.speedsms.vn/index.php/sms/send', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [cleanPhone],
          content: smsContent,
          sms_type: Number(process.env.SPEEDSMS_TYPE || 2),
          sender: process.env.SPEEDSMS_SENDER || '',
        }),
      });
      const json = await res.json();
      if (res.ok && json?.status === 'success') {
        return { sent: true, provider: 'speedsms' };
      }
    } catch (err: any) {
      console.warn('[ForgotPassword] Lỗi gửi SpeedSMS:', err?.message);
    }
  }

  // 2. Twilio SMS
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const params = new URLSearchParams({
        To: intlPhone,
        From: twilioFrom,
        Body: smsContent,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );
      if (res.ok) {
        return { sent: true, provider: 'twilio' };
      }
    } catch (err: any) {
      console.warn('[ForgotPassword] Lỗi gửi Twilio SMS:', err?.message);
    }
  }

  // 3. Generic SMS Webhook (TextBee / eSMS / n8n / Telegram / Zalo Gateway)
  const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;
  if (smsWebhookUrl) {
    try {
      const res = await fetch(smsWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMS_WEBHOOK_SECRET
            ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify({
          to: cleanPhone,
          internationalPhone: intlPhone,
          otp: otpCode,
          username,
          message: smsContent,
        }),
      });
      if (res.ok) {
        return { sent: true, provider: 'webhook' };
      }
    } catch (err: any) {
      console.warn('[ForgotPassword] Lỗi gọi SMS_WEBHOOK_URL:', err?.message);
    }
  }

  return { sent: false, provider: 'none' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action || 'send_otp').trim();
    const admin = createAdminSupabaseClient();

    // =========================================================================
    // BƯỚC 1: GỬI MÃ OTP THỰC TẾ TỚI EMAIL HOẶC SỐ ĐIỆN THOẠI ĐĂNG KÝ
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
      const fullName = String(staff['Họ và Tên'] || username).trim();
      const staffEmail = String(staff.Email || `${username}@h2.com`).trim();
      const staffPhone = String(staff['Số điện thoại'] || contact).trim();

      // Tạo mã OTP 6 chữ số ngẫu nhiên
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const now = Date.now();

      let usedSupabaseOtp = false;
      let deliveryNotice = '';

      if (method === 'email') {
        const emailResult = await sendRealEmailOtp(admin, staffEmail, fullName, username, otpCode);
        if (!emailResult.sent && emailResult.error) {
          return NextResponse.json(
            {
              success: false,
              error: `Không thể gửi email OTP lúc này (${emailResult.error}). Vui lòng thử lại sau ít phút hoặc cấu hình SMTP_EMAIL & SMTP_APP_PASSWORD.`,
            },
            { status: 500 }
          );
        }
        usedSupabaseOtp = emailResult.provider === 'supabase_auth';
        deliveryNotice = `Đã gửi mã xác nhận OTP (6 số) tới hộp thư ${maskEmail(staffEmail)}. Vui lòng kiểm tra Hộp thư đến (và mục Thư rác/Spam).`;
      } else {
        // Khi chọn nhận qua Số điện thoại:
        // 1. Bắn qua cổng SMS Gateway nếu đã cấu hình (SpeedSMS / Twilio / Webhook)
        const smsResult = await sendRealSmsOtp(staffPhone, otpCode, username);

        // 2. Nếu có Email liên kết với SĐT trong hồ sơ DSNV, tự động chuyển tiếp OTP về Email đó luôn
        let emailForwarded = false;
        if (staffEmail && staffEmail.includes('@')) {
          const emailResult = await sendRealEmailOtp(
            admin,
            staffEmail,
            fullName,
            username,
            otpCode
          );
          if (emailResult.sent) {
            emailForwarded = true;
            if (emailResult.provider === 'supabase_auth' && !smsResult.sent) {
              usedSupabaseOtp = true;
            }
          }
        }

        if (smsResult.sent && emailForwarded) {
          deliveryNotice = `Đã gửi tin nhắn SMS OTP tới số ${maskPhone(staffPhone)} và đồng thời chuyển tiếp bản sao tới Gmail đăng ký ${maskEmail(staffEmail)}.`;
        } else if (smsResult.sent) {
          deliveryNotice = `Đã gửi tin nhắn SMS chứa mã OTP (6 số) tới số điện thoại ${maskPhone(staffPhone)}.`;
        } else if (emailForwarded) {
          deliveryNotice = `Đã xác nhận số điện thoại ${maskPhone(staffPhone)} và chuyển tiếp mã OTP (6 số) về hộp thư đăng ký ${maskEmail(staffEmail)} của tài khoản.`;
        } else {
          return NextResponse.json(
            {
              success: false,
              error:
                'Chưa cấu hình cổng SMS (SpeedSMS/Twilio) và tài khoản không có Gmail hợp lệ để chuyển tiếp mã OTP.',
            },
            { status: 500 }
          );
        }
      }

      const otpMap = await loadOtpMap(admin);
      const recordKey = username.toLowerCase();
      otpMap[recordKey] = {
        username,
        email: staffEmail,
        phone: staffPhone,
        method,
        contact,
        otp: otpCode,
        usedSupabaseOtp,
        verified: false,
        createdAt: now,
        expiresAt: now + OTP_TTL_MS,
      };
      await saveOtpMap(admin, otpMap);

      const destinationMasked =
        method === 'email'
          ? maskEmail(staffEmail)
          : `${maskPhone(staffPhone)} (${maskEmail(staffEmail)})`;

      return NextResponse.json({
        success: true,
        username,
        fullName,
        method,
        destinationMasked,
        expiresInSeconds: 300,
        message: deliveryNotice,
      });
    }

    // =========================================================================
    // BƯỚC 2: KIỂM TRA MÃ OTP (HỖ TRỢ CẢ MÃ OTP SMTP/SMS LẪN MÃ OTP SUPABASE AUTH)
    // =========================================================================
    if (action === 'verify_otp') {
      const username = String(body.username || '').trim().toLowerCase();
      const otpInput = String(body.otp || '').trim();

      if (!username || !otpInput || otpInput.length < 6) {
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

      let isOtpValid = record.otp === otpInput;

      // Nếu người dùng dán đường link xác nhận từ trong email Supabase (chứa token_hash hoặc token) hoặc nhập mã 6 số từ email Supabase
      if (!isOtpValid && record.usedSupabaseOtp) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && anonKey) {
          const publicClient = createSupabaseClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // Kiểm tra nếu người dùng dán URL xác nhận từ email Supabase (có chứa token_hash=... hoặc token=...)
          let extractedTokenHash = '';
          let extractedToken = otpInput;
          if (otpInput.includes('token_hash=') || otpInput.includes('token=')) {
            try {
              const urlObj = new URL(otpInput);
              extractedTokenHash = urlObj.searchParams.get('token_hash') || '';
              extractedToken = urlObj.searchParams.get('token') || extractedTokenHash || otpInput;
            } catch {
              const matchHash = otpInput.match(/token_hash=([^&\s]+)/);
              const matchTok = otpInput.match(/token=([^&\s]+)/);
              if (matchHash) extractedTokenHash = decodeURIComponent(matchHash[1]);
              if (matchTok) extractedToken = decodeURIComponent(matchTok[1]);
            }
          } else if (otpInput.startsWith('pkce_') || otpInput.length > 10) {
            extractedTokenHash = otpInput;
          }

          for (const type of ['email', 'magiclink', 'recovery'] as const) {
            if (extractedTokenHash) {
              const { data, error } = await publicClient.auth.verifyOtp({
                token_hash: extractedTokenHash,
                type,
              });
              if (!error && data?.user) {
                isOtpValid = true;
                record.otp = otpInput;
                break;
              }
            }
            const { data, error } = await publicClient.auth.verifyOtp({
              email: record.email,
              token: extractedToken,
              type,
            });
            if (!error && data?.user) {
              isOtpValid = true;
              record.otp = otpInput;
              break;
            }
          }
        }
      }

      if (!isOtpValid) {
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

      if (!record || !record.verified || record.expiresAt < Date.now() || record.otp !== otpInput) {
        return NextResponse.json(
          {
            success: false,
            error: 'Phiên xác thực OTP không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại!',
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

      // Xóa OTP ngay sau khi đã đổi mật khẩu thành công
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
