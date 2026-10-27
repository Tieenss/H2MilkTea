import { SupabaseClient } from '@supabase/supabase-js';
import bundledConfigs from '@/data/CAUHINH.json';
import bundledMaterials from '@/data/NGUYENLIEU.json';

export interface CartItemForBOM {
  id: string; // IDSP
  name?: string;
  quantity: number;
}

export interface ConsumedMaterial {
  IDNguyenLieu: string;
  TenNguyenLieu: string;
  SoLuong: number;
  DonViTinh: string;
  DonGia: number;
  ThanhTien: number;
}

export interface InventoryExportRecord {
  IDGiaoDich: string;
  LoaiGiaoDich: string;
  NgayGiaoDich: string;
  NhaCungCap: string;
  NhanVienThucHien: string;
  GhiChu: string;
  TongTien: number;
  TrangThai: string;
  ChiTiet: ConsumedMaterial[];
}

export interface BomDeductionResult {
  success: boolean;
  transactionId?: string;
  consumedMaterials: ConsumedMaterial[];
  error?: string;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Tính toán số lượng nguyên liệu tiêu thụ từ giỏ hàng dựa trên bảng định lượng CAUHINH.
 * Hàm thuần túy (Pure Function) phục vụ kiểm thử đơn vị và tái sử dụng linh hoạt.
 */
export function calculateBomDeductions(
  cart: CartItemForBOM[],
  recipes: Array<Record<string, any>>,
  materials: Array<Record<string, any>>
): ConsumedMaterial[] {
  if (!Array.isArray(cart) || cart.length === 0 || !Array.isArray(recipes) || recipes.length === 0) {
    return [];
  }

  // Tạo map tra cứu nhanh thông tin nguyên liệu
  const materialMap = new Map<string, Record<string, any>>();
  for (const m of materials) {
    const id = String(m.IDNguyenLieu || '').trim();
    if (id) {
      materialMap.set(id, m);
    }
  }

  // Bảng đếm tổng nguyên liệu tiêu thụ: Map<IDNguyenLieu, { name, unit, totalQty }>
  const consumptionMap = new Map<
    string,
    { name: string; unit: string; totalQty: number }
  >();

  for (const item of cart) {
    const productId = String(item.id || '').trim();
    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0 || !productId) continue;

    // Tìm các nguyên liệu cấu thành sản phẩm này
    const itemRecipes = recipes.filter(
      (r) =>
        String(r.IDSP || '').trim() === productId &&
        r['Trạng thái'] !== 'Tạm ngừng' &&
        r['Trạng thái'] !== 'Ngừng hoạt động'
    );

    for (const recipe of itemRecipes) {
      const materialId = String(recipe.IDNguyenLieu || '').trim();
      if (!materialId) continue;

      const perItemQty =
        Number(recipe['Số lượng quy đổi']) ||
        Number(recipe['Số lượng cần']) ||
        0;

      if (perItemQty <= 0) continue;

      const totalItemMaterial = perItemQty * quantity;
      const matInfo = materialMap.get(materialId);
      const matName =
        String(recipe['Tên nguyên liệu'] || '').trim() ||
        String(matInfo?.['Tên nguyên liệu'] || '').trim() ||
        materialId;
      const unit =
        String(recipe['Đơn vị sử dụng'] || '').trim() ||
        String(recipe['Đơn vị gốc'] || '').trim() ||
        String(matInfo?.['Đơn vị tính'] || '').trim() ||
        'Đơn vị';

      const existing = consumptionMap.get(materialId);
      if (existing) {
        existing.totalQty += totalItemMaterial;
      } else {
        consumptionMap.set(materialId, {
          name: matName,
          unit,
          totalQty: totalItemMaterial,
        });
      }
    }
  }

  // Chuyển kết quả sang danh sách chi tiết giao dịch kho
  const result: ConsumedMaterial[] = [];
  for (const [id, val] of consumptionMap.entries()) {
    result.push({
      IDNguyenLieu: id,
      TenNguyenLieu: val.name,
      // Làm tròn 4 chữ số thập phân cho đơn vị kg/lit
      SoLuong: Math.round(val.totalQty * 10000) / 10000,
      DonViTinh: val.unit,
      DonGia: 0,
      ThanhTien: 0,
    });
  }

  return result;
}

/**
 * Tự động tạo phiếu xuất kho nguyên liệu trong NHAPXUATKHO khi đơn hàng thanh toán thành công
 */
export async function recordInventoryExport(
  supabase: SupabaseClient | null,
  invoiceId: string,
  staffName: string,
  cart: CartItemForBOM[]
): Promise<BomDeductionResult> {
  try {
    let recipes: any[] = [];
    let materials: any[] = [];

    // Ưu tiên nạp định lượng mới nhất từ cơ sở dữ liệu Supabase
    if (supabase && typeof supabase.from === 'function') {
      const [recRes, matRes] = await Promise.all([
        supabase.from('CAUHINH').select('*'),
        supabase.from('NGUYENLIEU').select('*'),
      ]);

      if (recRes.data && recRes.data.length > 0) {
        recipes = recRes.data;
      }
      if (matRes.data && matRes.data.length > 0) {
        materials = matRes.data;
      }
    }

    // Fallback sang dữ liệu mẫu tĩnh nếu chưa kết nối hoặc bảng rỗng
    if (recipes.length === 0) {
      recipes = bundledConfigs as any[];
    }
    if (materials.length === 0) {
      materials = bundledMaterials as any[];
    }

    // Tính toán lượng nguyên liệu xuất kho
    const consumedMaterials = calculateBomDeductions(cart, recipes, materials);

    if (consumedMaterials.length === 0) {
      return {
        success: true,
        consumedMaterials: [],
      };
    }

    const transactionId = `XK_${invoiceId}`;
    const transactionRecord: InventoryExportRecord = {
      IDGiaoDich: transactionId,
      LoaiGiaoDich: 'Xuất kho',
      NgayGiaoDich: formatDate(new Date()),
      NhaCungCap: '',
      NhanVienThucHien: staffName || 'POS Tự động',
      GhiChu: `Xuất kho tự động từ hóa đơn ${invoiceId}`,
      TongTien: 0,
      TrangThai: 'Hoàn thành',
      ChiTiet: consumedMaterials,
    };

    // Lưu vào bảng NHAPXUATKHO nếu có kết nối Supabase
    if (supabase && typeof supabase.from === 'function') {
      const { error } = await supabase
        .from('NHAPXUATKHO')
        .upsert(transactionRecord, { onConflict: 'IDGiaoDich' });

      if (error) {
        console.warn('Lỗi ghi phiếu xuất kho tự động:', error.message);
        return {
          success: false,
          transactionId,
          consumedMaterials,
          error: error.message,
        };
      }
    }

    return {
      success: true,
      transactionId,
      consumedMaterials,
    };
  } catch (err: any) {
    console.error('Ngoại lệ khi thực hiện trừ kho BOM:', err);
    return {
      success: false,
      consumedMaterials: [],
      error: err.message,
    };
  }
}
