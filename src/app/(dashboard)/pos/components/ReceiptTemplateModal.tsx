import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export interface ReceiptTemplate {
  companyName: string;
  address: string;
  phone: string;
  website: string;
  footer: string;
  fontFamily: string;
  fontSize: number;
  showLogo: boolean;
  logoUrl?: string;
}

interface ReceiptTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: ReceiptTemplate) => void;
  currentTemplate: ReceiptTemplate;
}

const DEFAULT_TEMPLATE: ReceiptTemplate = {
  companyName: 'GIGA COFFEE',
  address: 'Đông Hà, Quảng Trị',
  phone: '0826438777',
  website: 'gigacoffee.vn',
  footer: 'Cảm ơn quý khách đã mua hàng!\nHẹn gặp lại quý khách',
  fontFamily: 'Arial, sans-serif',
  fontSize: 12,
  showLogo: false,
  logoUrl: ''
};

export const ReceiptTemplateModal: React.FC<ReceiptTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentTemplate
}) => {
  const [template, setTemplate] = useState<ReceiptTemplate>(currentTemplate);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setTemplate(currentTemplate);
  }, [currentTemplate]);

  const handleInputChange = (field: keyof ReceiptTemplate, value: any) => {
    setTemplate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    try {
      onSave(template);
      toast.success('Mẫu hóa đơn đã được lưu thành công!');
      onClose();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu mẫu hóa đơn!');
    }
  };

  const handleReset = () => {
    setTemplate(DEFAULT_TEMPLATE);
    toast.success('Đã khôi phục về mẫu mặc định');
  };

  const generatePreviewHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Xem trước hóa đơn</title>
          <meta charset="UTF-8">
          <style>
              body {
                  font-family: ${template.fontFamily};
                  font-size: ${template.fontSize}px;
                  line-height: 1.4;
                  margin: 20px;
                  background-color: white;
              }
              .header {
                  text-align: center;
                  margin-bottom: 20px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 15px;
              }
              .company-name {
                  font-size: ${template.fontSize + 4}px;
                  font-weight: bold;
                  margin-bottom: 8px;
              }
              .company-info {
                  margin: 5px 0;
              }
              .invoice-title {
                  font-size: ${template.fontSize + 2}px;
                  font-weight: bold;
                  margin: 20px 0;
                  text-transform: uppercase;
                  text-align: center;
              }
              .sample-content {
                  margin: 20px 0;
                  padding: 10px;
                  border: 1px dashed #ccc;
                  background-color: #f9f9f9;
                  text-align: center;
                  color: #666;
              }
              .footer {
                  margin-top: 30px;
                  border-top: 1px dashed #000;
                  padding-top: 15px;
                  text-align: center;
                  white-space: pre-line;
              }
          </style>
      </head>
      <body>
          <div class="header">
              ${template.showLogo && template.logoUrl ? `<img src="${template.logoUrl}" alt="Logo" style="max-width: 100px; margin-bottom: 10px;">` : ''}
              <div class="company-name">${template.companyName}</div>
              <div class="company-info"><strong>Địa chỉ: ${template.address}</strong></div>
              <div class="company-info">SĐT: ${template.phone}</div>
              <div class="company-info">Website: ${template.website}</div>
          </div>

          <div class="invoice-title">Hóa đơn bán hàng</div>
          
          <div class="sample-content">
              [Nội dung hóa đơn sẽ hiển thị ở đây]<br>
              Thông tin khách hàng, sản phẩm, tổng tiền...
          </div>

          <div class="footer">
              ${template.footer}
              <div style="margin-top: 10px; font-size: ${template.fontSize - 2}px;">
                  Liên hệ hỗ trợ: ${template.phone}
              </div>
          </div>
      </body>
      </html>
    `;
  };

  const handlePreview = () => {
    const previewWindow = window.open('', '', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(generatePreviewHtml());
      previewWindow.document.close();
      previewWindow.focus();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Cài đặt mẫu hóa đơn
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Thông tin công ty */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Thông tin công ty</h3>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Tên công ty</Label>
              <Input
                id="companyName"
                value={template.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Tên công ty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                value={template.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Địa chỉ công ty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={template.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Số điện thoại"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={template.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="Website"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Lời cảm ơn</Label>
              <Textarea
                id="footer"
                value={template.footer}
                onChange={(e) => handleInputChange('footer', e.target.value)}
                placeholder="Lời cảm ơn cuối hóa đơn"
                rows={3}
              />
            </div>
          </div>

          {/* Cài đặt hiển thị */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cài đặt hiển thị</h3>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font chữ</Label>
              <select
                id="fontFamily"
                value={template.fontFamily}
                onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontSize">Kích thước chữ</Label>
              <Input
                id="fontSize"
                type="number"
                min="8"
                max="20"
                value={template.fontSize}
                onChange={(e) => handleInputChange('fontSize', parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showLogo"
                checked={template.showLogo}
                onChange={(e) => handleInputChange('showLogo', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="showLogo">Hiển thị logo</Label>
            </div>

            {template.showLogo && (
              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL Logo</Label>
                <Input
                  id="logoUrl"
                  value={template.logoUrl || ''}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handlePreview}
                variant="outline"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Xem trước
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Khôi phục mặc định
          </Button>

          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Hủy
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Lưu mẫu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptTemplateModal;
