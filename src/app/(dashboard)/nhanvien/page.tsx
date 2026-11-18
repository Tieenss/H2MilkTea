'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, User, Shield, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { navigation, NavigationItem } from '@/lib/navigation';
import authUtils from '@/utils/authUtils';
import toast from 'react-hot-toast'


export default function EmployeePage() {
  const router = useRouter();
  const { employees, addEmployee, updateEmployee, deleteEmployee, loading } = useEmployees();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(INITIAL_FORM_DATA);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [permissionEmployee, setPermissionEmployee] = useState<Employee | null>(null);
  const [permissionList, setPermissionList] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
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
  const getAllNavLeafItems = useCallback((navItems: NavigationItem[]) => {
    const allItems: NavigationItem[] = [];
    navItems.forEach((item) => {
      if (!item.isGroup) allItems.push(item);
      if (item.children) allItems.push(...item.children);
    });
    return allItems;
  }, []);

  const handleManagePermissions = useCallback((employee: Employee) => {
    if (!isAdmin && !isManager) {
      toast.error('Bạn không có quyền thực hiện chức năng này!');
      return;
    }

    if (employee['Phân quyền'] === 'Admin' && !isAdmin) {
      toast.error('Bạn không có quyền chỉnh sửa quyền của tài khoản Admin!');
      return;
    }

    const parsed = employee['Quyền View']
      ? employee['Quyền View'].split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    setPermissionEmployee(employee);
    setPermissionList(parsed);
    setIsPermissionDialogOpen(true);
  }, [isAdmin, isManager]);

  const handleTogglePermissionItem = (permName: string, checked: boolean) => {
    setPermissionList((prev) =>
      checked ? Array.from(new Set([...prev, permName])) : prev.filter((p) => p !== permName)
    );
  };

  const handleTogglePermissionGroup = (groupNames: string[], checked: boolean) => {
    setPermissionList((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...groupNames]));
      }
      return prev.filter((p) => !groupNames.includes(p));
    });
  };

  const handleSaveQuickPermissions = async () => {
    if (!permissionEmployee) return;
    setSavingPermissions(true);
    try {
      const updatedForm: EmployeeFormData = {
        'Họ và Tên': permissionEmployee['Họ và Tên'] || '',
        'Chức vụ': permissionEmployee['Chức vụ'] || '',
        'Phòng': permissionEmployee['Phòng'] || '',
        'username': permissionEmployee['username'] || '',
        'password': permissionEmployee['password'] || '',
        'Phân quyền': permissionEmployee['Phân quyền'] || 'Nhân viên',
        'Email': permissionEmployee['Email'] || '',
        'Image': permissionEmployee['Image'] || '',
        'Quyền View': permissionList.join(', '),
        'Số điện thoại': permissionEmployee['Số điện thoại'] || '',
        'Địa chỉ': permissionEmployee['Địa chỉ'] || '',
        'Ngày sinh': permissionEmployee['Ngày sinh'] || '',
        'Ngày vào làm': permissionEmployee['Ngày vào làm'] || '',
        'Ghi chú': permissionEmployee['Ghi chú'] || '',
      };
      await updateEmployee(permissionEmployee.username, updatedForm);
      setIsPermissionDialogOpen(false);
      setPermissionEmployee(null);
    } finally {
      setSavingPermissions(false);
    }
  };

  const columns = useMemo(
    () => getColumns({
      onEdit: handleEdit,
      onManagePermissions: handleManagePermissions,
      onDelete: handleDelete,
      isAdmin,
      isManager
    }),
    [handleEdit, handleManagePermissions, handleDelete, isAdmin, isManager]
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

      {/* Dialog cấu hình nhanh Quyền View (Phân quyền xem menu) */}
      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={(open) => {
          setIsPermissionDialogOpen(open);
          if (!open) setPermissionEmployee(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Phân quyền xem menu (Quyền View)
            </DialogTitle>
            <DialogDescription>
              {permissionEmployee ? (
                <span>
                  Cấu hình danh sách màn hình được phép truy cập cho{' '}
                  <strong>{permissionEmployee['Họ và Tên']}</strong> (
                  <Badge variant="outline" className="text-xs ml-1">
                    {permissionEmployee['Phân quyền'] || 'Nhân viên'}
                  </Badge>
                  )
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {permissionEmployee && (
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPermissionList(getAllNavLeafItems(navigation).map((item) => item.name))
                    }
                    disabled={permissionEmployee['Phân quyền'] === 'Admin'}
                  >
                    Chọn tất cả
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPermissionList([])}
                    disabled={permissionEmployee['Phân quyền'] === 'Admin'}
                  >
                    Bỏ chọn tất cả
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  Đã chọn: <strong>{permissionList.length}</strong> mục
                </span>
              </div>

              {permissionEmployee['Phân quyền'] === 'Admin' && (
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-2">
                  Tài khoản Admin mặc định có quyền truy cập toàn bộ menu hệ thống.
                </p>
              )}

              <div className="space-y-3 border rounded-lg p-3 max-h-80 overflow-y-auto">
                {navigation.map((navItem) => {
                  const Icon = navItem.icon;
                  const isDisabled = permissionEmployee['Phân quyền'] === 'Admin';

                  if (navItem.isGroup && navItem.children) {
                    const groupChildren = navItem.children;
                    const checkedCount = groupChildren.filter((c) =>
                      permissionList.includes(c.name)
                    ).length;
                    const isAllChecked = checkedCount === groupChildren.length;

                    return (
                      <div key={navItem.name} className="space-y-2">
                        <div className="flex items-center space-x-2 pb-1.5 border-b border-gray-100">
                          <Checkbox
                            id={`quick-group-${navItem.name}`}
                            checked={isAllChecked}
                            disabled={isDisabled}
                            onCheckedChange={(checked) =>
                              handleTogglePermissionGroup(
                                groupChildren.map((c) => c.name),
                                Boolean(checked)
                              )
                            }
                          />
                          <Label
                            htmlFor={`quick-group-${navItem.name}`}
                            className="flex items-center gap-2 cursor-pointer font-medium text-sm"
                          >
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span>{navItem.name}</span>
                            <span className="text-xs text-gray-500">
                              ({checkedCount}/{groupChildren.length})
                            </span>
                          </Label>
                        </div>
                        <div className="ml-6 space-y-1.5">
                          {groupChildren.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <div key={child.name} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`quick-perm-${child.name}`}
                                  checked={permissionList.includes(child.name)}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) =>
                                    handleTogglePermissionItem(child.name, Boolean(checked))
                                  }
                                />
                                <Label
                                  htmlFor={`quick-perm-${child.name}`}
                                  className="flex items-center gap-2 cursor-pointer text-xs text-gray-700"
                                >
                                  <ChildIcon className="h-3.5 w-3.5 text-gray-500" />
                                  <span>{child.name}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (!navItem.isGroup) {
                    return (
                      <div key={navItem.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`quick-perm-${navItem.name}`}
                          checked={permissionList.includes(navItem.name)}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            handleTogglePermissionItem(navItem.name, Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor={`quick-perm-${navItem.name}`}
                          className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700"
                        >
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span>{navItem.name}</span>
                        </Label>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPermissionDialogOpen(false)}
              disabled={savingPermissions}
            >
              Đóng
            </Button>
            {permissionEmployee && permissionEmployee['Phân quyền'] !== 'Admin' && (
              <Button
                type="button"
                onClick={handleSaveQuickPermissions}
                disabled={savingPermissions}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savingPermissions ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Lưu Quyền View
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}