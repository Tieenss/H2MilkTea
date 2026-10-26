import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, deviceInfo } = await request.json();

    if (!userId || !sessionId) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin userId hoặc sessionId' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Không thể khởi tạo kết nối máy chủ' }, { status: 500 });
    }

    // 1. Lấy thông tin user hiện tại
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId);
    if (getUserError || !userData?.user) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const currentMeta = userData.user.user_metadata || {};

    // 2. Cập nhật active_session_id mới vào user_metadata
    const updatedMeta = {
      ...currentMeta,
      active_session_id: sessionId,
      active_device: deviceInfo || 'Thiết bị khác',
      last_session_at: Date.now(),
    };

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMeta,
    });

    if (updateError) {
      console.error('Lỗi cập nhật session user_metadata:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 3. Phát sóng broadcast realtime để đá thiết bị cũ ngay lập tức
    try {
      const channel = admin.channel(`user-session:${userId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'session_revoked',
        payload: {
          activeSessionId: sessionId,
          userId,
          deviceInfo: deviceInfo || 'Thiết bị khác',
          revokedAt: Date.now(),
        },
      });
      await admin.removeChannel(channel);
    } catch (broadcastErr) {
      console.warn('Lỗi gửi broadcast session_revoked:', broadcastErr);
    }

    return NextResponse.json({
      success: true,
      activeSessionId: sessionId,
    });
  } catch (err: any) {
    console.error('Lỗi API session POST:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Lỗi xử lý phiên' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId) {
      return NextResponse.json({ valid: false, error: 'Thiếu userId' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ valid: true }); // Fallback an toàn nếu không có service key
    }

    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId);
    if (getUserError || !userData?.user) {
      return NextResponse.json({ valid: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const activeSessionId = userData.user.user_metadata?.active_session_id;

    // Nếu trên server đã có active_session_id và khác với sessionId gửi lên -> Thiết bị này đã bị đăng nhập đè
    if (activeSessionId && sessionId && activeSessionId !== sessionId) {
      return NextResponse.json({
        valid: false,
        activeSessionId,
        message: 'Tài khoản đã được đăng nhập từ thiết bị khác.',
      });
    }

    return NextResponse.json({
      valid: true,
      activeSessionId,
    });
  } catch (err: any) {
    console.error('Lỗi API session GET:', err);
    return NextResponse.json({ valid: true }); // Fallback an toàn tránh chặn người dùng nếu mạng lỗi
  }
}
