// utils/receiptSettings.ts
import toast from 'react-hot-toast';

export interface ReceiptSettings {
  paperSize: string;
  fontSize: string;
  customWidth?: number;
  customHeight?: number;
  templates: {
    pos: {
      paperSize: string;
      fontSize: string;
      showLogo: boolean;
      showQR: boolean;
      showSignature: boolean;
      headerText: string;
      footerText: string;
      companyInfo: {
        name: string;
        address: string;
        phone: string;
        email: string;
        taxCode: string;
        website: string;
      };
    };
    report: {
      paperSize: string;
      fontSize: string;
      showCharts: boolean;
      showSummary: boolean;
      headerText: string;
      landscape: boolean;
    };
  };
}

export const getReceiptSettings = (): ReceiptSettings | null => {
  try {
    const savedSettings = localStorage.getItem('gigapos-receipt-settings');
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('Error loading receipt settings:', error);
    return null;
  }
};

export const saveReceiptSettings = (settings: ReceiptSettings): boolean => {
  try {
    localStorage.setItem('gigapos-receipt-settings', JSON.stringify(settings));
    localStorage.setItem('gigapos-company-info', JSON.stringify(settings.templates.pos.companyInfo));
    return true;
  } catch (error) {
    console.error('Error saving receipt settings:', error);
    return false;
  }
};

export const applyReceiptSettingsToAll = (): void => {
  const settings = getReceiptSettings();
  if (!settings) {
    toast.error('Không tìm thấy cài đặt mẫu in!');
    return;
  }

  // Apply settings to both POS and Orders
  // The settings are already unified - both pages use the same 'pos' template
  toast.success('Cài đặt mẫu in đã được áp dụng cho cả POS và Orders!');
};

export const getDefaultSettings = (): ReceiptSettings => {
  return {
    paperSize: '80mm',
    fontSize: 'medium',
    customWidth: 80,
    customHeight: 200,
    templates: {
      pos: {
        paperSize: '80mm',
        fontSize: 'medium',
        showLogo: true,
        showQR: true,
        showSignature: false,
        headerText: 'HÓA ĐƠN BÁN HÀNG',
        footerText: 'Cảm ơn quý khách!',
        companyInfo: {
          name: 'GIGA POS SYSTEM',
          address: '123 Đường ABC, Quận 1, TP.HCM',
          phone: '0901234567',
          email: 'info@gigapos.com',
          taxCode: '0123456789',
          website: 'www.gigapos.com'
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
    }
  };
};

export const validateReceiptSettings = (settings: any): boolean => {
  try {
    return (
      settings &&
      settings.templates &&
      settings.templates.pos &&
      settings.templates.pos.companyInfo &&
      typeof settings.templates.pos.companyInfo.name === 'string' &&
      typeof settings.templates.pos.headerText === 'string'
    );
  } catch (error) {
    return false;
  }
};
