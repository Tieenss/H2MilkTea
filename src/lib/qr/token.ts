import crypto from 'crypto';

const QR_SECRET = process.env.QR_HMAC_SECRET || process.env.NEXTAUTH_SECRET || 'h2milktea-qr-default-secret';

// In-memory rate limiting map (IP + table -> timestamps)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 phút
const MAX_REQUESTS_PER_WINDOW = 5; // Tối đa 5 đơn / phút / bàn

/**
 * Tạo token HMAC xác thực phiên bàn cho mã QR
 */
export function generateTableQrToken(tableId: string, timestamp = Date.now()): string {
  const payload = `${tableId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Xác thực token HMAC của bàn
 * Token hết hạn sau 24 giờ kể từ khi in mã QR
 */
export function verifyTableQrToken(token: string, expectedTableId: string, maxAgeMs = 24 * 60 * 60 * 1000): { valid: boolean; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Cấu trúc token không hợp lệ.' };
    }

    const [tableId, timestampStr, signature] = parts;
    if (tableId.toLocaleLowerCase() !== expectedTableId.toLocaleLowerCase()) {
      return { valid: false, reason: 'Token không khớp với mã bàn yêu cầu.' };
    }

    const timestamp = Number(timestampStr);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > maxAgeMs) {
      return { valid: false, reason: 'Mã QR đã hết hạn, vui lòng quét lại mã mới.' };
    }

    const expectedPayload = `${tableId}:${timestampStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(expectedPayload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, reason: 'Chữ ký token không hợp lệ.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Lỗi giải mã token.' };
  }
}

/**
 * Kiểm tra giới hạn tốc độ (Rate Limit) chống spam tạo đơn từ cùng IP + Bàn
 */
export function checkOrderRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(identifier) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  rateLimitMap.set(identifier, timestamps);

  // Dọn dẹp bộ nhớ định kỳ nếu map quá lớn
  if (rateLimitMap.size > 2000) {
    for (const [key, list] of rateLimitMap.entries()) {
      if (list.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - timestamps.length };
}
