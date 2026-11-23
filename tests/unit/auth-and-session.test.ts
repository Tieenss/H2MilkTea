import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createDefaultFeatureConfig,
  isFeatureEnabledForUser,
  SYSTEM_FEATURE_DEFINITIONS,
} from '@/lib/settings/featureFlags';

// Mock state in-memory cho Supabase Admin để test đầy đủ các kịch bản tạo tài khoản & quản lý phiên
const mockDsnvTable: Record<string, any>[] = [];
const mockAuthUsers: Record<string, any>[] = [];
let mockDsnvShouldFail = false;
let mockEnforceSingleSessionSetting: boolean | undefined = undefined;

const mockChannelSend = vi.fn().mockResolvedValue({});
const mockSupabaseAdmin = {
  from: vi.fn((tableName: string) => {
    if (tableName === 'DSNV') {
      return {
        select: vi.fn(() => ({
          ilike: vi.fn((_col: string, val: string) => ({
            maybeSingle: vi.fn(async () => {
              const found = mockDsnvTable.find(
                (r) => String(r.username || '').toLowerCase() === String(val || '').toLowerCase()
              );
              return { data: found || null, error: null };
            }),
          })),
          then: (resolve: any) => resolve({ data: mockDsnvTable, error: null }),
        })),
        upsert: vi.fn((records: any[]) => ({
          select: vi.fn(async () => {
            if (mockDsnvShouldFail) {
              return {
                data: null,
                error: { message: 'Database constraint violation on DSNV' },
              };
            }
            for (const rec of records) {
              const idx = mockDsnvTable.findIndex(
                (r) => String(r.username).toLowerCase() === String(rec.username).toLowerCase()
              );
              if (idx >= 0) mockDsnvTable[idx] = { ...mockDsnvTable[idx], ...rec };
              else mockDsnvTable.push({ ...rec });
            }
            return { data: records, error: null };
          }),
        })),
      };
    }

    if (tableName === 'app_settings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (typeof mockEnforceSingleSessionSetting === 'boolean') {
                return {
                  data: {
                    value: {
                      flags: {
                        enforce_single_device_session: mockEnforceSingleSessionSetting,
                      },
                    },
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
          })),
        })),
      };
    }

    return {
      select: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      })),
    };
  }),
  auth: {
    admin: {
      createUser: vi.fn(async (payload: any) => {
        const existing = mockAuthUsers.find(
          (u) => String(u.email).toLowerCase() === String(payload.email).toLowerCase()
        );
        if (existing) {
          return {
            data: { user: null },
            error: { message: 'A user with this email address has already been registered' },
          };
        }
        const newUser = {
          id: `00000000-0000-4000-8000-${String(mockAuthUsers.length + 1).padStart(12, '0')}`,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          created_at: new Date().toISOString(),
        };
        mockAuthUsers.push(newUser);
        return { data: { user: newUser }, error: null };
      }),
      listUsers: vi.fn(async () => ({
        data: { users: mockAuthUsers },
        error: null,
      })),
      getUserById: vi.fn(async (id: string) => {
        const found = mockAuthUsers.find((u) => u.id === id);
        if (!found) return { data: { user: null }, error: { message: 'User not found' } };
        return { data: { user: found }, error: null };
      }),
      updateUserById: vi.fn(async (id: string, updates: any) => {
        const idx = mockAuthUsers.findIndex((u) => u.id === id);
        if (idx === -1) return { data: { user: null }, error: { message: 'User not found' } };
        mockAuthUsers[idx] = {
          ...mockAuthUsers[idx],
          ...(updates.password ? { passwordUpdated: true } : {}),
          user_metadata: updates.user_metadata || mockAuthUsers[idx].user_metadata,
        };
        return { data: { user: mockAuthUsers[idx] }, error: null };
      }),
    },
  },
  channel: vi.fn(() => ({
    subscribe: vi.fn().mockResolvedValue({}),
    send: mockChannelSend,
  })),
  removeChannel: vi.fn().mockResolvedValue({}),
};

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: () => mockSupabaseAdmin,
}));

