import menuData from '../src/data/DMHH.json';
import tableData from '../src/data/DSBAN.json';
import { toActiveCatalog } from '../src/lib/ai/catalog';
import { matchRuleBased } from '../src/lib/ai/ruleEngine';
import { AiOutputSchema } from '../src/lib/ai/schema';
import type { TableInfo } from '../src/lib/ai/types';

const activeCatalog = toActiveCatalog(menuData as any);
const tables: TableInfo[] = (tableData as any[])
  .filter((t) => t['Trạng thái'] === 'Đang hoạt động' || !t['Trạng thái'])
  .map((t) => ({
    id: String(t.IDBAN || ''),
    name: String(t['Tên bàn'] || ''),
  }))
  .filter((t) => t.id && t.name);

console.log('=== TEST SUITE: CHATBOT AI INTELLIGENCE ===\n');

const testCases = [
  {
    title: 'TC1: Câu lệnh gặp lỗi cũ (sai chính tả "lước", từ xưng hô "cho tôi", tên tắt "ép dưa")',
    prompt: 'thêm cho tôi 3 lước ép dưa vào bàn 6',
    expectedAction: 'add',
    expectedTable: 'Bàn 06',
    expectedItem: 'Ép dưa hấu',
    expectedQty: 3,
  },
  {
    title: 'TC2: Từ xưng hô "cho em" + viết tắt "ts", "tc đen", tùy chọn "50 đường"',
    prompt: 'cho em 2 ts tc đen 50 đường bàn 3',
    expectedAction: 'add',
    expectedTable: 'Bàn 03',
    expectedItem: 'Trà sữa trân châu đen',
    expectedQty: 2,
  },
  {
    title: 'TC3: Từ đệm "lấy giùm anh" + mang về',
    prompt: 'lấy giùm anh 1 bạc xỉu ít đá mang về',
    expectedAction: 'add',
    expectedTable: 'Khách mua về',
    expectedItem: 'Bạc xỉu',
    expectedQty: 1,
  },
  {
    title: 'TC4: Từ ngữ vùng miền "nâu đá" + "ép thơm"',
    prompt: 'thêm cho tôi 1 nâu đá và 2 ép thơm vào bàn 3',
    expectedAction: 'add',
    expectedTable: 'Bàn 03',
    expectedQty: 3, // 1 + 2
  },
  {
    title: 'TC5: Lệnh bớt món với từ xưng hô',
    prompt: 'bớt cho chị 1 ly cà phê sữa bàn 6',
    expectedAction: 'remove',
    expectedTable: 'Bàn 06',
    expectedQty: 1,
  },
  {
    title: 'TC6: Chỉ chọn/mở bàn',
    prompt: 'vào bàn 8',
    expectedAction: 'select_table',
    expectedTable: 'Bàn 08',
  },
];

let passed = 0;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  console.log(`[TEST ${i + 1}] Prompt: "${tc.prompt}"`);

  const ruleResult = matchRuleBased(tc.prompt, activeCatalog, tables);
  if (ruleResult.matched && ruleResult.output) {
    const out = ruleResult.output;
    const okAction = out.action === tc.expectedAction;
    const okTable = !tc.expectedTable || out.targetTable?.name.toLowerCase().includes(tc.expectedTable.toLowerCase());
    const totalQty = out.items.reduce((s, it) => s + it.quantity, 0);
    const okQty = !tc.expectedQty || totalQty === tc.expectedQty;
    const okItem = !tc.expectedItem || out.items.some((it) => it.productName.toLowerCase().includes(tc.expectedItem!.toLowerCase()));

    if (okAction && okTable && okQty && okItem) {
      console.log(`  -> ✅ PASSED (Rule Engine)`);
      console.log(`     Hành động: ${out.action} | Bàn: ${out.targetTable?.name || 'None'}`);
      console.log(`     Món: ${out.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}`);
      console.log(`     Thông báo: ${out.message}`);
      passed++;
    } else {
      console.log(`  -> ❌ FAILED Match Criteria:`);
      console.log(`     Action: ${out.action} (exp: ${tc.expectedAction})`);
      console.log(`     Table: ${out.targetTable?.name} (exp: ${tc.expectedTable})`);
      console.log(`     Items: ${JSON.stringify(out.items)}`);
    }
  } else {
    console.log(`  -> ⚠️ Chưa match Rule Engine (Cần chuyển sang LLM)`);
  }
  console.log('');
}

console.log('--- TEST KHOAN DUNG SCHEMA (Zod Schema Resilience Test) ---');

const malformedAiOutputs = [
  {
    name: 'LLM trả về quantity dạng string "3" thay vì số',
    input: { action: 'add', targetTable: { id: '6', name: 'Bàn 6' }, items: [{ productName: 'Ép dưa hấu', quantity: '3' }] },
  },
  {
    name: 'LLM trả về targetTable dạng string "Bàn 6" thay vì object',
    input: { action: 'add', targetTable: 'Bàn 6', items: [{ productName: 'Ép dưa hấu', quantity: 3 }] },
  },
  {
    name: 'LLM không trả về productId (chỉ có productName)',
    input: { action: 'add', items: [{ productName: 'Trà sữa Earl Grey', quantity: 1 }] },
  },
  {
    name: 'LLM trả về toppings dạng string "trân châu đen, thạch" thay vì mảng',
    input: { action: 'add', items: [{ productName: 'Trà sữa', quantity: 1, toppings: 'trân châu đen, thạch' }] },
  },
];

let schemaPassed = 0;
for (const sc of malformedAiOutputs) {
  const parseRes = AiOutputSchema.safeParse(sc.input);
  if (parseRes.success) {
    console.log(`✅ [Schema Resilience] ${sc.name} -> Thành công!`);
    console.log(`   Dữ liệu sau khi parse:`, JSON.stringify(parseRes.data));
    schemaPassed++;
  } else {
    console.log(`❌ [Schema Resilience] ${sc.name} -> Thất bại!`, parseRes.error.format());
  }
}

console.log(`\n========================================`);
console.log(`KẾT QUẢ TỔNG HỢP:`);
console.log(`- Rule Engine NLP Tests: ${passed}/${testCases.length} PASSED`);
console.log(`- Zod Schema Resilience Tests: ${schemaPassed}/${malformedAiOutputs.length} PASSED`);
console.log(`========================================\n`);
