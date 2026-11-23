'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Employee, EmployeeFormData } from '../types/employee';
import authUtils from '@/utils/authUtils';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authUtils.getAllNhanVien();
      if (Array.isArray(response)) {
        setEmployees(response);
      } else if (response && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employee list:', error);
      toast.error('Lỗi khi tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = useCallback(async (formData: EmployeeFormData): Promise<boolean> => {
    const cleanUsername = String(formData.username || '').trim();
    const exists = employees.some(
      (emp) => String(emp.username || '').trim().toLowerCase() === cleanUsername.toLowerCase()
    );

    if (exists) {
      toast.error(`Tên đăng nhập "${cleanUsername}" đã tồn tại!`);
      return false;
    }

    const toastId = toast.loading('Đang tạo tài khoản và lưu hồ sơ nhân viên...');
    try {
      const response = await authUtils.addNhanVien({
        ...formData,
        username: cleanUsername,
      });

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        await fetchEmployees();
        toast.success('Thêm nhân viên mới thành công!', { id: toastId });
        return true;
      } else {
        const errMsg =
          (response && typeof response === 'object' && 'message' in response && response.message) ||
          'Lỗi khi thêm nhân viên';
        toast.error(String(errMsg), { id: toastId });
        return false;
      }
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error(error?.message || 'Có lỗi xảy ra khi thêm nhân viên', { id: toastId });
      return false;
    }
  }, [employees, fetchEmployees]);

  const updateEmployee = useCallback(async (username: string, formData: EmployeeFormData): Promise<boolean> => {
    const toastId = toast.loading('Đang cập nhật thông tin nhân viên...');
    try {
      const response = await authUtils.updateNhanVien(username, formData);

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setEmployees((prev) =>
          prev.map((emp) => (emp.username === username ? { ...emp, ...formData } : emp))
        );
        toast.success('Cập nhật thông tin nhân viên thành công!', { id: toastId });
        return true;
      } else {
        const errMsg =
          (response && typeof response === 'object' && 'message' in response && response.message) ||
          'Lỗi khi cập nhật nhân viên';
        toast.error(String(errMsg), { id: toastId });
        return false;
      }
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error?.message || 'Có lỗi xảy ra khi cập nhật nhân viên', { id: toastId });
      return false;
    }
  }, []);

  const deleteEmployee = useCallback(async (username: string): Promise<boolean> => {
    const originalEmployees = employees;
    const employeeName = employees.find((emp) => emp.username === username)?.['Họ và Tên'] || username;
    const toastId = toast.loading('Đang xóa nhân viên...');

    try {
      setEmployees((prev) => prev.filter((emp) => emp.username !== username));

      const response = await authUtils.deleteNhanVien(username);

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        toast.success(`Xóa nhân viên "${employeeName}" thành công!`, { id: toastId });
        return true;
      } else {
        setEmployees(originalEmployees);
        const errMsg =
          (response && typeof response === 'object' && 'message' in response && response.message) ||
          'Lỗi khi xóa nhân viên';
        toast.error(String(errMsg), { id: toastId });
        return false;
      }
    } catch (error: any) {
      setEmployees(originalEmployees);
      console.error('Error deleting employee:', error);
      toast.error(error?.message || 'Có lỗi xảy ra khi xóa nhân viên', { id: toastId });
      return false;
    }
  }, [employees]);

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: fetchEmployees,
  };
};
