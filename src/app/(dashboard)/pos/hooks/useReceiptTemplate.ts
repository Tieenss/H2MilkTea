import { useState, useEffect } from 'react';
import type { ReceiptTemplate } from '../components/ReceiptTemplateModal';

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

const STORAGE_KEY = 'gigapos-receipt-template';

export const useReceiptTemplate = () => {
  const [template, setTemplate] = useState<ReceiptTemplate>(DEFAULT_TEMPLATE);

  // Load template from localStorage on component mount
  useEffect(() => {
    try {
      const savedTemplate = localStorage.getItem(STORAGE_KEY);
      if (savedTemplate) {
        const parsedTemplate = JSON.parse(savedTemplate);
        setTemplate({ ...DEFAULT_TEMPLATE, ...parsedTemplate });
      }
    } catch (error) {
      console.error('Error loading receipt template:', error);
      setTemplate(DEFAULT_TEMPLATE);
    }
  }, []);

  // Save template to localStorage
  const saveTemplate = (newTemplate: ReceiptTemplate) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplate));
      setTemplate(newTemplate);
      return true;
    } catch (error) {
      console.error('Error saving receipt template:', error);
      return false;
    }
  };

  // Reset to default template
  const resetTemplate = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setTemplate(DEFAULT_TEMPLATE);
      return true;
    } catch (error) {
      console.error('Error resetting receipt template:', error);
      return false;
    }
  };

  // Export template as JSON file
  const exportTemplate = () => {
    try {
      const dataStr = JSON.stringify(template, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-template-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error exporting template:', error);
      return false;
    }
  };

  // Import template from JSON file
  const importTemplate = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const importedTemplate = JSON.parse(content);
          
          // Validate template structure
          const validTemplate = { ...DEFAULT_TEMPLATE, ...importedTemplate };
          saveTemplate(validTemplate);
          resolve(true);
        } catch (error) {
          console.error('Error importing template:', error);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  };

  return {
    template,
    saveTemplate,
    resetTemplate,
    exportTemplate,
    importTemplate,
    defaultTemplate: DEFAULT_TEMPLATE
  };
};

export default useReceiptTemplate;
