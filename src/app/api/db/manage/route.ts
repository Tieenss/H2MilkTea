import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAuthenticatedStaff, getStaffRole } from '@/lib/supabase/server';

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
      '_RowNumber', 'IDBAN', 'Tên bàn', 'Sức chứa tối đa', 'Trạng thái', 'Lịch sử  bàn', 'Khu vực'
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

const AUX_PK_MAP: Record<string, string> = {
  pos_orders: 'id',
  pos_cart_drafts: 'table_id',
  ai_audit_logs: 'id',
};

function sanitizeRecordForTable(tableName: string, record: any): Record<string, any> {
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

  if (record[schema.pk]) {
    sanitized[schema.pk] = String(record[schema.pk]);
  }

  if (tableName === 'HOADON') {
    sanitized.IDBAN = sanitized.IDBAN || record['Bàn'] || 'Khách mua về';
    sanitized['Trạng thái sự dụng bàn'] =
      sanitized['Trạng thái sự dụng bàn'] || record['Trạng thái sử dụng bàn'] || 'Đã rời bàn';
  }

  return sanitized;
}

async function clearSupabaseTable(supabase: any, tableName: string, preserveValues?: string[]) {
  const pk = SCHEMAS[tableName]?.pk || AUX_PK_MAP[tableName] || 'id';
  try {
    let query = supabase.from(tableName).delete().not(pk, 'is', null);
    if (preserveValues && preserveValues.length > 0) {
      for (const val of preserveValues) {
        query = query.neq(pk, val);
      }
    }
    const { error } = await query;
    if (error) {
      // Fallback: lấy danh sách PK rồi xóa theo .in()
      const { data: rows } = await supabase.from(tableName).select(pk);
      if (Array.isArray(rows) && rows.length > 0) {
        const ids = rows
          .map((r: any) => r[pk])
          .filter((id: any) => id !== undefined && id !== null && (!preserveValues || !preserveValues.includes(String(id))));
        if (ids.length > 0) {
          const { error: batchErr } = await supabase.from(tableName).delete().in(pk, ids);
          if (batchErr) {
            return { success: false, error: batchErr.message };
          }
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || `Lỗi xóa bảng ${tableName}` };
  }
}

async function upsertRowsWithColumnFallback(supabase: any, tableName: string, rows: any[]) {
  const schema = SCHEMAS[tableName];
  if (!schema || !Array.isArray(rows) || rows.length === 0) {
    return { success: true, count: 0 };
  }

  let payloads = rows
    .map((r) => sanitizeRecordForTable(tableName, r))
    .filter((r) => Boolean(r[schema.pk]));

  // Khử trùng lặp theo primary key trong cùng batch để tránh lỗi PostgreSQL ON CONFLICT DO UPDATE command cannot affect row a second time
  const uniqueMap = new Map<string, any>();
  for (const item of payloads) {
    uniqueMap.set(String(item[schema.pk]), item);
  }
  payloads = Array.from(uniqueMap.values());

  if (payloads.length === 0) return { success: true, count: 0 };

  let lastError: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from(tableName).upsert(payloads, { onConflict: schema.pk });
    if (!error) {
      return { success: true, count: payloads.length };
    }
    lastError = error;

    const colMatch = error.message?.match(/Could not find the '([^']+)' column/i);
    if (colMatch && colMatch[1]) {
      const missingCol = colMatch[1];
      payloads = payloads.map((p) => {
        const copy = { ...p };
        delete copy[missingCol];
        return copy;
      });
      continue;
    }
    if (error.message?.includes('Khu vực')) {
      payloads = payloads.map((p) => {
        const copy = { ...p };
        delete copy['Khu vực'];
        return copy;
      });
      continue;
    }
    break;
  }

  return { success: false, count: 0, error: lastError?.message || `Lỗi ghi bảng ${tableName}` };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Supabase Admin' }, { status: 503 });
    }

    // Kiểm tra xác thực Admin / Quản lý (hoặc Root Admin Fallback khi DB vừa bị xóa trắng DSNV)
    const cookieHeader = request.headers.get('cookie') || '';
    const staff = await getAuthenticatedStaff(cookieHeader);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Bạn cần đăng nhập để thực hiện thao tác quản trị dữ liệu.' }, { status: 401 });
    }

    const staffRole = await getStaffRole(supabase, staff);
    const roleLower = String(staffRole.role || '').toLowerCase().trim();
    const isRootFallbackAdmin = String(staff.username || '').toLowerCase() === 'admin';
    const canManageData =
      staffRole.isAdmin ||
      isRootFallbackAdmin ||
      ['admin', 'quản trị viên', 'giám đốc', 'quản lý', 'quan ly', 'manager'].includes(roleLower);

    if (!canManageData) {
      return NextResponse.json(
        { success: false, error: 'Chỉ Quản trị viên (Admin) hoặc Quản lý mới có quyền thao tác cài đặt dữ liệu hệ thống.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body.action || '').trim().toLowerCase();

    // ============================================================================
    // 1. SELECTIVE CLEAR: Xóa dữ liệu tùy chọn theo các mục người dùng tick chọn
    // ============================================================================
    if (action === 'selective_clear') {
      const tablesToClear: string[] = Array.isArray(body.tables) ? body.tables : [];
      const options = body.options || {};
      const resetTableStatus = Boolean(options.resetTableStatus);
      const resetMaterialStock = Boolean(options.resetMaterialStock);
      const clearPrintQueue = Boolean(options.clearPrintQueue);

      const clearedSummary: Record<string, string> = {};
      const errors: string[] = [];

      // Sắp xếp thứ tự xóa an toàn (bảng con xóa trước, bảng cha xóa sau)
      const orderedTables = [
        'HOADONDETAIL',
        'HOADON',
        'pos_cart_drafts',
        'pos_orders',
        'CAUHINH',
        'NHAPXUATKHO',
        'KIEMKEKHO',
        'DMHH',
        'NGUYENLIEU',
        'NHACUNGCAP',
        'KHACHHANG',
        'DSBAN',
        'ai_audit_logs',
        'DSNV',
      ].filter((t) => tablesToClear.includes(t));

      for (const table of orderedTables) {
        if (table === 'DSNV') {
          // Luôn bảo vệ tài khoản admin đang đăng nhập và tài khoản 'admin' gốc
          const preserveUsers = Array.from(new Set(['admin', String(staff.username || 'admin').trim()])).filter(Boolean);
          const res = await clearSupabaseTable(supabase, 'DSNV', preserveUsers);
          if (res.success) {
            clearedSummary['DSNV'] = `Đã xóa nhân viên (giữ lại tài khoản quản trị: ${preserveUsers.join(', ')})`;
          } else if (res.error) {
            errors.push(`DSNV: ${res.error}`);
          }
          continue;
        }

        if (table === 'DSBAN') {
          // Xóa giỏ hàng nháp trước khi xóa bàn
          await clearSupabaseTable(supabase, 'pos_cart_drafts');
          const res = await clearSupabaseTable(supabase, 'DSBAN');
          if (res.success) {
            // Luôn khởi tạo lại 1 bản ghi "Khách mua về" chuẩn để POS bán mang về không bị lỗi
            await upsertRowsWithColumnFallback(supabase, 'DSBAN', [
              {
                _RowNumber: '2',
                IDBAN: 'Khách mua về',
                'Tên bàn': 'Khách mua về',
                'Sức chứa tối đa': 1,
                'Trạng thái': 'Đang hoạt động',
                'Lịch sử  bàn': '',
              },
            ]);
            clearedSummary['DSBAN'] = 'Đã xóa danh sách bàn (giữ bàn mặc định "Khách mua về")';
          } else if (res.error) {
            errors.push(`DSBAN: ${res.error}`);
          }
          continue;
        }

        const res = await clearSupabaseTable(supabase, table);
        if (res.success) {
          clearedSummary[table] = 'Đã xóa sạch dữ liệu';
        } else if (res.error) {
          // Bỏ qua lỗi nếu bảng phụ chưa tạo trên DB
          if (!['pos_orders', 'pos_cart_drafts', 'ai_audit_logs'].includes(table)) {
            errors.push(`${table}: ${res.error}`);
          }
        }
      }

      // Tùy chọn phụ 1: Nếu không xóa bàn nhưng chọn Reset trạng thái bàn về "Trống" (hoặc khi xóa hóa đơn/đơn POS)
      if (!tablesToClear.includes('DSBAN') && (resetTableStatus || tablesToClear.includes('HOADON') || tablesToClear.includes('pos_orders'))) {
        try {
          await clearSupabaseTable(supabase, 'pos_cart_drafts');
          const { data: allTables } = await supabase.from('DSBAN').select('*');
          if (Array.isArray(allTables) && allTables.length > 0) {
            const resetRows = allTables.map((t: any) => ({
              ...t,
              'Trạng thái': t.IDBAN === 'Khách mua về' ? 'Đang hoạt động' : 'Trống',
              'Lịch sử  bàn': '',
            }));
            await upsertRowsWithColumnFallback(supabase, 'DSBAN', resetRows);
            clearedSummary['DSBAN_RESET'] = 'Đã đặt lại tất cả bàn về trạng thái "Trống"';
          }
        } catch (err: any) {
          console.warn('Reset table status warning:', err?.message);
        }
      }

      // Tùy chọn phụ 2: Giữ danh mục Nguyên liệu nhưng Reset ghi chú/tồn kho hoặc làm sạch lịch sử kho
      if (!tablesToClear.includes('NGUYENLIEU') && resetMaterialStock) {
        try {
          await clearSupabaseTable(supabase, 'NHAPXUATKHO');
          await clearSupabaseTable(supabase, 'KIEMKEKHO');
          clearedSummary['NGUYENLIEU_RESET'] = 'Đã giữ danh mục nguyên liệu và đưa tồn kho giao dịch về 0';
        } catch (err: any) {
          console.warn('Reset material stock warning:', err?.message);
        }
      }

      // Tùy chọn phụ 3: Xóa hàng đợi lệnh in từ xa trong app_settings
      if (clearPrintQueue || tablesToClear.includes('HOADON') || tablesToClear.includes('pos_orders')) {
        try {
          await supabase.from('app_settings').delete().eq('key', 'remote_print_queue');
        } catch {
          // Ignore
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        message:
          errors.length === 0
            ? 'Đã dọn dẹp dữ liệu trên Supabase Cloud thành công!'
            : `Đã dọn dẹp dữ liệu nhưng có một số cảnh báo: ${errors.join('; ')}`,
        summary: clearedSummary,
        errors,
      });
    }

    // ============================================================================
    // 2. SYNC TABLES: Ghi đè hoặc Upsert dữ liệu chuẩn lên Supabase Cloud
    //    (Dùng cho Import JSON/Excel/CSV, Seed 60 ngày, Reset Demo Data)
    // ============================================================================
    if (action === 'sync_tables') {
      const tablesData: Record<string, any[]> = body.tablesData || {};
      const replaceExisting = body.replaceExisting !== false; // Mặc định xóa dữ liệu cũ của bảng đó trước khi nạp mới
      const syncSummary: Record<string, { count: number; error?: string }> = {};

      // Nếu xóa trước, xóa bảng con trước
      const targetTableNames = Object.keys(tablesData).filter((t) => Boolean(SCHEMAS[t]));
      if (replaceExisting) {
        const deleteOrder = [
          'HOADONDETAIL',
          'HOADON',
          'CAUHINH',
          'NHAPXUATKHO',
          'KIEMKEKHO',
          'DMHH',
          'NGUYENLIEU',
          'NHACUNGCAP',
          'KHACHHANG',
          'DSBAN',
        ].filter((t) => targetTableNames.includes(t));

        for (const t of deleteOrder) {
          await clearSupabaseTable(supabase, t);
        }
      }

      // Nạp bảng cha trước, bảng con sau
      const insertOrder = [
        'DSNV',
        'DSBAN',
        'DMHH',
        'NGUYENLIEU',
        'CAUHINH',
        'KHACHHANG',
        'NHACUNGCAP',
        'NHAPXUATKHO',
        'KIEMKEKHO',
        'HOADON',
        'HOADONDETAIL',
      ].filter((t) => targetTableNames.includes(t));

      for (const table of insertOrder) {
        let rows = Array.isArray(tablesData[table]) ? tablesData[table] : [];

        // Nếu là bảng DSNV và password bị trống, lấy password hiện có trên DB để không làm mất mật khẩu đăng nhập
        if (table === 'DSNV' && rows.length > 0) {
          const { data: existingUsers } = await supabase.from('DSNV').select('username, password');
          const passMap = new Map<string, string>();
          if (Array.isArray(existingUsers)) {
            existingUsers.forEach((u: any) => {
              if (u.username && u.password) passMap.set(String(u.username).toLowerCase(), u.password);
            });
          }
          rows = rows.map((r: any) => {
            const uname = String(r.username || '').trim();
            const existingPass = passMap.get(uname.toLowerCase());
            return {
              ...r,
              password: r.password || existingPass || '123456',
            };
          });
        }

        const res = await upsertRowsWithColumnFallback(supabase, table, rows);
        syncSummary[table] = {
          count: res.count,
          ...(res.error ? { error: res.error } : {}),
        };
      }

      const hasErrors = Object.values(syncSummary).some((s) => Boolean(s.error));
      return NextResponse.json({
        success: !hasErrors,
        message: hasErrors
          ? 'Đã đồng bộ dữ liệu lên Cloud với một số cảnh báo.'
          : 'Đã đồng bộ toàn bộ dữ liệu lên Supabase Cloud thành công!',
        summary: syncSummary,
      });
    }

    // ============================================================================
    // 3. AUTO FIX HEALTH: Tự động sửa lỗi dữ liệu mồ côi & bàn bị kẹt trạng thái
    // ============================================================================
    if (action === 'auto_fix_health') {
      const fixes: string[] = [];

      // 3.1. Giải phóng bàn bị kẹt "Đang sử dụng" nhưng không có giỏ hàng nháp hoặc đơn đang mở
      const [{ data: tables }, { data: drafts }, { data: activeOrders }] = await Promise.all([
        supabase.from('DSBAN').select('*'),
        supabase.from('pos_cart_drafts').select('table_id, cart_items'),
        supabase.from('pos_orders').select('table_id, status').in('status', ['PENDING', 'CONFIRMED', 'PREPARING']),
      ]);

      const busyTableIds = new Set<string>();
      if (Array.isArray(drafts)) {
        drafts.forEach((d: any) => {
          if (d.table_id && Array.isArray(d.cart_items) && d.cart_items.length > 0) {
            busyTableIds.add(String(d.table_id));
          }
        });
      }
      if (Array.isArray(activeOrders)) {
        activeOrders.forEach((o: any) => {
          if (o.table_id) busyTableIds.add(String(o.table_id));
        });
      }

      if (Array.isArray(tables)) {
        const stuckTables = tables.filter(
          (t: any) =>
            t.IDBAN !== 'Khách mua về' &&
            t['Trạng thái'] === 'Đang sử dụng' &&
            !busyTableIds.has(String(t.IDBAN))
        );
        if (stuckTables.length > 0) {
          const fixedRows = stuckTables.map((t: any) => ({ ...t, 'Trạng thái': 'Trống' }));
          await upsertRowsWithColumnFallback(supabase, 'DSBAN', fixedRows);
          fixes.push(`Đã giải phóng ${stuckTables.length} bàn bị kẹt trạng thái "Đang sử dụng" về "Trống"`);
        }
      }

      // 3.2. Xóa các dòng CAUHINH (BOM) mồ côi trỏ tới IDSP hoặc IDNguyenLieu không tồn tại
      const [{ data: products }, { data: materials }, { data: configs }] = await Promise.all([
        supabase.from('DMHH').select('IDSP'),
        supabase.from('NGUYENLIEU').select('IDNguyenLieu'),
        supabase.from('CAUHINH').select('IDCauHinh, IDSP, IDNguyenLieu'),
      ]);

      if (Array.isArray(products) && Array.isArray(materials) && Array.isArray(configs)) {
        const validSp = new Set(products.map((p: any) => String(p.IDSP)));
        const validNvl = new Set(materials.map((m: any) => String(m.IDNguyenLieu)));
        const orphanCfgIds = configs
          .filter((c: any) => !validSp.has(String(c.IDSP)) || !validNvl.has(String(c.IDNguyenLieu)))
          .map((c: any) => c.IDCauHinh)
          .filter(Boolean);

        if (orphanCfgIds.length > 0) {
          await supabase.from('CAUHINH').delete().in('IDCauHinh', orphanCfgIds);
          fixes.push(`Đã dọn dẹp ${orphanCfgIds.length} cấu hình định mức BOM mồ côi`);
        }
      }

      // 3.3. Xóa các dòng HOADONDETAIL mồ côi không có hóa đơn cha trong HOADON
      const [{ data: invoices }, { data: invoiceDetails }] = await Promise.all([
        supabase.from('HOADON').select('IDHOADON'),
        supabase.from('HOADONDETAIL').select('IDHOADONDETAIL, IDHOADON'),
      ]);

      if (Array.isArray(invoices) && Array.isArray(invoiceDetails)) {
        const validInv = new Set(invoices.map((h: any) => String(h.IDHOADON)));
        const orphanDetailIds = invoiceDetails
          .filter((d: any) => !validInv.has(String(d.IDHOADON)))
          .map((d: any) => d.IDHOADONDETAIL)
          .filter(Boolean);

        if (orphanDetailIds.length > 0) {
          await supabase.from('HOADONDETAIL').delete().in('IDHOADONDETAIL', orphanDetailIds);
          fixes.push(`Đã xóa ${orphanDetailIds.length} chi tiết hóa đơn mồ côi`);
        }
      }

      return NextResponse.json({
        success: true,
        message: fixes.length > 0 ? fixes.join('. ') + '!' : 'Hệ thống dữ liệu đã sạch và đồng bộ, không phát hiện lỗi cần sửa!',
        fixes,
      });
    }

    return NextResponse.json({ success: false, error: `Action "${action}" không được hỗ trợ` }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/db/manage POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
