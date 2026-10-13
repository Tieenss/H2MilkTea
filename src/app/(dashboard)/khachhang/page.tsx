// page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Filter, Download, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useCustomers } from './hooks/useCustomers';
import { CustomerStatsComponent } from './components/CustomerStats';
import { CustomerDataTable } from './components/CustomerDataTable';
import { CustomerDetailsModal } from './components/CustomerDetailsModal';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CUSTOMER_TYPES, CUSTOMER_STATUS } from './utils/customerConstants';
import { exportCustomerData } from './utils/customerFormatters';
import type { Customer, CustomerFormData } from './types/customer';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast';

// Helper function to parse Vietnamese date format (DD/MM/YYYY HH:mm:ss)
const parseVietnameseDate = (dateString: string): Date | null => {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    // Nếu đã là định dạng ISO hoặc có thể parse trực tiếp
    const directParse = new Date(dateString);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }
    
    // Xử lý định dạng DD/MM/YYYY hoặc DD/MM/YYYY HH:mm:ss
    const parts = dateString.trim().split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
    const [hour, minute, second] = timePart.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export default function CustomerManagementPage() {
  const router = useRouter();
  const {
    customers,
    customerTransactions,
    loading,
    stats,
    fetchCustomers,
    fetchCustomerTransactions,
    addCustomer,
    updateCustomer,
    deleteCustomer
  } = useCustomers();

  // User permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filtered customers
  const filteredCustomers = React.useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = !searchTerm || 
        customer['Tên khách hàng'].toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer['Số điện thoại'].includes(searchTerm) ||
        customer['Email']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.IDKHACHHANG.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || 
        customer['Loại khách hàng'] === typeFilter;

      const matchesStatus = statusFilter === 'all' || 
        customer['Trạng thái'] === statusFilter;

      const matchesDate = !dateRange || (() => {
        const createDate = parseVietnameseDate(customer['Ngày tạo']);
        if (!createDate) return false;
        return createDate >= dateRange.from && createDate <= dateRange.to;
      })();

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [customers, searchTerm, typeFilter, statusFilter, dateRange]);

  // Check user permissions
  useEffect(() => {
    const userData = authUtils.getUserData();
    if (!userData) {
      router.push('/login');
      return;
    }

    const isAdminUser = userData['Phân quyền'] === 'Admin';
    const isManagerUser = userData['Phân quyền'] === 'Quản lý';
    setIsAdmin(isAdminUser);
    setIsManager(isManagerUser);
  }, [router]);

  // Handle view customer details
  const handleViewDetails = async (customer: Customer) => {
    try {
      const transactions = await fetchCustomerTransactions(customer.IDKHACHHANG);
      setSelectedCustomer(customer);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditing(true);
    setShowFormModal(true);
  };

  // Handle add new customer
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  // Handle delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa khách hàng!');
      return;
    }

    try {
      await deleteCustomer(customerId);
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  // Handle form submit
  const handleFormSubmit = async (formData: CustomerFormData) => {
    try {
      if (isEditing && selectedCustomer) {
        await updateCustomer(selectedCustomer.IDKHACHHANG, formData);
      } else {
        await addCustomer(formData);
      }
      fetchCustomers(); // Refresh data
    } catch (error) {
      console.error('Error submitting customer form:', error);
      throw error;
    }
  };

  // Handle export data
  const handleExportData = () => {
    try {
      const exportData = exportCustomerData(filteredCustomers);
      const csvContent = generateCSVContent(exportData);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `khach-hang-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Xuất dữ liệu thành công!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu');
    }
  };

  const generateCSVContent = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const rows = data.map(row => {
      return headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...rows].join('\n');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Users className="mr-2 h-6 w-6 text-blue-600" />
          Quản lý khách hàng
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất dữ liệu
          </Button>
          <Button onClick={fetchCustomers} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleAddCustomer} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Thêm khách hàng
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <CustomerStatsComponent stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Tìm kiếm và lọc khách hàng theo các tiêu chí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Tìm kiếm khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Loại khách hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {CUSTOMER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {CUSTOMER_STATUS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Chọn khoảng thời gian"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách khách hàng ({filteredCustomers.length})</CardTitle>
          <CardDescription>
            Quản lý tất cả khách hàng trong hệ thống của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerDataTable
            customers={filteredCustomers}
            onViewDetails={handleViewDetails}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        transactions={selectedCustomer ? customerTransactions.get(selectedCustomer.IDKHACHHANG) || [] : []}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCustomer(null);
        }}
        onEdit={() => {
          setShowDetailsModal(false);
          setIsEditing(true);
          setShowFormModal(true);
        }}
      />

      {/* Form Modal */}
      <CustomerFormModal
        customer={selectedCustomer}
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedCustomer(null);
          setIsEditing(false);
        }}
        onSubmit={handleFormSubmit}
        isEditing={isEditing}
      />
    </div>
  );
}