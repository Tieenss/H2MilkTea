import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route';
import { POST as changePasswordPOST } from '@/app/api/auth/change-password/route';
import { memoryOtpStore } from '@/lib/supabase/passwordSync';

const mockUpdateUserById = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
const mockCreateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
const mockListUsers = vi.fn().mockResolvedValue({
  data: {
    users: [
      { id: 'u1', email: 'thungan@h2.com', user_metadata: { username: 'thungan' } },
    ],
  },
  error: null,
});

const mockStaffList = [
  {
    username: 'thungan',
    password: 'OldPassword123!',
    'Họ và Tên': 'Thu Ngân 01',
    'Phân quyền': 'Nhân viên',
    Email: 'thungan@gmail.com',
    'Số điện thoại': '0912345678',
  },
];

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
        updateUserById: mockUpdateUserById,
        createUser: mockCreateUser,
      },
    },
    from: (table: string) => {
      if (table === 'DSNV') {
        return {
          select: () => ({
            or: () => ({
              maybeSingle: async () => ({ data: mockStaffList[0], error: null }),
            }),
            eq: () => ({
              maybeSingle: async () => ({ data: mockStaffList[0], error: null }),
            }),
            then: (resolve: any) => resolve({ data: mockStaffList, error: null }),
          }),
          update: (payload: any) => ({
            eq: async (_col: string, val: string) => {
              if (val === 'thungan' && payload.password) {
                mockStaffList[0].password = payload.password;
              }
              return { data: [mockStaffList[0]], error: null };
            },
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        upsert: async () => ({ data: null, error: null }),
      };
    },
  }),
}));

describe('Luồng Quên mật khẩu (OTP Email/SĐT) & Đổi mật khẩu khi Sửa tài khoản', () => {
  beforeEach(() => {
    mockStaffList[0].password = 'OldPassword123!';
    vi.clearAllMocks();
  });

  it('Quên mật khẩu: Gửi OTP qua Số điện thoại -> Xác thực OTP -> Nhập 2 lần mật khẩu mới và đổi thành công', async () => {
    // Bước 1: Yêu cầu gửi OTP tới SĐT đăng ký
    const req1 = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        action: 'send_otp',
        method: 'phone',
        contact: '0912345678',
      }),
    });
    const res1 = await forgotPasswordPOST(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.success).toBe(true);
    expect(json1.username).toBe('thungan');
    // Đảm bảo API tuyệt đối không trả mã OTP về client
    expect(json1.otpPreview).toBeUndefined();

    const storedRecord = memoryOtpStore.get('thungan');
    expect(storedRecord).toBeDefined();
    const otp = storedRecord!.otp;
    expect(otp).toMatch(/^\d{6}$/);

    // Bước 2: Nhập sai OTP -> bị chặn
    const reqWrongOtp = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify_otp',
        username: 'thungan',
        otp: '000000',
      }),
    });
    const resWrongOtp = await forgotPasswordPOST(reqWrongOtp);
    expect(resWrongOtp.status).toBe(400);

    // Bước 2b: Nhập đúng OTP -> thành công
    const req2 = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify_otp',
        username: 'thungan',
        otp,
      }),
    });
    const res2 = await forgotPasswordPOST(req2);
    const json2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(json2.success).toBe(true);

    // Bước 3a: Nhập 2 lần mật khẩu mới không khớp -> bị chặn
    const reqMismatch = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reset_password',
        username: 'thungan',
        otp,
        newPassword: 'NewPassword999!',
        confirmPassword: 'MismatchPassword!',
      }),
    });
    const resMismatch = await forgotPasswordPOST(reqMismatch);
    expect(resMismatch.status).toBe(400);

    // Bước 3b: Nhập 2 lần mật khẩu mới khớp nhau -> đổi thành công
    const req3 = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reset_password',
        username: 'thungan',
        otp,
        newPassword: 'NewPassword999!',
        confirmPassword: 'NewPassword999!',
      }),
    });
    const res3 = await forgotPasswordPOST(req3);
    const json3 = await res3.json();
    expect(res3.status).toBe(200);
    expect(json3.success).toBe(true);
    expect(mockStaffList[0].password).toBe('NewPassword999!');
    expect(mockUpdateUserById).toHaveBeenCalled();
  });

  it('Sửa tài khoản / Đổi mật khẩu: Bắt buộc đúng mật khẩu hiện tại và khớp 2 lần mật khẩu mới', async () => {
    // 1. Nhập sai mật khẩu hiện tại -> bị từ chối (HTTP 401)
    const reqWrongCurrent = new NextRequest('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        username: 'thungan',
        currentPassword: 'WrongCurrentPassword',
        newPassword: 'UpdatedPass123!',
        confirmPassword: 'UpdatedPass123!',
      }),
    });
    const resWrongCurrent = await changePasswordPOST(reqWrongCurrent);
    expect(resWrongCurrent.status).toBe(401);

    // 2. Nhập đúng mật khẩu hiện tại nhưng 2 lần mật khẩu mới lệch nhau -> bị từ chối (HTTP 400)
    const reqMismatch = new NextRequest('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        username: 'thungan',
        currentPassword: 'OldPassword123!',
        newPassword: 'UpdatedPass123!',
        confirmPassword: 'DifferentPass123!',
      }),
    });
    const resMismatch = await changePasswordPOST(reqMismatch);
    expect(resMismatch.status).toBe(400);

    // 3. Nhập đúng mật khẩu hiện tại + 2 lần mật khẩu mới khớp nhau -> thành công (HTTP 200)
    const reqValid = new NextRequest('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        username: 'thungan',
        currentPassword: 'OldPassword123!',
        newPassword: 'UpdatedPass123!',
        confirmPassword: 'UpdatedPass123!',
      }),
    });
    const resValid = await changePasswordPOST(reqValid);
    const jsonValid = await resValid.json();
    expect(resValid.status).toBe(200);
    expect(jsonValid.success).toBe(true);
    expect(mockStaffList[0].password).toBe('UpdatedPass123!');
  });
});
