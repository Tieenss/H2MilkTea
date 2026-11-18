'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const COOLDOWN_SECONDS = 30;
const COOLDOWN_EVENT = 'h2_service_call_cooldown_updated';

function getStorageKey(tableId?: string): string {
  const normalized = (tableId || 'default').trim() || 'default';
  return `h2_service_call_cooldown_${normalized}`;
}

function readRemainingSeconds(tableId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(getStorageKey(tableId));
    if (!raw) return 0;
    const expiresAt = Number(raw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      localStorage.removeItem(getStorageKey(tableId));
      return 0;
    }
    return Math.ceil((expiresAt - Date.now()) / 1000);
  } catch {
    return 0;
  }
}

interface ServiceCallButtonProps {
  tableId?: string;
  tableName?: string;
  className?: string;
}

export function ServiceCallButton({
  tableId,
  tableName,
  className = '',
}: ServiceCallButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);

  const syncRemaining = useCallback(() => {
    setSecondsLeft(readRemainingSeconds(tableId));
  }, [tableId]);

  useEffect(() => {
    syncRemaining();
    const handleSync = () => syncRemaining();
    window.addEventListener(COOLDOWN_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(COOLDOWN_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [syncRemaining]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      const rem = readRemainingSeconds(tableId);
      setSecondsLeft(rem);
      if (rem <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, tableId]);

  const handleCallService = async () => {
    if (secondsLeft > 0 || isSending) return;

    const resolvedTableId = (tableId || '').trim() || 'Khách tại quán';
    const resolvedTableName = (tableName || '').trim() || resolvedTableId;

    setIsSending(true);
    try {
      const res = await fetch('/api/customer-order/service-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: resolvedTableId,
          tableName: resolvedTableName,
          requestType: 'Gọi nhân viên / Xin thêm đá',
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        toast.error(data?.error || 'Không thể gửi yêu cầu gọi nhân viên lúc này.');
        return;
      }

      const expiresAt = Date.now() + COOLDOWN_SECONDS * 1000;
      try {
        localStorage.setItem(getStorageKey(tableId), String(expiresAt));
        window.dispatchEvent(new Event(COOLDOWN_EVENT));
      } catch {
        // Bỏ qua lỗi ghi storage
      }
      setSecondsLeft(COOLDOWN_SECONDS);
      toast.success(
        data?.message || 'Đã gửi yêu cầu "Gọi nhân viên / Xin thêm đá" tới quầy POS!',
        { icon: '🔔', duration: 3000 }
      );
    } catch {
      toast.error('Lỗi kết nối, vui lòng thử lại hoặc báo trực tiếp nhân viên.');
    } finally {
      setIsSending(false);
    }
  };

  const isDisabled = secondsLeft > 0 || isSending;

  return (
    <button
      type="button"
      onClick={handleCallService}
      disabled={isDisabled}
      aria-label="Gọi nhân viên hoặc xin thêm đá"
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
        isDisabled
          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
          : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 shadow-2xs active:scale-95 cursor-pointer'
      } ${className}`}
    >
      <span>
        {isSending
          ? 'Đang gửi yêu cầu...'
          : secondsLeft > 0
            ? `Đã gọi nhân viên (chờ ${secondsLeft}s)`
            : '🔔 Gọi nhân viên / Xin thêm đá'}
      </span>
    </button>
  );
}
