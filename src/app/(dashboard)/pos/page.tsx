'use client';

import React from 'react';
import { Search, RefreshCw, Users, Filter, X, GalleryVertical } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { usePOS } from './hooks/usePOS';
import { BarcodeScanner } from './components/BarcodeScanner';
import { ProductGrid } from './components/ProductGrid';
import { CartSidebar } from './components/CartSidebar';
import { TableModal } from './components/TableModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TransferModal } from './components/TransferModal';
import { NoteModal } from './components/NoteModal';
import { ReceiptSettings } from './components/ReceiptSettings';
import authUtils from '@/utils/authUtils';
import './styles/pos.css';
import { CustomerSelectModal } from '@/app/(dashboard)/pos/components/CustomerSelectModal';
import type { Customer } from '@/app/(dashboard)/khachhang/types/customer';

export default function POSPage() {
  const {
    // ... existing props
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
    selectedCustomer,
    showCustomerModal,
    setShowCustomerModal,
    handleSelectCustomer,
    showTableModal,
    showCheckoutModal,
    showTransferModal,
    showNoteModal,
    selectedItemForNote,
    noteInput,
    setShowTableModal,
    setShowCheckoutModal,
    setShowTransferModal,
    setShowNoteModal,
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,
    setNoteInput,
    setSelectedItemForNote,
    updateCartItemNote,
    addToCart,
    removeFromCart,
    adjustQuantity,
    clearCart,
    selectTable,
    transferTable,
    processPayment,
    syncData,
    resetFilters,
    subtotal,
    vat,
    total,
    customerDiscount,
    selectedTableName,
  } = usePOS();

  const userData = authUtils.getUserData();
  const nhanvien = userData?.['Họ và Tên'] || userData?.username;
  // Mobile state for showing/hiding cart
  const [showMobileCart, setShowMobileCart] = React.useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);

  return (
    <div className="bg-background ">
      {/* Mobile Header - Simplified */}
      <div className="block lg:hidden">
        <Card className="p-2 border-b rounded-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 flex-1">
              <Button
                onClick={() => setShowTableModal(true)}
                variant="outline"
                size="sm"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 flex-shrink-0 text-xs px-2"
              >
                <GalleryVertical className="w-3 h-3" />
                <span className="hidden xs:inline ml-1">
                  {selectedTableName ? selectedTableName : 'Bàn'}
                </span>
              </Button>

              <Button
                onClick={() => setShowCustomerModal(true)}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 flex-shrink-0 text-xs px-2"
              >
                <Users className="w-3 h-3" />
                <span className="hidden xs:inline ml-1">
                  {selectedCustomer ? selectedCustomer['Tên khách hàng'].split(' ')[0] : 'KH'}
                </span>
              </Button>

              <Button
                onClick={() => setShowMobileCart(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0 relative text-xs px-2"
                size="sm"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                variant="outline"
                size="sm"
                className="border-gray-200 text-xs px-2"
              >
                <Search className="w-3 h-3" />
              </Button>

              <Button
                onClick={syncData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700 text-xs px-2"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Expandable Search */}
          {isSearchExpanded && (
            <div className="space-y-2 animate-slide-in">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-8 h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-1">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name} ({cat.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Giá" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả giá</SelectItem>
                    <SelectItem value="0-20000">0đ - 20k</SelectItem>
                    <SelectItem value="20000-50000">20k - 50k</SelectItem>
                    <SelectItem value="50000+">Trên 50k</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 h-8 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Card className="p-3 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={syncData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700 hover:bg-green-50 text-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                {isLoading ? loadingText : 'Đồng bộ'}
              </Button>

              <Button
                onClick={() => setShowTableModal(true)}
                variant="outline"
                size="sm"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs"
              >
                <GalleryVertical className="w-3 h-3 mr-1" />
                {selectedTableName ? (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedTableName}
                  </Badge>
                ) : (
                  'Chọn bàn'
                )}
              </Button>

              <Button
                onClick={() => setShowCustomerModal(true)}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs"
              >
                <Users className="w-3 h-3 mr-1" />
                {selectedCustomer ? (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedCustomer['Tên khách hàng']}
                  </Badge>
                ) : (
                  'Khách lẻ'
                )}
              </Button>

              {/* Receipt Settings */}
              <ReceiptSettings />
            </div>

            {/* Barcode Scanner */}
            <BarcodeScanner onBarcodeScanned={addToCart} />

            {/* Search and Filters */}
            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-8 w-40 h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cat.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {cat.count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Chọn giá" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả giá</SelectItem>
                  <SelectItem value="0-20000">0đ - 20,000đ</SelectItem>
                  <SelectItem value="20000-50000">20,000đ - 50,000đ</SelectItem>
                  <SelectItem value="50000+">Trên 50,000đ</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50 h-8 px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)]">
        {/* Product Grid - Full width on mobile */}
        <div className="flex-1 lg:flex-grow">
          <ProductGrid
            products={filteredProducts}
            onAddToCart={addToCart}
          />
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden lg:block lg:w-1/3">
          <CartSidebar
            cart={cart}
            subtotal={subtotal}
            vat={vat}
            total={total}
            customerDiscount={customerDiscount}
            selectedTableId={selectedTableId}
            selectedCustomer={selectedCustomer}
            selectedTableName={selectedTableName}
            employee={nhanvien}
            onRemoveFromCart={removeFromCart}
            onAdjustQuantity={adjustQuantity}
            onClearCart={clearCart}
            onCheckout={() => setShowCheckoutModal(true)}
            onShowTableModal={() => setShowTableModal(true)}
            onShowCustomerModal={() => setShowCustomerModal(true)}
            onShowNoteModal={(item) => {
              setSelectedItemForNote(item);
              setNoteInput(item.note || '');
              setShowNoteModal(true);
            }}
          />
        </div>
      </div>

      {/* Mobile Cart Modal */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-in">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="text-base font-semibold">
                Giỏ hàng ({cart.reduce((sum, item) => sum + item.quantity, 0)} món)
              </h3>
              <Button
                onClick={() => setShowMobileCart(false)}
                variant="ghost"
                size="sm"
                className="text-gray-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-100px)]">
              <CartSidebar
                cart={cart}
                subtotal={subtotal}
                vat={vat}
                total={total}
                customerDiscount={customerDiscount}
                selectedTableId={selectedTableId}
                selectedCustomer={selectedCustomer}
                onRemoveFromCart={removeFromCart}
                onAdjustQuantity={adjustQuantity}
                onClearCart={() => {
                  clearCart();
                  setShowMobileCart(false);
                }}
                onCheckout={() => {
                  setShowMobileCart(false);
                  setShowCheckoutModal(true);
                }}
                onShowTableModal={() => {
                  setShowMobileCart(false);
                  setShowTableModal(true);
                }}
                onShowCustomerModal={() => {
                  setShowMobileCart(false);
                  setShowCustomerModal(true);
                }}
                onShowNoteModal={(item) => {
                  setSelectedItemForNote(item);
                  setNoteInput(item.note || '');
                  setShowMobileCart(false);
                  setShowNoteModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Existing Modals */}
      <CustomerSelectModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={handleSelectCustomer}
      />

      {showTableModal && (
        <TableModal
          tables={tables}
          activeOrders={activeOrders}
          selectedTableId={selectedTableId}
          onSelectTable={selectTable}
          onClose={() => setShowTableModal(false)}
          onShowTransfer={() => setShowTransferModal(true)}
        />
      )}

      {showTransferModal && (
        <TransferModal
          tables={tables}
          selectedTableId={selectedTableId}
          activeOrders={activeOrders}
          cart={cart}
          subtotal={subtotal}
          onTransfer={transferTable}
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal
          cart={cart}
          subtotal={subtotal}
          vat={vat}
          total={total}
          customerDiscount={customerDiscount}
          selectedTableName={selectedTableName}
          employee={nhanvien}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={() => setShowCustomerModal(true)}
          onProcessPayment={processPayment}
          onClose={() => setShowCheckoutModal(false)}
        />
      )}

      {showNoteModal && selectedItemForNote && (
        <NoteModal
          item={selectedItemForNote}
          note={noteInput}
          onNoteChange={setNoteInput}
          onSave={(note) => {
            updateCartItemNote(selectedItemForNote.id, note);
            setShowNoteModal(false);
            setSelectedItemForNote(null);
            setNoteInput('');
          }}
          onClose={() => {
            setShowNoteModal(false);
            setSelectedItemForNote(null);
            setNoteInput('');
          }}
        />
      )}
    </div>
  );
}