'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onBarcodeScanned: (productId: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeScanned }) => {
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(Date.now());
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const CONFIG = {
    barcodeBufferTimeout: 100
  };

  // Check if device is mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBarcodeInput = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    const currentTime = Date.now();

    // Reset buffer if too much time has passed
    if (currentTime - lastKeystrokeTime > CONFIG.barcodeBufferTimeout) {
      setBarcodeBuffer('');
    }

    setLastKeystrokeTime(currentTime);

    if (event.key === 'Enter') {
      event.preventDefault();
      const barcode = event.currentTarget.value.trim();
      if (barcode) {
        processBarcodeInput(barcode);
        event.currentTarget.value = '';
      }
      setBarcodeBuffer('');
    }

    // Auto-focus back to barcode input if enabled
    if (autoFocusEnabled && barcodeInputRef.current) {
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);
    }
  }, [lastKeystrokeTime, autoFocusEnabled]);

  const processBarcodeInput = useCallback((barcode: string) => {
    onBarcodeScanned(barcode);
  }, [onBarcodeScanned]);

  const toggleAutoFocus = useCallback((enable: boolean) => {
    setAutoFocusEnabled(enable);
    if (enable && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const focusInput = useCallback(() => {
    toggleAutoFocus(true);
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [toggleAutoFocus]);

  // Mobile version - simplified
  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={barcodeInputRef}
          type="text"
          className="px-3 py-2 border rounded-lg flex-1 text-sm touch-target"
          placeholder="Nhập mã sản phẩm..."
          autoComplete="off"
          onKeyDown={handleBarcodeInput}
        />

        <Button
          onClick={focusInput}
          variant="outline"
          size="sm"
          className="border-blue-200 text-blue-700 hover:bg-blue-50 touch-target flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </Button>
      </div>
    );
  }

  // Desktop version - full featured
  return (
    <div className="flex items-center gap-2">
      <Input
        ref={barcodeInputRef}
        type="text"
        className="px-3 py-1.5 border rounded-lg w-56 text-sm"
        placeholder="Nhập hoặc quét mã sản phẩm..."
        autoComplete="off"
        onKeyDown={handleBarcodeInput}
      />

      <Button
        onClick={focusInput}
        variant="outline"
        size="sm"
        className="border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Quét mã
      </Button>
    </div>
  );
};