'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, Database, HardDrive, RefreshCw, Cookie } from 'lucide-react';

interface ClearCacheProgressModalProps {
  isOpen: boolean;
  onComplete?: () => void;
  redirectTo?: string;
}

interface StepInfo {
  step: number;
  progress: number;
  title: string;
  detail: string;
}

const STEPS: StepInfo[] = [
  {
    step: 1,
    progress: 20,
    title: 'Dọn sạch LocalStorage & SessionStorage',
    detail: 'Xóa giỏ hàng nháp, dữ liệu lưu tạm và token phiên cục bộ...',
  },
  {
    step: 2,
    progress: 40,
    title: 'Xóa Cookies & Tokens trình duyệt',
    detail: 'Hủy bỏ cookies xác thực và phiên đăng nhập cũ...',
  },
  {
    step: 3,
    progress: 65,
    title: 'Xóa bộ nhớ CacheStorage',
    detail: 'Dọn sạch tài nguyên tĩnh (assets, scripts, HTML) được lưu trong trình duyệt...',
  },
  {
    step: 4,
    progress: 85,
    title: 'Xóa cơ sở dữ liệu IndexedDB',
    detail: 'Dọn sạch cơ sở dữ liệu ngoại tuyến của Supabase và ứng dụng...',
  },
  {
    step: 5,
    progress: 100,
    title: 'Hủy đăng ký Service Workers & Hoàn tất',
    detail: 'Làm mới toàn bộ trạng thái và chuẩn bị chuyển hướng đăng nhập...',
  },
];

export const ClearCacheProgressModal: React.FC<ClearCacheProgressModalProps> = ({
  isOpen,
  onComplete,
  redirectTo = '/login',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Đang chuẩn bị dọn dẹp bộ nhớ đệm...');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setProgress(0);
      setIsFinished(false);
      return;
    }

    let isMounted = true;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const runCleanup = async () => {
      try {
        // Bước 1: 0% -> 20% - LocalStorage & SessionStorage
        if (!isMounted) return;
        setCurrentStepIndex(0);
        setStatusMessage(STEPS[0].detail);
        setProgress(20);
        await delay(350);

        try {
          if (typeof window !== 'undefined') {
            window.localStorage?.clear();
            window.sessionStorage?.clear();
          }
        } catch (e) {
          console.warn('Lỗi khi xóa Storage:', e);
        }

        // Bước 2: 20% -> 40% - Cookies
        if (!isMounted) return;
        setCurrentStepIndex(1);
        setStatusMessage(STEPS[1].detail);
        setProgress(40);
        await delay(350);

        try {
          if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const eqPos = cookie.indexOf('=');
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            }
          }
        } catch (e) {
          console.warn('Lỗi khi xóa Cookies:', e);
        }

        // Bước 3: 40% -> 65% - CacheStorage
        if (!isMounted) return;
        setCurrentStepIndex(2);
        setStatusMessage(STEPS[2].detail);
        setProgress(65);
        await delay(400);

        try {
          if (typeof window !== 'undefined' && 'caches' in window) {
            const cacheKeys = await window.caches.keys();
            await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
          }
        } catch (e) {
          console.warn('Lỗi khi xóa CacheStorage:', e);
        }

        // Bước 4: 65% -> 85% - IndexedDB
        if (!isMounted) return;
        setCurrentStepIndex(3);
        setStatusMessage(STEPS[3].detail);
        setProgress(85);
        await delay(400);

        try {
          if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            }
          }
        } catch (e) {
          console.warn('Lỗi khi xóa IndexedDB:', e);
        }

        // Bước 5: 85% -> 100% - Service Workers & Chuyển hướng
        if (!isMounted) return;
        setCurrentStepIndex(4);
        setStatusMessage(STEPS[4].detail);
        setProgress(100);
        await delay(450);

        try {
          if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }
        } catch (e) {
          console.warn('Lỗi khi hủy ServiceWorker:', e);
        }

        if (!isMounted) return;
        setIsFinished(true);
        setStatusMessage('Đã xóa sạch toàn bộ bộ nhớ đệm! Đang chuyển hướng...');

        await delay(600);
        if (onComplete) {
          onComplete();
        } else if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      } catch (err) {
        console.error('Lỗi trong tiến trình dọn dẹp:', err);
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      }
    };

    void runCleanup();

    return () => {
      isMounted = false;
    };
  }, [isOpen, onComplete, redirectTo]);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex] || STEPS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
          {isFinished ? (
            <CheckCircle2 className="w-9 h-9 text-emerald-500 animate-in zoom-in-50 duration-300" />
          ) : currentStepIndex === 0 ? (
            <HardDrive className="w-8 h-8 animate-pulse text-indigo-600" />
          ) : currentStepIndex === 1 ? (
            <Cookie className="w-8 h-8 animate-pulse text-amber-600" />
          ) : currentStepIndex === 2 ? (
            <Database className="w-8 h-8 animate-pulse text-blue-600" />
          ) : (
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
          )}
        </div>

        {/* Title & Step */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isFinished ? 'Đã hoàn tất dọn dẹp' : 'Đang xóa bộ nhớ đệm hệ thống'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Bước {currentStepIndex + 1} / {STEPS.length}: {currentStep.title}
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold px-1">
            <span className="text-gray-600 dark:text-gray-300">Tiến độ</span>
            <span className="text-indigo-600 dark:text-indigo-400 text-sm font-mono font-bold">
              {progress}%
            </span>
          </div>

          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3.5 p-0.5 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-1 ${
                isFinished
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-md shadow-indigo-500/20'
              }`}
              style={{ width: `${progress}%` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-ping" />
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 min-h-[52px] flex items-center justify-center leading-relaxed">
          <span>{statusMessage}</span>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center items-center gap-2 pt-1">
          {STEPS.map((s, idx) => (
            <div
              key={s.step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < currentStepIndex || isFinished
                  ? 'w-6 bg-emerald-500'
                  : idx === currentStepIndex
                  ? 'w-8 bg-indigo-600'
                  : 'w-2 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
