import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface SessionHistoryItem {
  sessionId: string;
  userId: string;
  username?: string;
  deviceName: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  userAgent: string;
  ipAddress: string;
  loginAt: number;
  lastActiveAt: number;
  status: 'active' | 'logged_out' | 'revoked_by_new_login' | 'revoked_by_admin';
  revokedAt?: number;
  revokedReason?: string;
}

const MAX_SESSION_HISTORY = 25;
const SETTINGS_KEY = 'system_features_config';

function parseUserAgentToVietnameseDevice(uaRaw: string): {
  deviceName: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
} {
  const ua = String(uaRaw || '').trim();
  if (!ua) {
    return { deviceName: 'Trình duyệt Web trên Máy tính', deviceType: 'Desktop' };
  }

  let browser = 'Trình duyệt';
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/CocCoc|coc_coc_browser/i.test(ua)) {
    browser = 'Cốc Cốc';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Safari';
  }

  let os = 'Thiết bị khác';
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';

  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = 'Tablet';
    if (/iPad/i.test(ua)) os = 'iPad (iPadOS)';
    else if (/Android/i.test(ua)) os = 'Máy tính bảng Android';
    else os = 'Máy tính bảng';
  } else if (/iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = 'Mobile';
    if (/iPhone/i.test(ua)) os = 'iPhone (iOS)';
    else if (/Android/i.test(ua)) os = 'Điện thoại Android';
    else os = 'Điện thoại di động';
  } else {
    deviceType = 'Desktop';
    if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else os = 'Máy tính';
  }

  return {
    deviceName: `${browser} trên ${os}`,
    deviceType,
  };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

async function getServerEnforceSingleSessionFlag(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  clientFallback?: boolean
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const flags = (data.value as any).flags;
      if (flags && typeof flags.enforce_single_device_session === 'boolean') {
        return flags.enforce_single_device_session;
      }
    }
  } catch {
    // Bỏ qua lỗi đọc app_settings
  }
  return typeof clientFallback === 'boolean' ? clientFallback : true;
}

async function resolveAuthUser(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  userId?: string | null,
  username?: string | null
): Promise<any | null> {
  const cleanUserId = String(userId || '').trim();
  const cleanUsername = String(username || '').trim().toLowerCase();

  // Nếu userId trông giống UUID chuẩn, thử getUserById trước
  if (cleanUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUserId)) {
    const { data } = await admin.auth.admin.getUserById(cleanUserId);
    if (data?.user) return data.user;
  }

  // Nếu tìm theo username hoặc userId không phải UUID
  const lookupKey = cleanUsername || cleanUserId.toLowerCase();
  if (!lookupKey) return null;

  const targetEmail = lookupKey.includes('@') ? lookupKey : `${lookupKey}@h2.com`;
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = listData?.users || [];

  return (
    users.find((u) => {
      const emailLower = String(u.email || '').toLowerCase();
      const emailPrefix = emailLower.split('@')[0];
      const metaUser = String(u.user_metadata?.username || '').toLowerCase();
      return (
        u.id === cleanUserId ||
        emailLower === targetEmail ||
        emailPrefix === lookupKey ||
        (metaUser && metaUser === lookupKey)
      );
    }) || null
  );
}

