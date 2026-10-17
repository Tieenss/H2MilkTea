import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { checkEnv } from '../check-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function runSeed() {
  // 1. Chặn chạy nhầm Production
  checkEnv();

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'));
  const envBase = loadEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envBase, ...envLocal, ...process.env };

  const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('\n🌱 BẮT ĐẦU NẠP DỮ LIỆU SEED VÀO DATABASE STAGING...');

  // 2. Tạo tài khoản nhân viên Supabase Auth
  console.log('\n👤 1. Khởi tạo tài khoản Supabase Auth cho nhân viên...');
  const testStaffAccounts = [
    {
      username: 'admin',
      email: 'admin@gmail.com',
      password: 'Password123!',
      fullName: 'Quản trị viên (Admin)',
      role: 'Admin',
      position: 'Quản lý'
    },
    {
      username: 'phuocnv',
      email: 'ninhphuoc@phuocnv.io.vn',
      password: 'Password123!',
      fullName: 'Ninh Phước',
      role: 'Admin',
      position: 'RND'
    },
    {
      username: 'thungan',
      email: 'thungan@h2.com',
      password: 'Password123!',
      fullName: 'Thu Ngân 01',
      role: 'Nhân viên',
      position: 'Thu ngân'
    },
    {
      username: 'bep',
      email: 'bep@h2.com',
      password: 'Password123!',
      fullName: 'Nhân Viên Bếp',
      role: 'Nhân viên',
      position: 'Pha chế / Bếp'
    }
  ];

  for (const staff of testStaffAccounts) {
    try {
      const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: staff.password,
        email_confirm: true,
        user_metadata: {
          username: staff.username,
          full_name: staff.fullName,
          role: staff.role
        }
      });

      if (authError) {
        if (authError.message.includes('already exists') || authError.message.includes('unique')) {
          console.log(`  ℹ️ User Auth [${staff.email}] đã tồn tại.`);
        } else {
          console.warn(`  ⚠️ Lỗi tạo User Auth [${staff.email}]:`, authError.message);
        }
      } else {
        console.log(`  ✅ Đã tạo User Auth [${staff.email}] thành công.`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Ngoại lệ tạo User Auth [${staff.email}]:`, err.message);
    }
  }

  // 3. Nạp danh sách bảng dữ liệu
  const tables = [
    'DSBAN',
    'DMHH',
    'DSNV',
    'KHACHHANG',
    'NGUYENLIEU',
    'CAUHINH',
    'KIEMKEKHO',
    'NHACUNGCAP',
    'NHAPXUATKHO',
    'HOADON',
    'HOADONDETAIL'
  ];

  console.log('\n📊 2. Nạp dữ liệu các bảng nghiệp vụ...');
  for (const table of tables) {
    const jsonPath = path.join(rootDir, 'src', 'data', `${table}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.log(`  ℹ️ Bảng [${table}]: Không tìm thấy file dữ liệu, bỏ qua.`);
      continue;
    }

    try {
      let records = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (!Array.isArray(records) || records.length === 0) {
        console.log(`  ℹ️ Bảng [${table}]: Dữ liệu rỗng.`);
        continue;
      }

      // Làm sạch dữ liệu
      records = records.map((item, idx) => {
        const clean = { ...item };
        if (clean['Hóa đọn liên quan'] !== undefined) {
          clean['Hóa đơn liên quan'] = clean['Hóa đọn liên quan'];
          delete clean['Hóa đọn liên quan'];
        }
        for (const [k, v] of Object.entries(clean)) {
          if (v === '') clean[k] = null;
        }
        return clean;
      });

      // Nếu là DSNV, bổ sung thêm các account test
      if (table === 'DSNV') {
        const existingEmails = new Set(records.map(r => r.Email || r.email));
        for (const st of testStaffAccounts) {
          if (!existingEmails.has(st.email)) {
            records.push({
              _RowNumber: String(records.length + 2),
              username: st.username,
              password: st.password,
              'Họ và Tên': st.fullName,
              'Chức vụ': st.position,
              'Phòng': 'Vận hành',
              'Phân quyền': st.role,
              'Email': st.email,
              'Image': '',
              'Quyền View': '',
              'Số điện thoại': '0901234567',
              'Địa chỉ': 'H2 MilkTea',
              'Ngày sinh': '01/01/2000',
              'Ngày vào làm': '01/01/2026',
              'Ghi chú': 'Tài khoản thử nghiệm STAGING'
            });
          }
        }
      }

      // Chia nhỏ batch để insert nếu nhiều dữ liệu (mỗi batch 50 bản ghi)
      const batchSize = 50;
      let insertedCount = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const chunk = records.slice(i, i + batchSize);
        const { error } = await supabase.from(table).upsert(chunk);
        if (error) {
          console.warn(`  ⚠️ Bảng [${table}] lỗi batch ${i}-${i + chunk.length}: ${error.message}`);
        } else {
          insertedCount += chunk.length;
        }
      }
      console.log(`  ✅ Bảng [${table}]: Đã nạp ${insertedCount}/${records.length} bản ghi.`);
    } catch (e) {
      console.warn(`  ⚠️ Bảng [${table}] lỗi ngoại lệ:`, e.message);
    }
  }

  // 4. Khởi tạo app_settings và FAQ
  console.log('\n⚙️ 3. Khởi tạo app_settings và FAQ cửa hàng...');
  try {
    let faqData = [];
    const faqPath = path.join(rootDir, 'src', 'data', 'store_faq.json');
    if (fs.existsSync(faqPath)) {
      faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
    }

    await supabase.from('app_settings').upsert([
      { key: 'ai_assistant_enabled', value: true },
      { key: 'store_custom_faq', value: faqData }
    ]);
    console.log(`  ✅ Cấu hình app_settings thành công (ai_assistant_enabled, store_custom_faq: ${faqData.length} câu).`);
  } catch (err) {
    console.warn('  ⚠️ Lỗi khi khởi tạo app_settings:', err.message);
  }

  console.log('\n🎉 NẠP DỮ LIỆU STAGING HOÀN TẤT!');
  console.log('--------------------------------------------------');
  console.log('Tài khoản test đăng nhập hệ thống:');
  console.log('  1. Admin:    admin / Password123! (hoặc admin@gmail.com)');
  console.log('  2. Admin:    phuocnv / Password123! (hoặc ninhphuoc@phuocnv.io.vn)');
  console.log('  3. Thu ngân: thungan / Password123! (hoặc thungan@h2.com)');
  console.log('  4. Bếp:      bep / Password123! (hoặc bep@h2.com)');
  console.log('--------------------------------------------------\n');
}

runSeed().catch(err => {
  console.error('❌ Lỗi khi thực hiện seed STAGING:', err);
  process.exit(1);
});
