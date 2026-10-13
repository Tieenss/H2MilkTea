import { useState, useEffect } from 'react';

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxCode: string;
  website: string;
}

export interface ReceiptSettings {
  paperSize: string;
  fontSize: string;
  showLogo: boolean;
  showQR: boolean;
  showSignature: boolean;
  headerText: string;
  footerText: string;
  companyInfo: CompanyInfo;
}

export interface AllTemplateSettings {
  pos: ReceiptSettings;
  kitchen: {
    paperSize: string;
    fontSize: string;
    showTime: boolean;
    showTable: boolean;
    showNotes: boolean;
    headerText: string;
    priority: boolean;
  };
  order: {
    paperSize: string;
    fontSize: string;
    showCustomer: boolean;
    showDelivery: boolean;
    headerText: string;
    columns: number;
  };
  report: {
    paperSize: string;
    fontSize: string;
    showCharts: boolean;
    showSummary: boolean;
    headerText: string;
    landscape: boolean;
  };
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'GIGA POS SYSTEM',
  address: '123 Đường ABC, Quận 1, TP.HCM',
  phone: '0901234567',
  email: 'info@gigapos.com',
  taxCode: '0123456789',
  website: 'www.gigapos.com'
};

const defaultSettings: AllTemplateSettings = {
  pos: {
    paperSize: '80mm',
    fontSize: 'medium',
    showLogo: true,
    showQR: true,
    showSignature: false,
    headerText: 'HÓA ĐƠN BÁN HÀNG',
    footerText: 'Cảm ơn quý khách!',
    companyInfo: defaultCompanyInfo
  },
  kitchen: {
    paperSize: '80mm',
    fontSize: 'large',
    showTime: true,
    showTable: true,
    showNotes: true,
    headerText: 'ĐƠN BẾP',
    priority: true
  },
  order: {
    paperSize: 'A4',
    fontSize: 'medium',
    showCustomer: true,
    showDelivery: true,
    headerText: 'ĐƠN HÀNG',
    columns: 4
  },
  report: {
    paperSize: 'A4',
    fontSize: 'small',
    showCharts: true,
    showSummary: true,
    headerText: 'BÁO CÁO',
    landscape: true
  }
};

export function useReceiptSettings() {
  const [settings, setSettings] = useState<AllTemplateSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('gigapos-receipt-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.templates) {
          setSettings(parsed.templates);
        }
      }
    } catch (error) {
      console.error('Error loading receipt settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = (newSettings: Partial<AllTemplateSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      const currentData = localStorage.getItem('gigapos-receipt-settings');
      const existingData = currentData ? JSON.parse(currentData) : {};
      
      const updatedData = {
        ...existingData,
        templates: updatedSettings
      };
      
      localStorage.setItem('gigapos-receipt-settings', JSON.stringify(updatedData));
      
      // Save company info separately for easy access
      localStorage.setItem('gigapos-company-info', JSON.stringify(updatedSettings.pos.companyInfo));
    } catch (error) {
      console.error('Error saving receipt settings:', error);
    }
  };

  const getCompanyInfo = (): CompanyInfo => {
    try {
      const savedCompanyInfo = localStorage.getItem('gigapos-company-info');
      if (savedCompanyInfo) {
        return JSON.parse(savedCompanyInfo);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
    return settings.pos.companyInfo;
  };

  const getPrintSettings = (templateType: keyof AllTemplateSettings) => {
    return settings[templateType];
  };

  return {
    settings,
    updateSettings,
    getCompanyInfo,
    getPrintSettings,
    isLoading
  };
}
