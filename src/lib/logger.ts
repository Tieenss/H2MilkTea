/**
 * Hệ thống Logger tập trung với Correlation ID
 * Phục vụ truy vết lỗi và giám sát sự cố (Phase 5)
 */

export function getCorrelationId(headers?: Headers | null): string {
  if (!headers) return crypto.randomUUID();
  return headers.get('x-correlation-id') || crypto.randomUUID();
}

export interface LogContext {
  context: string;
  correlationId?: string;
  staffId?: string;
  tableId?: string;
  path?: string;
}

export function logError(
  context: string | LogContext,
  error: unknown,
  extra?: Record<string, unknown>
): string {
  const ctx = typeof context === 'string' ? { context } : context;
  const cid = ctx.correlationId || crypto.randomUUID();
  const errMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const extraStr = extra ? ` | Extra: ${JSON.stringify(extra)}` : '';
  console.error(`[ERROR][CID:${cid}][${ctx.context}] ${errMsg}${extraStr}`, stack ? `\nStack: ${stack}` : '');
  return cid;
}

export function logInfo(
  context: string | LogContext,
  message: string,
  extra?: Record<string, unknown>
): void {
  const ctx = typeof context === 'string' ? { context } : context;
  const cid = ctx.correlationId || 'SYS';
  const extraStr = extra ? ` | ${JSON.stringify(extra)}` : '';
  console.log(`[INFO][CID:${cid}][${ctx.context}] ${message}${extraStr}`);
}

export function logWarn(
  context: string | LogContext,
  warning: string,
  extra?: Record<string, unknown>
): void {
  const ctx = typeof context === 'string' ? { context } : context;
  const cid = ctx.correlationId || 'SYS';
  const extraStr = extra ? ` | ${JSON.stringify(extra)}` : '';
  console.warn(`[WARN][CID:${cid}][${ctx.context}] ${warning}${extraStr}`);
}
