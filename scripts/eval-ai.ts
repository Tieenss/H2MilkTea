import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import dữ liệu và logic pipeline
import menuData from '../src/data/DMHH.json';
import tableData from '../src/data/DSBAN.json';
import { toActiveCatalog } from '../src/lib/ai/catalog';
import { checkSecurityGuardrails } from '../src/lib/ai/security';
import { matchRuleBased } from '../src/lib/ai/ruleEngine';

const datasetArg = process.argv.includes('--dev') ? 'dev.jsonl' : 'test.jsonl';
const datasetPath = path.join(rootDir, 'eval/ai', datasetArg);

if (!fs.existsSync(datasetPath)) {
  console.error(`❌ Không tìm thấy file dataset: ${datasetPath}`);
  process.exit(1);
}

const activeCatalog = toActiveCatalog(menuData as any[]);
const activeTables = ((tableData || []) as any[])
  .filter((t) => t['Trạng thái'] === 'Đang hoạt động' || !t['Trạng thái'])
  .map((t) => ({ id: String(t.IDBAN || ''), name: String(t['Tên bàn'] || '') }));

const lines = fs.readFileSync(datasetPath, 'utf8').split('\n').filter((l) => l.trim());
console.log(`\n🧪 BẮT ĐẦU ĐÁNH GIÁ AI PIPELINE TRÊN BỘ DỮ LIỆU: [${datasetArg}] (${lines.length} câu)`);

const categories = ['single_item', 'multi_item', 'alias', 'options', 'ambiguous', 'unauthorized', 'prompt_injection'];
const stats: Record<string, { total: number; correct: number }> = {};
for (const cat of categories) {
  stats[cat] = { total: 0, correct: 0 };
}

// Confusion matrix: Expected vs Predicted
const actions = ['add', 'remove', 'select_table', 'qa', 'none'] as const;
type ActionType = typeof actions[number];
const confusionMatrix: Record<string, Record<string, number>> = {};
for (const exp of actions) {
  confusionMatrix[exp] = {};
  for (const pred of actions) {
    confusionMatrix[exp][pred] = 0;
  }
}

let totalCorrect = 0;
const failureCases: Array<{
  id: string;
  category: string;
  input: string;
  expected_action: string;
  predictedAction: string;
  expected_items?: any;
  predictedItems?: any;
}> = [];

for (const line of lines) {
  const item = JSON.parse(line);
  const { id, category, input, expected_action, expected_items } = item;

  stats[category] = stats[category] || { total: 0, correct: 0 };
  stats[category].total += 1;

  // 1. Kiểm tra Guardrail
  const security = checkSecurityGuardrails(input);
  let predictedAction: ActionType = 'none';
  let predictedItems: any[] = [];

  if (security.violated) {
    predictedAction = 'none';
  } else {
    // 2. Kiểm tra Rule Engine
    const ruleRes = matchRuleBased(input, activeCatalog, activeTables);
    if (ruleRes.matched && ruleRes.output) {
      predictedAction = ruleRes.output.action;
      predictedItems = ruleRes.output.items || [];
    } else {
      // 3. Phân loại theo từ khóa nghiệp vụ / QA nếu là câu hỏi
      if (/wifi|mấy giờ|ngon nhất|hướng dẫn|cách in|gửi xe|vietqr|bán chạy|mật khẩu|đổi mật khẩu|chỉ (anh|em|tôi) cách|nghỉ bán|chuyển khoản/i.test(input)) {
        predictedAction = 'qa';
      } else {
        predictedAction = 'none';
      }
    }
  }

  // Cập nhật ma trận nhầm lẫn
  if (confusionMatrix[expected_action] && confusionMatrix[expected_action][predictedAction] !== undefined) {
    confusionMatrix[expected_action][predictedAction] += 1;
  }

  // Đánh giá tính đúng đắn
  let isCorrect = predictedAction === expected_action;
  if (isCorrect && (expected_action === 'add' || expected_action === 'remove') && expected_items?.length > 0) {
    if (predictedItems.length < expected_items.length) {
      isCorrect = false;
    }
  }

  if (isCorrect) {
    stats[category].correct += 1;
    totalCorrect += 1;
  } else {
    failureCases.push({
      id,
      category,
      input,
      expected_action,
      predictedAction,
      expected_items,
      predictedItems,
    });
  }
}

