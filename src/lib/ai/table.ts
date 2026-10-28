/**
 * Module nhận diện và phân giải Bàn (Table Resolver) cho AI POS
 */

import { normalizeSearchText } from './catalog';

export interface TableInfo {
  id: string;
  name: string;
}

export interface TableMatchResult {
  table?: TableInfo;
  confidence: number;
  matchedText: string;
  isNotFound?: boolean;
  requestedName?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  'mot': 1,
  'hai': 2,
  'ba': 3,
  'bon': 4,
  'tu': 4,
  'nam': 5,
  'sau': 6,
  'bay': 7,
  'tam': 8,
  'chin': 9,
  'muoi': 10,
};

/**
 * Trích xuất và khớp bàn mục tiêu từ câu nói của người dùng
 */
export function resolveTableFromMessage(
  message: string,
  tables: TableInfo[],
): TableMatchResult | null {
  if (!message || !tables.length) return null;

  const normalized = normalizeSearchText(message);

  // 1. Kiểm tra trường hợp "Khách mua về" / "mang về" / "take away"
  const takeawayKeywords = ['mang ve', 'mua ve', 'khach mua ve', 'mang di', 'take away', 'takeaway'];
  for (const kw of takeawayKeywords) {
    if (normalized.includes(kw)) {
      const takeawayTable = tables.find(
        (t) => normalizeSearchText(t.name).includes('khach mua ve') || normalizeSearchText(t.name).includes('mang ve'),
      );
      if (takeawayTable) {
        return {
          table: takeawayTable,
          confidence: 1.0,
          matchedText: kw,
        };
      }
    }
  }

  // 2. Khớp trực tiếp tên bàn nếu có nhắc đầy đủ (ví dụ "Bàn VIP 1", "Bàn 03", "Sân thượng 2")
  for (const t of tables) {
    const normTableName = normalizeSearchText(t.name);
    if (normTableName && (normalized.includes(normTableName) || normalized.includes(t.id.toLowerCase()))) {
      return {
        table: t,
        confidence: 0.95,
        matchedText: t.name,
      };
    }
  }

  // 3. Kiểm tra mẫu câu có số bàn: "bàn 3", "bàn 03", "bàn số 3", "b3", "table 3", "bàn ba"
  // Regex tìm: (ban|b|table)\s*(so\s*)?([0-9]+|[a-z]+)
  const tableRegex = /\b(?:ban|table|b)\s*(?:so\s*)?([0-9]{1,3}|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)\b/gi;
  const match = tableRegex.exec(normalized);

  if (match) {
    const rawNumberPart = match[1].toLowerCase();
    const tableNumber = NUMBER_WORDS[rawNumberPart] ?? parseInt(rawNumberPart, 10);

    if (Number.isInteger(tableNumber) && tableNumber > 0) {
      // Tìm bàn phù hợp trong danh sách
      // Tên bàn có thể là: "Bàn 03", "Bàn 3", "Bàn số 3", "B003", "BAN003"...
      const matchedTable = tables.find((t) => {
        const normName = normalizeSearchText(t.name);
        const numPattern = new RegExp(`\\b0*${tableNumber}\\b`);
        return (
          numPattern.test(normName) ||
          t.id.toLowerCase() === `b00${tableNumber}` ||
          t.id.toLowerCase() === `ban00${tableNumber}` ||
          t.id.toLowerCase() === `b${tableNumber}` ||
          t.id.toLowerCase() === `ban${tableNumber}`
        );
      });

      if (matchedTable) {
        return {
          table: matchedTable,
          confidence: 0.95,
          matchedText: match[0],
        };
      }

      // Người dùng đã chỉ định số bàn cụ thể nhưng không có trong danh sách bàn
      const formattedNum = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
      return {
        confidence: 1.0,
        matchedText: match[0],
        isNotFound: true,
        requestedName: `Bàn ${formattedNum}`,
      };
    }
  }

  return null;
}
