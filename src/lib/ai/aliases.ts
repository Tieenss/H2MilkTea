import { normalizeSearchText } from './catalog';

export const DEFAULT_ALIASES: Record<string, string> = {
  // Viết tắt
  'ts': 'tra sua tran chau den',
  'tsnt': 'tra sua topping thach cu nang',
  'tstt': 'tra sua tran chau den',
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

  // Cụm từ thường gặp
  'tra sua truyen thong': 'tra sua tran chau den',
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
};

/**
 * Mở rộng câu lệnh dựa trên từ điển viết tắt (thay thế một lượt từ dài đến ngắn)
 */
export function expandAliasesWithDict(text: string, customAliases?: Record<string, string>): string {
  let normalized = normalizeSearchText(text);
  const aliasDict = { ...DEFAULT_ALIASES, ...(customAliases || {}) };

  // Sắp xếp khóa từ dài đến ngắn để ưu tiên thay thế cụm từ trước
  const sortedKeys = Object.keys(aliasDict).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const normKey = normalizeSearchText(key);
    const regex = new RegExp(`(^|\\s)${normKey}(\\s|$)`, 'g');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, `$1${aliasDict[key]}$2`);
    }
  }

  return normalized.replace(/\s+/g, ' ').trim();
}