import { POST as createUserPOST } from '@/app/api/auth/create-user/route';
import {
  POST as sessionPOST,
  GET as sessionGET,
  DELETE as sessionDELETE,
} from '@/app/api/auth/session/route';

describe('Giai đoạn 1: Kiểm thử toàn diện Đăng ký / Tạo tài khoản nhân viên (8 kịch bản)', () => {
  beforeEach(() => {
    mockDsnvTable.length = 0;
    mockAuthUsers.length = 0;
    mockDsnvShouldFail = false;
    mockEnforceSingleSessionSetting = undefined;
    mockChannelSend.mockClear();
  });

  it('Case 1: Từ chối khi tên đăng nhập để trống hoặc chỉ chứa khoảng trắng', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({ username: '   ', password: 'password123' }),
    });
    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('không được để trống');
  });

  it('Case 2: Từ chối khi tên đăng nhập quá ngắn (< 3 ký tự) hoặc quá dài (> 30 ký tự)', async () => {
    const reqShort = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({ username: 'ab', password: 'password123' }),
    });
    const resShort = await createUserPOST(reqShort);
    const jsonShort = await resShort.json();
    expect(resShort.status).toBe(400);
    expect(jsonShort.error).toContain('từ 3 đến 30 ký tự');

    const reqLong = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({ username: 'a'.repeat(35), password: 'password123' }),
    });
    const resLong = await createUserPOST(reqLong);
    expect(resLong.status).toBe(400);
  });

  it('Case 3: Từ chối khi tên đăng nhập có khoảng trắng hoặc dấu tiếng Việt', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({ username: 'nhân viên 01', password: 'password123' }),
    });
    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('không được chứa khoảng trắng hoặc dấu tiếng Việt');
  });

  it('Case 4: Từ chối khi mật khẩu ngắn hơn 6 ký tự', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({ username: 'thungan01', password: '123' }),
    });
    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('ít nhất 6 ký tự');
  });

  it('Case 5: Tạo tài khoản nhân viên hợp lệ -> Phải lưu đồng bộ vào cả Auth lẫn bảng DSNV', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({
        username: 'thungan_moi',
        password: 'password123',
        employeeData: {
          username: 'thungan_moi',
          password: 'password123',
          'Họ và Tên': 'Nguyễn Thị Thu Ngân',
          'Chức vụ': 'Thu ngân ca sáng',
          'Phòng': 'Bán hàng',
          'Phân quyền': 'Thu ngân',
          'Số điện thoại': '0901234567',
        },
      }),
    });

    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.email).toBe('thungan_moi@h2.com');
    expect(mockDsnvTable).toHaveLength(1);
    expect(mockDsnvTable[0].username).toBe('thungan_moi');
    expect(mockDsnvTable[0]['Họ và Tên']).toBe('Nguyễn Thị Thu Ngân');
  });

  it('Case 6: Chặn tạo trùng tên đăng nhập đã có trong danh sách nhân viên DSNV (không phân biệt hoa/thường)', async () => {
    mockDsnvTable.push({
      username: 'thungan_moi',
      'Họ và Tên': 'Nhân viên cũ',
    });

    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({
        username: 'ThuNgan_Moi',
        password: 'password123',
        employeeData: { 'Họ và Tên': 'Nhân viên trùng' },
      }),
    });

    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('đã tồn tại trong danh sách nhân viên');
  });

  it('Case 7: Khi bảng DSNV trên Supabase bị lỗi ghi -> Tuyệt đối KHÔNG báo thành công giả', async () => {
    mockDsnvShouldFail = true;

    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({
        username: 'nv_loi_db',
        password: 'password123',
        employeeData: {
          username: 'nv_loi_db',
          'Họ và Tên': 'Nhân Viên Lỗi DB',
        },
      }),
    });

    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('Không thể lưu hồ sơ nhân viên vào bảng DSNV');
    expect(mockDsnvTable).toHaveLength(0);
  });

  it('Case 8: Khi tài khoản Auth đã tồn tại nhưng DSNV chưa có -> Tự động đồng bộ mật khẩu và ghi vào DSNV', async () => {
    mockAuthUsers.push({
      id: '00000000-0000-4000-8000-000000000099',
      email: 'nv_orphan@h2.com',
      user_metadata: { username: 'nv_orphan' },
    });

    const req = new NextRequest('http://localhost:3000/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify({
        username: 'nv_orphan',
        password: 'newpassword123',
        employeeData: {
          username: 'nv_orphan',
          'Họ và Tên': 'Nhân Viên Khôi Phục',
          'Phân quyền': 'Nhân viên',
        },
      }),
    });

    const res = await createUserPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockDsnvTable).toHaveLength(1);
    expect(mockDsnvTable[0]['Họ và Tên']).toBe('Nhân Viên Khôi Phục');
  });
});

