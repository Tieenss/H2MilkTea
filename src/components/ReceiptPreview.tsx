'use client';

import React from 'react';
import { useReceiptSettings, CompanyInfo } from '@/hooks/useReceiptSettings';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
}

interface ReceiptData {
  receiptNumber: string;
  date: Date;
  cashier: string;
  customer: string;
  table?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  notes?: string;
}

interface ReceiptPreviewProps {
  data: ReceiptData;
  templateType?: 'pos' | 'kitchen' | 'order' | 'report';
  className?: string;
}

export default function ReceiptPreview({ 
  data, 
  templateType = 'pos', 
  className = '' 
}: ReceiptPreviewProps) {
  const { settings, getCompanyInfo } = useReceiptSettings();
  const companyInfo = getCompanyInfo();
  const template = settings[templateType];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (templateType === 'pos') {
    const posTemplate = settings.pos;
    
    return (
      <div className={`bg-white p-4 font-mono text-sm max-w-md ${className}`}>
        {/* Header */}
        <div className="text-center border-b pb-2 mb-2">
          {posTemplate.showLogo && (
            <div className="text-lg font-bold mb-1">🏪 LOGO</div>
          )}
          <div className="font-bold">{companyInfo.name}</div>
          <div className="text-xs">{companyInfo.address}</div>
          <div className="text-xs">ĐT: {companyInfo.phone}</div>
          <div className="text-xs">Email: {companyInfo.email}</div>
          {companyInfo.taxCode && (
            <div className="text-xs">MST: {companyInfo.taxCode}</div>
          )}
          {companyInfo.website && (
            <div className="text-xs">Web: {companyInfo.website}</div>
          )}
        </div>

        {/* Receipt Title */}
        <div className="text-center font-bold border-b pb-1 mb-2">
          {posTemplate.headerText}
        </div>

        {/* Receipt Info */}
        <div className="text-xs space-y-1 mb-2">
          <div className="flex justify-between">
            <span>Số HĐ:</span>
            <span>{data.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Ngày:</span>
            <span>{data.date.toLocaleDateString('vi-VN')} {data.date.toLocaleTimeString('vi-VN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Thu ngân:</span>
            <span>{data.cashier}</span>
          </div>
          <div className="flex justify-between">
            <span>Khách hàng:</span>
            <span>{data.customer}</span>
          </div>
          {data.table && (
            <div className="flex justify-between">
              <span>Bàn:</span>
              <span>{data.table}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="border-t border-b py-2 mb-2">
          <div className="flex justify-between font-bold text-xs mb-1">
            <span>Món</span>
            <span>SL</span>
            <span>Giá</span>
            <span>T.Tiền</span>
          </div>
          <div className="space-y-1 text-xs">
            {data.items.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between">
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <span className="w-16 text-right">{formatCurrency(item.price)}</span>
                  <span className="w-20 text-right">{formatCurrency(item.total)}</span>
                </div>
                {item.notes && (
                  <div className="text-xs text-gray-600 ml-2">- {item.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between">
            <span>Tạm tính:</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between">
              <span>Giảm giá:</span>
              <span>-{formatCurrency(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1">
            <span>Tổng cộng:</span>
            <span>{formatCurrency(data.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tiền khách đưa:</span>
            <span>{formatCurrency(data.paid)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tiền thừa:</span>
            <span>{formatCurrency(data.change)}</span>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="text-xs mb-2 border-t pt-2">
            <div className="font-bold">Ghi chú:</div>
            <div>{data.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center border-t pt-2">
          <div className="text-xs">{posTemplate.footerText}</div>
          {posTemplate.showQR && (
            <div className="mt-2">
              <div className="text-xs">Quét mã QR để thanh toán:</div>
              <div className="flex justify-center mt-1">
                <div className="w-16 h-16 border-2 border-black flex items-center justify-center text-xs">
                  QR CODE
                </div>
              </div>
            </div>
          )}
          {posTemplate.showSignature && (
            <div className="mt-4 border-t pt-2">
              <div className="text-xs mb-2">Chữ ký khách hàng:</div>
              <div className="h-12 border-b"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (templateType === 'kitchen') {
    const kitchenTemplate = settings.kitchen;
    
    return (
      <div className={`bg-white p-4 font-mono text-sm max-w-sm ${className}`}>
        <div className="text-center font-bold text-lg border-b pb-2 mb-2">
          {kitchenTemplate.headerText}
        </div>
        
        {kitchenTemplate.showTime && (
          <div className="text-xs mb-1">
            Thời gian: {data.date.toLocaleTimeString('vi-VN')}
          </div>
        )}
        
        <div className="flex justify-between text-sm font-bold mb-2">
          <span>Đơn: {data.receiptNumber}</span>
          {kitchenTemplate.showTable && data.table && (
            <span>Bàn: {data.table}</span>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {data.items.map((item, index) => (
            <div key={index} className="border-b pb-1">
              <div className="flex justify-between font-bold">
                <span>{item.quantity}x {item.name}</span>
              </div>
              {kitchenTemplate.showNotes && item.notes && (
                <div className="text-xs text-gray-600 ml-4">- {item.notes}</div>
              )}
            </div>
          ))}
        </div>

        {kitchenTemplate.priority && (
          <div className="text-center">
            <div className="bg-red-100 text-red-800 font-bold py-1 px-2 rounded">
              🔥 ƯU TIÊN
            </div>
          </div>
        )}

        <div className="text-center text-xs mt-4 border-t pt-2">
          Thu ngân: {data.cashier}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`bg-white p-4 font-mono text-sm ${className}`}>
      <div className="text-center font-bold">
        {template.headerText || 'Document'}
      </div>
      <div className="mt-4 text-xs">
        Template: {templateType}
      </div>
    </div>
  );
}

// Export sample data for testing
export const sampleReceiptData: ReceiptData = {
  receiptNumber: 'HD001234',
  date: new Date(),
  cashier: 'Admin',
  customer: 'Khách lẻ',
  table: '05',
  items: [
    {
      name: 'Phở Tái',
      quantity: 2,
      price: 45000,
      total: 90000,
      notes: 'Ít hành'
    },
    {
      name: 'Cà phê sữa',
      quantity: 1,
      price: 25000,
      total: 25000,
      notes: 'Ít đường'
    }
  ],
  subtotal: 115000,
  discount: 0,
  total: 115000,
  paid: 120000,
  change: 5000,
  notes: 'Khách hàng VIP'
};
