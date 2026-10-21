'use client';

import React from 'react';
import { Toaster, ToastBar, toast } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#fff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '8px 12px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-center gap-2.5 w-full">
              {icon}
              <div className="flex-1 text-sm font-medium">{message}</div>
              {t.type !== 'loading' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                  title="Đóng nhanh"
                  aria-label="Đóng thông báo"
                >
                  <span className="text-sm font-bold leading-none">✕</span>
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
