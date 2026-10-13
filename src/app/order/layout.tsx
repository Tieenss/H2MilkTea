'use client';

import { CartProvider } from './context/CartContext';

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30">
        {children}
      </div>
    </CartProvider>
  );
}
