const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Schema specifications for each table in Supabase
const SCHEMAS = {
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

function sanitizeRecord(tableName, record) {
  const schema = SCHEMAS[tableName];
  if (!schema) return record;

  const sanitized = {};
  for (const col of schema.columns) {
    if (record[col] !== undefined) {
      if (schema.numericCols.includes(col)) {
        sanitized[col] = record[col] === null || record[col] === '' ? 0 : Number(record[col]) || 0;
      } else {
        sanitized[col] = record[col];
      }
    } else {
      // Default values for required/common fields
      if (schema.numericCols.includes(col)) {
        sanitized[col] = 0;
      }
    }
  }

  // Ensure PK is present
  if (record[schema.pk]) {
    sanitized[schema.pk] = String(record[schema.pk]);
  }

  // Table-specific fixes
  if (tableName === 'HOADON') {
    sanitized.IDBAN = sanitized.IDBAN || record['Bàn'] || 'BAN001';
    sanitized['Trạng thái sự dụng bàn'] = sanitized['Trạng thái sự dụng bàn'] || record['Trạng thái sử dụng bàn'] || 'Đã trả bàn';
  }

  return sanitized;
}

async function seedAll() {
  console.log('🚀 Starting Cloud Database Sync / Seed...');

  for (const [tableName, schema] of Object.entries(SCHEMAS)) {
    const jsonPath = path.join(__dirname, `../../src/data/${tableName}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.log(`⚠️ File src/data/${tableName}.json not found, skipping.`);
      continue;
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.log(`ℹ️ No records in ${tableName}.json.`);
      continue;
    }

    // Check existing count in Supabase
    const { count, error: countErr } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    if (countErr) {
      console.error(`❌ Error querying ${tableName}:`, countErr.message);
      continue;
    }

    if (count > 0) {
      console.log(`⏩ Table [${tableName}] already has ${count} records on Supabase. Keeping existing cloud data.`);
      continue;
    }

    console.log(`📤 Seeding ${rawData.length} records into table [${tableName}]...`);
    const cleanRecords = rawData.map(r => sanitizeRecord(tableName, r));

    // Batch insert
    const batchSize = 50;
    let inserted = 0;
    for (let i = 0; i < cleanRecords.length; i += batchSize) {
      const batch = cleanRecords.slice(i, i + batchSize);
      const { error: insertErr } = await supabase.from(tableName).upsert(batch, { onConflict: schema.pk });
      if (insertErr) {
        console.error(`❌ Error inserting into ${tableName} batch ${i}:`, insertErr.message);
      } else {
        inserted += batch.length;
      }
    }
    console.log(`✅ Table [${tableName}]: Successfully seeded ${inserted} records!`);
  }

  console.log('\n🏁 Cloud Database Seed Complete!');
}

seedAll().catch(console.error);
