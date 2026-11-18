const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Parse linh hoạt nhiều định dạng ngày/giờ về Date local time.
 * Mặc định ưu tiên chuẩn Việt Nam DD/MM/YYYY khi có dấu `/`,
 * đồng thời tương thích ngược MM/DD/YYYY nếu phần thứ hai > 12.
 * Trả về null nếu chuỗi không hợp lệ (không bao giờ trả Invalid Date).
 */
export function parseFlexibleDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(raw).trim();
  if (!str) return null;

  // 1. YYYY-MM-DD (local time để tránh lệch múi giờ UTC)
  const isoDateOnlyMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDateOnlyMatch) {
    const year = parseInt(isoDateOnlyMatch[1], 10);
    const month = parseInt(isoDateOnlyMatch[2], 10);
    const day = parseInt(isoDateOnlyMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const d = new Date(year, month - 1, day);
    if (
      isNaN(d.getTime()) ||
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }
    return d;
  }

  // 2. DD/MM/YYYY [HH:mm[:ss]] (ưu tiên VN) hoặc MM/DD/YYYY [HH:mm[:ss]] (khi b > 12)
  const slashMatch = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    const hours = slashMatch[4] !== undefined ? parseInt(slashMatch[4], 10) : 0;
    const minutes = slashMatch[5] !== undefined ? parseInt(slashMatch[5], 10) : 0;
    const seconds = slashMatch[6] !== undefined ? parseInt(slashMatch[6], 10) : 0;

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      return null;
    }

    let day: number;
    let month: number;

    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
      // Ưu tiên chuẩn Việt Nam DD/MM/YYYY
      day = p1;
      month = p2;
    } else if (p2 > 12 && p2 <= 31 && p1 >= 1 && p1 <= 12) {
      // Tương thích ngược dữ liệu US MM/DD/YYYY (vd: HOADON)
      month = p1;
      day = p2;
    } else {
      return null;
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    if (
      isNaN(d.getTime()) ||
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }
    return d;
  }

  // 3. ISO datetime string (2026-11-18T...) hoặc định dạng chuẩn JS khác
  const direct = new Date(str);
  return isNaN(direct.getTime()) ? null : direct;
}

/**
 * Format ngày theo chuẩn Việt Nam dd/MM/yyyy.
 */
export function formatVNDate(raw: unknown, fallback = '—'): string {
  const d = parseFlexibleDate(raw);
  if (!d) return fallback;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Format ngày giờ theo chuẩn Việt Nam dd/MM/yyyy HH:mm (hoặc kèm :ss).
 */
export function formatVNDateTime(
  raw: unknown,
  fallback = '—',
  includeSeconds = false
): string {
  const d = parseFlexibleDate(raw);
  if (!d) return fallback;
  const base = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return includeSeconds ? `${base}:${pad2(d.getSeconds())}` : base;
}

/**
 * Hiển thị thời gian tương đối bằng tiếng Việt (Hôm nay, Hôm qua, X ngày trước...).
 */
export function formatRelativeTimeVN(
  raw: unknown,
  fallback = 'Không xác định'
): string {
  const d = parseFlexibleDate(raw);
  if (!d) return fallback;

  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  if (diffInMs < 0) return 'Trong tương lai';

  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  if (diffInDays === 0) return 'Hôm nay';
  if (diffInDays === 1) return 'Hôm qua';
  if (diffInDays < 7) return `${diffInDays} ngày trước`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} tuần trước`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} tháng trước`;
  return `${Math.floor(diffInDays / 365)} năm trước`;
}
