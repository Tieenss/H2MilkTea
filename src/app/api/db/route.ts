import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface TableSchema {
  pk: string;
  columns: string[];
  numericCols: string[];
}

const SCHEMAS: Record<string, TableSchema> = {
  HOADON: {
    pk: 'IDHOADON',
    columns: [
      '_RowNumber', 'IDHOADON', 'IDBAN', 'Nhân viên', 'Khách hàng', 'Ngày',
      'Tổng tiền', 'VAT', 'Giảm giá', 'Khách trả', 'Tiền thừa',
      'Ghi chú', 'Trạng thái', 'Trạng thái sự dụng bàn', 'Loại thanh toán', 'Hóa đơn chi tiết'
    ],
    numericCols: ['Tổng tiền', 'VAT', 'Giảm giá', 'Khách trả', 'Tiền thừa']
  },
  HOADONDETAIL: {
    pk: 'IDHOADONDETAIL',
    columns: [
      '_RowNumber', 'IDHOADONDETAIL', 'IDHOADON', 'IDSP', 'Tên sản phẩm',
      'Đơn vị tính', 'Đơn giá', 'Số lượng', 'Thành tiền', 'Ghi chú'
    ],
    numericCols: ['Đơn giá', 'Số lượng', 'Thành tiền']
  },
  KHACHHANG: {
    pk: 'IDKHACHHANG',
    columns: [
      '_RowNumber', 'IDKHACHHANG', 'Tên khách hàng', 'Số điện thoại', 'Email',
      'Địa chỉ', 'Ngày sinh', 'Giới tính', 'Loại khách hàng', 'Điểm tích lũy',
      'Tổng chi tiêu', 'Lần mua cuối', 'Ghi chú', 'Trạng thái', 'Ngày tạo',
      'Ngày cập nhật', 'Hóa đơn liên quan', 'Ưu đãi hiện tại'
    ],
    numericCols: ['Điểm tích lũy', 'Tổng chi tiêu']
  },
  NGUYENLIEU: {
    pk: 'IDNguyenLieu',
    columns: [
      '_RowNumber', 'IDNguyenLieu', 'Tên nguyên liệu', 'Đơn vị tính', 'Ghi chú',
      'Số lượng cảnh báo', 'Đơn vị cơ sở', 'Hệ số quy đổi'
    ],
    numericCols: ['Số lượng cảnh báo', 'Hệ số quy đổi']
  },
  CAUHINH: {
    pk: 'IDCauHinh',
    columns: [
      '_RowNumber', 'IDCauHinh', 'IDSP', 'IDNguyenLieu', 'Tên sản phẩm',
      'Tên nguyên liệu', 'Số lượng cần', 'Đơn vị sử dụng', 'Đơn vị gốc',
      'Hệ số quy đổi', 'Số lượng quy đổi', 'Ghi chú', 'Trạng thái',
      'Ngày tạo', 'Ngày cập nhật', 'Loại cấu hình'
    ],
    numericCols: ['Số lượng cần', 'Hệ số quy đổi', 'Số lượng quy đổi']
  },
  DSNV: {
    pk: 'username',
    columns: [
      '_RowNumber', 'username', 'password', 'Họ và Tên', 'Chức vụ', 'Phòng',
      'Phân quyền', 'Email', 'Image', 'Quyền View', 'Số điện thoại', 'Địa chỉ',
      'Ngày sinh', 'Ngày vào làm', 'Ghi chú'
    ],
    numericCols: []
  },
  DSBAN: {
    pk: 'IDBAN',
    columns: [
      '_RowNumber', 'IDBAN', 'Tên bàn', 'Sức chứa tối đa', 'Trạng thái', 'Lịch sử  bàn'
    ],
    numericCols: ['Sức chứa tối đa']
  },
  DMHH: {
    pk: 'IDSP',
    columns: [
      '_RowNumber', 'IDSP', 'Tên sản phẩm', 'Hình ảnh', 'Loại sản phẩm',
      'Đơn vị tính', 'Giá vốn', 'Đơn giá', 'Mô tả', 'Trạng thái', 'Lịch sử bán'
    ],
    numericCols: ['Giá vốn', 'Đơn giá']
  },
  NHAPXUATKHO: {
    pk: 'IDGiaoDich',
    columns: [
      'IDGiaoDich', 'LoaiGiaoDich', 'NgayGiaoDich', 'NhaCungCap', 'NhanVienThucHien',
      'GhiChu', 'TongTien', 'TrangThai', 'ChiTiet'
    ],
    numericCols: ['TongTien']
  },
  KIEMKEKHO: {
    pk: 'IDKiemKe',
    columns: [
      'IDKiemKe', 'NgayKiemKe', 'LoaiKiemKe', 'NhanVienThucHien', 'TrangThai',
      'GhiChu', 'TongMatHang', 'TongGiaTri', 'ChiTiet'
    ],
    numericCols: ['TongMatHang', 'TongGiaTri']
  },
  NHACUNGCAP: {
    pk: 'IDNhaCungCap',
    columns: [
      'IDNhaCungCap', 'TenNhaCungCap', 'MaSoThue', 'DiaChi', 'SoDienThoai', 'Email',
      'NguoiDaiDien', 'SoDienThoaiLienHe', 'EmailLienHe', 'NgayHopTac', 'TrangThai',
      'GhiChu', 'DanhGia', 'ThoiGianGiaoHang', 'PhuongThucThanhToan', 'LichSuDatHang'
    ],
    numericCols: ['DanhGia']
  }
};

