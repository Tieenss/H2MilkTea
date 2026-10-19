'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Printer, 
  FileText, 
  Settings, 
  Upload, 
  Download, 
  Save,
  RefreshCw,
  Monitor,
  Smartphone,
  Eye,
  Copy,
  Tag
} from 'lucide-react';
import useReceiptTemplate from '../pos/hooks/useReceiptTemplate';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import ReceiptPreview, { sampleReceiptData } from '@/components/ReceiptPreview';
import { applyReceiptSettingsToAll } from '@/utils/receiptSettings';
import { LabelSettingsTab } from '@/components/LabelSettingsTab';
import toast from 'react-hot-toast';

// Paper size configurations
const PAPER_SIZES = {
  '58mm': {
    name: '58mm (Máy in nhiệt)',
    width: 58,
    description: 'Khổ giấy 58mm phù hợp cho máy in nhiệt di động',
    maxChars: 24,
    recommended: 'POS'
  },
  '80mm': {
    name: '80mm (Máy in nhiệt)',
    width: 80,
    description: 'Khổ giấy 80mm phù hợp cho máy in nhiệt quầy',
    maxChars: 32,
    recommended: 'POS + Kitchen'
  },
  'A4': {
    name: 'A4 (210x297mm)',
    width: 210,
    description: 'Khổ giấy A4 tiêu chuẩn cho máy in laser/inkjet',
    maxChars: 80,
    recommended: 'Reports'
  },
  'A5': {
    name: 'A5 (148x210mm)',
    width: 148,
    description: 'Khổ giấy A5 nhỏ gọn',
    maxChars: 60,
    recommended: 'Orders'
  },
  'custom': {
    name: 'Tùy chỉnh',
    width: 0,
    description: 'Tự định nghĩa kích thước giấy',
    maxChars: 0,
    recommended: 'Custom'
  }
};

const FONT_SIZES = {
  'small': { name: 'Nhỏ', size: '10px', description: 'Tiết kiệm giấy' },
  'medium': { name: 'Trung bình', size: '12px', description: 'Cân bằng' },
  'large': { name: 'Lớn', size: '14px', description: 'Dễ đọc' },
  'xlarge': { name: 'Rất lớn', size: '16px', description: 'Cho người già' }
};

const TEMPLATES = {
  pos: 'Mẫu hóa đơn bán hàng',
  report: 'Mẫu báo cáo'
};

