import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import type { AuditSource, AuditStatus } from './schema';

export interface CreateAuditLogParams {
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  rawMessage: string;
  parsedAction: Record<string, unknown>;
  source: AuditSource;
  status: AuditStatus;
  blockedReason?: string | null;
  latencyMs?: number;
  modelName?: string;
  promptVersion?: string;
}

export interface AuditLogRecord extends CreateAuditLogParams {
  id: string;
  createdAt: string;
}

export interface AuditLogStats {
  totalLogs: number;
  confirmedCount: number;
  rejectedCount: number;
  blockedCount: number;
  previewedCount: number;
  ruleCount: number;
  llmCount: number;
  avgLatencyMs: number;
  accuracyRate: number;
}

const LOCAL_LOG_PATH = path.resolve(process.cwd(), 'data/ai_audit_logs.json');

const SEED_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'seed-audit-01',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    staffId: 'NV001',
    staffName: 'Quản trị viên (Admin)',
    staffRole: 'Admin',
    rawMessage: 'bàn 3 thêm 2 trà sữa trân châu đường đen size L 50% đường ít đá thêm kem cheese',
    parsedAction: {
      action: 'add_items',
      tableName: 'Bàn 3',
      items: [
        {
          productName: 'Trà sữa trân châu đường đen',
          quantity: 2,
          size: 'L',
          sugarLevel: '50%',
          iceLevel: 'Ít đá',
          toppings: ['Kem cheese'],
        },
      ],
    },
    source: 'rule',
    status: 'confirmed',
    blockedReason: null,
    latencyMs: 6,
    modelName: 'rule-engine-v2',
    promptVersion: 'v2.0.0',
  },
  {
    id: 'seed-audit-02',
    createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    staffId: 'NV002',
    staffName: 'Thu ngân Minh Anh',
    staffRole: 'Nhân viên',
    rawMessage: 'khách bị dị ứng sữa bò (lactose) và đang ăn kiêng thì nên tư vấn món nào ít calo?',
    parsedAction: {
      action: 'qa',
      topic: 'allergy-and-recipes',
      reply: 'Tư vấn Trà đào cam sả (120-160 kcal, Lactose-free) hoặc Nước ép trái cây tươi (90-135 kcal, 0% sữa).',
    },
    source: 'rule',
    status: 'confirmed',
    blockedReason: null,
    latencyMs: 4,
    modelName: 'rule-engine-v2',
    promptVersion: 'v2.0.0',
  },
  {
    id: 'seed-audit-03',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    staffId: 'NV002',
    staffName: 'Thu ngân Minh Anh',
    staffRole: 'Nhân viên',
    rawMessage: 'bàn 5 cho 1 trà đào cam sả size M 30% đường và 1 bạc xỉu ít đá',
    parsedAction: {
      action: 'add_items',
      tableName: 'Bàn 5',
      items: [
        { productName: 'Trà đào cam sả', quantity: 1, size: 'M', sugarLevel: '30%', iceLevel: 'Bình thường' },
        { productName: 'Bạc xỉu', quantity: 1, size: 'M', sugarLevel: '100%', iceLevel: 'Ít đá' },
      ],
    },
    source: 'llm',
    status: 'confirmed',
    blockedReason: null,
    latencyMs: 640,
    modelName: 'gemini-2.5-flash',
    promptVersion: 'v2.0.0',
  },
  {
    id: 'seed-audit-04',
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    staffId: 'NV003',
    staffName: 'Thu ngân Hoàng Nam',
    staffRole: 'Nhân viên',
    rawMessage: 'bàn 2 bớt 1 trà sữa nướng',
    parsedAction: {
      action: 'remove_items',
      tableName: 'Bàn 2',
      items: [{ productName: 'Trà sữa nướng', quantity: 1 }],
    },
    source: 'rule',
    status: 'confirmed',
    blockedReason: null,
    latencyMs: 5,
    modelName: 'rule-engine-v2',
    promptVersion: 'v2.0.0',
  },
  {
    id: 'seed-audit-05',
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    staffId: 'NV003',
    staffName: 'Thu ngân Hoàng Nam',
    staffRole: 'Nhân viên',
    rawMessage: 'bàn 1 thêm 25 ly trà sữa thái xanh',
    parsedAction: {
      action: 'clarify',
      items: [{ productName: 'Trà sữa Thái xanh', quantity: 25 }],
    },
    source: 'rule',
    status: 'blocked',
    blockedReason: 'Vượt ngưỡng an toàn số lượng tối đa mỗi lệnh (25 > 10 ly). Yêu cầu xác nhận quản lý.',
    latencyMs: 3,
    modelName: 'safety-guard-v2',
    promptVersion: 'v2.0.0',
  },
  {
    id: 'seed-audit-06',
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    staffId: 'NV001',
    staffName: 'Quản trị viên (Admin)',
    staffRole: 'Admin',
    rawMessage: 'mang về 2 trà sữa kem cheese ít đường',
    parsedAction: {
      action: 'add_items',
      tableName: 'Khách mua về',
      items: [{ productName: 'Trà sữa kem Cheese', quantity: 2, sugarLevel: '30%' }],
    },
    source: 'llm',
    status: 'previewed',
    blockedReason: null,
    latencyMs: 580,
    modelName: 'gemini-2.5-flash',
    promptVersion: 'v2.0.0',
  },
];

