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

const LOCAL_LOG_PATH = path.resolve(process.cwd(), 'data/ai_audit_logs.json');

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

  // 1. Thử ghi vào Supabase ai_audit_logs
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
      console.warn('Ghi vào ai_audit_logs DB không khả dụng, lưu dự phòng cục bộ:', error.message);
    }
  } catch (dbErr) {
    console.warn('Lỗi kết nối ai_audit_logs DB, fallback local log:', dbErr);
  }

  // 2. Dự phòng cục bộ (Local JSON fallback)
  appendLocalAuditLog(record);
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
