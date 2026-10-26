'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import authUtils from '@/utils/authUtils';

export function useSingleActiveSession() {
  const router = useRouter();
  const [isKickedOut, setIsKickedOut] = useState(false);
  const kickoutHandledRef = useRef(false);

  const handleKickOut = useCallback(async (reason = 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác.') => {
    if (kickoutHandledRef.current) return;
    kickoutHandledRef.current = true;
    setIsKickedOut(true);

    try {
      await authUtils.logout();
    } catch (e) {
      console.warn('Lỗi đăng xuất khi bị đá:', e);
    }

    // Hiển thị thông báo và điều hướng về trang đăng nhập
    alert(reason);
    if (typeof window !== 'undefined') {
      window.location.href = '/?kicked=true';
    }
  }, []);

  useEffect(() => {
    const userData = authUtils.getUserData();
    const userId = userData?.id || userData?.IDNV;
    const mySessionId = typeof window !== 'undefined' ? window.localStorage.getItem('h2_session_id') : null;

    if (!userId || !mySessionId) return;

    let active = true;
    let client: ReturnType<typeof createClient>;

    try {
      client = createClient();
    } catch {
      return;
    }

    // 1. Lắng nghe broadcast realtime trên kênh riêng của người dùng
    const channel = client
      .channel(`user-session:${userId}`)
      .on('broadcast', { event: 'session_revoked' }, (payload) => {
        if (!active) return;
        const incomingSessionId = payload.payload?.activeSessionId;
        if (incomingSessionId && incomingSessionId !== mySessionId) {
          console.warn('[Session Security] Phiên làm việc đã bị ghi đè bởi thiết bị mới:', incomingSessionId);
          void handleKickOut('Tài khoản của bạn vừa đăng nhập ở thiết bị khác. Thiết bị này đã bị đăng xuất để bảo mật.');
        }
      })
      .subscribe();

    // 2. Hàm kiểm tra hợp lệ với API máy chủ
    const verifySessionWithServer = async () => {
      if (!active || kickoutHandledRef.current) return;
      try {
        const res = await fetch(`/api/auth/session?userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(mySessionId)}`, {
          cache: 'no-store',
        });
        const result = await res.json();
        if (active && result && result.valid === false) {
          console.warn('[Session Security] Server xác nhận phiên đã hết hạn:', result);
          void handleKickOut(result.message || 'Tài khoản đã đăng nhập từ một thiết bị khác.');
        }
      } catch (err) {
        // Lỗi mạng tạm thời không đá người dùng ra ngay
      }
    };

    // Kiểm tra ngay khi khởi động
    void verifySessionWithServer();

    // 3. Kiểm tra định kỳ mỗi 20 giây
    const interval = window.setInterval(verifySessionWithServer, 20000);

    // 4. Kiểm tra khi người dùng quay lại tab (visibilitychange)
    const handleVisibilityChange = () => {
      if (!document.hidden && active) {
        void verifySessionWithServer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void client.removeChannel(channel);
    };
  }, [handleKickOut]);

  return { isKickedOut };
}
