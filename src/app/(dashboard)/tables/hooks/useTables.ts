'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Table, TableFormData } from '../types/table';
import authUtils from '@/utils/authUtils';
import { sortTables } from '../utils/constants';

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
      setTables(sortTables(tableList, 'name-asc'));
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
        setTables(prev => sortTables([...prev, formData as Table], 'name-asc'));
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
        setTables(prev =>
          sortTables(
            prev.map(table =>
              table.IDBAN === tableId ? { ...table, ...formData } : table
            ),
            'name-asc'
          )
        );
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
        // Dọn dẹp giỏ hàng nháp liên quan đến bàn vừa xóa
        fetch(`/api/pos/cart-draft?tableId=${encodeURIComponent(tableId)}`, { method: 'DELETE' }).catch(() => {});

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

  const bulkAddTables = useCallback(async (newTables: TableFormData[]) => {
    try {
      setLoading(true);
      let successCount = 0;
      const addedList: Table[] = [];

      for (const formData of newTables) {
        try {
          const result = await authUtils.apiRequest('DSBAN', 'create', formData);
          if (!Array.isArray(result) && result.success) {
            successCount++;
            addedList.push(formData as Table);
          }
        } catch (e) {
          console.error('Lỗi khi thêm bàn:', formData['Tên bàn'], e);
        }
      }

      if (addedList.length > 0) {
        setTables(prev => sortTables([...prev, ...addedList], 'name-asc'));
        toast.success(`Đã thêm thành công ${successCount} bàn mới!`);
      } else {
        toast.error('Không thể thêm bàn hàng loạt');
      }
    } catch (err: any) {
      console.error('Error bulk adding tables:', err);
      toast.error(err.message || 'Lỗi khi thêm bàn hàng loạt');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tables,
    loading,
    addTable,
    bulkAddTables,
    updateTable,
    deleteTable,
    generateTableId,
    fetchTables
  };
};