function normalizeUserSessionHistory(user: any): SessionHistoryItem[] {
  const meta = user?.user_metadata || {};
  const rawHistory: SessionHistoryItem[] = Array.isArray(meta.session_history)
    ? [...meta.session_history]
    : [];

  // Tương thích ngược: nếu user có active_session_id cũ nhưng chưa có trong session_history
  if (meta.active_session_id && !rawHistory.some((s) => s.sessionId === meta.active_session_id)) {
    const parsed = parseUserAgentToVietnameseDevice(meta.active_device || '');
    const emailPrefix = String(user.email || '').split('@')[0];
    rawHistory.unshift({
      sessionId: String(meta.active_session_id),
      userId: user.id,
      username: meta.username || emailPrefix,
      deviceName: parsed.deviceName,
      deviceType: parsed.deviceType,
      userAgent: String(meta.active_device || ''),
      ipAddress: '127.0.0.1',
      loginAt: Number(meta.last_session_at) || Date.now(),
      lastActiveAt: Number(meta.last_session_at) || Date.now(),
      status: 'active',
    });
  }

  return rawHistory.sort((a, b) => (b.loginAt || 0) - (a.loginAt || 0)).slice(0, MAX_SESSION_HISTORY);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, sessionId, deviceInfo, enforceSingleSession } = body;

    if ((!userId && !username) || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin userId/username hoặc sessionId' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Không thể khởi tạo kết nối máy chủ' },
        { status: 500 }
      );
    }

    const targetUser = await resolveAuthUser(admin, userId, username);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const enforceSingle = await getServerEnforceSingleSessionFlag(admin, enforceSingleSession);
    const now = Date.now();
    const ipAddress = getClientIp(request);
    const parsedDevice = parseUserAgentToVietnameseDevice(deviceInfo || '');
    const resolvedUsername =
      String(username || targetUser.user_metadata?.username || String(targetUser.email || '').split('@')[0]).trim();

    const currentMeta = targetUser.user_metadata || {};
    let history = normalizeUserSessionHistory(targetUser);

    if (enforceSingle) {
      // Đánh dấu mọi phiên active cũ khác sessionId hiện tại là revoked_by_new_login
      history = history.map((item) => {
        if (item.status === 'active' && item.sessionId !== sessionId) {
          return {
            ...item,
            status: 'revoked_by_new_login',
            revokedAt: now,
            revokedReason: `Đăng nhập trên thiết bị mới (${parsedDevice.deviceName})`,
          };
        }
        return item;
      });
    }

    // Kiểm tra xem sessionId này đã có trong history chưa
    const existingIdx = history.findIndex((item) => item.sessionId === sessionId);
    const newSessionItem: SessionHistoryItem = {
      sessionId,
      userId: targetUser.id,
      username: resolvedUsername,
      deviceName: parsedDevice.deviceName,
      deviceType: parsedDevice.deviceType,
      userAgent: String(deviceInfo || ''),
      ipAddress,
      loginAt: existingIdx >= 0 ? history[existingIdx].loginAt : now,
      lastActiveAt: now,
      status: 'active',
    };

    if (existingIdx >= 0) {
      history[existingIdx] = newSessionItem;
    } else {
      history.unshift(newSessionItem);
    }

    history = history.sort((a, b) => (b.loginAt || 0) - (a.loginAt || 0)).slice(0, MAX_SESSION_HISTORY);

    const updatedMeta = {
      ...currentMeta,
      username: resolvedUsername,
      active_session_id: sessionId,
      active_device: parsedDevice.deviceName,
      last_session_at: now,
      session_history: history,
    };

    const { error: updateError } = await admin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: updatedMeta,
    });

    if (updateError) {
      console.error('Lỗi cập nhật session user_metadata:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // Chỉ phát sóng broadcast đá thiết bị cũ khi chế độ enforce_single_device_session đang BẬT
    if (enforceSingle) {
      try {
        const channel = admin.channel(`user-session:${targetUser.id}`);
        await channel.subscribe();
        await channel.send({
          type: 'broadcast',
          event: 'session_revoked',
          payload: {
            activeSessionId: sessionId,
            userId: targetUser.id,
            mode: 'single_enforced',
            deviceInfo: parsedDevice.deviceName,
            revokedAt: now,
          },
        });
        await admin.removeChannel(channel);
      } catch (broadcastErr) {
        console.warn('Lỗi gửi broadcast session_revoked:', broadcastErr);
      }
    }

    return NextResponse.json({
      success: true,
      activeSessionId: sessionId,
      enforceSingle,
      deviceName: parsedDevice.deviceName,
      sessionHistory: history,
    });
  } catch (err: any) {
    console.error('Lỗi API session POST:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi xử lý phiên đăng nhập' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const sessionId = searchParams.get('sessionId');

    const admin = createAdminSupabaseClient();

    // CHẾ ĐỘ 2: Admin xem danh sách phiên & lịch sử thiết bị (?action=list)
    if (action === 'list') {
      if (!admin) {
        return NextResponse.json({
          success: true,
          enforceSingleDevice: true,
          accounts: [],
        });
      }

      const enforceSingleDevice = await getServerEnforceSingleSessionFlag(admin, true);
      const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });

      if (listErr) {
        return NextResponse.json({ success: false, error: listErr.message }, { status: 500 });
      }

      const filterUsername = String(username || '').trim().toLowerCase();
      const filterUserId = String(userId || '').trim();

      const accounts = (listData?.users || [])
        .map((u) => {
          const emailLower = String(u.email || '').toLowerCase();
          const emailPrefix = emailLower.split('@')[0];
          const resolvedUsername = String(u.user_metadata?.username || emailPrefix).trim();
          const history = normalizeUserSessionHistory(u);
          const activeSessions = history.filter((item) => item.status === 'active');

          return {
            userId: u.id,
            email: u.email || '',
            username: resolvedUsername,
            fullName: String(
              u.user_metadata?.name || u.user_metadata?.full_name || resolvedUsername
            ).trim(),
            role: String(u.user_metadata?.role || 'Nhân viên').trim(),
            activeSessionsCount: activeSessions.length,
            activeDevice: activeSessions[0]?.deviceName || u.user_metadata?.active_device || null,
            lastLoginAt: history[0]?.loginAt || u.user_metadata?.last_session_at || null,
            sessionHistory: history,
          };
        })
        .filter((acc) => {
          if (filterUserId && acc.userId === filterUserId) return true;
          if (filterUsername) {
            return (
              acc.username.toLowerCase() === filterUsername ||
              acc.email.toLowerCase() === `${filterUsername}@h2.com`
            );
          }
          return true;
        });

      return NextResponse.json({
        success: true,
        enforceSingleDevice,
        accounts,
      });
    }

    // CHẾ ĐỘ 1: Client tự kiểm tra phiên của mình (?userId=...&sessionId=...)
    if (!userId && !username) {
      return NextResponse.json({ valid: false, error: 'Thiếu userId' }, { status: 400 });
    }

    if (!admin) {
      return NextResponse.json({ valid: true }); // Fallback an toàn nếu không có service key
    }

    const targetUser = await resolveAuthUser(admin, userId, username);
    if (!targetUser) {
      return NextResponse.json({ valid: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const enforceSingle = await getServerEnforceSingleSessionFlag(admin, true);
    const currentMeta = targetUser.user_metadata || {};
    const activeSessionId = currentMeta.active_session_id;
    const history = normalizeUserSessionHistory(targetUser);

    if (sessionId) {
      const matchedSession = history.find((item) => item.sessionId === sessionId);

      if (matchedSession) {
        if (matchedSession.status === 'revoked_by_admin') {
          return NextResponse.json({
            valid: false,
            reason: 'revoked_by_admin',
            activeSessionId,
            message: 'Phiên đăng nhập của bạn đã bị Quản trị viên (Admin) đăng xuất từ xa.',
          });
        }
        if (matchedSession.status === 'revoked_by_new_login') {
          return NextResponse.json({
            valid: false,
            reason: 'revoked_by_new_login',
            activeSessionId,
            message:
              matchedSession.revokedReason ||
              'Tài khoản của bạn đã được đăng nhập trên một thiết bị khác.',
          });
        }
        if (matchedSession.status === 'logged_out') {
          return NextResponse.json({
            valid: false,
            reason: 'logged_out',
            activeSessionId,
            message: 'Phiên đăng nhập này đã kết thúc.',
          });
        }

        // Nếu chế độ giới hạn 1 thiết bị đang BẬT và active_session_id khác sessionId
        if (enforceSingle && activeSessionId && activeSessionId !== sessionId) {
          return NextResponse.json({
            valid: false,
            reason: 'revoked_by_new_login',
            activeSessionId,
            message: 'Tài khoản đã được đăng nhập từ thiết bị khác.',
          });
        }

        // Cập nhật lastActiveAt nếu đã qua > 60 giây để tránh ghi quá nhiều
        const now = Date.now();
        if (now - (matchedSession.lastActiveAt || 0) > 60000) {
          matchedSession.lastActiveAt = now;
          await admin.auth.admin.updateUserById(targetUser.id, {
            user_metadata: {
              ...currentMeta,
              session_history: history,
            },
          });
        }

        return NextResponse.json({
          valid: true,
          activeSessionId,
          enforceSingle,
        });
      }

      // Tương thích ngược nếu sessionId chưa có trong mảng history
      if (enforceSingle && activeSessionId && activeSessionId !== sessionId) {
        return NextResponse.json({
          valid: false,
          reason: 'revoked_by_new_login',
          activeSessionId,
          message: 'Tài khoản đã được đăng nhập từ thiết bị khác.',
        });
      }
    }

    return NextResponse.json({
      valid: true,
      activeSessionId,
      enforceSingle,
    });
  } catch (err: any) {
    console.error('Lỗi API session GET:', err);
    return NextResponse.json({ valid: true }); // Fallback an toàn tránh chặn người dùng nếu mạng lỗi
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, targetSessionId, revokeAll, revokedByAdmin } = body;

    if (!userId && !username) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin tài khoản cần đăng xuất (userId hoặc username)' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình kết nối Supabase Admin' },
        { status: 500 }
      );
    }

    const targetUser = await resolveAuthUser(admin, userId, username);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tài khoản trên hệ thống Auth' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const currentMeta = targetUser.user_metadata || {};
    let history = normalizeUserSessionHistory(targetUser);
    const nextStatus = revokedByAdmin ? 'revoked_by_admin' : 'logged_out';
    const reasonText = revokedByAdmin
      ? 'Quản trị viên (Admin) đăng xuất thủ công từ xa'
      : 'Người dùng chủ động đăng xuất';

    if (revokeAll) {
      history = history.map((item) => {
        if (item.status === 'active') {
          return {
            ...item,
            status: nextStatus,
            revokedAt: now,
            revokedReason: reasonText,
          };
        }
        return item;
      });
    } else if (targetSessionId) {
      history = history.map((item) => {
        if (item.sessionId === targetSessionId) {
          return {
            ...item,
            status: nextStatus,
            revokedAt: now,
            revokedReason: reasonText,
          };
        }
        return item;
      });
    }

    const remainingActive = history.filter((item) => item.status === 'active');
    const nextActiveSessionId = revokeAll
      ? null
      : currentMeta.active_session_id === targetSessionId
      ? remainingActive[0]?.sessionId || null
      : currentMeta.active_session_id || null;

    const updatedMeta = {
      ...currentMeta,
      active_session_id: nextActiveSessionId,
      active_device: remainingActive[0]?.deviceName || null,
      session_history: history,
    };

    const { error: updateErr } = await admin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: updatedMeta,
    });

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Phát sóng Realtime Broadcast để thiết bị bị thu hồi tự động đăng xuất ngay lập tức
    try {
      const channel = admin.channel(`user-session:${targetUser.id}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'session_revoked',
        payload: {
          userId: targetUser.id,
          revokedSessionId: targetSessionId || null,
          revokeAll: Boolean(revokeAll),
          revokedByAdmin: Boolean(revokedByAdmin),
          message: revokedByAdmin
            ? 'Quản trị viên (Admin) đã đăng xuất thiết bị này từ xa.'
            : 'Phiên đăng nhập đã kết thúc.',
          revokedAt: now,
        },
      });
      await admin.removeChannel(channel);
    } catch (broadcastErr) {
      console.warn('Lỗi gửi broadcast khi thu hồi phiên:', broadcastErr);
    }

    return NextResponse.json({
      success: true,
      userId: targetUser.id,
      activeSessionsCount: remainingActive.length,
      sessionHistory: history,
    });
  } catch (err: any) {
    console.error('Lỗi API session DELETE:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi khi thu hồi phiên đăng nhập' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return DELETE(request);
}
