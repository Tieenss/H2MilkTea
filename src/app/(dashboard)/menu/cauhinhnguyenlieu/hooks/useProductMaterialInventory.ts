import { useState, useEffect, useCallback } from 'react';
import authUtils from '@/utils/authUtils';

export interface ProductMaterialInventoryStats {
  IDSP: string;
  'Tên sản phẩm': string;
  'Tổng NVL sử dụng': number;
  'Số lượng bán': number;
  'Tổng NVL tiêu thụ': number;
  'Giá vốn ước tính': number;
  'Đơn giá bán'?: number;
  'Trạng thái': string;
}

/**
 * Hỗ trợ đọc số thực có cả dấu '.' và ',' (ví dụ "0,01" hoặc "0.01" hoặc "1.500,25")
 */
export const parseDecimal = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val === null || val === undefined) return 0;

  let str = String(val).trim().replace(/\s+/g, '');
  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(/,/g, '.');
  }

  const parsed = parseFloat(str);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const useProductMaterialInventory = () => {
  const [inventoryStats, setInventoryStats] = useState<ProductMaterialInventoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateInventoryStats = useCallback(async () => {
    try {
      setLoading(true);

      // Đọc trực tiếp từ Database qua authUtils.apiRequest (không đọc file tĩnh /data/*.json)
      const [configsRes, orderDetailsRes, productsRes, materialsRes, transactionsRes] = await Promise.all([
        authUtils.apiRequest('CAUHINH', 'getall', {}),
        authUtils.apiRequest('HOADONDETAIL', 'getall', {}),
        authUtils.apiRequest('DMHH', 'getall', {}),
        authUtils.apiRequest('NGUYENLIEU', 'getall', {}),
        authUtils.apiRequest('NHAPXUATKHO', 'getall', {}).catch(() => [])
      ]);

      const productMaterialsData = Array.isArray(configsRes) ? configsRes : [];
      const orderDetailsData = Array.isArray(orderDetailsRes) ? orderDetailsRes : [];
      const productsData = Array.isArray(productsRes) ? productsRes : [];
      const materialsData = Array.isArray(materialsRes) ? materialsRes : [];
      const transactionsData = Array.isArray(transactionsRes) ? transactionsRes : [];

      // Map nguyên liệu theo IDNguyenLieu
      const materialMap = new Map<string, any>();
      materialsData.forEach((material: any) => {
        if (material?.IDNguyenLieu) {
          materialMap.set(String(material.IDNguyenLieu), material);
        }
      });

      // Tính giá nhập bình quân theo nguyên liệu từ lịch sử Nhập kho (NHAPXUATKHO)
      const importPriceAgg = new Map<string, { totalValue: number; totalQty: number }>();
      transactionsData.forEach((tx: any) => {
        if (tx?.LoaiGiaoDich !== 'Nhập kho') return;
        const details = Array.isArray(tx.ChiTiet) ? tx.ChiTiet : [];
        details.forEach((detail: any) => {
          const matId = String(detail?.IDNguyenLieu || '').trim();
          const qty = parseDecimal(detail?.SoLuong);
          const unitPrice = parseDecimal(detail?.DonGia);
          const lineValue = parseDecimal(detail?.ThanhTien) || qty * unitPrice;
          if (!matId || qty <= 0 || lineValue <= 0) return;

          const current = importPriceAgg.get(matId) || { totalValue: 0, totalQty: 0 };
          current.totalValue += lineValue;
          current.totalQty += qty;
          importPriceAgg.set(matId, current);
        });
      });

      const getMaterialImportPrice = (materialId: string): number => {
        const material = materialMap.get(materialId);
        const directPrice =
          parseDecimal(material?.['Giá nhập']) ||
          parseDecimal(material?.['Đơn giá']) ||
          parseDecimal(material?.['Giá vốn']) ||
          parseDecimal(material?.DonGia);
        if (directPrice > 0) return directPrice;

        const agg = importPriceAgg.get(materialId);
        if (agg && agg.totalQty > 0) {
          return agg.totalValue / agg.totalQty;
        }
        return 0;
      };

      const stats: ProductMaterialInventoryStats[] = [];

      // Nhóm cấu hình theo sản phẩm
      const productConfigs = productMaterialsData.reduce((acc: Record<string, any[]>, config: any) => {
        if (!config?.IDSP) return acc;
        if (!acc[config.IDSP]) {
          acc[config.IDSP] = [];
        }
        acc[config.IDSP].push(config);
        return acc;
      }, {});

      // Tính tổng số lượng đã bán theo sản phẩm trước để tối ưu O(N)
      const soldByProductMap = new Map<string, number>();
      orderDetailsData.forEach((detail: any) => {
        const productId = String(detail?.IDSP || '');
        if (!productId) return;
        const qty = parseDecimal(detail['Số lượng']);
        soldByProductMap.set(productId, (soldByProductMap.get(productId) || 0) + qty);
      });

      // Tính toán cho từng sản phẩm
      Object.keys(productConfigs).forEach((productId) => {
        const configs = productConfigs[productId];
        const product = productsData.find((p: any) => p.IDSP === productId);
        if (!product) return;

        const activeConfigs = configs.filter(
          (c: any) => !c['Trạng thái'] || c['Trạng thái'] === 'Hoạt động'
        );
        const effectiveConfigs = activeConfigs.length > 0 ? activeConfigs : configs;

        // Tính tổng số lượng nguyên vật liệu sử dụng cho 1 sản phẩm
        const totalMaterialsPerProductRaw = effectiveConfigs.reduce((sum: number, config: any) => {
          const converted = parseDecimal(config['Số lượng quy đổi']);
          const needed = parseDecimal(config['Số lượng cần']);
          return sum + (converted > 0 ? converted : needed);
        }, 0);
        const totalMaterialsPerProduct = Math.round(totalMaterialsPerProductRaw * 10000) / 10000;

        // Tính số lượng sản phẩm đã bán
        const soldQuantity = soldByProductMap.get(productId) || 0;

        // Tính tổng nguyên vật liệu tiêu thụ
        const totalMaterialsConsumed =
          Math.round(soldQuantity * totalMaterialsPerProduct * 10000) / 10000;

        // Tính giá vốn ước tính (COGS) dựa trên định lượng BOM × giá nhập nguyên liệu
        const productBaseCost = parseDecimal(product['Giá vốn']);
        const bomCogs = effectiveConfigs.reduce((sum: number, config: any) => {
          const isSelfConfig = config.IDSP === config.IDNguyenLieu;
          const qtyNeeded = parseDecimal(config['Số lượng cần']) || 0;
          if (isSelfConfig) {
            return sum + (qtyNeeded > 0 ? qtyNeeded : 1) * productBaseCost;
          }

          const materialId = String(config.IDNguyenLieu || '');
          const material = materialMap.get(materialId);
          const importPrice = getMaterialImportPrice(materialId);
          if (importPrice <= 0) return sum;

          const conversionRatio = parseDecimal(material?.['Hệ số quy đổi']) || 1;
          const usedUnit = String(config['Đơn vị sử dụng'] || '').trim().toLowerCase();
          const baseUnit = String(material?.['Đơn vị cơ sở'] || '').trim().toLowerCase();
          const mainUnit = String(material?.['Đơn vị tính'] || '').trim().toLowerCase();

          // Nếu định lượng trong BOM đang ghi theo đơn vị cơ sở (Gram/Ml) còn giá nhập theo đơn vị lớn (Kg/Hộp)
          const unitQty =
            usedUnit && baseUnit && usedUnit === baseUnit && usedUnit !== mainUnit && conversionRatio > 1
              ? qtyNeeded / conversionRatio
              : qtyNeeded;

          return sum + unitQty * importPrice;
        }, 0);

        const estimatedCogs = Math.round(bomCogs > 0 ? bomCogs : productBaseCost);

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
          'Giá vốn ước tính': estimatedCogs,
          'Đơn giá bán': parseDecimal(product['Đơn giá']),
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