describe('Giai đoạn 2: Kiểm thử Quản lý đăng nhập đa thiết bị, Công tắc Admin & Đăng xuất từ xa', () => {
  const testUserId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    mockDsnvTable.length = 0;
    mockAuthUsers.length = 0;
    mockChannelSend.mockClear();
    mockEnforceSingleSessionSetting = true;

    mockAuthUsers.push({
      id: testUserId,
      email: 'cashier01@h2.com',
      user_metadata: {
        username: 'cashier01',
        name: 'Thu Ngân 01',
        role: 'Thu ngân',
      },
    });
  });

  it('Case 9: Công tắc enforce_single_device_session tồn tại trong hệ thống Feature Flags của Admin', () => {
    const def = SYSTEM_FEATURE_DEFINITIONS.find((f) => f.key === 'enforce_single_device_session');
    expect(def).toBeDefined();
    expect(def?.enabledGlobally).toBe(true);

    const cfg = createDefaultFeatureConfig();
    expect(cfg.flags.enforce_single_device_session).toBe(true);

    cfg.flags.enforce_single_device_session = false;
    expect(isFeatureEnabledForUser('enforce_single_device_session', { username: 'admin', role: 'Admin' }, cfg)).toBe(false);
  });

  it('Case 10: Khi Admin BẬT giới hạn 1 thiết bị -> Máy thứ 2 đăng nhập sẽ tự động đăng xuất máy thứ 1', async () => {
    mockEnforceSingleSessionSetting = true;

    // 1. Máy 1 (Windows Chrome) đăng nhập
    const req1 = new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.10' },
      body: JSON.stringify({
        userId: testUserId,
        username: 'cashier01',
        sessionId: 'sess_win_01',
        deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
        enforceSingleSession: true,
      }),
    });
    const res1 = await sessionPOST(req1);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);
    expect(json1.deviceName).toContain('Chrome trên Windows');

    // 2. Máy 2 (iPhone Safari) đăng nhập cùng tài khoản
    const req2 = new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.25' },
      body: JSON.stringify({
        userId: testUserId,
        username: 'cashier01',
        sessionId: 'sess_iphone_02',
        deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1',
        enforceSingleSession: true,
      }),
    });
    const res2 = await sessionPOST(req2);
    const json2 = await res2.json();
    expect(json2.success).toBe(true);

    // 3. Kiểm tra trạng thái Máy 1 -> Phải bị đá ra (valid: false, reason: revoked_by_new_login)
    const check1 = await sessionGET(
      new NextRequest(`http://localhost:3000/api/auth/session?userId=${testUserId}&sessionId=sess_win_01`)
    );
    const checkJson1 = await check1.json();
    expect(checkJson1.valid).toBe(false);
    expect(checkJson1.reason).toBe('revoked_by_new_login');

    // 4. Kiểm tra trạng thái Máy 2 -> Vẫn đang hoạt động hợp lệ (valid: true)
    const check2 = await sessionGET(
      new NextRequest(`http://localhost:3000/api/auth/session?userId=${testUserId}&sessionId=sess_iphone_02`)
    );
    const checkJson2 = await check2.json();
    expect(checkJson2.valid).toBe(true);
  });

  it('Case 11: Khi Admin TẮT giới hạn 1 thiết bị -> Cho phép nhiều máy đăng nhập cùng lúc không bị đá', async () => {
    mockEnforceSingleSessionSetting = false;

    // Máy 1 đăng nhập
    await sessionPOST(
      new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({
          userId: testUserId,
          username: 'cashier01',
          sessionId: 'sess_device_A',
          deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
          enforceSingleSession: false,
        }),
      })
    );

    // Máy 2 (iPad) đăng nhập
    await sessionPOST(
      new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({
          userId: testUserId,
          username: 'cashier01',
          sessionId: 'sess_device_B',
          deviceInfo: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1',
          enforceSingleSession: false,
        }),
      })
    );

    // Cả Máy 1 và Máy 2 đều valid: true
    const checkA = await (
      await sessionGET(
        new NextRequest(`http://localhost:3000/api/auth/session?userId=${testUserId}&sessionId=sess_device_A`)
      )
    ).json();
    const checkB = await (
      await sessionGET(
        new NextRequest(`http://localhost:3000/api/auth/session?userId=${testUserId}&sessionId=sess_device_B`)
      )
    ).json();

    expect(checkA.valid).toBe(true);
    expect(checkB.valid).toBe(true);
  });

  it('Case 12: Admin xem được lịch sử thiết bị đăng nhập và thực hiện Đăng xuất thủ công từ xa (Force Logout)', async () => {
    mockEnforceSingleSessionSetting = false;

    // Đăng nhập 2 thiết bị
    await sessionPOST(
      new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({
          userId: testUserId,
          username: 'cashier01',
          sessionId: 'sess_pc_1',
          deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/130.0.0.0',
          enforceSingleSession: false,
        }),
      })
    );
    await sessionPOST(
      new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({
          userId: testUserId,
          username: 'cashier01',
          sessionId: 'sess_mobile_2',
          deviceInfo: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Mobile) Chrome/130.0.0.0',
          enforceSingleSession: false,
        }),
      })
    );

    // 1. Admin truy vấn danh sách lịch sử đăng nhập
    const listRes = await sessionGET(
      new NextRequest('http://localhost:3000/api/auth/session?action=list&username=cashier01')
    );
    const listJson = await listRes.json();
    expect(listJson.success).toBe(true);
    expect(listJson.accounts).toHaveLength(1);
    expect(listJson.accounts[0].activeSessionsCount).toBe(2);

    // 2. Admin bấm Đăng xuất thủ công riêng thiết bị sess_mobile_2
    const revokeRes = await sessionDELETE(
      new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'DELETE',
        body: JSON.stringify({
          userId: testUserId,
          targetSessionId: 'sess_mobile_2',
          revokedByAdmin: true,
        }),
      })
    );
    const revokeJson = await revokeRes.json();
    expect(revokeJson.success).toBe(true);

    // 3. Thiết bị sess_mobile_2 kiểm tra phiên -> Phải bị đá ra với lý do revoked_by_admin
    const mobileCheck = await (
      await sessionGET(
        new NextRequest(`http://localhost:3000/api/auth/session?userId=${testUserId}&sessionId=sess_mobile_2`)
      )
    ).json();
    expect(mobileCheck.valid).toBe(false);
    expect(mobileCheck.reason).toBe('revoked_by_admin');
    expect(mobileCheck.message).toContain('Quản trị viên');

    // 4. Thiết bị sess_pc_1 vẫn hoạt động bình thường
    const pcCheck = await (
      await sessionGET(
        new NextRequest(`http://localhost:3000/api/auth/session?userId=${testUserId}&sessionId=sess_pc_1`)
      )
    ).json();
    expect(pcCheck.valid).toBe(true);
  });
});
