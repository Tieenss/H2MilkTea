import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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

async function run() {
  // 1. Kiểm tra an toàn môi trường STAGING
  checkEnv();

  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('❌ Cú pháp: node scripts/db/apply-migration.mjs <đường-dẫn-file-migration>');
    process.exit(1);
  }

  const fullPath = path.isAbsolute(migrationFile)
    ? migrationFile
    : path.resolve(rootDir, migrationFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Không tìm thấy file migration: ${fullPath}`);
    process.exit(1);
  }

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'));
  const envBase = loadEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envBase, ...envLocal, ...process.env };

  const dbUrl = mergedEnv.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Thiếu DATABASE_URL trong .env.local.');
    process.exit(1);
  }

  console.log(`\n🚀 Đang áp migration lên STAGING: [${path.basename(fullPath)}]...`);

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npxCmd, [
    'supabase',
    'db',
    'query',
    '--file',
    fullPath,
    '--db-url',
    dbUrl
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.status !== 0 || result.error) {
    console.error('❌ Lỗi khi thực thi migration:');
    if (result.error) console.error(result.error);
    if (result.stderr) console.error(result.stderr);
    if (result.stdout) console.error(result.stdout);
    process.exit(result.status || 1);
  }

  console.log(result.stdout);
  console.log(`✅ Áp migration [${path.basename(fullPath)}] thành công!\n`);
}

run();
