'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployees } from './hooks/useEmployees';
import { EmployeeStats } from './components/EmployeeStats';
import { DataTable } from './components/DataTable';
import { EmployeeForm } from './components/EmployeeForm';
import { getColumns } from './utils/columns';
import type { Employee, EmployeeFormData } from './types/employee';
import { INITIAL_FORM_DATA } from './utils/constants';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast'


export default function EmployeePage() {
  const router = useRouter();
  const { employees, addEmployee, updateEmployee, deleteEmployee, loading } = useEmployees();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(INITIAL_FORM_DATA);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

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
    setFormData(INITIAL_FORM_DATA);
    setEditingEmployee(null);
    setIsDialogOpen(false);
  };

  const handleAddNew = () => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    setEditingEmployee(null);
    setFormData(INITIAL_FORM_DATA);
    setIsDialogOpen(true);
  };

 const handleSubmit = async (data: EmployeeFormData) => {
  try {
    if (editingEmployee) {
      await updateEmployee(editingEmployee.username, data);
    } else {
      await addEmployee(data);
    }
    // Chỉ reset form sau khi thành công
    resetForm();
  } catch (error) {
    // Error đã được handle trong hook, không cần làm gì thêm
    console.error('Submit error:', error);
  }
};

 
const handleEdit = (employee: Employee) => {
  if (!isAdmin && !isManager) {
    toast.error('Bạn không có quyền thực hiện chức năng này!');
    return;
  }

  // Thêm check quyền edit Admin
  if (employee['Phân quyền'] === 'Admin' && !isAdmin) {
    toast.error('Bạn không có quyền chỉnh sửa tài khoản Admin!');
    return;
  }

  setEditingEmployee(employee);
  setFormData({
    'Họ và Tên': employee['Họ và Tên'] || '',
    'Chức vụ': employee['Chức vụ'] || '',
    'Phòng': employee['Phòng'] || '',
    'username': employee['username'] || '',
    'password': employee['password'] || '',
    'Phân quyền': employee['Phân quyền'] || 'Nhân viên',
    'Email': employee['Email'] || '',
    'Image': employee['Image'] || '',
    'Quyền View': employee['Quyền View'] || '',
    'Số điện thoại': employee['Số điện thoại'] || '',
    'Địa chỉ': employee['Địa chỉ'] || '',
    'Ngày sinh': employee['Ngày sinh'] || '',
    'Ngày vào làm': employee['Ngày vào làm'] || '',
    'Ghi chú': employee['Ghi chú'] || ''
  });
  setIsDialogOpen(true);
};

  const handleDelete = async (employee: Employee) => {
  if (!isAdmin && !isManager) {
    toast.error('Bạn không có quyền xóa nhân viên!');
    return;
  }

  if (employee['Phân quyền'] === 'Admin' && !isAdmin) {
    toast.error('Bạn không có quyền xóa Admin!');
    return;
  }

  // Thêm confirmation
  const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${employee['Họ và Tên']}"?`);
  if (!confirmed) return;

  await deleteEmployee(employee.username);
};
  const columns = useMemo(
    () => getColumns({
      onEdit: handleEdit,
      onDelete: handleDelete,
      isAdmin,
      isManager
    }),
    [handleEdit, handleDelete, isAdmin, isManager]
  );

  const departmentsList = useMemo(() =>
    Array.from(new Set(employees.map(emp => emp['Phòng']).filter(Boolean))),
    [employees]
  );

  const positionsList = useMemo(() =>
    Array.from(new Set(employees.map(emp => emp['Chức vụ']).filter(Boolean))),
    [employees]
  );

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
          Quản lý nhân viên
        </h1>
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
              <UserPlus className="h-4 w-4" />
              Thêm nhân viên
            </Button>
          </DialogTrigger>
          <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0 flex flex-col">
            <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <div>
                    <DialogTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                      {editingEmployee ? 'Cập nhật thông tin nhân viên' : 'Thêm nhân viên mới'}
                    </DialogTitle>

                  </div>
                </div>

              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden min-h-0">
              <EmployeeForm
                employee={editingEmployee}
                formData={formData}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
                onCancel={resetForm}
                isAdmin={isAdmin}
                isManager={isManager}
                departments={departmentsList}
                positions={positionsList}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <EmployeeStats employees={employees} />

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách nhân viên</CardTitle>
          <CardDescription>
            Quản lý tất cả nhân viên trong hệ thống của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={employees}
            departments={departmentsList}
            positions={positionsList}
            onAddNew={handleAddNew}
            isAdmin={isAdmin}
            isManager={isManager}
          />
        </CardContent>
      </Card>
    </div>
  );
}