'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Employee, EmployeeFormData } from '../types/employee';
import authUtils from '@/utils/authUtils';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

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

  const addEmployee = useCallback(async (formData: EmployeeFormData) => {
    try {
      // Check for existing username
      const exists = employees.some(emp =>
        emp.username.toLowerCase() === formData.username.toLowerCase()
      );

      if (exists) {
        toast.error('Tên đăng nhập này đã tồn tại!');
        return;
      }

      const toastId = toast.loading('Đang thêm nhân viên...');
      
      const response = await authUtils.addNhanVien(formData);

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        // Fetch lại data để đảm bảo đồng bộ
        await fetchEmployees();
        toast.success('Thêm nhân viên mới thành công!', { id: toastId });
      } else {
        throw new Error((response && typeof response === 'object' && 'message' in response && response.message) || 'Lỗi khi thêm nhân viên');
      }
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm nhân viên');
    }
  }, [employees, fetchEmployees]);

  const updateEmployee = useCallback(async (username: string, formData: EmployeeFormData) => {
    try {
      const toastId = toast.loading('Đang cập nhật nhân viên...');
      
      const response = await authUtils.updateNhanVien(username, formData);

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        // Update state immediately
        setEmployees(prev => prev.map(emp =>
          emp.username === username ? { ...emp, ...formData } : emp
        ));
        toast.success('Cập nhật thông tin nhân viên thành công!', { id: toastId });
      } else {
        throw new Error((response && typeof response === 'object' && 'message' in response && response.message) || 'Lỗi khi cập nhật nhân viên');
      }
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật nhân viên');
    }
  }, []);

  const deleteEmployee = useCallback(async (username: string) => {
    // Store original state for potential rollback
    const originalEmployees = employees;
    const employeeName = employees.find(emp => emp.username === username)?.['Họ và Tên'] || '';

    try {
      // Optimistic update
      setEmployees(prev => prev.filter(emp => emp.username !== username));
      
      const toastId = toast.loading('Đang xóa nhân viên...');
      
      const response = await authUtils.deleteNhanVien(username);

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        toast.success(`Xóa nhân viên "${employeeName}" thành công!`, { id: toastId });
      } else {
        // Rollback on error
        setEmployees(originalEmployees);
        throw new Error((response && typeof response === 'object' && 'message' in response && response.message) || 'Lỗi khi xóa nhân viên');
      }
    } catch (error: any) {
      // Rollback on error
      setEmployees(originalEmployees);
      console.error('Error deleting employee:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa nhân viên');
    }
  }, [employees]);

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: fetchEmployees
  };
};