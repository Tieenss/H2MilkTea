'use client';

import React from 'react';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import ReceiptPreview, { sampleReceiptData } from '@/components/ReceiptPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// Example component showing how to use receipt settings in other pages
export default function ReceiptUsageExample() {
  const { settings, getCompanyInfo, getPrintSettings } = useReceiptSettings();
  const [showPreview, setShowPreview] = React.useState(false);

  const handlePrint = (templateType: 'pos' | 'kitchen' | 'order' | 'report') => {
    const printSettings = getPrintSettings(templateType);
    const companyInfo = getCompanyInfo();
    
    console.log('Printing with settings:', {
      template: templateType,
      settings: printSettings,
      companyInfo
    });
    
    // Here you would implement actual printing logic
    toast.success(`Đang in ${templateType} với cài đặt đã lưu...`);
  };

  const handleGenerateReceipt = () => {
    // Example of how to generate a receipt with current settings
    const companyInfo = getCompanyInfo();
    const posSettings = getPrintSettings('pos');
    
    console.log('Generating receipt with:', {
      companyInfo,
      settings: posSettings,
      data: sampleReceiptData
    });
    
    setShowPreview(true);
    toast.success('Đã tạo hóa đơn với cài đặt hiện tại!');
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Sử dụng cài đặt mẫu in</h2>
        <p className="text-muted-foreground">
          Ví dụ về cách sử dụng cài đặt mẫu in trong các trang khác
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* POS Receipt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Hóa đơn POS
            </CardTitle>
            <CardDescription>
              In hóa đơn bán hàng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => handlePrint('pos')}
              className="w-full"
            >
              In hóa đơn
            </Button>
            <Button 
              onClick={handleGenerateReceipt}
              variant="outline"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Xem trước
            </Button>
          </CardContent>
        </Card>

        {/* Kitchen Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Đơn bếp
            </CardTitle>
            <CardDescription>
              In đơn hàng cho bếp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handlePrint('kitchen')}
              className="w-full"
            >
              In đơn bếp
            </Button>
          </CardContent>
        </Card>

        {/* Order Receipt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Đơn hàng
            </CardTitle>
            <CardDescription>
              In đơn hàng chi tiết
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handlePrint('order')}
              className="w-full"
            >
              In đơn hàng
            </Button>
          </CardContent>
        </Card>

        {/* Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Báo cáo
            </CardTitle>
            <CardDescription>
              In báo cáo doanh thu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handlePrint('report')}
              className="w-full"
            >
              In báo cáo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Company Info Display */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin công ty hiện tại</CardTitle>
          <CardDescription>
            Thông tin công ty được lưu trong cài đặt mẫu in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Tên công ty:</strong> {getCompanyInfo().name}
            </div>
            <div>
              <strong>Điện thoại:</strong> {getCompanyInfo().phone}
            </div>
            <div>
              <strong>Email:</strong> {getCompanyInfo().email}
            </div>
            <div>
              <strong>Mã số thuế:</strong> {getCompanyInfo().taxCode}
            </div>
            <div className="md:col-span-2">
              <strong>Địa chỉ:</strong> {getCompanyInfo().address}
            </div>
            {getCompanyInfo().website && (
              <div>
                <strong>Website:</strong> {getCompanyInfo().website}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Xem trước hóa đơn</CardTitle>
            <CardDescription>
              Hóa đơn được tạo với cài đặt hiện tại
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <ReceiptPreview 
                data={sampleReceiptData}
                templateType="pos"
                className="border rounded-lg"
              />
            </div>
            <div className="flex justify-center mt-4">
              <Button 
                onClick={() => setShowPreview(false)}
                variant="outline"
              >
                Đóng xem trước
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Cách sử dụng trong code</CardTitle>
          <CardDescription>
            Ví dụ về cách import và sử dụng hook useReceiptSettings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
{`import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import ReceiptPreview from '@/components/ReceiptPreview';

function MyComponent() {
  const { settings, getCompanyInfo, getPrintSettings } = useReceiptSettings();
  
  // Lấy thông tin công ty
  const companyInfo = getCompanyInfo();
  
  // Lấy cài đặt in cho từng loại
  const posSettings = getPrintSettings('pos');
  const kitchenSettings = getPrintSettings('kitchen');
  
  // Sử dụng component ReceiptPreview
  return (
    <ReceiptPreview 
      data={receiptData}
      templateType="pos"
    />
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
