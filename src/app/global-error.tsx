'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-6 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold">Hệ thống đang tải lại</h2>
          <p className="text-sm text-gray-600">
            Trình duyệt gặp một xung đột tạm thời. Vui lòng bấm làm mới để tiếp tục.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors"
          >
            Làm mới ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}
