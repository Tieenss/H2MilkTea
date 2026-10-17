import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
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

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function runRestore() {
  // 1. Kiểm tra an toàn môi trường
  checkEnv();

  const backupInput = process.argv[2];
  if (!backupInput) {
    console.error('❌ Cú pháp: node scripts/db/restore.mjs <đường-dẫn-thư-mục-backup> [--confirm-ref=<ref>]');
    process.exit(1);
  }

  const backupDir = path.isAbsolute(backupInput)
    ? backupInput
    : path.resolve(rootDir, backupInput);

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Không tìm thấy thư mục backup: ${backupDir}`);
    process.exit(1);
  }

  const checksumsPath = path.join(backupDir, 'checksums.json');
  if (!fs.existsSync(checksumsPath)) {
    console.error('❌ Thư mục backup thiếu checksums.json! Dừng để đảm bảo an toàn.');
    process.exit(1);
  }

  // 2. Xác thực tính toàn vẹn (checksums)
  console.log('\n🔒 Đang kiểm tra mã băm SHA256 các file backup...');
  const recordedChecksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
  for (const [relPath, expectedHash] of Object.entries(recordedChecksums)) {
    const fullPath = path.join(backupDir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Thiếu file trong bản backup: ${relPath}`);
      process.exit(1);
    }
    const actualHash = getSha256(fullPath);
    if (actualHash !== expectedHash) {
      console.error(`❌ MÃ BĂM KHÔNG KHỚP cho file ${relPath}! Bản backup có thể bị hỏng.`);
      process.exit(1);
    }
  }
  console.log('✅ Toàn bộ file backup hợp lệ và toàn vẹn.');

  // 3. Yêu cầu xác nhận tên project ref để tránh ghi đè nhầm
  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'));
  const envBase = loadEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envBase, ...envLocal, ...process.env };

  const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = supabaseUrl.match(/https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/i);
  const currentRef = match ? match[1].toLowerCase() : '';

  let confirmRefArg = process.argv.find(a => a.startsWith('--confirm-ref='));
  let inputRef = confirmRefArg ? confirmRefArg.split('=')[1].trim() : null;

  if (!inputRef) {
    console.log(`\n⚠️ BẢO VỆ DỮ LIỆU: Thao tác này sẽ khôi phục dữ liệu lên STAGING [${currentRef}].`);
    inputRef = await askQuestion(`Vui lòng nhập lại chính xác project ref [${currentRef}] để tiếp tục: `);
  }

  if (inputRef !== currentRef) {
    console.error(`❌ Xác nhận thất bại: "${inputRef}" không khớp với project ref hiện tại "${currentRef}". Hủy restore.`);
    process.exit(1);
  }

  // 4. Thực hiện khôi phục qua Supabase client
  const serviceKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY || mergedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  const dataDir = path.join(backupDir, 'data');
  if (!fs.existsSync(dataDir)) {
    console.error('❌ Không tìm thấy thư mục data/ trong bản backup.');
    process.exit(1);
  }

  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  console.log(`\n📥 Bắt đầu nạp dữ liệu từ ${dataFiles.length} bảng...`);

  for (const file of dataFiles) {
    const table = path.basename(file, '.json');
    const records = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));

    if (records.length === 0) {
      console.log(`  ℹ️ Bảng [${table}]: Bản backup rỗng, bỏ qua.`);
      continue;
    }

    try {
      // Upsert các bản ghi từ backup
      const { error } = await supabase.from(table).upsert(records);
      if (error) {
        console.warn(`  ⚠️ Bảng [${table}]: Lỗi upsert (${error.message})`);
      } else {
        console.log(`  ✅ Bảng [${table}]: Đã khôi phục ${records.length} bản ghi.`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Bảng [${table}]: Ngoại lệ - ${err.message}`);
    }
  }

  console.log(`\n🎉 HOÀN THÀNH RESTORE STAGING TỪ ${backupDir}\n`);
}

runRestore().catch(err => {
  console.error('❌ Lỗi khi thực hiện restore:', err);
  process.exit(1);
});
