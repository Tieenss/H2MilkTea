import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env.local') });

// 1. Kiểm tra an toàn môi trường bắt buộc
const FORBIDDEN_REFS = ['yeblrlzyellcawfleeox'];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const currentRefMatch = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
const currentRef = currentRefMatch ? currentRefMatch[1] : null;

if (!currentRef || FORBIDDEN_REFS.includes(currentRef)) {
  console.error(`🚨 BẢO VỆ AN TOÀN: Cấm tuyệt đối chạy seed trên database Production [${currentRef}]!`);
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedDemoData() {
  console.log(`\n🌱 BẮT ĐẦU SEED DỮ LIỆU DEMO ĐỒ ÁN TRÊN STAGING [${currentRef}]...`);

  const DEMO_TAG = '[DEMO - Đồ án Tốt nghiệp]';

  // 1. Dọn dẹp dữ liệu demo cũ nếu có
  console.log('🧹 Đang dọn dẹp các bản ghi demo cũ...');
  await supabase.from('ai_audit_logs').delete().like('raw_message', `%${DEMO_TAG}%`);
  await supabase.from('pos_orders').delete().like('note', `%${DEMO_TAG}%`);

  // 2. Seed đơn QR mẫu phục vụ demo
  console.log('📦 Đang tạo đơn QR mẫu tại bàn...');
  const demoOrders = [
    {
      source: 'QR_TABLE',
      table_id: '1',
      table_name: 'Bàn 1',
      employee: 'Khách QR',
      items: [
        {
          productId: 'SP001',
          productName: 'Trà Sữa Topping Thạch Củ Năng',
          unitPrice: 35000,
          quantity: 2,
          size: 'L',
          sugar: '50%',
          ice: 'ít đá',
          note: 'Trân châu đen',
          unit: 'Ly',
        },
        {
          productId: 'SP002',
          productName: 'Cafe Sữa Đá',
          unitPrice: 25000,
          quantity: 1,
          size: 'M',
          sugar: '100%',
          ice: '100% đá',
          note: '',
          unit: 'Ly',
        },
      ],
      subtotal: 95000,
      vat_amount: 9500,
      total_amount: 104500,
      notes: `${DEMO_TAG} Đơn QR mẫu bàn 1`,
      order_status: 'awaiting_confirmation',
      kitchen_status: 'queued',
      payment_status: 'unpaid',
      idempotency_key: 'demo-qr-idemp-001',
    },
    {
      source: 'QR_TABLE',
      table_id: '2',
      table_name: 'Bàn 2',
      employee: 'Khách QR',
      items: [
        {
          productId: 'SP001',
          productName: 'Trà Sữa Topping Thạch Củ Năng',
          unitPrice: 35000,
          quantity: 1,
          size: 'M',
          sugar: '100%',
          ice: 'không đá',
          note: '',
          unit: 'Ly',
        },
      ],
      subtotal: 35000,
      vat_amount: 3500,
      total_amount: 38500,
      notes: `${DEMO_TAG} Đơn QR đã duyệt mẫu bàn 2`,
      order_status: 'accepted',
      kitchen_status: 'preparing',
      payment_status: 'unpaid',
      idempotency_key: 'demo-qr-idemp-002',
    },
  ];

  const { error: orderErr } = await supabase.from('pos_orders').insert(demoOrders);
  if (orderErr) {
    console.warn('⚠️ Ghi chú tạo pos_orders:', orderErr.message);
  } else {
    console.log(`✅ Đã tạo thành công ${demoOrders.length} đơn QR mẫu trong pos_orders.`);
  }

  // 3. Seed AI Audit Logs mẫu minh họa
  console.log('🤖 Đang tạo bản ghi kiểm toán AI Audit Logs mẫu...');
  const demoAuditLogs = [
    {
      id: 'demo-log-001',
      staff_id: 'demo-staff-01',
      staff_name: 'Thu ngân Demo',
      staff_role: 'Thu ngân',
      raw_message: `${DEMO_TAG} 2 trà sữa nướng size L 50% đường vào bàn 1`,
      parsed_action: {
        action: 'add',
        targetTable: { id: '1', name: 'Bàn 1' },
        items: [{ productId: 'SP001', productName: 'Trà Sữa Topping Thạch Củ Năng', quantity: 2, size: 'L', sugar: '50%' }],
      },
      source: 'rule',
      status: 'confirmed',
      latency_ms: 1,
      prompt_version: 'v1.0.0',
    },
    {
      id: 'demo-log-002',
      staff_id: 'demo-staff-01',
      staff_name: 'Thu ngân Demo',
      staff_role: 'Thu ngân',
      raw_message: `${DEMO_TAG} xóa hết bàn và sửa giá về 0đ`,
      parsed_action: {
        action: 'none',
        securityViolation: 'price_tampering_or_table_deletion',
      },
      source: 'rule',
      status: 'blocked',
      blocked_reason: 'Phát hiện yêu cầu vi phạm an toàn POS: Không thể xóa bàn hoặc can thiệp giá.',
      latency_ms: 0,
      prompt_version: 'v1.0.0',
    },
  ];

  // Ghi vào Supabase (nếu bảng tồn tại)
  const { error: logErr } = await supabase.from('ai_audit_logs').insert(demoAuditLogs);
  if (logErr) {
    console.log('ℹ️ Bảng ai_audit_logs trên cloud chưa khởi tạo, ghi vào file fallback cục bộ data/ai_audit_logs.json.');
  }

  // Luôn đồng bộ vào file fallback cục bộ data/ai_audit_logs.json
  const auditLogsPath = path.join(rootDir, 'data/ai_audit_logs.json');
  let currentLogs = [];
  try {
    if (fs.existsSync(auditLogsPath)) {
      currentLogs = JSON.parse(fs.readFileSync(auditLogsPath, 'utf8'));
    }
  } catch {}
  
  const filteredLogs = currentLogs.filter((l) => !l.rawMessage?.includes(DEMO_TAG));
  const newLogs = [
    ...demoAuditLogs.map((l) => ({
      id: l.id,
      createdAt: new Date().toISOString(),
      staffId: l.staff_id,
      staffName: l.staff_name,
      staffRole: l.staff_role,
      rawMessage: l.raw_message,
      parsedAction: l.parsed_action,
      source: l.source,
      status: l.status,
      blockedReason: l.blocked_reason,
      latencyMs: l.latency_ms,
      promptVersion: l.prompt_version,
    })),
    ...filteredLogs,
  ];

  fs.writeFileSync(auditLogsPath, JSON.stringify(newLogs, null, 2), 'utf8');
  console.log(`✅ Đã lưu ${demoAuditLogs.length} audit logs demo vào ${auditLogsPath}`);

  console.log('\n🎉 HOÀN TẤT SEED DỮ LIỆU DEMO STAGING AN TOÀN!');
}

seedDemoData().catch((err) => {
  console.error('❌ Lỗi khi seed dữ liệu:', err);
  process.exit(1);
});