export default function ReceiptSettingsPage() {
  const { template, saveTemplate, exportTemplate, importTemplate } = useReceiptTemplate();
  const [currentTab, setCurrentTab] = useState('pos');
  const [paperSize, setPaperSize] = useState('80mm');
  const [customWidth, setCustomWidth] = useState(80);
  const [customHeight, setCustomHeight] = useState(200);
  const [fontSize, setFontSize] = useState('medium');
  const [showPreview, setShowPreview] = useState(false);
  
  // Template settings
  const [templateSettings, setTemplateSettings] = useState({
    pos: {
      paperSize: '80mm',
      fontSize: 'medium',
      showLogo: true,
      showQR: true,
      showSignature: false,
      headerText: 'HÓA ĐƠN BÁN HÀNG',
      footerText: 'Cảm ơn quý khách!',
      companyInfo: {
        name: 'H2 MilkTea SYSTEM',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        phone: '0985561909',
        email: 'tiengame@gmail.com',
        taxCode: '0985561909',
        website: 'https://h2milktea.vercel.app/'
      }
    },
    report: {
      paperSize: 'A4',
      fontSize: 'small',
      showCharts: true,
      showSummary: true,
      headerText: 'BÁO CÁO',
      landscape: true
    }
  });

  // Load settings from localStorage on mount
  React.useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('gigapos-receipt-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.paperSize) setPaperSize(settings.paperSize);
        if (settings.fontSize) setFontSize(settings.fontSize);
        if (settings.customWidth) setCustomWidth(settings.customWidth);
        if (settings.customHeight) setCustomHeight(settings.customHeight);
        if (settings.templates) setTemplateSettings(settings.templates);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  const handleSaveSettings = () => {
    // Save to localStorage with extended settings
    try {
      const extendedSettings = {
        template,
        paperSize,
        fontSize,
        customWidth,
        customHeight,
        templates: templateSettings
      };
      localStorage.setItem('gigapos-receipt-settings', JSON.stringify(extendedSettings));
      
      // Also save globally for other components to use
      localStorage.setItem('gigapos-company-info', JSON.stringify(templateSettings.pos.companyInfo));
      
      toast.success('Cài đặt mẫu in đã được lưu thành công!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Có lỗi xảy ra khi lưu cài đặt!');
    }
  };

  const handleApplyToAll = () => {
    // Apply current settings to both POS and Orders
    const extendedSettings = {
      template,
      paperSize,
      fontSize,
      customWidth,
      customHeight,
      templates: templateSettings
    };
    
    // Save the unified settings
    localStorage.setItem('gigapos-receipt-settings', JSON.stringify(extendedSettings));
    localStorage.setItem('gigapos-company-info', JSON.stringify(templateSettings.pos.companyInfo));
    
    // Apply to all systems
    applyReceiptSettingsToAll();
    
    toast.success('Đã áp dụng cài đặt cho cả POS và Orders!');
  };

  const handleTestPrint = () => {
    // Simulate test print
    toast.success('Đang in thử mẫu... (Tính năng demo)');
  };

  const handleExportSettings = () => {
    try {
      const extendedSettings = {
        template,
        paperSize,
        fontSize,
        customWidth,
        customHeight,
        templates: templateSettings
      };
      
      const dataStr = JSON.stringify(extendedSettings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất cài đặt thành công!');
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Có lỗi xảy ra khi xuất cài đặt!');
    }
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          if (settings.paperSize) setPaperSize(settings.paperSize);
          if (settings.fontSize) setFontSize(settings.fontSize);
          if (settings.customWidth) setCustomWidth(settings.customWidth);
          if (settings.customHeight) setCustomHeight(settings.customHeight);
          if (settings.templates) setTemplateSettings(settings.templates);
          toast.success('Đã nhập cài đặt thành công!');
        } catch (error) {
          console.error('Error importing settings:', error);
          toast.error('Có lỗi xảy ra khi nhập cài đặt!');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  const handleResetToDefault = () => {
    setPaperSize('80mm');
    setFontSize('medium');
    setCustomWidth(80);
    setCustomHeight(200);
    toast.success('Đã khôi phục cài đặt mặc định!');
  };

  const getCurrentPaperSize = () => {
    return PAPER_SIZES[paperSize as keyof typeof PAPER_SIZES];
  };

  const updateTemplateSettings = (templateType: string, key: string, value: any) => {
    setTemplateSettings(prev => ({
      ...prev,
      [templateType]: {
        ...prev[templateType as keyof typeof prev],
        [key]: value
      }
    }));
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt mẫu in</h1>
          <p className="text-muted-foreground">
            Tùy chỉnh mẫu in hóa đơn bán hàng cho POS và Orders. Cài đặt sẽ tự động áp dụng cho cả hai trang.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-green-100 text-green-800">✓ POS đã tích hợp</Badge>
            <Badge className="bg-green-100 text-green-800">✓ Orders đã tích hợp</Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportSettings}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Xuất cài đặt
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="import-settings"
            />
            <Button
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
              asChild
            >
              <label htmlFor="import-settings" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Nhập cài đặt
              </label>
            </Button>
          </div>
          
          <Button
            onClick={handleSaveSettings}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Lưu cài đặt
          </Button>
        </div>
      </div>

      {/* Navigation Mode Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          type="button"
          variant={currentTab === 'pos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentTab('pos')}
          className={`flex items-center gap-2 ${currentTab === 'pos' ? 'bg-blue-600 text-white' : ''}`}
        >
          <Monitor className="w-4 h-4" />
          Hóa đơn bán hàng
        </Button>
        <Button
          type="button"
          variant={currentTab === 'label' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentTab('label')}
          className={`flex items-center gap-2 ${currentTab === 'label' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}`}
        >
          <Tag className="w-4 h-4" />
          Tem nhãn dán ly (Mới)
        </Button>
        <Button
          type="button"
          variant={currentTab === 'report' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentTab('report')}
          className={`flex items-center gap-2 ${currentTab === 'report' ? 'bg-blue-600 text-white' : ''}`}
        >
          <Settings className="w-4 h-4" />
          Mẫu báo cáo
        </Button>
      </div>

      {currentTab === 'label' ? (
        <LabelSettingsTab />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Trạng thái tích hợp
              </CardTitle>
              <CardDescription>
                Các trang đã được tích hợp với cài đặt mẫu in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-green-600" />
                    <span className="font-medium">POS</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Đã tích hợp</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Đơn hàng</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Đã tích hợp</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium">Báo cáo</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Sẵn sàng</Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Cách sử dụng:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Mẫu hóa đơn sẽ tự động áp dụng cho cả POS và Orders</li>
                  <li>• Thông tin công ty sẽ hiển thị trên tất cả hóa đơn</li>
                  <li>• Khổ giấy và cỡ chữ được tùy chỉnh thống nhất</li>
                  <li>• Có thể in thử mẫu để kiểm tra trước khi sử dụng</li>
                  <li>• <strong>Cài đặt được đồng bộ giữa trang POS và Orders</strong></li>
                </ul>
              </div>
              
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                  ✅ Tích hợp hoàn tất
                </h4>
                <p className="text-sm text-green-700">
                  Cài đặt mẫu in đã được tích hợp hoàn toàn cho cả trang <strong>POS</strong> và <strong>Orders</strong>. 
                  Bất kỳ thay đổi nào ở đây sẽ tự động áp dụng cho cả hai trang.
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pos" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Hóa đơn bán hàng
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Báo cáo
              </TabsTrigger>
            </TabsList>

            {/* Invoice Template */}
            <TabsContent value="pos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    Cài đặt mẫu hóa đơn bán hàng
                  </CardTitle>
                  <CardDescription>
                    Tùy chỉnh mẫu in hóa đơn cho hệ thống POS và Orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Paper Size Selection */}
                  <div className="space-y-2">
                    <Label>Khổ giấy</Label>
                    <Select
                      value={templateSettings.pos.paperSize}
                      onValueChange={(value) => updateTemplateSettings('pos', 'paperSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAPER_SIZES).map(([key, size]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center justify-between w-full">
                              <span>{size.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {size.recommended}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {PAPER_SIZES[templateSettings.pos.paperSize as keyof typeof PAPER_SIZES]?.description}
                    </p>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-2">
                    <Label>Cỡ chữ</Label>
                    <Select
                      value={templateSettings.pos.fontSize}
                      onValueChange={(value) => updateTemplateSettings('pos', 'fontSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FONT_SIZES).map(([key, font]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center justify-between w-full">
                              <span>{font.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {font.size}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Header Text */}
                  <div className="space-y-2">
                    <Label>Tiêu đề hóa đơn</Label>
                    <Input
                      value={templateSettings.pos.headerText}
                      onChange={(e) => updateTemplateSettings('pos', 'headerText', e.target.value)}
                      placeholder="HÓA ĐƠN BÁN HÀNG"
                    />
                  </div>

                  {/* Footer Text */}
                  <div className="space-y-2">
                    <Label>Lời cảm ơn</Label>
                    <Textarea
                      value={templateSettings.pos.footerText}
                      onChange={(e) => updateTemplateSettings('pos', 'footerText', e.target.value)}
                      placeholder="Cảm ơn quý khách!"
                      rows={2}
                    />
                  </div>

                  <Separator />

                  {/* Company Information */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Thông tin công ty</Label>
                    
                    <div className="space-y-2">
                      <Label>Tên công ty</Label>
                      <Input
                        value={templateSettings.pos.companyInfo.name}
                        onChange={(e) => updateTemplateSettings('pos', 'companyInfo', {
                          ...templateSettings.pos.companyInfo,
                          name: e.target.value
                        })}
                        placeholder="GIGA POS SYSTEM"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Địa chỉ</Label>
                      <Textarea
                        value={templateSettings.pos.companyInfo.address}
                        onChange={(e) => updateTemplateSettings('pos', 'companyInfo', {
                          ...templateSettings.pos.companyInfo,
                          address: e.target.value
                        })}
                        placeholder="123 Đường ABC, Quận 1, TP.HCM"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Số điện thoại</Label>
                        <Input
                          value={templateSettings.pos.companyInfo.phone}
                          onChange={(e) => updateTemplateSettings('pos', 'companyInfo', {
                            ...templateSettings.pos.companyInfo,
                            phone: e.target.value
                          })}
                          placeholder="0901234567"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={templateSettings.pos.companyInfo.email}
                          onChange={(e) => updateTemplateSettings('pos', 'companyInfo', {
                            ...templateSettings.pos.companyInfo,
                            email: e.target.value
                          })}
                          placeholder="info@gigapos.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Mã số thuế</Label>
                      <Input
                        value={templateSettings.pos.companyInfo.taxCode || ''}
                        onChange={(e) => updateTemplateSettings('pos', 'companyInfo', {
                          ...templateSettings.pos.companyInfo,
                          taxCode: e.target.value
                        })}
                        placeholder="0123456789"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={templateSettings.pos.companyInfo.website || ''}
                        onChange={(e) => updateTemplateSettings('pos', 'companyInfo', {
                          ...templateSettings.pos.companyInfo,
                          website: e.target.value
                        })}
                        placeholder="www.gigapos.com"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Display Options */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Tùy chọn hiển thị</Label>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Hiển thị logo</Label>
                        <p className="text-sm text-muted-foreground">Logo công ty trên hóa đơn</p>
                      </div>
                      <Switch
                        checked={templateSettings.pos.showLogo}
                        onCheckedChange={(checked) => updateTemplateSettings('pos', 'showLogo', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Hiển thị mã QR</Label>
                        <p className="text-sm text-muted-foreground">Mã QR thanh toán</p>
                      </div>
                      <Switch
                        checked={templateSettings.pos.showQR}
                        onCheckedChange={(checked) => updateTemplateSettings('pos', 'showQR', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Chỗ ký tên</Label>
                        <p className="text-sm text-muted-foreground">Khu vực ký tên khách hàng</p>
                      </div>
                      <Switch
                        checked={templateSettings.pos.showSignature}
                        onCheckedChange={(checked) => updateTemplateSettings('pos', 'showSignature', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Report Template */}
            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Cài đặt mẫu báo cáo
                  </CardTitle>
                  <CardDescription>
                    Tùy chỉnh mẫu in báo cáo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Report template settings */}
                  <div className="space-y-2">
                    <Label>Khổ giấy</Label>
                    <Select
                      value={templateSettings.report.paperSize}
                      onValueChange={(value) => updateTemplateSettings('report', 'paperSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAPER_SIZES).map(([key, size]) => (
                          <SelectItem key={key} value={key}>
                            {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>In ngang</Label>
                      <p className="text-sm text-muted-foreground">Chế độ landscape</p>
                    </div>
                    <Switch
                      checked={templateSettings.report.landscape}
                      onCheckedChange={(checked) => updateTemplateSettings('report', 'landscape', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Xem trước
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="outline"
                  className="w-full"
                >
                  {showPreview ? 'Ẩn xem trước' : 'Hiển thị xem trước'}
                </Button>

                {showPreview && (
                  <div className="border rounded-lg bg-gray-50 p-2">
                    <ReceiptPreview 
                      data={sampleReceiptData}
                      templateType={currentTab as 'pos' | 'report'}
                      className="scale-75 origin-top mx-auto"
                    />
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Button
                    onClick={handleTestPrint}
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    In thử mẫu
                  </Button>

                  <Button
                    onClick={handleApplyToAll}
                    variant="outline"
                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Áp dụng cho POS & Orders
                  </Button>

                  <Button
                    onClick={handleResetToDefault}
                    variant="outline"
                    className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Khôi phục mặc định
                  </Button>

                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(templateSettings, null, 2));
                      toast.success('Đã copy cài đặt vào clipboard!');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy cài đặt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin khổ giấy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {Object.entries(PAPER_SIZES).map(([key, size]) => (
                  <div key={key} className="flex justify-between">
                    <span>{size.name}</span>
                    <Badge variant="outline">{size.recommended}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
