'use client';

import React, { useRef, useEffect } from 'react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  categoryCounts: Record<string, number>;
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange, categoryCounts }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active category
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = activeRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      
      container.scrollTo({
        left: elementLeft - containerWidth / 2 + elementWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [activeCategory]);

  const allCategories = ['Tất cả', ...categories];

  return (
    <div className="sticky top-[57px] z-40 bg-white/90 backdrop-blur-lg border-b border-orange-50">
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allCategories.map((cat) => {
          const isActive = cat === activeCategory;
          const count = cat === 'Tất cả'
            ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
            : (categoryCounts[cat] || 0);

          return (
            <button
              key={cat}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryChange(cat)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-200/50 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                }
              `}
            >
              {cat}
              <span className={`ml-1.5 text-xs ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
