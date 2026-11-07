'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Search, X, Layers, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTables } from './hooks/useTables';
import { TableStats } from './components/TableStats';
import { TableCard } from './components/TableCard';
import { TableForm } from './components/TableForm';
import { BulkQRCodeGenerator } from './components/BulkQRCodeGenerator';
import { BulkAddTablesDialog } from './components/BulkAddTablesDialog';
import type { Table, TableFormData } from './types/table';
import { INITIAL_TABLE_FORM_DATA, TABLE_STATUS, DEFAULT_AREAS, detectTableArea } from './utils/constants';
import authUtils from '@/utils/authUtils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function TablePage() {
  const router = useRouter();
  const {
    tables,
    addTable,
    bulkAddTables,
    updateTable,
    deleteTable,
    generateTableId,
    loading
  } = useTables();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState<TableFormData>(INITIAL_TABLE_FORM_DATA);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [capacityFilter, setCapacityFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('Tất cả');

  // Bulk add states & initial config
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkInitialConfig, setBulkInitialConfig] = useState<{
    prefix?: string;
    from?: number;
    to?: number;
    area?: string;
    capacity?: number;
  }>({
    prefix: 'BAN',
    from: 1,
    to: 15,
    area: 'Phòng hát',
    capacity: 4
  });

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

  // AI Assistant listener for Bulk Table Add command & pending queue
  useEffect(() => {
    const handleOpenBulkEvent = (e: any) => {
      const config = e?.detail || {};
      setBulkInitialConfig(prev => ({
        ...prev,
        ...config
      }));
      setIsBulkDialogOpen(true);
    };

    // Check localStorage for pending bulk add from AI
    try {
      const pending = localStorage.getItem('h2_pending_bulk_add_tables');
      if (pending) {
        localStorage.removeItem('h2_pending_bulk_add_tables');
        const parsed = JSON.parse(pending);
        setBulkInitialConfig(prev => ({
          ...prev,
          ...parsed
        }));
        setIsBulkDialogOpen(true);
      }
    } catch {}

    window.addEventListener('h2_open_bulk_add_tables', handleOpenBulkEvent as EventListener);
    return () => {
      window.removeEventListener('h2_open_bulk_add_tables', handleOpenBulkEvent as EventListener);
    };
  }, []);

  const resetForm = () => {
    setFormData(INITIAL_TABLE_FORM_DATA);
    setEditingTable(null);
    setIsDialogOpen(false);
  };

  const handleAddNew = () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    setEditingTable(null);
    const newFormData: TableFormData = {
      ...INITIAL_TABLE_FORM_DATA,
      IDBAN: generateTableId(),
      'Khu vực': areaFilter !== 'Tất cả' ? areaFilter : 'Quầy'
    };
    setFormData(newFormData);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: TableFormData) => {
    try {
      if (editingTable) {
        await updateTable(editingTable.IDBAN, data);
      } else {
        await addTable(data);
      }
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (table: Table) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }

    setEditingTable(table);
    setFormData({
      IDBAN: table.IDBAN || '',
      'Tên bàn': table['Tên bàn'] || '',
      'Sức chứa tối đa': table['Sức chứa tối đa'] || 4,
      'Trạng thái': table['Trạng thái'] || 'Trống',
      'Khu vực': table['Khu vực'] || detectTableArea(table['Tên bàn']) || 'Quầy'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (table: Table) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền xóa bàn!');
      return;
    }

    deleteTable(table.IDBAN);
  };

  // Filter tables with Area and Status normalization
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      const matchesSearch = 
        table.IDBAN.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table['Tên bàn'].toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' 
        ? true 
        : (statusFilter === 'Đang hoạt động' 
            ? (table['Trạng thái'] === 'Đang hoạt động' || table['Trạng thái'] === 'Trống' || table['Trạng thái'] === 'Có khách')
            : table['Trạng thái'] === statusFilter);

      const tableArea = detectTableArea(table['Tên bàn'], table['Khu vực']);
      const matchesArea = areaFilter === 'Tất cả' || tableArea === areaFilter;
      
      const matchesCapacity = (() => {
        switch (capacityFilter) {
          case 'small': return table['Sức chứa tối đa'] <= 4;
          case 'medium': return table['Sức chứa tối đa'] > 4 && table['Sức chứa tối đa'] <= 8;
          case 'large': return table['Sức chứa tối đa'] > 8;
          default: return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesArea && matchesCapacity;
    });
  }, [tables, searchTerm, statusFilter, areaFilter, capacityFilter]);

  // Group tables by status
  const tablesByStatus = useMemo(() => {
    const grouped = {
      'Đang hoạt động': [] as Table[],
      'Bảo trì': [] as Table[]
    };

    filteredTables.forEach(table => {
      const status = table['Trạng thái'];
      if (status === 'Bảo trì' || status === 'Ngưng sử dụng') {
        grouped['Bảo trì'].push(table);
      } else {
        grouped['Đang hoạt động'].push(table);
      }
    });

    return grouped;
  }, [filteredTables]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-6xl">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-3xl font-bold text-gray-800 dark:text-slate-100 flex items-center">
          <MapPin className="mr-2 h-6 w-6 text-blue-600" />
          Quản lý bàn
        </h3>
        
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <BulkQRCodeGenerator tables={tables} />
          
          {(isAdmin || isManager) && (
            <Button
              variant="outline"
              onClick={() => setIsBulkDialogOpen(true)}
              className="flex items-center gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold"
            >
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              ⚡ Tạo bàn nhanh
            </Button>
          )}

          <Dialog
            open={isDialogOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) resetForm();
              setIsDialogOpen(isOpen);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4" />
                Thêm bàn
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0 flex flex-col">
              <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-blue-600" />
                    <div>
                      <DialogTitle className="text-xl md:text-2xl font-semibold text-gray-900">
                        {editingTable ? 'Cập nhật thông tin bàn' : 'Thêm bàn mới'}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-500">
                        {editingTable ? 'Chỉnh sửa thông tin bàn' : 'Tạo bàn mới cho nhà hàng'}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden min-h-0">
                <TableForm
                  table={editingTable}
                  formData={formData}
                  onFormDataChange={setFormData}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                  isAdmin={isAdmin}
                  isManager={isManager}
                  generateTableId={generateTableId}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <TableStats tables={tables} />

      {/* Area Filter Tabs (Khớp phong cách POS TableModal) */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 px-2 whitespace-nowrap flex items-center gap-1">
          <Compass className="h-3.5 w-3.5 text-indigo-500" />
          Khu vực:
        </span>
        {DEFAULT_AREAS.map((area) => {
          const isSelected = areaFilter === area;
          const count = area === 'Tất cả'
            ? tables.length
            : tables.filter(t => detectTableArea(t['Tên bàn'], t['Khu vực']) === area).length;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setAreaFilter(area)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              )}
            >
              <span>
                {area === 'Phòng hát' && '🎤 '}
                {area === 'Quầy' && '☕ '}
                {area === 'Vườn' && '🌿 '}
                {area === 'Mang về' && '🛍️ '}
                {area}
              </span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                isSelected ? "bg-white/25 text-white" : "bg-black/5 dark:bg-white/10 text-gray-500 dark:text-slate-400"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bộ lọc và tìm kiếm</CardTitle>
          <CardDescription className="text-xs">
            Lọc và tìm kiếm bàn theo tên, mã bàn, trạng thái hoặc sức chứa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên bàn hoặc mã bàn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {TABLE_STATUS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={capacityFilter} onValueChange={setCapacityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sức chứa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kích cỡ</SelectItem>
                <SelectItem value="small">Nhỏ (≤4 người)</SelectItem>
                <SelectItem value="medium">Vừa (5-8 người)</SelectItem>
                <SelectItem value="large">Lớn (hơn 8 người)</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== 'all' || capacityFilter !== 'all' || areaFilter !== 'Tất cả') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCapacityFilter('all');
                  setAreaFilter('Tất cả');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="space-y-6">
        {statusFilter === 'all' ? (
          Object.entries(tablesByStatus).map(([status, statusTables]) => {
            if (statusTables.length === 0) return null;
            
            const statusInfo = TABLE_STATUS.find(s => s.value === status);
            
            return (
              <div key={status} className="space-y-4">
                <div className="flex items-center gap-2">
                  {statusInfo?.icon && (
                    <statusInfo.icon className="h-5 w-5 text-gray-600" />
                  )}
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                    {statusInfo?.label} ({statusTables.length})
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {statusTables.map((table) => (
                    <TableCard
                      key={table.IDBAN}
                      table={table}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isAdmin={isAdmin}
                      isManager={isManager}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800">
                Kết quả tìm kiếm ({filteredTables.length} bàn)
              </h4>
            </div>
            {filteredTables.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTables.map((table) => (
                  <TableCard
                    key={table.IDBAN}
                    table={table}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isAdmin={isAdmin}
                    isManager={isManager}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MapPin className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Không tìm thấy bàn nào
                  </h3>
                  <p className="text-gray-500 text-center mb-4">
                    Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setCapacityFilter('all');
                        setAreaFilter('Tất cả');
                      }}
                    >
                      Xóa bộ lọc
                    </Button>
                    {(isAdmin || isManager) && (
                      <Button onClick={handleAddNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm bàn mới
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị {filteredTables.length} trên tổng số {tables.length} bàn
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                Đang hoạt động: {tablesByStatus['Đang hoạt động'].length}
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                Bảo trì: {tablesByStatus['Bảo trì'].length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Add Tables Dialog */}
      <BulkAddTablesDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        existingTables={tables}
        onSubmit={bulkAddTables}
        initialConfig={bulkInitialConfig}
      />
    </div>
  );
}
