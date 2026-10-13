'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, User, UserPlus, Phone, Gift } from 'lucide-react';
import authUtils from '@/utils/authUtils';
import { formatCurrency, formatPoints } from '../utils/formatters';
import type { Customer } from '@/app/(dashboard)/khachhang/types/customer';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomer
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await authUtils.apiRequest('KHACHHANG', 'getall', {});
      const customerList = Array.isArray(response) ? response : [];
      
      // Chỉ lấy khách hàng đang hoạt động
      const activeCustomers = customerList.filter(customer => 
        customer['Trạng thái'] === 'Hoạt động'
      );
      
      setCustomers(activeCustomers);
      setFilteredCustomers(activeCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer['Tên khách hàng'].toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer['Số điện thoại'].includes(searchTerm) ||
      customer['Email']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.IDKHACHHANG.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // Load customers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const handleSelectCustomer = (customer: Customer | null) => {
    onSelectCustomer(customer);
    onClose();
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'Khách VIP':
        return 'bg-blue-100 text-blue-800';
      case 'Khách kim cương':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <User className="mr-2 h-5 w-5" />
            Chọn khách hàng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo tên, số điện thoại, email hoặc mã khách hàng..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleSelectCustomer(null)}
              variant={!selectedCustomer ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Khách lẻ
            </Button>
            
            <Button
              onClick={() => {
                // TODO: Mở modal thêm khách hàng mới
                console.log('Add new customer');
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Thêm khách hàng mới
            </Button>
          </div>

          {/* Customer List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Đang tải danh sách khách hàng...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <CustomerCard
                      key={customer.IDKHACHHANG}
                      customer={customer}
                      isSelected={selectedCustomer?.IDKHACHHANG === customer.IDKHACHHANG}
                      onSelect={() => handleSelectCustomer(customer)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Customer Info */}
          {selectedCustomer && (
            <div className="bg-blue-50 p-4 rounded-lg border">
              <h4 className="font-medium text-blue-800 mb-2">Khách hàng đã chọn:</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {selectedCustomer['Tên khách hàng'].charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-blue-800">
                      {selectedCustomer['Tên khách hàng']}
                    </div>
                    <div className="text-sm text-blue-600">
                      {selectedCustomer['Số điện thoại']}
                    </div>
                  </div>
                </div>
                <Badge className={getCustomerTypeColor(selectedCustomer['Loại khách hàng'])}>
                  {selectedCustomer['Loại khách hàng']}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CustomerCardProps {
  customer: Customer;
  isSelected: boolean;
  onSelect: () => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, isSelected, onSelect }) => {
  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'Khách VIP':
        return 'bg-blue-100 text-blue-800';
      case 'Khách kim cương':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {customer['Tên khách hàng'].charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900">
                {customer['Tên khách hàng']}
              </h3>
              <Badge className={getCustomerTypeColor(customer['Loại khách hàng'])}>
                {customer['Loại khách hàng']}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {customer['Số điện thoại']}
              </div>
              
              <div className="flex items-center gap-1">
                <Gift className="w-3 h-3" />
                {formatPoints(customer['Điểm tích lũy'])} điểm
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(customer['Tổng chi tiêu'])}
          </div>
          <div className="text-xs text-gray-500">Tổng chi tiêu</div>
        </div>
      </div>
    </div>
  );
};