function sanitizePayload(tableName: string, record: any): Record<string, any> {
  const schema = SCHEMAS[tableName];
  if (!schema) return record;

  const sanitized: Record<string, any> = {};
  for (const col of schema.columns) {
    if (record[col] !== undefined) {
      if (schema.numericCols.includes(col)) {
        sanitized[col] = record[col] === null || record[col] === '' ? 0 : Number(record[col]) || 0;
      } else {
        sanitized[col] = record[col];
      }
    }
  }

  // Ensure PK is preserved
  if (record[schema.pk]) {
    sanitized[schema.pk] = String(record[schema.pk]);
  }

  // Fix table-specific discrepancies
  if (tableName === 'HOADON') {
    sanitized.IDBAN = sanitized.IDBAN || record['Bàn'] || 'BAN001';
    sanitized['Trạng thái sự dụng bàn'] = sanitized['Trạng thái sự dụng bàn'] || record['Trạng thái sử dụng bàn'] || 'Đã trả bàn';
  }

  return sanitized;
}

// GET: Lấy danh sách toàn bộ bản ghi của một bảng từ Supabase Cloud
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');

    if (!table || !SCHEMAS[table]) {
      return NextResponse.json({ success: false, error: 'Tên bảng không hợp lệ hoặc không được phép' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Supabase Admin' }, { status: 503 });
    }

    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('API /api/db GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Thực hiện create, update, delete đồng bộ xuống Supabase Cloud
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, action, data } = body;

    if (!table || !SCHEMAS[table]) {
      return NextResponse.json({ success: false, error: 'Tên bảng không hợp lệ' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Supabase Admin' }, { status: 503 });
    }

    const schema = SCHEMAS[table];
    const pk = schema.pk;
    const act = String(action || '').toLowerCase();

    if (['create', 'add', 'insert'].includes(act)) {
      const cleanData = sanitizePayload(table, data);
      const { data: resData, error } = await supabase.from(table).insert([cleanData]).select();
      if (error) {
        console.warn(`Supabase ${table} insert warning:`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: resData });
    }

    if (['update', 'edit', 'modify'].includes(act)) {
      const cleanData = sanitizePayload(table, data);
      const targetId = data[pk] || data.id || (table === 'HOADON' ? data.IDHD : undefined) || (table === 'KHACHHANG' ? (data.IDKH || data.IDKHACHHANG) : undefined);
      
      if (!targetId) {
        return NextResponse.json({ success: false, error: 'Thiếu ID để cập nhật' }, { status: 400 });
      }

      const { data: resData, error } = await supabase.from(table).update(cleanData).eq(pk, targetId).select();
      if (error) {
        console.warn(`Supabase ${table} update warning:`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: resData });
    }

    if (['delete', 'remove'].includes(act)) {
      const targetId = data[pk] || data.id || (table === 'HOADON' ? data.IDHD : undefined) || (table === 'KHACHHANG' ? (data.IDKH || data.IDKHACHHANG) : undefined);
      
      if (!targetId) {
        return NextResponse.json({ success: false, error: 'Thiếu ID để xóa' }, { status: 400 });
      }

      // Cascade delete chi tiết nếu xóa hóa đơn
      if (table === 'HOADON') {
        await supabase.from('HOADONDETAIL').delete().eq('IDHOADON', targetId);
      }

      // Xóa giỏ hàng nháp nếu xóa bàn
      if (table === 'DSBAN') {
        await supabase.from('pos_cart_drafts').delete().eq('table_id', targetId);
      }

      const { error } = await supabase.from(table).delete().eq(pk, targetId);
      if (error) {
        console.warn(`Supabase ${table} delete warning:`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: `Action ${action} không hỗ trợ` }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/db POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
