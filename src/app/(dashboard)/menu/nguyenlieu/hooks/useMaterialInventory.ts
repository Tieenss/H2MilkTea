import { useState, useEffect, useCallback } from 'react';
import { Material } from '../types/material';
import authUtils from '@/utils/authUtils';

export interface MaterialInventoryStats {
  IDNguyenLieu: string;
  'Tên nguyên liệu': string;
  'Đơn vị tính': string;
  'Số lượng nhập': number;
  'Số lượng bán': number;
  'Số lượng tồn': number;
  'Giá trị tồn': number;
}

export const useMaterialInventory = () => {
  const [inventoryStats, setInventoryStats] = useState<MaterialInventoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateInventoryStats = useCallback(async () => {
    try {
      setLoading(true);

      const [materialsRes, transactionsRes, orderDetailsRes, productMaterialsRes] = await Promise.all([
        authUtils.apiRequest('NGUYENLIEU', 'getall', {}),
        authUtils.apiRequest('NHAPXUATKHO', 'getall', {}),
        authUtils.apiRequest('HOADONDETAIL', 'getall', {}),
        authUtils.apiRequest('CAUHINH', 'getall', {})
      ]);

      const materialsData: Material[] = Array.isArray(materialsRes) ? materialsRes : [];
      const transactionsData: any[] = Array.isArray(transactionsRes) ? transactionsRes : [];
      const orderDetailsData: any[] = Array.isArray(orderDetailsRes) ? orderDetailsRes : [];
      const productMaterialsData: any[] = Array.isArray(productMaterialsRes) ? productMaterialsRes : [];

      const stats: MaterialInventoryStats[] = [];

      materialsData.forEach((material: Material) => {
        const materialId = material.IDNguyenLieu;

        const nhapKho = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Nhập kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => Array.isArray(tx.ChiTiet) ? tx.ChiTiet : [])
          .filter((detail: any) => detail.IDNguyenLieu === materialId)
          .reduce((sum: number, detail: any) => sum + (Number(detail.SoLuong) || 0), 0);

        const xuatKho = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Xuất kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => Array.isArray(tx.ChiTiet) ? tx.ChiTiet : [])
          .filter((detail: any) => detail.IDNguyenLieu === materialId)
          .reduce((sum: number, detail: any) => sum + (Number(detail.SoLuong) || 0), 0);

        let soLuongBan = 0;

        const productsUsingMaterial = productMaterialsData
          .filter((pm: any) => pm.IDNguyenLieu === materialId)
          .map((pm: any) => pm.IDSP);

        const productSales = orderDetailsData
          .filter((detail: any) => productsUsingMaterial.includes(detail.IDSP))
          .reduce((acc: Record<string, number>, detail: any) => {
            const productId = detail.IDSP;
            if (!acc[productId]) {
              acc[productId] = 0;
            }
            acc[productId] += parseFloat(detail['Số lượng']) || 0;
            return acc;
          }, {});

        productsUsingMaterial.forEach((productId: string) => {
          const soldQuantity = productSales[productId] || 0;
          const materialConfig = productMaterialsData.find((pm: any) =>
            pm.IDSP === productId && pm.IDNguyenLieu === materialId
          );

          if (materialConfig) {
            const materialPerProduct = parseFloat(materialConfig['Số lượng quy đổi']) || parseFloat(materialConfig['Số lượng cần']) || 0;
            soLuongBan += soldQuantity * materialPerProduct;
          }
        });

        const tonKho = nhapKho - xuatKho - soLuongBan;

        const nhapKhoDetails = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Nhập kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => Array.isArray(tx.ChiTiet) ? tx.ChiTiet : [])
          .filter((detail: any) => detail.IDNguyenLieu === materialId);

        const tongGiaTriNhap = nhapKhoDetails.reduce((sum: number, detail: any) =>
          sum + (Number(detail.ThanhTien) || ((Number(detail.SoLuong) || 0) * (Number(detail.DonGia) || 0))), 0
        );
        const giaTriTrungBinh = nhapKho > 0 ? tongGiaTriNhap / nhapKho : 25000;
        const giaTriTonKho = Math.max(0, tonKho) * giaTriTrungBinh;

        stats.push({
          IDNguyenLieu: material.IDNguyenLieu,
          'Tên nguyên liệu': material['Tên nguyên liệu'],
          'Đơn vị tính': material['Đơn vị tính'],
          'Số lượng nhập': Math.round(nhapKho * 100) / 100,
          'Số lượng bán': Math.round(soLuongBan * 100) / 100,
          'Số lượng tồn': Math.max(0, Math.round(tonKho * 100) / 100),
          'Giá trị tồn': Math.round(giaTriTonKho)
        });
      });

      setInventoryStats(stats);
    } catch (error) {
      console.error('Lỗi khi tính toán thống kê tồn kho:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateInventoryStats();
  }, [calculateInventoryStats]);

  const refreshStats = () => {
    calculateInventoryStats();
  };

  return {
    inventoryStats,
    loading,
    refreshStats
  };
};
