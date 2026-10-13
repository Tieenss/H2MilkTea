'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mainElement = document.querySelector('[data-scroll-container]');
    if (!mainElement) return;

    const toggleVisibility = () => {
      setIsVisible(mainElement.scrollTop > 300);
    };

    mainElement.addEventListener('scroll', toggleVisibility);
    return () => mainElement.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const mainElement = document.querySelector('[data-scroll-container]');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full backdrop-blur-md bg-white/20 border border-white/30 shadow-lg hover:bg-white/30 transition-all duration-300 flex items-center justify-center text-gray-700 hover:text-gray-900"
      aria-label="Lên đầu trang"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
};