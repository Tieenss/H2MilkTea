import { useState, useEffect } from 'react';
import { Material } from '../types/material';

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
      
      // Đọc dữ liệu từ các file JSON
      const [materialsData, transactionsData, orderDetailsData, productMaterialsData] = await Promise.all([
        fetch('/data/NGUYENLIEU.json').then(res => res.json()),
        fetch('/data/NHAPXUATKHO.json').then(res => res.json()),
        fetch('/data/HOADONDETAIL.json').then(res => res.json()),
        fetch('/data/CAUHINH.json').then(res => res.json())
      ]);

      const stats: MaterialInventoryStats[] = [];

      // Tính toán cho từng nguyên vật liệu
      materialsData.forEach((material: Material) => {
        const materialId = material.IDNguyenLieu;
        
        // Tính số lượng nhập từ giao dịch nhập kho
        const nhapKho = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Nhập kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => tx.ChiTiet)
          .filter((detail: any) => detail.IDNguyenLieu === materialId)
          .reduce((sum: number, detail: any) => sum + detail.SoLuong, 0);

        // Tính số lượng xuất từ giao dịch xuất kho
        const xuatKho = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Xuất kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => tx.ChiTiet)
          .filter((detail: any) => detail.IDNguyenLieu === materialId)
          .reduce((sum: number, detail: any) => sum + detail.SoLuong, 0);

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
            acc[productId] += parseInt(detail['Số lượng']) || 0;
            return acc;
          }, {});

        // Tính số lượng nguyên vật liệu đã sử dụng cho việc bán
        productsUsingMaterial.forEach((productId: string) => {
          const soldQuantity = productSales[productId] || 0;
          const materialConfig = productMaterialsData.find((pm: any) => 
            pm.IDSP === productId && pm.IDNguyenLieu === materialId
          );
          
          if (materialConfig) {
            const materialPerProduct = materialConfig['Số lượng quy đổi'] || materialConfig['Số lượng cần'];
            soLuongBan += soldQuantity * materialPerProduct;
          }
        });

        // Tính số lượng tồn
        const tonKho = nhapKho - xuatKho - soLuongBan;

        // Tính giá trị tồn (giả sử giá trung bình từ các lần nhập)
        const nhapKhoDetails = transactionsData
          .filter((tx: any) => tx.LoaiGiaoDich === 'Nhập kho' && tx.TrangThai === 'Hoàn thành')
          .flatMap((tx: any) => tx.ChiTiet)
          .filter((detail: any) => detail.IDNguyenLieu === materialId);

        const tongGiaTriNhap = nhapKhoDetails.reduce((sum: number, detail: any) => 
          sum + (detail.ThanhTien || 0), 0
        );
        const giaTriTrungBinh = nhapKho > 0 ? tongGiaTriNhap / nhapKho : 0;
        const giaTriTonKho = tonKho * giaTriTrungBinh;

        stats.push({
          IDNguyenLieu: material.IDNguyenLieu,
          'Tên nguyên liệu': material['Tên nguyên liệu'],
          'Đơn vị tính': material['Đơn vị tính'],
          'Số lượng nhập': nhapKho,
          'Số lượng bán': soLuongBan,
          'Số lượng tồn': Math.max(0, tonKho), // Không cho phép âm
          'Giá trị tồn': giaTriTonKho
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
    refreshStats
  };
}; 