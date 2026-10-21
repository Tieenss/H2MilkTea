'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { NavigationItem } from '@/lib/navigation';
import { getFeatureBadge, type DeviceFeatureState } from '@/utils/featureTracker';

interface GroupHubViewProps {
  title: string;
  description: string;
  icon: React.ElementType;
  items: NavigationItem[];
  accentGradient?: string;
}

export function GroupHubView({
  title,
  description,
  icon: HeaderIcon,
  items,
  accentGradient = 'from-indigo-600 to-purple-600',
}: GroupHubViewProps) {
  return (
    <div className="min-h-screen bg-gray-50/60 pb-16">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${accentGradient} text-white flex items-center justify-center shadow-lg shadow-indigo-500/10`}
              >
                <HeaderIcon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {title}
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/50">
                    {items.length} chức năng
                  </span>
                </div>
                <p className="text-sm sm:text-base text-gray-500 mt-1">{description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Sub-features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => {
            const ItemIcon = item.icon;
            const badge = getFeatureBadge(item.href);

            return (
              <Link
                key={item.href || index}
                href={item.href || '#'}
                className="group relative bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-xl hover:border-indigo-400/80 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Top decorative gradient bar on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110"
                      style={{ backgroundColor: item.color || '#4f46e5' }}
                    >
                      <ItemIcon className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-2">
                      {badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                    {item.description || 'Truy cập để quản lý và vận hành chức năng này.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500 group-hover:text-indigo-600">
                  <span>Mở chức năng</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
