'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import authUtils from '@/utils/authUtils';
import { getStoredFeatureConfig } from '@/lib/settings/featureFlags';

export function useSingleActiveSession() {
  const [isKickedOut, setIsKickedOut] = useState(false);
  const kickoutHandledRef = useRef(false);

  const handleKickOut = useCallback(
    async (reason = 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác.') => {
      if (kickoutHandledRef.current) return;
      kickoutHandledRef.current = true;
      setIsKickedOut(true);

      try {
        // Truyền skipRemoteSessionRevoke = true để không ghi đè trạng thái revoked_by_admin / revoked_by_new_login trên server
        await authUtils.logout(true);
      } catch (e) {
        console.warn('Lỗi đăng xuất khi bị đá:', e);
      }

      alert(reason);
      if (typeof window !== 'undefined') {
        window.location.href = '/?kicked=true';
      }
    },
    []
  );

  useEffect(() => {
    const userData = authUtils.getUserData();
    const userId = userData?.id || userData?.IDNV;
    const username = userData?.username || '';
    const mySessionId =
      typeof window !== 'undefined' ? window.localStorage.getItem('h2_session_id') : null;

    if ((!userId && !username) || !mySessionId) return;

    let active = true;
    let client: ReturnType<typeof createClient>;

    try {
      client = createClient();
    } catch {
      return;
    }

    const channelTopic = userId ? `user-session:${userId}` : `user-session:${username}`;

    // 1. Lắng nghe broadcast realtime trên kênh riêng của người dùng
    const channel = client
      .channel(channelTopic)
      .on('broadcast', { event: 'session_revoked' }, (eventPayload) => {
        if (!active || kickoutHandledRef.current) return;
        const data = eventPayload?.payload || {};

        // Trường hợp 1: Admin thu hồi toàn bộ phiên của tài khoản
        if (data.revokeAll === true) {
          console.warn('[Session Security] Toàn bộ phiên đã bị thu hồi từ xa:', data);
          void handleKickOut(
            data.message || 'Phiên đăng nhập của bạn đã bị Quản trị viên (Admin) đăng xuất từ xa.'
          );
          return;
        }

        // Trường hợp 2: Admin hoặc người dùng đăng xuất đích danh phiên của thiết bị này
        if (data.revokedSessionId && data.revokedSessionId === mySessionId) {
          console.warn('[Session Security] Thiết bị này đã bị đăng xuất từ xa:', data);
          void handleKickOut(
            data.message || 'Thiết bị này đã bị Quản trị viên (Admin) đăng xuất từ xa.'
          );
          return;
        }

        // Trường hợp 3: Đăng nhập trên thiết bị mới khi chế độ giới hạn 1 thiết bị đang bật
        const incomingSessionId = data.activeSessionId;
        if (incomingSessionId && incomingSessionId !== mySessionId) {
          const isSingleEnforced =
            data.mode === 'single_enforced' ||
            getStoredFeatureConfig().flags.enforce_single_device_session !== false;

          if (isSingleEnforced) {
            console.warn(
              '[Session Security] Phiên làm việc đã bị ghi đè bởi thiết bị mới:',
              incomingSessionId
            );
            const deviceLabel = data.deviceInfo ? ` (${data.deviceInfo})` : '';
            void handleKickOut(
              `Tài khoản của bạn vừa đăng nhập ở thiết bị khác${deviceLabel}. Thiết bị này đã tự động đăng xuất để bảo mật.`
            );
          }
        }
      })
      .subscribe();

    // 2. Hàm kiểm tra hợp lệ với API máy chủ
    const verifySessionWithServer = async () => {
      if (!active || kickoutHandledRef.current) return;
      try {
        const params = new URLSearchParams();
        if (userId) params.set('userId', String(userId));
        if (username) params.set('username', String(username));
        params.set('sessionId', String(mySessionId));

        const res = await fetch(`/api/auth/session?${params.toString()}`, {
          cache: 'no-store',
        });
        const result = await res.json();
        if (active && result && result.valid === false) {
          console.warn('[Session Security] Server xác nhận phiên không còn hiệu lực:', result);
          void handleKickOut(
            result.message || 'Phiên đăng nhập đã hết hiệu lực hoặc đăng nhập ở thiết bị khác.'
          );
        }
      } catch {
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
