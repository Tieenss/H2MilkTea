'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatInputCurrency, formatPoints, getNumericValue } from '../utils/formatters';
import { PAYMENT_TYPES } from '../utils/constants';
import { QRBankSelector, type Bank } from './QRBankSelector';
import type { CartItem } from '../types/pos';
import { Customer } from '@/app/(dashboard)/khachhang/types/customer';
import { getCustomerTypeColor } from '@/app/(dashboard)/khachhang/utils/customerFormatters';

interface CheckoutModalProps {
  cart: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  customerDiscount: number;
  selectedTableName: string;
  employee: string;
  selectedCustomer: Customer | null;
  onProcessPayment: (paymentData: any) => void;
  onSelectCustomer?: () => void;
  onClose: () => void;
}

const generateVietQRUrl = (bankCode: string, accountNumber: string, accountName: string, amount: number, description: string) => {
  const baseUrl = 'https://img.vietqr.io/image';
  const params = new URLSearchParams({
    bankId: bankCode,
    accountId: accountNumber,
    accountName: accountName,
    amount: amount.toString(),
    addInfo: description,
    template: 'compact'
  });

  return `${baseUrl}/${bankCode}-${accountNumber}-compact.png?${params}`;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  subtotal,
  vat,
  total,
  customerDiscount,
  selectedTableName,
  employee,
  selectedCustomer,
  onProcessPayment,
  onSelectCustomer,
  onClose
}) => {
  const [formData, setFormData] = useState({
    customer: selectedCustomer ? selectedCustomer['Tên khách hàng'] : 'Khách lẻ',
    discount: 0,
    paidAmount: total,
    note: '',
    paymentType: 'Tiền mặt'
  });

  const [finalTotal, setFinalTotal] = useState(total);
  const [change, setChange] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // QR Code configuration
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const paidAmountRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update customer info when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customer: selectedCustomer['Tên khách hàng']
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customer: 'Khách lẻ'
      }));
    }
  }, [selectedCustomer]);

  // Calculate final totals when discount changes
  useEffect(() => {
    const newFinalTotal = total - formData.discount;
    setFinalTotal(newFinalTotal);

    const newChange = Math.max(0, formData.paidAmount - newFinalTotal);
    setChange(newChange);
  }, [total, formData.discount, formData.paidAmount]);

  // Generate QR code when payment type changes to banking methods
  useEffect(() => {
    if (['Chuyển khoản', 'VietQR'].includes(formData.paymentType)) {
      if (selectedBank && accountNumber && accountName) {
        const description = `Thanh toan ban ${selectedTableName} - ${new Date().toLocaleString('vi-VN')}`;
        const url = generateVietQRUrl(selectedBank.code, accountNumber, accountName, finalTotal, description);
        setQrCodeUrl(url);
        setShowQRCode(true);
      } else {
        setShowQRCode(false);
      }
    } else {
      setShowQRCode(false);
    }
  }, [formData.paymentType, finalTotal, selectedTableName, selectedBank, accountNumber, accountName]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const discount = parseFloat(e.target.value) || 0;
    handleInputChange('discount', discount);
  };

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = formatInputCurrency(e.target);
    handleInputChange('paidAmount', amount);
  };

  const handleQuickAmount = (percentage: number) => {
    const amount = Math.ceil(finalTotal * percentage / 1000) * 1000;
    if (paidAmountRef.current) {
      paidAmountRef.current.value = new Intl.NumberFormat('vi-VN').format(amount);
      paidAmountRef.current.dataset.value = amount.toString();
      handleInputChange('paidAmount', amount);
    }
  };

  const handlePaymentTypeChange = (paymentType: string) => {
    handleInputChange('paymentType', paymentType);

    // Auto-set paid amount for non-cash payments
    if (['Chuyển khoản', 'VietQR', 'Thẻ'].includes(paymentType)) {
      handleInputChange('paidAmount', finalTotal);
      if (paidAmountRef.current) {
        paidAmountRef.current.value = new Intl.NumberFormat('vi-VN').format(finalTotal);
        paidAmountRef.current.dataset.value = finalTotal.toString();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    // Validation
    if (formData.paidAmount < finalTotal) {
      alert('Số tiền khách trả không đủ!');
      return;
    }

    if (formData.discount < 0 || formData.discount > (subtotal + vat)) {
      alert('Giảm giá không hợp lệ!');
      return;
    }

    // Validation cho VietQR
    if (['Chuyển khoản', 'VietQR'].includes(formData.paymentType)) {
      if (!selectedBank || !accountNumber || !accountName) {
        alert('Vui lòng chọn ngân hàng và nhập đầy đủ thông tin tài khoản!');
        return;
      }
    }

    setIsProcessing(true);

    try {
      await onProcessPayment({
        customer: formData.customer,
        discount: formData.discount,
        paidAmount: formData.paidAmount,
        note: formData.note,
        paymentType: formData.paymentType,
        qrCodeUrl: showQRCode ? qrCodeUrl : null,
        bankInfo: selectedBank ? {
          bank: selectedBank,
          accountNumber,
          accountName
        } : null
      });
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
        <div className="bg-white rounded-t-2xl shadow-xl w-full max-h-[90vh] overflow-hidden mobile-modal animate-slide-in-bottom">
          {/* Mobile Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Thanh toán</h2>
              <p className="text-sm text-gray-600">
                {selectedTableName} • {employee}
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 touch-target"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Mobile Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] pb-20">
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              {/* Order Summary - Collapsible */}
              <div className="bg-gray-50 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setShowOrderDetails(!showOrderDetails)}
                  className="w-full p-3 flex justify-between items-center text-left"
                >
                  <span className="font-medium text-gray-800">
                    Chi tiết đơn hàng ({cart.length} món)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-semibold">
                      {formatCurrency(finalTotal)}
                    </span>
                    {showOrderDetails ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </button>
                
                {showOrderDetails && (
                  <div className="p-3 pt-0 space-y-2 max-h-48 overflow-y-auto border-t border-gray-200">
                    {cart.map((item, index) => (
                      <div key={`${item.id}-${index}`} className="flex justify-between items-start py-2 text-sm">
                        <div className="flex-1 mr-2">
                          <p className="font-medium text-gray-800 line-clamp-1">{item.name}</p>
                          {item.note && (
                            <p className="text-xs text-blue-600 italic line-clamp-1">{item.note}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-800 text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Info */}
              {selectedCustomer && (
                <div className="bg-blue-50 p-3 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-blue-800 truncate">
                          {selectedCustomer['Tên khách hàng']}
                        </span>
                        <Badge className={`${getCustomerTypeColor(selectedCustomer['Loại khách hàng'])} text-xs flex-shrink-0`}>
                          {selectedCustomer['Loại khách hàng']}
                        </Badge>
                      </div>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>SĐT: {selectedCustomer['Số điện thoại']}</div>
                        <div>Điểm: {formatPoints(selectedCustomer['Điểm tích lũy'])}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onSelectCustomer}
                      className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0 touch-target flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {customerDiscount > 0 && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between text-green-800">
                        <div className="flex items-center">
                          <Gift className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">Ưu đãi {selectedCustomer?.['Loại khách hàng']}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-700">-{formatCurrency(customerDiscount)}</div>
                          <div className="text-xs text-green-600">({((customerDiscount / subtotal) * 100).toFixed(0)}% giảm giá)</div>
                        </div>
                      </div>
                      {selectedCustomer?.['Ưu đãi hiện tại'] && (
                        <div className="mt-1 text-xs text-green-700 border-t border-green-200 pt-1">
                          <span className="font-medium">Ghi chú ưu đãi:</span> {selectedCustomer['Ưu đãi hiện tại']}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Totals Summary - Always visible */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 border">
                <div className="flex justify-between text-gray-700 text-sm">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700 text-sm">
                  <span>VAT (10%):</span>
                  <span className="font-medium">{formatCurrency(vat)}</span>
                </div>
                {customerDiscount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Ưu đãi khách hàng:</span>
                    <span className="font-medium">-{formatCurrency(customerDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700 text-sm">
                  <span>Giảm giá khác:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(formData.discount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between font-bold text-lg text-gray-800">
                    <span>Tổng cộng:</span>
                    <span className="text-blue-600">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                {/* Customer Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Khách hàng
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={formData.customer}
                      readOnly
                      className="flex-1 bg-gray-50 text-sm touch-target"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSelectCustomer}
                      className="px-3 touch-target flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Payment Type */}
                <div>
                  <Label htmlFor="paymentType" className="text-sm font-medium text-gray-700">
                    Loại thanh toán
                  </Label>
                  <select
                    id="paymentType"
                    value={formData.paymentType}
                    onChange={(e) => handlePaymentTypeChange(e.target.value)}
                    className="mt-1 w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 touch-target"
                  >
                    {PAYMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                    <option value="VietQR">VietQR</option>
                  </select>
                </div>

                {/* Bank Selector */}
                {['Chuyển khoản', 'VietQR'].includes(formData.paymentType) && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <QRBankSelector
                      selectedBank={selectedBank}
                      accountNumber={accountNumber}
                      accountName={accountName}
                      onBankChange={setSelectedBank}
                      onAccountNumberChange={setAccountNumber}
                      onAccountNameChange={setAccountName}
                    />
                  </div>
                )}

                {/* Additional Discount */}
                <div>
                  <Label htmlFor="discount" className="text-sm font-medium text-gray-700">
                    Giảm giá thêm (VNĐ)
                  </Label>
                  <Input
                    ref={discountRef}
                    id="discount"
                    type="number"
                    value={formData.discount}
                    onChange={handleDiscountChange}
                    min="0"
                    max={subtotal + vat}
                    className="mt-1 touch-target"
                  />
                </div>

                {/* Paid Amount */}
                <div>
                  <Label htmlFor="paidAmount" className="text-sm font-medium text-gray-700">
                    Khách trả (VNĐ)
                  </Label>
                  <Input
                    ref={paidAmountRef}
                    id="paidAmount"
                    type="text"
                    defaultValue={new Intl.NumberFormat('vi-VN').format(total)}
                    onChange={handlePaidAmountChange}
                    className="mt-1 touch-target"
                    data-value={total}
                    disabled={['Chuyển khoản', 'VietQR', 'Thẻ'].includes(formData.paymentType)}
                  />

                  {/* Quick Amount Buttons */}
                  {formData.paymentType === 'Tiền mặt' && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(1)}
                        className="text-xs touch-target"
                      >
                        Vừa đủ
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(1.05)}
                        className="text-xs touch-target"
                      >
                        +5%
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(1.1)}
                        className="text-xs touch-target"
                      >
                        +10%
                      </Button>
                    </div>
                  )}
                </div>

                {/* Change Amount */}
                {formData.paymentType === 'Tiền mặt' && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Tiền thừa:
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="note" className="text-sm font-medium text-gray-700">
                    Ghi chú
                  </Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => handleInputChange('note', e.target.value)}
                    rows={3}
                    className="mt-1 touch-target resize-none"
                    placeholder="Nhập ghi chú..."
                  />
                </div>

                {/* QR Code - Collapsible */}
                {showQRCode && (
                  <details className="bg-white border border-gray-200 rounded-lg">
                    <summary className="p-3 cursor-pointer font-medium text-gray-800 flex justify-between items-center touch-target">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Mã QR thanh toán
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    
                    <div className="p-3 text-center border-t">
                      <div className="mb-4">
                        <img
                          src={qrCodeUrl}
                          alt="VietQR Code"
                          className="mx-auto max-w-full h-auto rounded"
                          style={{ maxHeight: '250px' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden">
                          <div className="text-red-500 mb-2">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Không thể tải mã QR
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-50 p-2 rounded text-xs">
                          <p className="font-medium text-gray-800">
                            Số tiền: <span className="text-blue-600">{formatCurrency(finalTotal)}</span>
                          </p>
                          {selectedBank && (
                            <>
                              <div className="flex items-center justify-center gap-2 mt-1">
                                <img
                                  src={selectedBank.logo}
                                  alt={selectedBank.shortName}
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <span className="font-medium">{selectedBank.shortName}</span>
                              </div>
                              <p className="text-gray-600 text-xs">STK: {accountNumber}</p>
                              <p className="text-gray-600 text-xs">Tên TK: {accountName}</p>
                            </>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• Quét mã QR bằng app ngân hàng</p>
                          <p>• Kiểm tra thông tin và xác nhận</p>
                          <p>• Thông báo cho nhân viên sau khi chuyển khoản</p>
                        </div>
                      </div>

                      {/* Refresh QR Button */}
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedBank && accountNumber && accountName) {
                              const description = `Thanh toan ban ${selectedTableName} - ${new Date().toLocaleString('vi-VN')}`;
                              const url = generateVietQRUrl(selectedBank.code, accountNumber, accountName, finalTotal, description);
                              setQrCodeUrl(url);
                            }
                          }}
                          className="text-xs touch-target"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Làm mới QR
                        </Button>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </form>
          </div>

          {/* Fixed Action Buttons at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex gap-3 safe-area-bottom">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isProcessing}
              className="flex-1 touch-target"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || formData.paidAmount < finalTotal}
              className={`flex-2 flex items-center justify-center gap-2 touch-target ${isProcessing
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Xác nhận thanh toán</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Thanh toán</h2>
            <p className="text-gray-600 mt-1">
              Bàn: <span className="font-semibold">{selectedTableName}</span> |
              Nhân viên: <span className="font-semibold">{employee}</span>
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row">
          {/* Left: Order Summary */}
          <div className="xl:w-1/3 p-6 border-r border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Chi tiết đơn hàng</h3>

           {/* Items List */}
           <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
             {cart.map((item, index) => (
               <div key={`${item.id}-${index}`} className="flex justify-between items-center py-2 border-b border-gray-100">
                 <div className="flex-1">
                   <p className="font-medium text-gray-800 text-sm">
                     {item.name}
                   </p>
                   {item.note && (
                     <p className="text-xs text-blue-600 italic">
                       {item.note}
                     </p>
                   )}
                   <p className="text-xs text-gray-500">
                     {formatCurrency(item.price)} × {item.quantity}
                   </p>
                 </div>
                 <div className="text-right">
                   <p className="font-semibold text-gray-800">
                     {formatCurrency(item.price * item.quantity)}
                   </p>
                 </div>
               </div>
             ))}
           </div>

           {/* Customer Info */}
           {selectedCustomer && (
             <div className="mb-4 p-3 bg-blue-50 rounded-lg border">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <span className="font-medium text-blue-800">
                     {selectedCustomer['Tên khách hàng']}
                   </span>
                   <Badge className={getCustomerTypeColor(selectedCustomer['Loại khách hàng'])}>
                     {selectedCustomer['Loại khách hàng']}
                   </Badge>
                 </div>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={onSelectCustomer}
                   className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0"
                 >
                   <X className="w-4 h-4" />
                 </Button>
               </div>
               
               <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                 <div>
                   <span>SĐT: {selectedCustomer['Số điện thoại']}</span>
                 </div>
                 <div>
                   <span>Điểm: {formatPoints(selectedCustomer['Điểm tích lũy'])}</span>
                 </div>
               </div>

               {customerDiscount > 0 && (
                 <div className="mt-2 p-2 bg-green-100 rounded text-sm">
                   <div className="flex items-center text-green-800">
                     <Gift className="w-4 h-4 mr-1" />
                     <span>Ưu đãi: -{formatCurrency(customerDiscount)} ({((customerDiscount / subtotal) * 100).toFixed(0)}%)</span>
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* Totals Summary */}
           <div className="bg-gray-50 p-4 rounded-lg space-y-3">
             <div className="flex justify-between text-gray-700">
               <span>Tổng tiền hàng:</span>
               <span className="font-medium">{formatCurrency(subtotal)}</span>
             </div>
             <div className="flex justify-between text-gray-700">
               <span>VAT (10%):</span>
               <span className="font-medium">{formatCurrency(vat)}</span>
             </div>
             {customerDiscount > 0 && (
               <div className="flex justify-between text-green-600">
                 <span>Ưu đãi khách hàng:</span>
                 <span className="font-medium">-{formatCurrency(customerDiscount)}</span>
               </div>
             )}
             <div className="flex justify-between text-gray-700">
               <span>Giảm giá khác:</span>
               <span className="font-medium text-red-600">
                 -{formatCurrency(formData.discount)}
               </span>
             </div>
             <div className="border-t border-gray-200 pt-3">
               <div className="flex justify-between font-bold text-lg text-gray-800">
                 <span>Tổng cộng:</span>
                 <span className="text-blue-600">
                   {formatCurrency(finalTotal)}
                 </span>
               </div>
             </div>
           </div>
         </div>

         {/* Middle: Payment Form */}
         <div className="xl:w-1/3 p-6 border-r border-gray-200">
           <h3 className="font-semibold text-gray-800 mb-4">Thông tin thanh toán</h3>

           <div className="space-y-4">
             {/* Customer Selection */}
             <div>
               <Label className="text-sm font-medium text-gray-700 mb-2 block">
                 Khách hàng
               </Label>
               <div className="flex gap-2">
                 <Input
                   type="text"
                   value={formData.customer}
                   readOnly
                   className="flex-1 bg-gray-50"
                 />
                 <Button
                   type="button"
                   variant="outline"
                   onClick={onSelectCustomer}
                   className="px-3"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                   </svg>
                 </Button>
               </div>
             </div>

             {/* Payment Type */}
             <div>
               <Label htmlFor="paymentType" className="text-sm font-medium text-gray-700">
                 Loại thanh toán
               </Label>
               <select
                 id="paymentType"
                 value={formData.paymentType}
                 onChange={(e) => handlePaymentTypeChange(e.target.value)}
                 className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
               >
                 {PAYMENT_TYPES.map((type) => (
                   <option key={type.value} value={type.value}>
                     {type.label}
                   </option>
                 ))}
                 <option value="VietQR">VietQR</option>
               </select>
             </div>

             {/* Bank Selector - Chỉ hiển thị khi chọn VietQR hoặc Chuyển khoản */}
             {['Chuyển khoản', 'VietQR'].includes(formData.paymentType) && (
               <div className="bg-blue-50 p-4 rounded-lg">
                 <QRBankSelector
                   selectedBank={selectedBank}
                   accountNumber={accountNumber}
                   accountName={accountName}
                   onBankChange={setSelectedBank}
                   onAccountNumberChange={setAccountNumber}
                   onAccountNameChange={setAccountName}
                 />
               </div>
             )}

             {/* Additional Discount */}
             <div>
               <Label htmlFor="discount" className="text-sm font-medium text-gray-700">
                 Giảm giá thêm (VNĐ)
               </Label>
               <Input
                 ref={discountRef}
                 id="discount"
                 type="number"
                 value={formData.discount}
                 onChange={handleDiscountChange}
                 min="0"
                 max={subtotal + vat}
                 className="mt-1"
               />
             </div>

             {/* Paid Amount */}
             <div>
               <Label htmlFor="paidAmount" className="text-sm font-medium text-gray-700">
                 Khách trả (VNĐ)
               </Label>
               <Input
                 ref={paidAmountRef}
                 id="paidAmount"
                 type="text"
                 defaultValue={new Intl.NumberFormat('vi-VN').format(total)}
                 onChange={handlePaidAmountChange}
                 className="mt-1"
                 data-value={total}
                 disabled={['Chuyển khoản', 'VietQR', 'Thẻ'].includes(formData.paymentType)}
               />

               {/* Quick Amount Buttons - Only show for cash payments */}
               {formData.paymentType === 'Tiền mặt' && (
                 <div className="flex gap-2 mt-2">
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => handleQuickAmount(1)}
                     className="flex-1 text-xs"
                   >
                     Vừa đủ
                   </Button>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => handleQuickAmount(1.05)}
                     className="flex-1 text-xs"
                   >
                     +5%
                   </Button>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => handleQuickAmount(1.1)}
                     className="flex-1 text-xs"
                   >
                     +10%
                   </Button>
                 </div>
               )}
             </div>

             {/* Change Amount - Only show for cash payments */}
             {formData.paymentType === 'Tiền mặt' && (
               <div className="bg-blue-50 p-3 rounded-lg">
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-medium text-gray-700">
                     Tiền thừa:
                   </span>
                   <span className="text-lg font-bold text-blue-600">
                     {formatCurrency(change)}
                   </span>
                 </div>
               </div>
             )}

             {/* Notes */}
             <div>
               <Label htmlFor="note" className="text-sm font-medium text-gray-700">
                 Ghi chú
               </Label>
               <Textarea
                 id="note"
                 value={formData.note}
                 onChange={(e) => handleInputChange('note', e.target.value)}
                 rows={3}
                 className="mt-1"
                 placeholder="Nhập ghi chú..."
               />
             </div>
           </div>

           {/* Action Buttons */}
           <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
             <Button
               type="button"
               onClick={onClose}
               variant="outline"
               disabled={isProcessing}
             >
               Hủy
             </Button>
             <Button
               type="submit"
               disabled={isProcessing || formData.paidAmount < finalTotal}
               className={`flex items-center justify-center gap-2 ${isProcessing
                 ? 'bg-blue-400 cursor-not-allowed'
                 : 'bg-blue-600 hover:bg-blue-700'
                 }`}
             >
               {isProcessing ? (
                 <>
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                   <span>Đang xử lý...</span>
                 </>
               ) : (
                 <>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                       d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                   </svg>
                   <span>Xác nhận thanh toán</span>
                 </>
               )}
             </Button>
           </div>
         </div>

         {/* Right: QR Code */}
         {showQRCode && (
           <div className="xl:w-1/3 p-6">
             <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                   d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
               </svg>
               Mã QR thanh toán
             </h3>

             <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 text-center">
               <div className="mb-4">
                 <img
                   src={qrCodeUrl}
                   alt="VietQR Code"
                   className="mx-auto max-w-full h-auto"
                   style={{ maxHeight: '300px' }}
                   onError={(e) => {
                     e.currentTarget.style.display = 'none';
                     e.currentTarget.nextElementSibling?.classList.remove('hidden');
                   }}
                 />
                 <div className="hidden">
                   <div className="text-red-500 mb-2">
                     <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                         d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                     </svg>
                     Không thể tải mã QR
                   </div>
                   <p className="text-sm text-gray-600">
                     Vui lòng kiểm tra kết nối mạng hoặc cấu hình VietQR
                   </p>
                 </div>
               </div>

               <div className="space-y-2 text-sm">
                 <div className="bg-gray-50 p-3 rounded">
                   <p className="font-medium text-gray-800">
                     Số tiền: <span className="text-blue-600">{formatCurrency(finalTotal)}</span>
                   </p>
                   {selectedBank && (
                     <>
                       <div className="flex items-center justify-center gap-2 mt-2">
                         <img
                           src={selectedBank.logo}
                           alt={selectedBank.shortName}
                           className="w-6 h-6 object-contain"
                           onError={(e) => {
                             e.currentTarget.style.display = 'none';
                           }}
                         />
                         <span className="font-medium">{selectedBank.shortName}</span>
                       </div>
                       <p className="text-gray-600 mt-1">
                         STK: {accountNumber}
                       </p>
                       <p className="text-gray-600">
                         Tên TK: {accountName}
                       </p>
                     </>
                   )}
                 </div>

                 <div className="text-xs text-gray-500 space-y-1">
                   <p>• Quét mã QR bằng app ngân hàng</p>
                   <p>• Kiểm tra thông tin và xác nhận</p>
                   <p>• Thông báo cho nhân viên sau khi chuyển khoản</p>
                 </div>
               </div>

               {/* Refresh QR Button */}
               <div className="mt-4">
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => {
                     if (selectedBank && accountNumber && accountName) {
                       const description = `Thanh toan ban ${selectedTableName} - ${new Date().toLocaleString('vi-VN')}`;
                       const url = generateVietQRUrl(selectedBank.code, accountNumber, accountName, finalTotal, description);
                       setQrCodeUrl(url);
                     }
                   }}
                   className="text-xs"
                 >
                   <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                   Làm mới QR
                 </Button>
               </div>
             </div>
           </div>
         )}
       </form>
     </div>
   </div>
 );
};