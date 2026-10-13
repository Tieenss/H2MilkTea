'use client';

import React, { Suspense } from 'react';
import LoginPage from './login'; // hoặc đường dẫn đến component LoginPage

// Loading component
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải...</p>
      </div>
    </div>
  );
}

// Main page component
export default function Page() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginPage />
    </Suspense>
  );
}