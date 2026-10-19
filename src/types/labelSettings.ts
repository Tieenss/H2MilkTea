export type LabelPaperSize = '50x30' | '40x30' | '50x40' | 'custom';
export type LabelConnectionType = 'browser' | 'usb_serial';
export type LabelBarcodeType = 'none' | 'qr' | 'barcode';
export type LabelFontSize = 'small' | 'medium' | 'large';

export interface LabelFieldsConfig {
  showStoreName: boolean;
  storeName: string;
  showOrderIndex: boolean;      // Ví dụ: Ly 1/3
  showTable: boolean;           // Bàn: B001 / Khách mua về
  showPrice: boolean;
  showBarcodeOrQR: LabelBarcodeType;
  showDateTime: boolean;
  showCashier: boolean;
  showNote: boolean;
  showToppings: boolean;
  showOptions: boolean;         // Size, Đường, Đá
  footerMessage?: string;       // Lời chúc ở đáy tem
}

export interface LabelSettings {
  enabled: boolean;
  connectionType: LabelConnectionType;
  paperSize: LabelPaperSize;
  customWidthMm: number;
  customHeightMm: number;
  fontSize: LabelFontSize;
  density: number;              // Độ đậm (1-15 cho lệnh máy in nhiệt)
  fields: LabelFieldsConfig;
  applicableCategories: string[]; // Danh sách loại sản phẩm in tem, vd: ['Trà sữa', 'Cà phê']
  autoPrintOnKitchenSend: boolean; // Tự động in khi bấm Gửi bếp
  autoPrintOnCheckout: boolean;    // Tự động in khi bấm Thanh toán
}

export interface PrintableLabelItem {
  id: string;
  name: string;
  size?: string;
  sugar?: string;
  ice?: string;
  toppings?: string[];
  note?: string;
  price: number;
  category?: string;
  itemIndex: number;            // Thứ tự ly (VD: 1)
  totalItems: number;           // Tổng số ly cần in tem của đơn (VD: 3)
}

export interface LabelOrderInfo {
  orderId?: string;
  tableId?: string;
  tableName?: string;
  cashier?: string;
  cashierName?: string;
  customerName?: string;
  createdAt?: string | Date;
}
