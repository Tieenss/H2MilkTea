import { LabelSettings } from '@/types/labelSettings';

const STORAGE_KEY = 'h2milktea-label-settings';

export const LABEL_PAPER_SIZES: Record<string, { name: string; width: number; height: number; description: string }> = {
  '50x30': {
    name: '50mm × 30mm (Tiêu chuẩn trà sữa)',
    width: 50,
    height: 30,
    description: 'Khổ tem phổ biến nhất cho quán trà sữa & cà phê tại Việt Nam (Xprinter XP-350B, XP-235B...)',
  },
  '40x30': {
    name: '40mm × 30mm (Bản nhỏ gọn)',
    width: 40,
    height: 30,
    description: 'Khổ tem nhỏ gọn, tiết kiệm chi phí giấy in cho các quán menu đơn giản',
  },
  '50x40': {
    name: '50mm × 40mm (Bản mở rộng)',
    width: 50,
    height: 40,
    description: 'Khổ tem dài hơn, phù hợp khi quán có nhiều topping hoặc khách ghi chú dài',
  },
  'custom': {
    name: 'Tùy chỉnh (mm)',
    width: 50,
    height: 30,
    description: 'Tự nhập kích thước chiều rộng và chiều cao tem theo loại cuộn giấy của bạn',
  },
};

export const getDefaultLabelSettings = (): LabelSettings => {
  return {
    enabled: true,
    connectionType: 'browser', // Mặc định dùng trình duyệt (Driver Windows/macOS)
    paperSize: '50x30',
    customWidthMm: 50,
    customHeightMm: 30,
    fontSize: 'medium',
    density: 10,
    fields: {
      showStoreName: true,
      storeName: 'H2 MilkTea',
      showOrderIndex: true,
      showTable: true,
      showPrice: true,
      showBarcodeOrQR: 'qr',
      showDateTime: true,
      showCashier: true,
      showNote: true,
      showToppings: true,
      showOptions: true,
      footerMessage: 'Chúc quý khách ngon miệng!',
    },
    // Các danh mục đồ uống mặc định cần in tem
    applicableCategories: ['Trà sữa', 'Cà phê', 'Trà trái cây', 'Đá xay', 'Sinh tố', 'Macchiato', 'Latte'],
    autoPrintOnKitchenSend: true,
    autoPrintOnCheckout: false,
  };
};

export const getLabelSettings = (): LabelSettings => {
  if (typeof window === 'undefined') {
    return getDefaultLabelSettings();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultLabelSettings();
    const parsed = JSON.parse(raw);
    return { ...getDefaultLabelSettings(), ...parsed };
  } catch (error) {
    console.error('Lỗi khi đọc cài đặt máy in tem nhãn:', error);
    return getDefaultLabelSettings();
  }
};

export const saveLabelSettings = (settings: LabelSettings): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu cài đặt máy in tem nhãn:', error);
    return false;
  }
};
