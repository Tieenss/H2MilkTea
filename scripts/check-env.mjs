import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Đọc và parse file env thủ công để không phụ thuộc vào dotenv khi chạy độc lập
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

export function checkEnv() {
  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'));
  const envBase = loadEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envBase, ...envLocal, ...process.env };

  const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL || '';
  const databaseUrl = mergedEnv.DATABASE_URL || '';
  const forbiddenRefsRaw = mergedEnv.FORBIDDEN_SUPABASE_REFS || '';

  const forbiddenRefs = forbiddenRefsRaw
    .split(/[,;\s]+/)
    .map(r => r.trim().toLowerCase())
    .filter(Boolean);

  let currentRef = null;

  if (supabaseUrl) {
    const match = supabaseUrl.match(/https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/i);
    if (match) currentRef = match[1].toLowerCase();
  }

  if (!currentRef && databaseUrl) {
    const match = databaseUrl.match(/db\.([a-zA-Z0-9_-]+)\.supabase\.co/i);
    if (match) currentRef = match[1].toLowerCase();
  }

  console.log('\n======================================================');
  console.log(' [check-env] KIỂM TRA AN TOÀN MÔI TRƯỜNG SUPABASE');
  console.log('======================================================');

  if (!currentRef) {
    console.error('❌ LỖI AN TOÀN: Không thể xác định Supabase project ref từ NEXT_PUBLIC_SUPABASE_URL hoặc DATABASE_URL!');
    console.error('Vui lòng kiểm tra lại cấu hình trong file .env.local.');
    process.exit(1);
  }

  console.log(`ℹ️ Project Ref hiện tại: [${currentRef}]`);
  console.log(`ℹ️ Danh sách Ref cấm: [${forbiddenRefs.join(', ') || 'Chưa thiết lập'}]`);

  if (forbiddenRefs.includes(currentRef)) {
    console.error('\n🚨 CẢNH BÁO NGUY HIỂM: VI PHẠM LUẬT AN TOÀN SỐ 2!');
    console.error(`Project ref [${currentRef}] nằm trong danh sách cấm FORBIDDEN_SUPABASE_REFS!`);
    console.error('DỪNG NGAY TIẾN TRÌNH để bảo vệ dữ liệu PRODUCTION.\n');
    process.exit(1);
  }

  if (forbiddenRefs.length === 0) {
    console.warn('\n⚠️ CẢNH BÁO: FORBIDDEN_SUPABASE_REFS chưa được cấu hình trong .env.local.');
    console.warn('Khuyến nghị chủ dự án thêm ref của production vào FORBIDDEN_SUPABASE_REFS để chặn nhầm lẫn.\n');
  }

  console.log('✅ XÁC NHẬN AN TOÀN: Môi trường hợp lệ, không trỏ vào database Production bị cấm.');
  console.log('======================================================\n');
}

// Nếu file được gọi trực tiếp bằng node scripts/check-env.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkEnv();
}
