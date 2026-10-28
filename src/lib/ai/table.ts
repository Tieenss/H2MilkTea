/**
 * Module nhận diện và phân giải Bàn (Table Resolver) cho AI POS
 * Ưu tiên tuyệt đối Tên Bàn (name) thay vì Mã Bàn (id) vì mã bàn trong CSDL
 * có thể không trùng khớp với số thứ tự hiển thị, hoặc bàn đã được quản lý đổi tên.
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
  availableTables?: string[];
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
      const takeawayTable = tables.find((t) => {
        const n = normalizeSearchText(t.name);
        return n.includes('khach mua ve') || n.includes('mang ve') || n.includes('takeaway');
      });
      if (takeawayTable) {
        return {
          table: takeawayTable,
          confidence: 1.0,
          matchedText: kw,
        };
      }
    }
  }

  // 2. So khớp trực tiếp theo TÊN BÀN (name) đầy đủ hoặc tên tùy biến
  // Sắp xếp các bàn theo độ dài tên giảm dần (để "Bàn VIP 1" được ưu tiên trước "Bàn 1")
  const sortedByNameLength = [...tables].sort(
    (a, b) => b.name.trim().length - a.name.trim().length,
  );

  for (const t of sortedByNameLength) {
    const normTableName = normalizeSearchText(t.name);
    if (!normTableName) continue;

    // Ranh giới từ hoặc bắt đầu/kết thúc chuỗi để không bị nhầm (ví dụ: "bàn 1" không khớp vào "bàn 10")
    // Cho phép số có hoặc không có số 0 ở đầu (ví dụ "02" khớp với "2")
    const flexibleNamePattern = normTableName
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\b0*([0-9]+)\b/g, '0*$1');

    const nameRegex = new RegExp(`(^|\\s|[^a-z0-9])${flexibleNamePattern}($|\\s|[^a-z0-9])`, 'i');

    if (nameRegex.test(normalized)) {
      return {
        table: t,
        confidence: 0.98,
        matchedText: t.name,
      };
    }
  }

  // 3. Kiểm tra mẫu câu gọi bàn bằng số hoặc từ ngữ:
  // "bàn 3", "bàn 03", "bàn số 3", "b3", "table 3", "bàn ba", "bàn năm"
  const tableRegex = /\b(?:ban|table|b)\s*(?:so\s*)?([0-9]{1,3}|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)\b/gi;
  const match = tableRegex.exec(normalized);

  if (match) {
    const rawNumberPart = match[1].toLowerCase();
    const tableNumber = NUMBER_WORDS[rawNumberPart] ?? parseInt(rawNumberPart, 10);

    if (Number.isInteger(tableNumber) && tableNumber > 0) {
      const formattedNum2 = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;

      // 3.1. ƯU TIÊN TUYỆT ĐỐI THEO TÊN BÀN (t.name):
      // Người dùng gọi "bàn 3", tìm bàn có TÊN là "Bàn 03", "Bàn 3", "B3", "Bàn số 3"...
      let matchedTable = tables.find((t) => {
        const normName = normalizeSearchText(t.name);
        return (
          normName === `ban ${formattedNum2}` ||
          normName === `ban ${tableNumber}` ||
          normName === `b${formattedNum2}` ||
          normName === `b${tableNumber}` ||
          normName === `ban so ${formattedNum2}` ||
          normName === `ban so ${tableNumber}`
        );
      });

      // 3.2. Nếu chưa thấy, tìm bàn mà TÊN chứa số thứ tự này (như "Bàn VIP 3", "Sân thượng 03", "Khu A Bàn 3")
      if (!matchedTable) {
        matchedTable = tables.find((t) => {
          const normName = normalizeSearchText(t.name);
          const numPattern = new RegExp(`(^|\\D)0*${tableNumber}(\\D|$)`, 'i');
          return numPattern.test(normName);
        });
      }

      // 3.3. CHỈ FALLBACK tìm theo IDBAN khi và chỉ khi KHÔNG có bàn nào trùng tên
      // và ID thực sự khớp mã người dùng đọc (ví dụ người dùng đọc mã kỹ thuật BAN003)
      if (!matchedTable) {
        matchedTable = tables.find((t) => {
          const normId = t.id.toLowerCase();
          return (
            normId === `b00${tableNumber}` ||
            normId === `ban00${tableNumber}` ||
            normId === `b${tableNumber}` ||
            normId === `ban${tableNumber}`
          );
        });
      }

      if (matchedTable) {
        return {
          table: matchedTable,
          confidence: 0.95,
          matchedText: match[0],
        };
      }

      // Không tìm thấy bàn nào có tên phù hợp
      const availableTableNames = tables.map((t) => t.name).filter(Boolean);
      return {
        confidence: 1.0,
        matchedText: match[0],
        isNotFound: true,
        requestedName: `Bàn ${formattedNum2}`,
        availableTables: availableTableNames,
      };
    }
  }

  // 4. Khớp tên tùy biến khi người dùng chỉ gọi cụm từ đặc biệt của bàn
  // (Ví dụ quán có bàn tên là: "VIP 1", "Sân Vườn", "Góc Cửa Sổ")
  for (const t of sortedByNameLength) {
    const normTableName = normalizeSearchText(t.name);
    if (normTableName.length < 3) continue;
    if (normalized.includes(normTableName)) {
      return {
        table: t,
        confidence: 0.9,
        matchedText: t.name,
      };
    }
  }

  return null;
}
