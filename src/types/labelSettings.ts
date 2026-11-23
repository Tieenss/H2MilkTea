export type LabelPaperSize = '50x30' | '40x30' | '50x40' | 'custom';
export type LabelConnectionType = 'browser' | 'usb_serial';
export type LabelBarcodeType = 'none' | 'qr' | 'barcode';
export type LabelFontSize = 'small' | 'medium' | 'large';
export type LabelHeaderAlign = 'space-between' | 'center';

export interface LabelElementSizes {
  storeNameSize: number;      // Cỡ chữ Tên quán (Header trái) - Mặc định: 10 (px), Dải: 7 - 16
  tableAndIndexSize: number;  // Cỡ chữ Tên bàn & Số thứ tự ly (#1/2) - Mặc định: 9 (px), Dải: 7 - 16
  productNameSize: number;    // Cỡ chữ Tên món & Size [L] - Mặc định: 11 (px), Dải: 8 - 20
  optionsSize: number;        // Cỡ chữ Đường / Đá - Mặc định: 9 (px), Dải: 6 - 15
  toppingsSize: number;       // Cỡ chữ Danh sách Topping - Mặc định: 8.5 (px), Dải: 6 - 14
  noteSize: number;           // Cỡ chữ Ghi chú của khách - Mặc định: 8 (px), Dải: 6 - 14
  priceSize: number;          // Cỡ chữ Giá tiền - Mặc định: 10 (px), Dải: 8 - 18
  metaSize: number;           // Cỡ chữ Ngày giờ & Thu ngân - Mặc định: 7.5 (px), Dải: 6 - 12
  footerMessageSize: number;  // Cỡ chữ Lời chúc đáy tem - Mặc định: 6.5 (px), Dải: 5 - 12
  qrCodeSize: number;         // Kích thước Mã QR (px) - Mặc định: 18 (px), Dải: 12 - 34
}

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
  productNameBold?: boolean;    // In đậm tên món - mặc định true
  productNameWrap?: boolean;    // Cho phép tên món dài xuống 2 dòng thay vì cắt 1 dòng - mặc định true
  priceBold?: boolean;          // In đậm giá tiền - mặc định true
  headerAlign?: LabelHeaderAlign; // Căn lề phần đầu tem - mặc định 'space-between'
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
  elementSizes?: LabelElementSizes; // Kích thước chi tiết từng mục
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