function appendLocalAuditLog(record: AuditLogRecord) {
  try {
    const dir = path.dirname(LOCAL_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let logs: AuditLogRecord[] = [];
    if (fs.existsSync(LOCAL_LOG_PATH)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOCAL_LOG_PATH, 'utf8'));
      } catch {
        logs = [];
      }
    }
    logs.push(record);
    // Giới hạn 2000 log gần nhất
    if (logs.length > 2000) logs = logs.slice(-2000);
    fs.writeFileSync(LOCAL_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Không thể ghi file local audit log:', err);
  }
}

/**
 * Tạo một bản ghi kiểm toán mới
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<string> {
  const logId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const record: AuditLogRecord = {
    id: logId,
    createdAt,
    ...params,
  };

  // Luôn lưu bản sao vào file local dự phòng để Dashboard có thể đọc ngay cả khi DB chưa tạo bảng
  appendLocalAuditLog(record);

  // Thử ghi vào Supabase ai_audit_logs
  try {
    const supabase = createAdminSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('ai_audit_logs').insert({
        id: logId,
        created_at: createdAt,
        staff_id: params.staffId || null,
        staff_name: params.staffName || null,
        staff_role: params.staffRole || null,
        raw_message: params.rawMessage,
        parsed_action: params.parsedAction,
        source: params.source,
        status: params.status,
        blocked_reason: params.blockedReason || null,
        latency_ms: params.latencyMs || 0,
        model_name: params.modelName || null,
        prompt_version: params.promptVersion || 'v1.0.0',
      });

      if (!error) {
        return logId;
      }
      console.warn('Ghi vào ai_audit_logs DB không khả dụng, đã lưu dự phòng cục bộ:', error.message);
    }
  } catch (dbErr) {
    console.warn('Lỗi kết nối ai_audit_logs DB, fallback local log:', dbErr);
  }

  return logId;
}

/**
 * Cập nhật trạng thái của bản ghi kiểm toán khi người dùng Xác nhận hoặc Từ chối trên UI
 */
export async function updateAuditLogStatus(logId: string, newStatus: AuditStatus): Promise<boolean> {
  let updated = false;

  // 1. Cập nhật trên Supabase
  try {
    const supabase = createAdminSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('ai_audit_logs')
        .update({ status: newStatus })
        .eq('id', logId);

      if (!error) updated = true;
    }
  } catch (err) {
    console.warn('Không thể update ai_audit_logs trên DB:', err);
  }

  // 2. Cập nhật trên local JSON nếu có
  try {
    if (fs.existsSync(LOCAL_LOG_PATH)) {
      const logs: AuditLogRecord[] = JSON.parse(fs.readFileSync(LOCAL_LOG_PATH, 'utf8'));
      const target = logs.find((l) => l.id === logId);
      if (target) {
        target.status = newStatus;
        fs.writeFileSync(LOCAL_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
        updated = true;
      }
    }
  } catch (err) {
    console.error('Không thể cập nhật local audit log:', err);
  }

  return updated;
}

