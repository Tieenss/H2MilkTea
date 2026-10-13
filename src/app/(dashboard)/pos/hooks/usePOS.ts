'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'

import type { Product, Table, CartItem, Category, POSState, ModalState } from '../types/pos';
import { useProducts } from './useProducts';
import { useTables } from './useTables';
import { useCart } from './useCart';
import { formatCurrency, generateId, formatDate } from '../utils/formatters';
import { printReceipt } from '../utils/receipt';
import authUtils from '@/utils/authUtils';
import { Customer } from '@/app/(dashboard)/khachhang/types/customer';
import { calculatePointsFromSpending } from '@/app/(dashboard)/khachhang/utils/customerFormatters';

// Helper function to format date to Vietnamese format (DD/MM/YYYY HH:mm:ss)
const formatToVietnameseDateTime = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

// Import customer types và utils
export const usePOS = () => {
  // Get user data
  const userData = authUtils.getUserData();
  const nhanvien = userData?.['Họ và Tên'] || userData?.username;

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Custom hooks
  const {
    products,
    filteredProducts,
    categories,
    searchTerm,
    categoryFilter,
    priceFilter,
    isLoading: productsLoading,
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,
    fetchProducts,
    filterProducts,
    resetFilters
  } = useProducts();

  const {
    tables,
    isLoading: tablesLoading,
    fetchTables,
    updateTableStatus
  } = useTables();

  const {
    cart,
    activeOrders,
    selectedTableId,
    addToCart: addItemToCart,
    removeFromCart,
    adjustQuantity,
    clearCart,
    setCart,
    setActiveOrders,
    setSelectedTableId,
    updateCartItemNote
  } = useCart();

  // Modal state
  const [modalState, setModalState] = useState<ModalState>({
    showTableModal: false,
    showCheckoutModal: false,
    showTransferModal: false,
    showNoteModal: false,
    selectedItemForNote: null,
    noteInput: ''
  });

  // Loading state
  const [loadingText, setLoadingText] = useState('Đang tải dữ liệu...');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Customer display reference
  const customerDisplayWindow = useRef<Window | null>(null);

  // Constants
  const CONFIG = {
    timeouts: {
      notification: 2000,
      barcodeBuffer: 100
    },
    customerDisplayUrl: 'customer-display.html'
  };

  // Loading states
  const isLoading = productsLoading || tablesLoading;
  // UI Helpers
  // (showNotification already declared above, duplicate removed)

  const sendToKitchen = useCallback(async (orderData: {
    tableId: string;
    tableName: string;
    items: CartItem[];
    employee: string;
    notes?: string;
  }) => {
    try {
      const kitchenOrder = {
        id: generateId('ORD'),
        tableId: orderData.tableId,
        tableName: orderData.tableName,
        items: orderData.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          note: item.note,
          unit: item.unit
        })),
        orderTime: new Date().toISOString(),
        employee: orderData.employee,
        status: 'pending',
        priority: 'normal',
        notes: orderData.notes
      };

      const response = await fetch('/api/kitchen/new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kitchenOrder)
      });

      if (response.ok) {
        showNotification('Đã gửi đơn hàng đến bếp!');
        
        // Print kitchen receipt
        try {
          const { printReceiptWithSettings } = await import('../utils/receiptPrint');
          
          const kitchenReceiptData = {
            receiptNumber: kitchenOrder.id,
            date: new Date(),
            cashier: orderData.employee,
            customer: 'Đơn bếp',
            table: orderData.tableName,
            items: orderData.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              notes: item.note
            })),
            subtotal: 0,
            discount: 0,
            total: 0,
            paid: 0,
            change: 0,
            notes: orderData.notes
          };

          await printReceiptWithSettings(kitchenReceiptData, 'kitchen');
        } catch (printError) {
          console.error('Error printing kitchen receipt:', printError);
          // Don't show error to user as kitchen order was sent successfully
        }
      } else {
        throw new Error('Failed to send order to kitchen');
      }
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      showNotification('Lỗi gửi đơn hàng đến bếp!', 'error');
    }
  }, []);
  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await authUtils.apiRequest('KHACHHANG', 'getall', {});
      const customerList = Array.isArray(response) ? response : [];
      const activeCustomers = customerList.filter(customer =>
        customer['Trạng thái'] === 'Hoạt động'
      );
      setCustomers(activeCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  // UI Helpers
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (type === 'success') {
      toast.success(message, {
        position: "bottom-left",
        duration: CONFIG.timeouts.notification,
      });
    } else if (type === 'error') {
      toast.error(message, {
        position: "bottom-left",
        duration: CONFIG.timeouts.notification,
      });
    } else if (type === 'warning') {
      toast(message, {
        icon: '⚠️',
        position: "bottom-left",
        duration: CONFIG.timeouts.notification,
        style: { background: '#fffbe6', color: '#ad8b00' }
      });
    }
  }, []);

  const showLoading = useCallback((message = 'Đang tải dữ liệu...') => {
    setLoadingText(message);
  }, []);

  // Modal handlers
  const updateModalState = useCallback((updates: Partial<ModalState>) => {
    setModalState(prev => ({ ...prev, ...updates }));
  }, []);

  const setShowTableModal = useCallback((show: boolean) => {
    updateModalState({ showTableModal: show });
  }, [updateModalState]);

  const setShowCheckoutModal = useCallback((show: boolean) => {
    updateModalState({ showCheckoutModal: show });
  }, [updateModalState]);

  const setShowTransferModal = useCallback((show: boolean) => {
    updateModalState({ showTransferModal: show });
  }, [updateModalState]);

  const setShowNoteModal = useCallback((show: boolean) => {
    updateModalState({ showNoteModal: show });
  }, [updateModalState]);

  const setSelectedItemForNote = useCallback((item: CartItem | null) => {
    updateModalState({ selectedItemForNote: item });
  }, [updateModalState]);

  const setNoteInput = useCallback((note: string) => {
    updateModalState({ noteInput: note });
  }, [updateModalState]);

  // Customer handlers
  const handleSelectCustomer = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);

    if (customer) {
      showNotification(`Đã chọn khách hàng: ${customer['Tên khách hàng']}`);
    } else {
      showNotification('Đã chọn khách lẻ');
    }
  }, [showNotification]);

  // Cart operations
  const addToCart = useCallback((productId: string) => {
    if (!selectedTableId) {
      showNotification('Vui lòng chọn bàn trước khi gọi món!', 'error');
      setShowTableModal(true);
      return;
    }

    const product = products.find(p => p.IDSP === productId);
    if (!product) {
      showNotification('Không tìm thấy sản phẩm!', 'error');
      return;
    }

    addItemToCart(product);
    updateCustomerDisplay();
  }, [selectedTableId, products, addItemToCart, showNotification, setShowTableModal]);

  // Table operations
  const selectTable = useCallback((tableId: string) => {
    const table = tables.find(t => t.IDBAN === tableId);
    if (!table) return;

    // Save current cart if exists
    if (selectedTableId && cart.length > 0) {
      const newActiveOrders = new Map(activeOrders);
      newActiveOrders.set(selectedTableId, [...cart]);
      setActiveOrders(newActiveOrders);
    }

    // Update selected table
    setSelectedTableId(tableId);

    // Load cart for this table
    const tableCart = activeOrders.get(tableId) || [];
    setCart(tableCart);

    // Update table status if needed
    if (table['Tên bàn'] !== 'Khách mua về' && table['Trạng thái'] === 'Trống') {
      updateTableStatus(tableId, 'Đang sử dụng');
    }

    // Update customer display
    updateCustomerDisplay(tableCart, table);

    showNotification(`Đã chuyển sang ${table['Tên bàn']}`);
    setShowTableModal(false);
  }, [tables, selectedTableId, cart, activeOrders, setActiveOrders, setSelectedTableId, setCart, updateTableStatus, showNotification, setShowTableModal]);

  // Transfer table
  const transferTable = useCallback(async (targetTableId: string) => {
    try {
      showLoading('Đang chuyển bàn...');

      const sourceTableId = selectedTableId;
      const sourceTable = tables.find(t => t.IDBAN === sourceTableId);
      const targetTable = tables.find(t => t.IDBAN === targetTableId);

      // Update tables status
      if (sourceTable && sourceTable['Tên bàn'] !== 'Khách mua về') {
        updateTableStatus(sourceTableId!, 'Trống');
      }
      if (targetTable && targetTable['Tên bàn'] !== 'Khách mua về') {
        updateTableStatus(targetTableId, 'Đang sử dụng');
      }

      // Transfer orders
      const newActiveOrders = new Map(activeOrders);
      newActiveOrders.set(targetTableId, [...cart]);
      newActiveOrders.delete(sourceTableId!);
      setActiveOrders(newActiveOrders);

      // Update selected table
      setSelectedTableId(targetTableId);

      // Update customer display
      updateCustomerDisplay(cart, targetTable);

      showNotification(`Đã chuyển từ ${sourceTable?.['Tên bàn']} sang ${targetTable?.['Tên bàn']}`);
      setShowTransferModal(false);

    } catch (error) {
      console.error('Lỗi chuyển bàn:', error);
      showNotification('Có lỗi xảy ra khi chuyển bàn!', 'error');
    }
  }, [selectedTableId, tables, cart, activeOrders, setActiveOrders, setSelectedTableId, updateTableStatus, showNotification, setShowTransferModal, showLoading]);

  const updateCustomerDisplay = useCallback((cartData = cart, tableInfo: Table | null = null) => {
    if (!customerDisplayWindow.current || customerDisplayWindow.current.closed) return;

    try {
      const total = cartData.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Get current table info if not provided
      const currentTable = tableInfo || tables.find(t => t.IDBAN === selectedTableId);
      const tableData = currentTable ? {
        id: currentTable.IDBAN,
        name: currentTable['Tên bàn'],
        capacity: currentTable['Sức chứa tối đa'],
        status: currentTable['Trạng thái']
      } : null;

      customerDisplayWindow.current.postMessage({
        type: 'updateCart',
        cart: cartData,
        totals: {
          subtotal: total,
          vat: total * 0.1,
          discount: 0,
          total: total * 1.1
        },
        tableInfo: tableData,
        customer: selectedCustomer
      }, window.location.origin);
    } catch (error) {
      console.error('Lỗi khi cập nhật màn hình phụ:', error);
    }
  }, [cart, tables, selectedTableId, selectedCustomer]);

  // Payment operations with customer integration
  const saveInvoice = useCallback(async (invoice: any, details: any[]) => {
    try {
      console.log('Saving invoice:', invoice);
      console.log('Saving details:', details);

      // Thêm hóa đơn
      const invoiceResult = await authUtils.addHoaDon(invoice);
      console.log('Invoice result:', invoiceResult);

      if (Array.isArray(invoiceResult) || !invoiceResult.success) {
        const msg = !Array.isArray(invoiceResult) ? invoiceResult.message : 'Unknown error';
        throw new Error('Không thể lưu hóa đơn: ' + (msg || 'Unknown error'));
      }

      // Thêm chi tiết hóa đơn từng item
      const detailPromises = details.map(async (detail, index) => {
        try {
          const detailResult = await authUtils.addHoaDonDetail(detail);
          console.log(`Detail ${index} result:`, detailResult);

          if (Array.isArray(detailResult) || !detailResult.success) {
            const msg = !Array.isArray(detailResult) ? detailResult.message : 'Unknown error';
            throw new Error(`Lỗi lưu chi tiết ${index + 1}: ${msg || 'Unknown error'}`);
          }
          return detailResult;
        } catch (error) {
          console.error(`Error saving detail ${index}:`, error);
          throw error;
        }
      });

      // Đợi tất cả chi tiết được lưu
      await Promise.all(detailPromises);

      return { success: true };
    } catch (error) {
      console.error('Lỗi lưu hóa đơn:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Lỗi lưu dữ liệu: ${msg}`);
    }
  }, []);

  // Update customer after purchase
  const updateCustomerAfterPurchase = useCallback(async (customer: Customer, invoiceTotal: number, invoiceId: string) => {
    try {
      // Calculate points based on customer type
      const newPoints = calculatePointsFromSpending(invoiceTotal, customer['Loại khách hàng']);
      const currentPoints = Number(customer['Điểm tích lũy']) || 0;
      const currentSpending = Number(customer['Tổng chi tiêu']) || 0;

      // Determine new customer tier based on total spending
      const newTotalSpending = currentSpending + invoiceTotal;
      let newCustomerType = customer['Loại khách hàng'];

      if (newTotalSpending >= 50000000 && newCustomerType !== 'Khách kim cương') {
        newCustomerType = 'Khách kim cương';
        showNotification('🎉 Khách hàng đã được nâng cấp lên Kim Cương!', 'success');
      } else if (newTotalSpending >= 20000000 && newCustomerType === 'Khách thường') {
        newCustomerType = 'Khách VIP';
        showNotification('🎉 Khách hàng đã được nâng cấp lên VIP!', 'success');
      }

      const updatedCustomer = {
        ...customer,
        'Loại khách hàng': newCustomerType,
        'Điểm tích lũy': currentPoints + newPoints,
        'Tổng chi tiêu': newTotalSpending,
        'Lần mua cuối': formatToVietnameseDateTime(new Date()),
        'Ngày cập nhật': formatToVietnameseDateTime(new Date()),
        'Hóa đơn liên quan': customer['Hóa đơn liên quan'] ?
          `${customer['Hóa đơn liên quan']}, ${invoiceId}` : invoiceId
      };

      await authUtils.updateKhachHang(customer.IDKHACHHANG, updatedCustomer);

      // Update local customer list
      setCustomers(prev => prev.map(c =>
        c.IDKHACHHANG === customer.IDKHACHHANG ? updatedCustomer : c
      ));

      // Update selected customer if it's the same
      if (selectedCustomer?.IDKHACHHANG === customer.IDKHACHHANG) {
        setSelectedCustomer(updatedCustomer);
      }

      showNotification(`+${newPoints} điểm tích lũy cho ${customer['Tên khách hàng']}!`);

    } catch (error) {
      console.error('Error updating customer after purchase:', error);
      showNotification('Không thể cập nhật điểm khách hàng', 'warning');
    }
  }, [selectedCustomer, showNotification]);

  const processPayment = useCallback(async (paymentForm: any) => {
    try {
      setIsProcessingPayment(true);
      showLoading('Đang xử lý thanh toán...');
      
      // Validate payment data
      if (!cart || cart.length === 0) {
        throw new Error('EMPTY_CART');
      }

      if (!nhanvien?.trim()) {
        throw new Error('INVALID_EMPLOYEE');
      }

      const {
        customer = selectedCustomer ? selectedCustomer['Tên khách hàng'] : 'Khách lẻ',
        discount = 0,
        paidAmount = 0,
        note = '',
        paymentType = 'Tiền mặt'
      } = paymentForm;

      // Calculate totals - Tính toán tổng tiền
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const vat = total * 0.1; // VAT 10%

      // Apply customer discounts - Áp dụng ưu đãi khách hàng
      // discount từ form + ưu đãi tự động theo loại khách hàng
      let customerDiscount = discount; // Giảm giá thủ công từ form thanh toán
      if (selectedCustomer) {
        const customerType = selectedCustomer['Loại khách hàng'];
        if (customerType === 'Khách kim cương') {
          customerDiscount += total * 0.2; // Thêm 20% ưu đãi tự động
        } else if (customerType === 'Khách VIP') {
          customerDiscount += total * 0.1; // Thêm 10% ưu đãi tự động
        }
        // Khách thường: chỉ có giảm giá thủ công (nếu có)
      }

      // Tổng tiền thanh toán = Tạm tính + VAT - Tổng ưu đãi
      const finalAmount = total + vat - customerDiscount;

      if (paidAmount < finalAmount) {
        throw new Error('INSUFFICIENT_PAYMENT');
      }

      const change = paidAmount - finalAmount;

      // Lấy thông tin bàn
      const selectedTable = tables.find(t => t.IDBAN === selectedTableId);
      const tableName = selectedTable?.['Tên bàn'] || 'Không xác định';

      // Create invoice với đầy đủ thông tin
      const invoiceId = generateId('INV');
      const invoice = {
        IDHOADON: invoiceId,
        IDBAN: selectedTableId || '',
        "Ngày": formatDate(new Date()),
        "Nhân viên": nhanvien,
        "Khách hàng": customer,
        "Tổng tiền": total,
        "VAT": vat,
        "Giảm giá": customerDiscount,
        "Khách trả": paidAmount,
        "Tiền thừa": change,
        "Ghi chú": note,
        "Trạng thái": "Đã thanh toán",
        "Trạng thái sử dụng bàn": tableName === 'Khách mua về' ? 'Mang về' : 'Tại bàn',
        "Loại thanh toán": paymentType
      };

      // Create invoice details với validation
      const invoiceDetails = cart.map((item) => ({
        IDHOADONDETAIL: generateId(`DTL`),
        IDHOADON: invoiceId,
        IDSP: item.id,
        "Tên sản phẩm": item.name || '',
        "Đơn vị tính": item.unit || 'Cái',
        "Đơn giá": Number(item.price) || 0,
        "Số lượng": Number(item.quantity) || 0,
        "Thành tiền": Number(item.price) * Number(item.quantity),
        "Ghi chú": item.note || ''
      }));

      // Validate invoice details
      if (invoiceDetails.some(detail => !detail["Tên sản phẩm"] || detail["Đơn giá"] <= 0 || detail["Số lượng"] <= 0)) {
        throw new Error('Dữ liệu sản phẩm không hợp lệ');
      }

      // Save to database using AuthUtils
      await saveInvoice(invoice, invoiceDetails);

      // Update customer if selected
      if (selectedCustomer) {
        await updateCustomerAfterPurchase(selectedCustomer, finalAmount, invoiceId);
      }

      // Print receipt using new settings-based system
      try {
        const { printReceiptWithSettings } = await import('../utils/receiptPrint');
        
        const receiptData = {
          receiptNumber: invoiceId,
          date: new Date(),
          cashier: nhanvien,
          customer: customer,
          table: tableName,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            notes: item.note
          })),
          subtotal: total,
          discount: customerDiscount,
          total: finalAmount,
          paid: paidAmount,
          change: change,
          notes: note,
          paymentType: paymentType
        };

        await printReceiptWithSettings(receiptData, 'pos');
      } catch (printError) {
        console.warn('Không thể in hóa đơn:', printError);
        showNotification('Thanh toán thành công nhưng không thể in hóa đơn', 'warning');
      }

      // Reset state
      resetAfterPayment();
      setShowCheckoutModal(false);

      showNotification('Thanh toán thành công!', 'success');
    } catch (error: any) {
      console.error('Lỗi thanh toán:', error);

      const errorMessages: Record<string, string> = {
        'EMPTY_CART': 'Giỏ hàng trống!',
        'INVALID_EMPLOYEE': 'Vui lòng chọn nhân viên thanh toán!',
        'INSUFFICIENT_PAYMENT': 'Số tiền khách trả không đủ!',
      };

      const message = errorMessages[error.message] || `Có lỗi xảy ra khi thanh toán: ${error.message}`;
      showNotification(message, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  }, [cart, selectedTableId, nhanvien, tables, selectedCustomer, saveInvoice, updateCustomerAfterPurchase, showLoading, showNotification, setShowCheckoutModal]);

  const resetAfterPayment = useCallback(() => {
    // Clear active order
    if (selectedTableId) {
      const newActiveOrders = new Map(activeOrders);
      newActiveOrders.delete(selectedTableId);
      setActiveOrders(newActiveOrders);

      // Reset table status
      updateTableStatus(selectedTableId, 'Trống');

      // Reset selected table
      setSelectedTableId(null);
    }

    // Clear cart
    clearCart();

    // Clear selected customer
    setSelectedCustomer(null);
  }, [selectedTableId, activeOrders, setActiveOrders, updateTableStatus, setSelectedTableId, clearCart]);

  // Data synchronization
  const syncData = useCallback(async () => {
    try {
      showLoading('Đang đồng bộ...');

      await Promise.all([
        fetchProducts(),
        fetchTables(),
        fetchCustomers()
      ]);

      showNotification('Đồng bộ dữ liệu thành công!');
    } catch (error) {
      console.error('Lỗi đồng bộ:', error);
      showNotification('Lỗi đồng bộ dữ liệu. Vui lòng thử lại!', 'error');
    }
  }, [fetchProducts, fetchTables, fetchCustomers, showLoading, showNotification]);

  // Keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    switch (true) {
      case e.key === 'F4': // Quick checkout
        e.preventDefault();
        if (cart.length > 0 && selectedTableId) {
          setShowCheckoutModal(true);
        } else if (cart.length === 0) {
          showNotification('Giỏ hàng trống!', 'error');
        } else if (!selectedTableId) {
          showNotification('Vui lòng chọn bàn trước khi thanh toán!', 'error');
        }
        break;

      case e.key === 'Escape': // Clear cart
        e.preventDefault();
        clearCart();
        break;

      case e.key === 'F1': // Reset filters
        e.preventDefault();
        resetFilters();
        break;

      case e.key === 'F5': // Sync data
        e.preventDefault();
        syncData();
        break;

      case e.key === 'F3': // Customer modal
        e.preventDefault();
        setShowCustomerModal(true);
        break;
    }
  }, [cart.length, selectedTableId, setShowCheckoutModal, showNotification, clearCart, resetFilters, syncData]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      if (!nhanvien) {
        showNotification('Không thể khởi tạo ứng dụng. Thiếu thông tin nhân viên!', 'error');
        return;
      }

      try {
        showLoading('Đang tải...');

        // Restore saved state if exists
        const savedState = localStorage.getItem('posState');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            setActiveOrders(new Map(state.activeOrders));
            setSelectedTableId(state.selectedTableId);
          } catch (parseError) {
            console.error('Lỗi khôi phục trạng thái:', parseError);
          }
        }

        // Fetch initial data
        await Promise.all([
          fetchProducts(),
          fetchTables(),
          fetchCustomers()
        ]);

        showNotification('Khởi tạo ứng dụng thành công!');
      } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        showNotification('Không thể khởi tạo ứng dụng. Vui lòng thử lại!', 'error');
      }
    };

    initializeApp();

    // Set up event listeners
    window.addEventListener('keydown', handleKeyboardShortcuts);

    // Save state before window close
    const handleBeforeUnload = () => {
      const state = {
        activeOrders: Array.from(activeOrders.entries()),
        selectedTableId,
      };
      localStorage.setItem('posState', JSON.stringify(state));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Close customer display window if open
      if (customerDisplayWindow.current && !customerDisplayWindow.current.closed) {
        customerDisplayWindow.current.close();
      }
    };
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.1; // VAT 10% tính trên tạm tính
  let total = subtotal + vat;

  // Apply customer discount - Áp dụng ưu đãi theo loại khách hàng
  // Ưu đãi được tính trên subtotal (tạm tính) chưa bao gồm VAT
  let customerDiscount = 0;
  if (selectedCustomer) {
    const customerType = selectedCustomer['Loại khách hàng'];
    if (customerType === 'Khách kim cương') {
      customerDiscount = subtotal * 0.2; // Khách kim cương: giảm 20%
    } else if (customerType === 'Khách VIP') {
      customerDiscount = subtotal * 0.1; // Khách VIP: giảm 10%
    }
    // Khách thường: không có ưu đãi tự động (customerDiscount = 0)
  }

  // Tổng tiền cuối cùng = Tạm tính + VAT - Ưu đãi khách hàng
  const finalTotal = total - customerDiscount;

  // Get table name for display
  const selectedTableName = selectedTableId
    ? tables.find(t => t.IDBAN === selectedTableId)?.['Tên bàn'] || 'Đang chọn bàn...'
    : 'Chưa chọn';

  return {
    // State
    products,
    filteredProducts,
    tables,
    cart,
    selectedTableId,
    activeOrders,
    isLoading,
    loadingText,
    categories,
    searchTerm,
    categoryFilter,
    priceFilter,
    isProcessingPayment,

    // Customer state
    customers,
    selectedCustomer,
    showCustomerModal,
    setShowCustomerModal,
    handleSelectCustomer,

    // Modal state
    ...modalState,

    // Modal setters
    setShowTableModal,
    setShowCheckoutModal,
    setShowTransferModal,
    setShowNoteModal,
    setSelectedItemForNote,
    setNoteInput,

    // Filter setters
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,

    // Operations
    addToCart,
    removeFromCart,
    adjustQuantity,
    clearCart,
    selectTable,
    transferTable,
    processPayment,
    syncData,
    resetFilters,
    updateCartItemNote,
  sendToKitchen,
    // Calculations
    subtotal,
    vat,
    total: finalTotal,
    customerDiscount,
    selectedTableName,

    // Utilities
    showNotification
  };
};