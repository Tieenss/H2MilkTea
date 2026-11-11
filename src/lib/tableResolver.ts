/**
 * Smart Table Resolver for H2MilkTea
 * Resolves any table identifier variant (IDBAN, Tên bàn, số bàn, slug, unaccented)
 * Examples: 'BAN01', 'B001', '1', '01', 'Bàn 01', 'ban 01', 'takeaway' -> Matched Table Record
 */

export interface TableRecord {
  IDBAN: string;
  'Tên bàn': string;
  'Trạng thái'?: string;
  [key: string]: any;
}

export function stripVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeTableKey(str: string): string {
  if (!str) return '';
  return stripVietnameseAccents(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Trích xuất số bàn nếu có (ví dụ: 'BAN01' -> 1, 'Bàn 02' -> 2, 'b003' -> 3, '5' -> 5)
 */
export function extractTableNumber(str: string): number | null {
  if (!str) return null;
  const cleaned = stripVietnameseAccents(str).toLowerCase();
  
  // Không trích xuất số nếu là mang về
  if (cleaned.includes('takeaway') || cleaned.includes('mua ve') || cleaned.includes('mang ve')) {
    return null;
  }

  // Tìm chuỗi số cuối hoặc sau tiền tố bàn/b/ban
  const match = cleaned.match(/(?:ban|table|b)?\s*0*([1-9]\d*)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }

  const rawNumMatch = cleaned.match(/\b0*([1-9]\d*)\b/);
  if (rawNumMatch && rawNumMatch[1]) {
    const num = parseInt(rawNumMatch[1], 10);
    return isNaN(num) ? null : num;
  }

  return null;
}

export function resolveTableFlexible<T extends TableRecord>(
  query: string | null | undefined,
  tables: T[]
): T | null {
  if (!query || !Array.isArray(tables) || tables.length === 0) {
    return null;
  }

  const raw = query.trim();
  const lower = raw.toLowerCase();
  const normKey = normalizeTableKey(raw);

  // 1. Khách mua về / Takeaway
  if (
    normKey === 'takeaway' ||
    normKey === 'mangve' ||
    normKey === 'muave' ||
    normKey === 'khachmuave' ||
    lower === 'khách mua về'
  ) {
    const takeaway = tables.find(
      t => t.IDBAN === 'Khách mua về' || normalizeTableKey(t['Tên bàn']) === 'khachmuave'
    );
    if (takeaway) return takeaway;
  }

  // 2. Exact match trên IDBAN hoặc Tên bàn
  const exact = tables.find(
    t =>
      t.IDBAN.toLowerCase() === lower ||
      t['Tên bàn'].toLowerCase() === lower ||
      t.IDBAN === raw ||
      t['Tên bàn'] === raw
  );
  if (exact) return exact;

  // 3. Khớp trên Normalized Key (bỏ dấu, bỏ khoảng trắng và ký tự đặc biệt)
  const normMatch = tables.find(t => {
    const tIdNorm = normalizeTableKey(t.IDBAN);
    const tNameNorm = normalizeTableKey(t['Tên bàn']);
    return tIdNorm === normKey || tNameNorm === normKey;
  });
  if (normMatch) return normMatch;

  // 4. Khớp số thứ tự bàn (VD: 'BAN01' -> số 1; 'Bàn 01' (ID B001) -> số 1; '1' -> Bàn 01)
  const queryNum = extractTableNumber(raw);
  if (queryNum !== null) {
    // Ưu tiên tìm bàn có số thứ tự trùng trong Tên bàn (VD: 'Bàn 01' hoặc 'Bàn 1')
    const matchByNumber = tables.find(t => {
      const tNameNum = extractTableNumber(t['Tên bàn']);
      if (tNameNum === queryNum) return true;
      const tIdNum = extractTableNumber(t.IDBAN);
      return tIdNum === queryNum;
    });
    if (matchByNumber) return matchByNumber;
  }

  // 5. Khớp mờ dạng Contains (VD: 'Bàn 01' chứa trong 'Khu A - Bàn 01')
  const containsMatch = tables.find(t => {
    const tNameNorm = normalizeTableKey(t['Tên bàn']);
    const tIdNorm = normalizeTableKey(t.IDBAN);
    return (
      (normKey.length >= 3 && tNameNorm.includes(normKey)) ||
      (normKey.length >= 3 && tIdNorm.includes(normKey)) ||
      (tNameNorm.length >= 3 && normKey.includes(tNameNorm))
    );
  });
  if (containsMatch) return containsMatch;

  return null;
}
