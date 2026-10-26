'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, Home, Trash2, AlertTriangle } from 'lucide-react';
import { ClearCacheProgressModal } from '@/components/ClearCacheProgressModal';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  useEffect(() => {
    console.error('Captured by Next.js Error Boundary:', error);
  }, [error]);

  const handleClearCacheAndReload = () => {
    setShowClearCacheModal(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Đã xảy ra sự cố hiển thị
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            Hệ thống vừa ngăn chặn một lỗi tạm thời ở trình duyệt để bảo vệ dữ liệu của bạn.
          </p>
          {error?.message && (
            <div className="mt-3 p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-600 dark:text-gray-300 text-left truncate">
              {error.message}
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            Thử tải lại ngay
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            Về màn hình chính
          </button>

          <button
            type="button"
            onClick={handleClearCacheAndReload}
            className="w-full py-2 px-4 rounded-xl text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa bộ nhớ đệm & Đăng nhập lại
          </button>
        </div>
      </div>

      <ClearCacheProgressModal
        isOpen={showClearCacheModal}
        redirectTo="/login"
      />
    </div>
  );
}
