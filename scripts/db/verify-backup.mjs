import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

async function runVerify() {
  checkEnv();

  const backupInput = process.argv[2];
  if (!backupInput) {
    console.error('❌ Cú pháp: node scripts/db/verify-backup.mjs <đường-dẫn-thư-mục-backup>');
    process.exit(1);
  }

  const backupDir = path.isAbsolute(backupInput)
    ? backupInput
    : path.resolve(rootDir, backupInput);

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Không tìm thấy thư mục backup: ${backupDir}`);
    process.exit(1);
  }

  console.log(`\n🔎 BẮT ĐẦU KIỂM ĐỊNH TÍNH TOÀN VẸN BẢN BACKUP: ${path.basename(backupDir)}`);

  // 1. Kiểm tra checksums
  const checksumsPath = path.join(backupDir, 'checksums.json');
  if (!fs.existsSync(checksumsPath)) {
    console.error('❌ Thiếu file checksums.json!');
    process.exit(1);
  }

  const recordedChecksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
  let checksumErrors = 0;
  console.log('\n1️⃣ Kiểm tra mã băm SHA256 từng file:');
  for (const [relPath, expectedHash] of Object.entries(recordedChecksums)) {
    const fullPath = path.join(backupDir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ Thiếu file: ${relPath}`);
      checksumErrors++;
      continue;
    }
    const actualHash = getSha256(fullPath);
    if (actualHash === expectedHash) {
      console.log(`  ✅ ${relPath} : KHỚP (${actualHash.slice(0, 12)}...)`);
    } else {
      console.error(`  ❌ ${relPath} : SAI LỆCH! (Kỳ vọng: ${expectedHash.slice(0, 8)}..., Thực tế: ${actualHash.slice(0, 8)}...)`);
      checksumErrors++;
    }
  }

  // 2. So sánh số lượng bản ghi giữa file backup và DB hiện tại
  const recordCountsPath = path.join(backupDir, 'record_counts.json');
  if (!fs.existsSync(recordCountsPath)) {
    console.error('❌ Thiếu file record_counts.json!');
    process.exit(1);
  }

  const recordedCounts = JSON.parse(fs.readFileSync(recordCountsPath, 'utf8'));

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'));
  const envBase = loadEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envBase, ...envLocal, ...process.env };

  const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY || mergedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('\n2️⃣ So sánh số lượng bản ghi với Database hiện tại:');
  console.log('---------------------------------------------------------------------');
  console.log('| Bảng                 | Trong Backup | Trên Database | Trạng thái  |');
  console.log('---------------------------------------------------------------------');

  let countMismatches = 0;
  for (const [table, backupCount] of Object.entries(recordedCounts)) {
    if (backupCount === -1) {
      console.log(`| ${table.padEnd(20)} | N/A          | N/A           | ⚠️ Bỏ qua   |`);
      continue;
    }

    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      const currentCount = error ? -1 : (count ?? 0);
      const isMatch = currentCount === backupCount;
      const statusStr = isMatch ? '✅ Khớp' : '❌ Lệch';
      if (!isMatch) countMismatches++;

      console.log(`| ${table.padEnd(20)} | ${String(backupCount).padEnd(12)} | ${String(currentCount).padEnd(13)} | ${statusStr.padEnd(11)} |`);
    } catch (e) {
      console.log(`| ${table.padEnd(20)} | ${String(backupCount).padEnd(12)} | Lỗi           | ❌ Lỗi kết nối |`);
      countMismatches++;
    }
  }
  console.log('---------------------------------------------------------------------\n');

  if (checksumErrors === 0 && countMismatches === 0) {
    console.log('🎉 KIỂM ĐỊNH THÀNH CÔNG: Toàn bộ checksum và số lượng bản ghi đều KHỚP HOÀN TOÀN!\n');
    process.exit(0);
  } else {
    console.warn(`⚠️ CẢNH BÁO KIỂM ĐỊNH: Phát hiện ${checksumErrors} lỗi checksum, ${countMismatches} bảng có số bản ghi lệch.`);
    process.exit(1);
  }
}

runVerify().catch(err => {
  console.error('❌ Lỗi khi thực hiện kiểm định:', err);
  process.exit(1);
});
