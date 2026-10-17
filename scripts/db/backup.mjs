import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
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

async function runBackup() {
  // 1. Kiểm tra môi trường an toàn trước tiên
  checkEnv();

  const label = process.argv[2] || 'manual';
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const backupDirName = `${timestamp}-${label}`;
  const targetDir = path.join(rootDir, 'backups', 'db', backupDirName);

  fs.mkdirSync(path.join(targetDir, 'data'), { recursive: true });

  console.log(`\n📦 BẮT ĐẦU SAO LƯU DATABASE STAGING: [${backupDirName}]`);
  console.log(`📁 Thư mục lưu: ${targetDir}`);

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'));
  const envBase = loadEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envBase, ...envLocal, ...process.env };

  const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY || mergedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Thiếu SUPABASE_URL hoặc SERVICE_ROLE_KEY / ANON_KEY trong .env.local.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Danh sách các bảng nghiệp vụ cốt lõi cố định theo hiến pháp
  const tables = [
    'DMHH',
    'DSBAN',
    'DSNV',
    'HOADON',
    'HOADONDETAIL',
    'pos_orders',
    'pos_cart_drafts',
    'ai_settings'
  ];

  const recordCounts = {};
  console.log('\n📊 Đang kiểm đếm và sao lưu dữ liệu từng bảng...');

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.warn(`  ⚠️ Bảng [${table}]: Không truy vấn được (${error.message})`);
        recordCounts[table] = -1;
      } else {
        recordCounts[table] = count ?? (data ? data.length : 0);
        const dataFilePath = path.join(targetDir, 'data', `${table}.json`);
        fs.writeFileSync(dataFilePath, JSON.stringify(data || [], null, 2), 'utf8');
        console.log(`  ✅ Bảng [${table}]: ${recordCounts[table]} bản ghi -> data/${table}.json`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Bảng [${table}]: Lỗi - ${err.message}`);
      recordCounts[table] = -1;
    }
  }

  // Ghi file record_counts.json
  const recordCountsPath = path.join(targetDir, 'record_counts.json');
  fs.writeFileSync(recordCountsPath, JSON.stringify(recordCounts, null, 2), 'utf8');

  // Thử gọi pg_dump hoặc supabase db dump nếu công cụ có sẵn trong hệ thống
  console.log('\n🔍 Kiểm tra công cụ CLI (pg_dump / supabase CLI)...');
  let cliDumpSuccess = false;
  try {
    const dbUrl = mergedEnv.DATABASE_URL;
    if (dbUrl) {
      const schemaDumpPath = path.join(targetDir, 'schema.sql');
      execSync(`pg_dump --schema-only "${dbUrl}" > "${schemaDumpPath}"`, { stdio: 'pipe' });
      console.log('  ✅ Đã dump schema bằng pg_dump -> schema.sql');
      cliDumpSuccess = true;
    }
  } catch (e) {
    console.log('  ℹ️ Không thể chạy pg_dump trực tiếp (chưa cài pg_dump hoặc thiếu kết nối trực tiếp 5432). Đã sao lưu dữ liệu qua Supabase Client.');
  }

  // Tạo manifest
  const manifest = {
    backupName: backupDirName,
    timestamp: now.toISOString(),
    label,
    recordCounts,
    cliDump: cliDumpSuccess,
    nodeVersion: process.version,
    platform: process.platform
  };
  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // Tính toán checksum SHA256 cho toàn bộ file trong thư mục backup
  const checksums = {};
  function computeDirChecksums(dir, baseRel = '') {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const relPath = path.join(baseRel, f).replace(/\\/g, '/');
      if (fs.statSync(fullPath).isDirectory()) {
        computeDirChecksums(fullPath, relPath);
      } else if (f !== 'checksums.json') {
        checksums[relPath] = getSha256(fullPath);
      }
    }
  }

  computeDirChecksums(targetDir);
  fs.writeFileSync(path.join(targetDir, 'checksums.json'), JSON.stringify(checksums, null, 2), 'utf8');

  console.log('\n🔒 Đã tạo checksums.json (SHA-256):');
  for (const [f, hash] of Object.entries(checksums)) {
    console.log(`  - ${f}: ${hash.slice(0, 16)}...`);
  }

  console.log(`\n🎉 HOÀN THÀNH SAO LƯU: ${targetDir}\n`);
}

runBackup().catch((err) => {
  console.error('❌ Lỗi khi thực hiện backup:', err);
  process.exit(1);
});
