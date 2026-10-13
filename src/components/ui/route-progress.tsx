// components/ui/route-progress.tsx với thanh cực mỏng
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setProgress(0);

    const timer1 = setTimeout(() => setProgress(30), 30);
    const timer2 = setTimeout(() => setProgress(70), 80);
    const timer3 = setTimeout(() => setProgress(100), 150);
    
    const hideTimer = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40">
      <Progress 
        value={progress} 
        className="h-px w-full rounded-none bg-transparent" // Cực mỏng chỉ 1px
      />
    </div>
  );
}