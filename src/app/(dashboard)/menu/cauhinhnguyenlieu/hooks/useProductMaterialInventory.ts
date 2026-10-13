import { useState, useEffect } from 'react';
import { ProductMaterial } from '../types/productMaterial';

export interface ProductMaterialInventoryStats {
  IDSP: string;
  'Tên sản phẩm': string;
  'Tổng NVL sử dụng': number;
  'Số lượng bán': number;
  'Tổng NVL tiêu thụ': number;
  'Trạng thái': string;
}

export const useProductMaterialInventory = () => {
  const [inventoryStats, setInventoryStats] = useState<ProductMaterialInventoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateInventoryStats = async () => {
    try {
      setLoading(true);
      
      // Đọc dữ liệu từ các file JSON
      const [productMaterialsData, orderDetailsData, productsData] = await Promise.all([
        fetch('/data/CAUHINH.json').then(res => res.json()),
        fetch('/data/HOADONDETAIL.json').then(res => res.json()),
        fetch('/data/DMHH.json').then(res => res.json())
      ]);

      const stats: ProductMaterialInventoryStats[] = [];

      // Nhóm cấu hình theo sản phẩm
      const productConfigs = productMaterialsData.reduce((acc: any, config: any) => {
        if (!acc[config.IDSP]) {
          acc[config.IDSP] = [];
        }
        acc[config.IDSP].push(config);
        return acc;
      }, {});

      // Tính toán cho từng sản phẩm
      Object.keys(productConfigs).forEach((productId) => {
        const configs = productConfigs[productId];
        const product = productsData.find((p: any) => p.IDSP === productId);
        
        if (!product) return;

        // Tính tổng số lượng nguyên vật liệu sử dụng cho 1 sản phẩm
        const totalMaterialsPerProduct = configs.reduce((sum: number, config: any) => {
          return sum + (config['Số lượng quy đổi'] || config['Số lượng cần']);
        }, 0);

        // Tính số lượng sản phẩm đã bán
        const soldQuantity = orderDetailsData
          .filter((detail: any) => detail.IDSP === productId)
          .reduce((sum: number, detail: any) => sum + (parseInt(detail['Số lượng']) || 0), 0);

        // Tính tổng nguyên vật liệu tiêu thụ
        const totalMaterialsConsumed = soldQuantity * totalMaterialsPerProduct;

        // Xác định trạng thái dựa trên số lượng bán
        let status = 'Ít bán';
        if (soldQuantity > 100) {
          status = 'Bán chạy';
        } else if (soldQuantity > 50) {
          status = 'Bán tốt';
        } else if (soldQuantity > 10) {
          status = 'Bán trung bình';
        }

        stats.push({
          IDSP: productId,
          'Tên sản phẩm': product['Tên sản phẩm'] || 'Không xác định',
          'Tổng NVL sử dụng': totalMaterialsPerProduct,
          'Số lượng bán': soldQuantity,
          'Tổng NVL tiêu thụ': totalMaterialsConsumed,
          'Trạng thái': status
        });
      });

      // Sắp xếp theo số lượng bán giảm dần
      stats.sort((a, b) => b['Số lượng bán'] - a['Số lượng bán']);

      setInventoryStats(stats);
    } catch (error) {
      console.error('Lỗi khi tính toán thống kê cấu hình nguyên vật liệu:', error);
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