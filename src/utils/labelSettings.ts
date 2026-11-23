import { LabelSettings, LabelElementSizes, LabelFontSize } from '@/types/labelSettings';

const STORAGE_KEY = 'h2milktea-label-settings';

export const DEFAULT_LABEL_ELEMENT_SIZES: LabelElementSizes = {
  storeNameSize: 10,
  tableAndIndexSize: 9,
  productNameSize: 11,
  optionsSize: 9,
  toppingsSize: 8.5,
  noteSize: 8,
  priceSize: 10,
  metaSize: 7.5,
  footerMessageSize: 6.5,
  qrCodeSize: 18,
};

export const getPresetElementSizes = (preset: LabelFontSize): LabelElementSizes => {
  if (preset === 'small') {
    return {
      storeNameSize: 8.5,
      tableAndIndexSize: 8,
      productNameSize: 9.5,
      optionsSize: 7.5,
      toppingsSize: 7.5,
      noteSize: 7,
      priceSize: 8.5,
      metaSize: 6.5,
      footerMessageSize: 5.5,
      qrCodeSize: 16,
    };
  }
  if (preset === 'large') {
    return {
      storeNameSize: 11.5,
      tableAndIndexSize: 10.5,
      productNameSize: 13,
      optionsSize: 10.5,
      toppingsSize: 10,
      noteSize: 9.5,
      priceSize: 12,
      metaSize: 8.5,
      footerMessageSize: 7.5,
      qrCodeSize: 22,
    };
  }
  return { ...DEFAULT_LABEL_ELEMENT_SIZES };
};

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
      productNameBold: true,
      productNameWrap: true,
      priceBold: true,
      headerAlign: 'space-between',
    },
    elementSizes: { ...DEFAULT_LABEL_ELEMENT_SIZES },
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
    const parsed = JSON.parse(raw) as Partial<LabelSettings>;
    const defaults = getDefaultLabelSettings();
    const presetSizes = parsed.fontSize ? getPresetElementSizes(parsed.fontSize) : DEFAULT_LABEL_ELEMENT_SIZES;

    return {
      ...defaults,
      ...parsed,
      fields: {
        ...defaults.fields,
        ...(parsed.fields || {}),
      },
      elementSizes: {
        ...presetSizes,
        ...(parsed.elementSizes || {}),
      },
    };
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
