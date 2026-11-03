import dotenv from 'dotenv';
dotenv.config({ path: 'D:/Documents/H2MilkTea/.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const SAMPLE_20_TABLES = [
  // 1. Mang về (1 bàn)
  { IDBAN: 'BAN000', 'Tên bàn': 'Khách mua về', 'Sức chứa tối đa': 1, 'Trạng thái': 'Đang hoạt động' },

  // 2. Khu vực Quầy (5 bàn)
  { IDBAN: 'Q01', 'Tên bàn': 'Quầy 01', 'Sức chứa tối đa': 2, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'Q02', 'Tên bàn': 'Quầy 02', 'Sức chứa tối đa': 2, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'Q03', 'Tên bàn': 'Quầy 03', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'Q04', 'Tên bàn': 'Quầy 04', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'Q05', 'Tên bàn': 'Quầy 05', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },

  // 3. Khu vực Vườn (8 bàn)
  { IDBAN: 'V01', 'Tên bàn': 'Vườn 01', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V02', 'Tên bàn': 'Vườn 02', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V03', 'Tên bàn': 'Vườn 03', 'Sức chứa tối đa': 4, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V04', 'Tên bàn': 'Vườn 04', 'Sức chứa tối đa': 6, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V05', 'Tên bàn': 'Vườn 05', 'Sức chứa tối đa': 6, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V06', 'Tên bàn': 'Vườn 06', 'Sức chứa tối đa': 6, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V07', 'Tên bàn': 'Vườn 07', 'Sức chứa tối đa': 8, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'V08', 'Tên bàn': 'Vườn 08', 'Sức chứa tối đa': 8, 'Trạng thái': 'Đang hoạt động' },

  // 4. Khu vực Phòng hát (6 bàn)
  { IDBAN: 'PH01', 'Tên bàn': 'Phòng hát 01', 'Sức chứa tối đa': 10, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'PH02', 'Tên bàn': 'Phòng hát 02', 'Sức chứa tối đa': 10, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'PH03', 'Tên bàn': 'Phòng hát 03', 'Sức chứa tối đa': 12, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'PH04', 'Tên bàn': 'Phòng hát 04', 'Sức chứa tối đa': 12, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'PH05', 'Tên bàn': 'Phòng hát 05', 'Sức chứa tối đa': 15, 'Trạng thái': 'Đang hoạt động' },
  { IDBAN: 'PH06', 'Tên bàn': 'Phòng hát 06', 'Sức chứa tối đa': 20, 'Trạng thái': 'Đang hoạt động' }
];

async function reseed() {
  console.log('🔄 Đang dọn dẹp các bàn cũ trong bảng DSBAN...');
  const { error: deleteError } = await supabase.from('DSBAN').delete().neq('IDBAN', '___ALL___');
  if (deleteError) {
    console.error('Lỗi khi xóa bàn cũ:', deleteError);
    return;
  }
  console.log('✅ Đã dọn sạch bảng DSBAN.');

  console.log('🌱 Đang chèn 20 bàn mẫu mới thuộc 4 khu vực...');
  const { data, error: insertError } = await supabase.from('DSBAN').insert(SAMPLE_20_TABLES).select();
  if (insertError) {
    console.error('Lỗi khi chèn bàn mới:', insertError);
    return;
  }

  console.log(`🎉 Thành công! Đã tạo ${data.length} bàn mẫu:`);
  data.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.IDBAN}] ${t['Tên bàn']} - Sức chứa: ${t['Sức chứa tối đa']} - ${t['Trạng thái']}`);
  });
}

reseed();
