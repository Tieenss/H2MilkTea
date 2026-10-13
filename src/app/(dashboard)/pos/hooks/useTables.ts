'use client';

import { useState, useCallback } from 'react';
import type { Table } from '../types/pos';
import authUtils from '@/utils/authUtils';

export const useTables = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tables from API
  const fetchTables = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authUtils.apiRequest('DSBAN', 'getall', {});
      
      const tableList = Array.isArray(response) ? response : [];
      
      // Chỉ lấy bàn đang hoạt động
      const activeTables = tableList.filter(table => 
        table['Trạng thái'] === 'Đang hoạt động'
      );
      
      setTables(activeTables);
      return activeTables;
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update table status locally (không save vào DB)
  const updateTableStatus = useCallback((tableId: string, status: string) => {
    setTables(prevTables => 
      prevTables.map(table => 
        table.IDBAN === tableId 
          ? { ...table, 'Trạng thái sử dụng': status }
          : table
      )
    );
  }, []);

  // Update table status in database
  const updateTableStatusInDB = useCallback(async (tableId: string, status: string) => {
    try {
      const table = tables.find(t => t.IDBAN === tableId);
      if (!table) return;

      const updatedTable = { 
        ...table, 
        'Trạng thái sử dụng': status 
      };

      const { IDBAN, ...tableData } = updatedTable;
      const result = await authUtils.apiRequest('DSBAN', 'update', {
        IDBAN: tableId,
        ...tableData
      });

      if (!Array.isArray(result) && result.success) {
        updateTableStatus(tableId, status);
      } else {
        throw new Error((!Array.isArray(result) && result.message) || 'Lỗi khi cập nhật trạng thái bàn');
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      throw error;
    }
  }, [tables, updateTableStatus]);

  // Get table by ID
  const getTableById = useCallback((tableId: string) => {
    return tables.find(table => table.IDBAN === tableId);
  }, [tables]);

  // Get available tables (empty or takeaway)
  const getAvailableTables = useCallback(() => {
    return tables.filter(table => 
      table['Trạng thái sử dụng'] === 'Trống' || 
      table['Tên bàn'] === 'Khách mua về'
    );
  }, [tables]);

  // Get occupied tables
  const getOccupiedTables = useCallback(() => {
    return tables.filter(table => 
      table['Trạng thái sử dụng'] === 'Đang sử dụng' && 
      table['Tên bàn'] !== 'Khách mua về'
    );
  }, [tables]);

  // Get tables by status
  const getTablesByStatus = useCallback((status: string) => {
    return tables.filter(table => table['Trạng thái sử dụng'] === status);
  }, [tables]);

  return {
    tables,
    isLoading,
    fetchTables,
    updateTableStatus,
    updateTableStatusInDB,
    getTableById,
    getAvailableTables,
    getOccupiedTables,
    getTablesByStatus
  };
};