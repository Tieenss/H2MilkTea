export interface Product {
  IDSP: string;
  'Tên sản phẩm': string;
  'Đơn giá': string;
  'Loại sản phẩm': string;
  'Hình ảnh': string;
  [key: string]: any;
}

export interface Table {
  IDBAN: string;
  'Tên bàn': string;
  'Sức chứa tối đa': number;
  'Trạng thái': string;
  [key: string]: any;
}

export interface CartItem {
  image: string | Blob | undefined;
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  unit: string;
}

// Customer info for receipt
export interface CustomerInfo {
  name: string;
  phone: string;
  type: string;
  points: number;
}

// Updated PaymentData to include customer info
export interface PaymentData {
  id: string;
  tableId: string;
  employee: string;
  customer: string;
  date: string;
  total: number;
  vat: number;
  discount: number;
  paidAmount: number;
  change: number;
  note: string;
  items: CartItem[];
  customerInfo?: CustomerInfo | null;
}

export interface Invoice {
  IDHOADON: string;
  IDBAN: string;
  'Nhân viên': string;
  'Khách hàng': string;
  'Ngày': string;
  'Tổng tiền': number;
  'VAT': number;
  'Giảm giá': number;
  'Khách trả': number;
  'Tiền thừa': number;
  'Ghi chú': string;
  'Trạng thái': string;
  'Trạng thái sử dụng bàn': string;
  'Loại thanh toán': string;
  [key: string]: any;
}

export interface InvoiceDetail {
  IDHOADONDETAIL: string;
  IDHOADON: string;
  IDSP: string;
  'Tên sản phẩm': string;
  'Đơn vị tính': string;
  'Đơn giá': number;
  'Số lượng': number;
  'Thành tiền': number;
  'Ghi chú': string;
  [key: string]: any;
}

export interface Category {
  name: string;
  count: number;
}

export interface POSState {
  products: Product[];
  filteredProducts: Product[];
  tables: Table[];
  cart: CartItem[];
  selectedTableId: string | null;
  activeOrders: Map<string, CartItem[]>;
  categories: Category[];
  searchTerm: string;
  categoryFilter: string;
  priceFilter: string;
  isLoading: boolean;
  loadingText: string;
}

export interface ModalState {
  showTableModal: boolean;
  showCheckoutModal: boolean;
  showTransferModal: boolean;
  showNoteModal: boolean;
  selectedItemForNote: CartItem | null;
  noteInput: string;
}