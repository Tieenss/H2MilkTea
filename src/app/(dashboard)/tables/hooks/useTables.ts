'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Table, TableFormData } from '../types/table';
import authUtils from '@/utils/authUtils';

export const useTables = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authUtils.apiRequest('DSBAN', 'getall', {});
      const tableList = Array.isArray(response) ? response : [];
      setTables(tableList);
    } catch (error) {
      console.error('Error fetching table list:', error);
      toast.error('Lỗi khi tải danh sách bàn');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateTableId = useCallback(() => {
    const existingIds = tables.map(t => t.IDBAN);
    let newId = 'BAN001';
    let counter = 1;
    
    while (existingIds.includes(newId)) {
      counter++;
      newId = `BAN${counter.toString().padStart(3, '0')}`;
    }
    
    return newId;
  }, [tables]);

  const addTable = useCallback(async (formData: TableFormData) => {
    try {
      if (!formData.IDBAN) {
        formData.IDBAN = generateTableId();
      }

      const exists = tables.some(table =>
        table.IDBAN.toLowerCase() === formData.IDBAN.toLowerCase()
      );

      if (exists) {
        toast.error('Mã bàn này đã tồn tại!');
        return;
      }

      const result = await authUtils.apiRequest('DSBAN', 'create', formData);
      
      if (!Array.isArray(result) && result.success) {
        setTables(prev => [...prev, formData as Table]);
        toast.success('Thêm bàn mới thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi thêm bàn');
      } else {
        throw new Error('Lỗi khi thêm bàn');
      }
    } catch (error: any) {
      console.error('Error adding table:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm bàn');
    }
  }, [tables, generateTableId]);

  const updateTable = useCallback(async (tableId: string, formData: TableFormData) => {
    try {
      const { IDBAN, ...restFormData } = formData;
      const result = await authUtils.apiRequest('DSBAN', 'update', { 
        IDBAN: tableId, 
        ...restFormData 
      });
      
      if (!Array.isArray(result) && result.success) {
        setTables(prev => prev.map(table =>
          table.IDBAN === tableId ? { ...table, ...formData } : table
        ));
        toast.success('Cập nhật thông tin bàn thành công!');
      } else if (!Array.isArray(result)) {
        throw new Error(result.message || 'Lỗi khi cập nhật bàn');
      } else {
        throw new Error('Lỗi khi cập nhật bàn');
      }
    } catch (error: any) {
      console.error('Error updating table:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật bàn');
    }
  }, []);

  const deleteTable = useCallback(async (tableId: string) => {
    const originalTables = tables;
    const tableName = tables.find(table => table.IDBAN === tableId)?.['Tên bàn'] || '';

    try {
      // Optimistic update
      setTables(prev => prev.filter(table => table.IDBAN !== tableId));
      
      const toastId = toast.loading('Đang xóa bàn...');
      
      const result = await authUtils.apiRequest('DSBAN', 'delete', { IDBAN: tableId });
      
      if (!Array.isArray(result) && result.success) {
        toast.success(`Xóa bàn "${tableName}" thành công!`, { id: toastId });
      } else {
        // Rollback on error
        setTables(originalTables);
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi xóa bàn');
      }
    } catch (error: any) {
      // Rollback on error
      setTables(originalTables);
      console.error('Error deleting table:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa bàn');
    }
  }, [tables]);

  return {
    tables,
    loading,
    addTable,
    updateTable,
    deleteTable,
    generateTableId,
    fetchTables
  };
};