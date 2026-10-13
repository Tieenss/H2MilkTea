'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Home, 
  ArrowLeft, 
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  FileText
} from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-50 rounded-full">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-gray-800 mb-2">
              404
            </CardTitle>
            <h2 className="text-2xl font-semibold text-gray-700">
              Trang không tìm thấy
            </h2>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 text-lg">
              Trang bạn đang tìm kiếm không tồn tại trong hệ thống dashboard.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button className="bg-red-500 hover:bg-red-600 text-white">
                  <Home className="h-4 w-4 mr-2" />
                  Về trang chủ
                </Button>
              </Link>
              
              <Button 
                variant="outline"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            </div>

            {/* Quick Navigation */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Truy cập nhanh:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/products">
                  <Button variant="ghost" size="sm" className="w-full">
                    <Package className="h-4 w-4 mr-1" />
                    Sản phẩm
                  </Button>
                </Link>
                <Link href="/kho">
                  <Button variant="ghost" size="sm" className="w-full">
                    <Package className="h-4 w-4 mr-1" />
                    Kho
                  </Button>
                </Link>
                <Link href="/orders">
                  <Button variant="ghost" size="sm" className="w-full">
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Đơn hàng
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="w-full">
                    <Users className="h-4 w-4 mr-1" />
                    Cá nhân
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}