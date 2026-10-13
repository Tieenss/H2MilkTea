'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Home,
  ArrowLeft,
  Search,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50">
      {/* Liquid Glass Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-100/30 rounded-full mix-blend-normal filter blur-3xl animate-liquid-float"></div>
          <div className="absolute top-40 right-32 w-80 h-80 bg-gray-200/40 rounded-full mix-blend-normal filter blur-3xl animate-liquid-float-delayed"></div>
          <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-blue-50/50 rounded-full mix-blend-normal filter blur-3xl animate-liquid-float-slow"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-gray-100/60 rounded-full mix-blend-normal filter blur-3xl animate-liquid-pulse"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
    

          {/* 404 Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100/50 to-gray-100/50 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

            <Card className="relative backdrop-blur-2xl bg-white/70 border border-white/60 shadow-2xl rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

              <CardContent className="relative p-12">
                {/* 404 Icon */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative">
                 
                    <img
                      src="/logo-h2.png"
                      alt="H2 MilkTea Logo"
                      className="w-40 h-40 object-contain"
                    />
                  </div>

                  {/* 404 Text */}
                  <div className="space-y-4">
                    <h1 className="text-8xl font-bold text-gray-800 mb-2 tracking-wider">
                      404
                    </h1>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">
                      Trang không tìm thấy
                    </h2>

                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/dashboard">
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl py-3 px-8 font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                    >
                      <Home className="h-5 w-5 mr-2" />
                      Về trang chủ
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="bg-white/60 backdrop-blur-xl border border-gray-200/40 hover:bg-white/80 text-gray-800 rounded-2xl py-3 px-8 font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Quay lại
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="bg-white/60 backdrop-blur-xl border border-gray-200/40 hover:bg-white/80 text-gray-800 rounded-2xl py-3 px-8 font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Tải lại
                  </Button>
                </div>


              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}