/**
 * Đọc danh sách Nhật ký Kiểm toán AI (AI Audit Logs) và tính toán các chỉ số thống kê KPI
 */
export async function getAuditLogsAndStats(limit = 50): Promise<{
  logs: AuditLogRecord[];
  stats: AuditLogStats;
}> {
  const mergedMap = new Map<string, AuditLogRecord>();

  // 1. Đọc từ Supabase ai_audit_logs nếu có
  try {
    const supabase = createAdminSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ai_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const rec: AuditLogRecord = {
            id: String(row.id),
            createdAt: String(row.created_at || new Date().toISOString()),
            staffId: row.staff_id || undefined,
            staffName: row.staff_name || undefined,
            staffRole: row.staff_role || undefined,
            rawMessage: String(row.raw_message || ''),
            parsedAction:
              row.parsed_action && typeof row.parsed_action === 'object'
                ? (row.parsed_action as Record<string, unknown>)
                : {},
            source: (row.source === 'llm' ? 'llm' : 'rule') as AuditSource,
            status: (['previewed', 'confirmed', 'rejected', 'blocked'].includes(row.status)
              ? row.status
              : 'previewed') as AuditStatus,
            blockedReason: row.blocked_reason || null,
            latencyMs: Number(row.latency_ms || 0),
            modelName: row.model_name || undefined,
            promptVersion: row.prompt_version || 'v1.0.0',
          };
          mergedMap.set(rec.id, rec);
        }
      }
    }
  } catch (err) {
    console.warn('Không thể truy vấn ai_audit_logs từ DB, sử dụng local logs:', err);
  }

  // 2. Đọc và gộp từ file local data/ai_audit_logs.json
  try {
    if (fs.existsSync(LOCAL_LOG_PATH)) {
      const raw = fs.readFileSync(LOCAL_LOG_PATH, 'utf8');
      const localLogs: AuditLogRecord[] = JSON.parse(raw);
      if (Array.isArray(localLogs)) {
        for (const item of localLogs) {
          if (item && item.id && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Không thể đọc file local audit log:', err);
  }

  // 3. Nếu chưa có log nào trên cả DB và Local, khởi tạo dữ liệu mẫu để Dashboard hiển thị trực quan
  if (mergedMap.size === 0) {
    for (const seed of SEED_AUDIT_LOGS) {
      mergedMap.set(seed.id, seed);
    }
  }

  const allLogs = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const logs = allLogs.slice(0, limit);

  const totalLogs = logs.length;
  const confirmedCount = logs.filter((l) => l.status === 'confirmed').length;
  const rejectedCount = logs.filter((l) => l.status === 'rejected').length;
  const blockedCount = logs.filter((l) => l.status === 'blocked').length;
  const previewedCount = logs.filter((l) => l.status === 'previewed').length;
  const ruleCount = logs.filter((l) => l.source === 'rule').length;
  const llmCount = logs.filter((l) => l.source === 'llm').length;

  const totalLatency = logs.reduce((acc, l) => acc + Number(l.latencyMs || 0), 0);
  const avgLatencyMs = totalLogs > 0 ? Math.round(totalLatency / totalLogs) : 0;

  const decisionTotal = confirmedCount + rejectedCount;
  const accuracyRate =
    decisionTotal > 0 ? Math.round((confirmedCount / decisionTotal) * 100) : 100;

  return {
    logs,
    stats: {
      totalLogs,
      confirmedCount,
      rejectedCount,
      blockedCount,
      previewedCount,
      ruleCount,
      llmCount,
      avgLatencyMs,
      accuracyRate,
    },
  };
}
