import { normalizeSearchText } from './catalog';

export const DEFAULT_ALIASES: Record<string, string> = {
  // Sửa lỗi gõ phím / ngữ âm tiếng Việt & tên món nước ép
  'luoc ep dua': 'ep dua hau',
  'nuoc ep dua': 'ep dua hau',
  'ep dua': 'ep dua hau',
  'nuoc dua': 'ep dua hau',
  'luoc ep': 'nuoc ep',
  'luoc': 'nuoc',
  'ep thom': 'nuoc ep dua',
  'ep khom': 'nuoc ep dua',
  'nuoc thom': 'nuoc ep dua',
  'nuoc ep thom': 'nuoc ep dua',

  // Viết tắt đồ uống
  'ts': 'tra sua tran chau den',
  'tsnt': 'tra sua topping thach cu nang',
  'tstt': 'tra sua tran chau den',
  'tstc': 'tra sua tran chau den',
  'cf': 'cafe sua da',
  'cfd': 'cafe den da',
  'cfs': 'cafe sua da',
  'dcs': 'tra dao cam sa',
  'bx': 'bac xiu',
  'tt': 'tran chau den',
  'tc': 'tran chau',
  'tct': 'tran chau trang',
  'tcd': 'tran chau den',
  'olong': 'tra sua earl grey',
  'sttc': 'tra sua tran chau duong den',
  'td': 'tra dao cam sa',
  'tv': 'tra vai',

  // Từ lóng vùng miền & cụm từ thường gặp
  'nau da': 'cafe sua da',
  'nau nong': 'cafe sua nong',
  'den da': 'cafe den da',
  'den nong': 'cafe den nong',
  'tra sua truyen thong': 'tra sua tran chau den',
  'tra sua tran chau': 'tra sua tran chau den',
  'tra sua': 'tra sua tran chau den',
  'tra sua nuong': 'tra sua topping thach cu nang',
  'hong tra dac biet': 'hong tra sua',
  'hong tra': 'hong tra sua',
  'tra o long': 'tra sua earl grey',
  'tra dao': 'tra dao cam sa',
  'tra chanh mat ong': 'tra chanh',
  'tra xoai': 'tra sua xoai kem cheese',
  'sua tuoi tran chau duong den': 'tra sua tran chau duong den',
  'sua tuoi tran chau': 'tra sua tran chau duong den',
  'ca phe den nong': 'cafe den nong',
  'ca phe den da': 'cafe den da',
  'ca phe den': 'cafe den da',
  'ca phe sua da': 'cafe sua da',
  'ca phe sua': 'cafe sua da',
  'ca phe': 'cafe sua da',
  'cafe': 'cafe sua da',
  'matcha': 'tra sua matcha dau do',
  'tra sua matcha': 'tra sua matcha dau do',
};

/**
 * Mở rộng câu lệnh dựa trên từ điển viết tắt (Single-pass thay thế để chống lặp từ)
 */
export function expandAliasesWithDict(text: string, customAliases?: Record<string, string>): string {
  const normalized = normalizeSearchText(text);
  const aliasDict = { ...DEFAULT_ALIASES, ...(customAliases || {}) };

  // Sắp xếp khóa từ dài đến ngắn để ưu tiên thay thế cụm từ trước
  const sortedKeys = Object.keys(aliasDict)
    .map(k => normalizeSearchText(k))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (sortedKeys.length === 0) return normalized;

  // Single-pass replacement bằng RegExp với boundary \b
  const escapedKeys = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const combinedRegex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'g');

  const result = normalized.replace(combinedRegex, (matched) => {
    return aliasDict[matched] || matched;
  });

  return result.replace(/\s+/g, ' ').trim();
}