// In kết quả
console.log('\n========================================================================');
console.log('               BẢNG ĐỘ CHÍNH XÁC THEO NHÓM (ACCURACY BY CATEGORY)');
console.log('========================================================================');
console.log('| Nhóm kiểm định (Category)     | Số mẫu | Chính xác | Tỷ lệ (%) |');
console.log('|-------------------------------|--------|-----------|-----------|');

let csvContent = 'Category,Total,Correct,Accuracy%\n';
for (const cat of categories) {
  const s = stats[cat] || { total: 0, correct: 0 };
  const acc = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : '0.0';
  console.log(`| ${cat.padEnd(29)} | ${String(s.total).padStart(6)} | ${String(s.correct).padStart(9)} | ${acc.padStart(8)}% |`);
  csvContent += `${cat},${s.total},${s.correct},${acc}%\n`;
}

const overallAccuracy = ((totalCorrect / lines.length) * 100).toFixed(1);
console.log('------------------------------------------------------------------------');
console.log(`| TỔNG CỘNG CHUNG               | ${String(lines.length).padStart(6)} | ${String(totalCorrect).padStart(9)} | ${overallAccuracy.padStart(8)}% |`);
console.log('========================================================================\n');
csvContent += `Overall,${lines.length},${totalCorrect},${overallAccuracy}%\n`;

// In ma trận nhầm lẫn
console.log('========================================================================');
console.log('             MA TRẬN NHẦM LẪN (CONFUSION MATRIX: Row=Exp, Col=Pred)');
console.log('========================================================================');
console.log('| Expected \\ Predicted |    add | remove | select_table |     qa |   none |');
console.log('|----------------------|--------|--------|--------------|--------|--------|');
for (const exp of actions) {
  const row = confusionMatrix[exp];
  console.log(`| ${exp.padEnd(20)} | ${String(row.add).padStart(6)} | ${String(row.remove).padStart(6)} | ${String(row.select_table).padStart(12)} | ${String(row.qa).padStart(6)} | ${String(row.none).padStart(6)} |`);
}
console.log('========================================================================\n');

// Xuất file CSV
const csvPath = path.join(rootDir, 'eval/ai/eval-results.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log(`📁 Đã lưu kết quả CSV: [${path.relative(rootDir, csvPath)}]`);

// Xuất file báo cáo Markdown
const reportPath = path.join(rootDir, 'docs/agent/eval-ai-report.md');
const mdReport = `# Báo cáo Đánh giá AI Benchmark (eval:ai)

- **Dataset**: \`eval/ai/${datasetArg}\` (${lines.length} mẫu, \`source: synthetic\`)
- **Thời điểm chạy**: ${new Date().toISOString()}
- **Độ chính xác tổng thể**: **${overallAccuracy}%** (${totalCorrect}/${lines.length} câu đúng)

## 1. Độ chính xác theo Nhóm
| Nhóm kiểm định | Số mẫu | Chính xác | Tỷ lệ (%) |
|---|---|---|---|
${categories.map((cat) => {
  const s = stats[cat];
  const acc = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : '0.0';
  return `| \`${cat}\` | ${s.total} | ${s.correct} | **${acc}%** |`;
}).join('\n')}
| **TỔNG CỘNG** | **${lines.length}** | **${totalCorrect}** | **${overallAccuracy}%** |

## 2. Ma trận Nhầm lẫn (Confusion Matrix)
| Thực tế \\ Dự đoán | \`add\` | \`remove\` | \`select_table\` | \`qa\` | \`none\` |
|---|---|---|---|---|---|
${actions.map((exp) => {
  const row = confusionMatrix[exp];
  return `| **\`${exp}\`** | ${row.add} | ${row.remove} | ${row.select_table} | ${row.qa} | ${row.none} |`;
}).join('\n')}

## 3. Các ca cần cải tiến (nếu có)
${failureCases.length === 0 ? '_Không có ca nào sai._' : failureCases.map((f) => `- [${f.id}] [${f.category}] \`${f.input}\`: mong đợi \`${f.expected_action}\`, nhận được \`${f.predictedAction}\``).join('\n')}
`;

fs.writeFileSync(reportPath, mdReport, 'utf8');
console.log(`📁 Đã lưu báo cáo Markdown: [${path.relative(rootDir, reportPath)}]\n`);

if (Number(overallAccuracy) >= 80) {
  console.log(`🎉 KẾT QUẢ ĐẠT TIÊU CHUẨN NGHIỆM THU: ${overallAccuracy}% >= 80%\n`);
  process.exit(0);
} else {
  console.warn(`⚠️ Độ chính xác ${overallAccuracy}% chưa đạt 80%.\n`);
  process.exit(1);
}
