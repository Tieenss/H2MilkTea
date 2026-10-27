import { useState, useEffect } from 'react';
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

  const calculateInventoryStats = async () => {
    try {
      setLoading(true);

      // Đọc dữ liệu từ API live (ưu tiên Supabase qua authUtils), có fallback an toàn sang file JSON
      const [materialsRes, transactionsRes, orderDetailsRes, productMaterialsRes] = await Promise.all([
        authUtils.apiRequest('NGUYENLIEU', 'getall', {}).catch(() => fetch('/data/NGUYENLIEU.json').then((res) => res.json())),
        authUtils.apiRequest('NHAPXUATKHO', 'getall', {}).catch(() => fetch('/data/NHAPXUATKHO.json').then((res) => res.json())),
        authUtils.apiRequest('HOADONDETAIL', 'getall', {}).catch(() => fetch('/data/HOADONDETAIL.json').then((res) => res.json())),
        authUtils.apiRequest('CAUHINH', 'getall', {}).catch(() => fetch('/data/CAUHINH.json').then((res) => res.json())),
      ]);

      const materialsData: any[] = Array.isArray(materialsRes) ? materialsRes : (materialsRes?.data || []);
      const transactionsData: any[] = Array.isArray(transactionsRes) ? transactionsRes : (transactionsRes?.data || []);
      const orderDetailsData: any[] = Array.isArray(orderDetailsRes) ? orderDetailsRes : (orderDetailsRes?.data || []);
      const productMaterialsData: any[] = Array.isArray(productMaterialsRes) ? productMaterialsRes : (productMaterialsRes?.data || []);

      const stats: MaterialInventoryStats[] = [];

      // Tính toán cho từng nguyên vật liệu
      materialsData.forEach((material: Material) => {
        const materialId = material.IDNguyenLieu;

        // Tính số lượng nhập từ giao dịch nhập kho
        const nhapKho = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Nhập kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => tx.ChiTiet || [])
          .filter((detail: any) => detail?.IDNguyenLieu === materialId)
          .reduce((sum: number, detail: any) => sum + (Number(detail?.SoLuong) || 0), 0);

        // Tính số lượng xuất từ giao dịch xuất kho khác (loại trừ xuất bán hàng XK_ để không cộng trùng với soLuongBan)
        const xuatKho = transactionsData
          .filter(
            (tx: any) =>
              tx.LoaiGiaoDich === 'Xuất kho' &&
              tx.TrangThai === 'Hoàn thành' &&
              !String(tx.IDGiaoDich || '').startsWith('XK_') &&
              !String(tx.GhiChu || '').toLowerCase().includes('hóa đơn')
          )
          .flatMap((tx: any) => tx.ChiTiet || [])
          .filter((detail: any) => detail?.IDNguyenLieu === materialId)
          .reduce((sum: number, detail: any) => sum + (Number(detail?.SoLuong) || 0), 0);

        // Tính số lượng bán từ hóa đơn chi tiết
        let soLuongBan = 0;

        // Lấy danh sách sản phẩm sử dụng nguyên vật liệu này
        const productsUsingMaterial = productMaterialsData
          .filter((pm: any) => pm.IDNguyenLieu === materialId)
          .map((pm: any) => pm.IDSP);

        // Tính tổng số lượng sản phẩm đã bán
        const productSales = orderDetailsData
          .filter((detail: any) => productsUsingMaterial.includes(detail.IDSP))
          .reduce((acc: any, detail: any) => {
            const productId = detail.IDSP;
            if (!acc[productId]) {
              acc[productId] = 0;
            }
            acc[productId] += parseInt(detail['Số lượng'], 10) || 0;
            return acc;
          }, {});

        // Tính số lượng nguyên vật liệu đã sử dụng cho việc bán
        productsUsingMaterial.forEach((productId: string) => {
          const soldQuantity = productSales[productId] || 0;
          const materialConfig = productMaterialsData.find(
            (pm: any) => pm.IDSP === productId && pm.IDNguyenLieu === materialId
          );

          if (materialConfig) {
            const materialPerProduct =
              Number(materialConfig['Số lượng quy đổi']) ||
              Number(materialConfig['Số lượng cần']) ||
              0;
            soLuongBan += soldQuantity * materialPerProduct;
          }
        });

        // Tính số lượng tồn
        const tonKho = nhapKho - xuatKho - soLuongBan;

        // Tính giá trị tồn (giá trung bình từ các lần nhập)
        const nhapKhoDetails = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Nhập kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => tx.ChiTiet || [])
          .filter((detail: any) => detail?.IDNguyenLieu === materialId);

        const tongGiaTriNhap = nhapKhoDetails.reduce(
          (sum: number, detail: any) => sum + (Number(detail?.ThanhTien) || 0),
          0
        );
        const giaTriTrungBinh = nhapKho > 0 ? tongGiaTriNhap / nhapKho : 0;
        const giaTriTonKho = tonKho * giaTriTrungBinh;

        stats.push({
          IDNguyenLieu: material.IDNguyenLieu,
          'Tên nguyên liệu': material['Tên nguyên liệu'],
          'Đơn vị tính': material['Đơn vị tính'],
          'Số lượng nhập': Math.round(nhapKho * 1000) / 1000,
          'Số lượng bán': Math.round(soLuongBan * 1000) / 1000,
          'Số lượng tồn': Math.max(0, Math.round(tonKho * 1000) / 1000), // Không âm
          'Giá trị tồn': Math.round(giaTriTonKho),
        });
      });

      setInventoryStats(stats);
    } catch (error) {
      console.error('Lỗi khi tính toán thống kê tồn kho:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateInventoryStats();
  }, []);

  const refreshStats = () => {
    calculateInventoryStats();
  };

  return {
    inventoryStats,
    loading,
    refreshStats,
  };
};
