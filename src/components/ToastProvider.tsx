'use client';

import React, { useState, useRef } from 'react';
import { Toaster, ToastBar, toast, Toast } from 'react-hot-toast';

function SwipeableToastContent({
  t,
  icon,
  message,
}: {
  t: Toast;
  icon: React.ReactNode;
  message: React.ReactNode;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  // Xử lý Touch Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    setOffsetX(deltaX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(offsetX) > 60) {
      toast.dismiss(t.id);
    } else {
      setOffsetX(0);
    }
  };

  // Xử lý Mouse Drag Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    setOffsetX(deltaX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(offsetX) > 60) {
      toast.dismiss(t.id);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity: Math.max(0.2, 1 - Math.abs(offsetX) / 120),
        transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'pan-y',
      }}
      className="flex items-center gap-2.5 w-full select-none"
      title="Kéo sang trái hoặc phải để tắt nhanh"
    >
      {icon}
      <div className="flex-1 text-sm font-medium">{message}</div>
      {t.type !== 'loading' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
          title="Đóng nhanh"
          aria-label="Đóng thông báo"
        >
          <span className="text-sm font-bold leading-none">✕</span>
        </button>
      )}
    </div>
  );
}

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
            <SwipeableToastContent t={t} icon={icon} message={message} />
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
