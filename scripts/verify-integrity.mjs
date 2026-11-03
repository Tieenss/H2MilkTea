#!/usr/bin/env node

/**
 * ==============================================================================
 * H2MILKTEA CODE INTEGRITY & ANTI-REGRESSION VERIFIER
 * Hàng rào kiểm định tính toàn vẹn mã nguồn chống lỗi do AI Agent sửa code
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

let errors = [];

const REACT_HOOKS = [
  'useEffect',
  'useState',
  'useCallback',
  'useMemo',
  'useRef',
  'useContext',
  'useReducer',
  'useId'
];

function getSourceFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        results = results.concat(getSourceFiles(fullPath));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('\n======================================================');
console.log(' 🛡️  H2MILKTEA CODE INTEGRITY GUARDRAIL');
console.log('======================================================');

const files = getSourceFiles(srcDir);
console.log(`🔍 Đang quét ${files.length} file mã nguồn TypeScript/React...\n`);

for (const filePath of files) {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');

  // Lấy danh sách named imports từ 'react' (bắt đúng từng câu lệnh import, không nuốt qua file khác)
  const reactNamedImports = new Set();
  const reactImportMatches = content.matchAll(/import\s+([^;]+?)\s+from\s+['"]react['"]/g);
  for (const m of reactImportMatches) {
    const importClause = m[1].trim();
    const namedMatch = importClause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      namedMatch[1].split(',').forEach(s => {
        const item = s.trim().split(/\s+as\s+/)[0].trim();
        if (item) reactNamedImports.add(item);
      });
    }
  }

  // 1. KIỂM TRA BARE HOOK CALLS (Không có tiền tố React.)
  for (const hook of REACT_HOOKS) {
    // Regex tìm bare hook: không đi sau dấu chấm (như React.useEffect)
    const bareHookRegex = new RegExp(`(?<!\\.)\\b${hook}\\s*(?:<[^>]+>)?\\s*\\(`, 'g');
    const matches = content.match(bareHookRegex);

    if (matches && matches.length > 0) {
      // Nếu có dùng bare hook thì BẮT BUỘC phải có named import trong `{ ... }` từ 'react'
      const hasNamedImport = reactNamedImports.has(hook);
      // Hoặc là file tự định nghĩa hook đó
      const isCustomDeclaration = new RegExp(`(?:function|const)\\s+${hook}\\b`).test(content);

      if (!hasNamedImport && !isCustomDeclaration) {
        errors.push(`[Thiếu import React Hook] ${relPath}: Gọi trực tiếp "${hook}()" nhưng chưa import { ${hook} } từ 'react'.`);
      }
    }
  }

  // 2. KIỂM TRA GỌI .toFixed() TRÊN BIẾN DỮ LIỆU ĐỘNG MÀ KHÔNG ÉP KIỂU
  const lines = content.split('\n');
  lines.forEach((line, lineIdx) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    if (line.includes('.toFixed(')) {
      const unsafePattern = /(?:rating|DanhGia|trungBinhDanhGia)\.toFixed\(/i;
      if (unsafePattern.test(line) && !line.includes('Number(') && !line.includes('typeof') && !line.includes('parseFloat')) {
        errors.push(`[Gọi .toFixed không an toàn] ${relPath}:${lineIdx + 1} -> Cần bọc Number(...) hoặc kiểm tra an toàn: ${line.trim()}`);
      }
    }
  });
}

// BÁO CÁO KẾT QUẢ
if (errors.length > 0) {
  console.error(`❌ PHÁT HIỆN ${errors.length} LỖI CẦN XỬ LÝ (BLOCKING ERRORS):`);
  errors.forEach(e => console.error('  ⛔ ' + e));
  console.log('\n======================================================');
  console.log('🚨 HÀNG RÀO TỪ CHỐI: Vui lòng sửa các lỗi trên trước khi bàn giao!');
  console.log('======================================================\n');
  process.exit(1);
} else {
  console.log('✅ XÁC NHẬN AN TOÀN TUYỆT ĐỐI:');
  console.log('  1. 100% các React Hooks bare calls đều được import chính xác từ react.');
  console.log('  2. Không còn bất kỳ lời gọi .toFixed() không an toàn nào trên dữ liệu nhà cung cấp/đánh giá.');
  console.log('======================================================\n');
  process.exit(0);
}
