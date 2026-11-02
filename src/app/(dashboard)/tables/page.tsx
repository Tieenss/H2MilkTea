'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Search, X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import type { Table, TableFormData } from './types/table';
import { INITIAL_TABLE_FORM_DATA, TABLE_STATUS, DEFAULT_AREAS, detectTableArea } from './utils/constants';
import authUtils from '@/utils/authUtils';
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

  // Bulk add states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('Bàn ');
  const [bulkFrom, setBulkFrom] = useState(1);
  const [bulkTo, setBulkTo] = useState(5);
  const [bulkCapacity, setBulkCapacity] = useState(4);
  const [bulkArea, setBulkArea] = useState('Tầng 1');

  // Check user permissions
  React.useEffect(() => {
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
   const newFormData = {
     ...INITIAL_TABLE_FORM_DATA,
     IDBAN: generateTableId()
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
    // Chỉ reset form sau khi thành công
    resetForm();
  } catch (error) {
    // Error đã được handle trong hook, không cần làm gì thêm
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
     'Trạng thái': table['Trạng thái'] || 'Trống'
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

  // Group tables by status - FIXED: Tất cả các bàn Trống, Có khách, Đang hoạt động đều thuộc nhóm Đang hoạt động, không bao giờ bị ẩn
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

  const handleBulkSubmit = async () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    const from = Math.min(bulkFrom, bulkTo);
    const to = Math.max(bulkFrom, bulkTo);
    const newTables: TableFormData[] = [];

    for (let i = from; i <= to; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      const prefix = bulkPrefix.trim();
      const tableName = `${prefix} ${numStr}`.trim();
      newTables.push({
        IDBAN: `BAN${Date.now().toString().slice(-4)}${numStr}`,
        'Tên bàn': tableName,
        'Sức chứa tối đa': bulkCapacity,
        'Trạng thái': 'Đang hoạt động',
        'Khu vực': bulkArea,
      });
    }

    await bulkAddTables(newTables);
    setIsBulkDialogOpen(false);
  };

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

     {/* Filters */}
     <Card>
       <CardHeader>
         <CardTitle>Bộ lọc và tìm kiếm</CardTitle>
         <CardDescription>
           Lọc và tìm kiếm bàn theo các tiêu chí khác nhau
         </CardDescription>
       </CardHeader>
       <CardContent>
         <div className="flex flex-col sm:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
             <Input
               placeholder="Tìm kiếm theo tên bàn hoặc mã bàn..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10"
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

           {(searchTerm || statusFilter !== 'all' || capacityFilter !== 'all') && (
             <Button
               variant="outline"
               onClick={() => {
                 setSearchTerm('');
                 setStatusFilter('all');
                 setCapacityFilter('all');
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
         // Group by status when showing all
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
         // Show all filtered tables when a specific status is selected
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
   </div>
 );
}
