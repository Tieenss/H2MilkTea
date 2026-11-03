'use client';

import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowLeft, Settings, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KitchenDisplay } from './components/KitchenDisplay';
import { useFeatureFlags } from '@/lib/settings/useFeatureFlags';

export default function KitchenPage() {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  const isKitchenEnabled = isFeatureEnabled('pos_kitchen_print');

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Khi tính năng bị tắt trong Cài đặt chức năng -> Vô hiệu hóa màn hình bếp
  if (!isKitchenEnabled) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
            <UtensilsCrossed className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Chức năng đang tắt</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Màn hình Bếp / Pha chế đã bị vô hiệu hóa
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Tính năng <strong className="text-slate-700 dark:text-slate-200 font-semibold">"Gửi bếp & In tem nhãn pha chế"</strong> đã được tắt trong phần Cài đặt chức năng hệ thống.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link href="/pos" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full flex items-center justify-center gap-1.5 border-slate-300 dark:border-slate-700 dark:text-slate-200">
                <ArrowLeft className="w-4 h-4" />
                <span>Về POS Bán hàng</span>
              </Button>
            </Link>
            <Link href="/settings/features" className="w-full sm:w-auto">
              <Button className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold">
                <Settings className="w-4 h-4" />
                <span>Quản lý chức năng</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <KitchenDisplay stationId="main" maxOrders={20} />
  );
}
