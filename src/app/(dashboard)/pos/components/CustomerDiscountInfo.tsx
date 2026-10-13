'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Gift, Star, Crown, User } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import type { Customer } from '@/app/(dashboard)/khachhang/types/customer';

interface CustomerDiscountInfoProps {
  customer: Customer | null;
  subtotal: number;
  discount: number;
}

export const CustomerDiscountInfo: React.FC<CustomerDiscountInfoProps> = ({
  customer,
  subtotal,
  discount
}) => {
  if (!customer) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
        <User className="w-4 h-4 mx-auto mb-1 text-gray-400" />
        <p className="text-sm text-gray-500">Khách lẻ</p>
        <p className="text-xs text-gray-400">Không có ưu đãi đặc biệt</p>
      </div>
    );
  }

  const customerType = customer['Loại khách hàng'];
  const points = customer['Điểm tích lũy'];
  
  const getCustomerIcon = () => {
    switch (customerType) {
      case 'Khách kim cương':
        return <Crown className="w-4 h-4 text-purple-600" />;
      case 'Khách VIP':
        return <Star className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCustomerColor = () => {
    switch (customerType) {
      case 'Khách kim cương':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'Khách VIP':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getDiscountInfo = () => {
    switch (customerType) {
      case 'Khách kim cương':
        return {
          percentage: 20,
          description: 'Giảm 20% mọi đơn hàng',
          color: 'text-purple-600'
        };
      case 'Khách VIP':
        return {
          percentage: 10,
          description: 'Giảm 10% mọi đơn hàng',
          color: 'text-blue-600'
        };
      default:
        return {
          percentage: 0,
          description: `Cần ${1000 - points} điểm nữa để lên VIP`,
          color: 'text-gray-500'
        };
    }
  };

  const discountInfo = getDiscountInfo();

  return (
    <div className={`border rounded-lg p-3 ${getCustomerColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {getCustomerIcon()}
          <span className="ml-2 font-medium text-sm">{customer['Tên khách hàng']}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {customerType}
        </Badge>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Điểm tích lũy:</span>
          <span className="font-medium">{points.toLocaleString()} điểm</span>
        </div>
        
        <div className="flex justify-between">
          <span>Số điện thoại:</span>
          <span>{customer['Số điện thoại']}</span>
        </div>
      </div>

      {/* Discount Information */}
      <div className="mt-2 pt-2 border-t border-current border-opacity-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Gift className="w-3 h-3 mr-1" />
            <span className="text-xs">{discountInfo.description}</span>
          </div>
          {discount > 0 && (
            <div className="text-right">
              <div className={`font-bold text-sm ${discountInfo.color}`}>
                -{formatCurrency(discount)}
              </div>
              <div className="text-xs opacity-75">
                ({discountInfo.percentage}% giảm)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Suggestion for Regular Customers */}
      {customerType === 'Khách thường' && points < 1000 && (
        <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
          <div className="flex items-center">
            <Star className="w-3 h-3 mr-1" />
            <span>Mua thêm {formatCurrency((1000 - points) * 1000)} để lên VIP!</span>
          </div>
        </div>
      )}

      {/* Upgrade Suggestion for VIP Customers */}
      {customerType === 'Khách VIP' && points < 3000 && (
        <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-700">
          <div className="flex items-center">
            <Crown className="w-3 h-3 mr-1" />
            <span>Mua thêm {formatCurrency((3000 - points) * 1000)} để lên Kim cương!</span>
          </div>
        </div>
      )}
    </div>
  );
};
