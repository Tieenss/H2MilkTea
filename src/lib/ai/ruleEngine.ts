import type { TableInfo } from './types';
import { resolveTableFromMessage } from './table';
import { expandAliasesWithDict } from './aliases';
import { resolveProduct, normalizeSearchText } from './catalog';
import type { AiOutput, ParsedItem } from './schema';

export interface RuleMatchResult {
  matched: boolean;
  output?: AiOutput;
}

const GREETING_REGEX = /^(xin chào(\s+(bạn|bot|em|shop|ad))?|chào(\s+(bạn|bot|em|shop|ad|buổi sáng|buổi trưa|buổi chiều|buổi tối))?|hello(\s+(bạn|bot))?|hi(\s+(bạn|bot))?|alo(\s+(bạn|bot))?|hey)[!. ]*$/i;
const TABLE_ONLY_REGEX = /^(mở|chuyển( sang)?|chọn|vào)\s+(bàn\s+[a-z0-9]+|khách mua về|mang về)[!. ]*$/i;

/**
 * Trích xuất các tùy chọn phổ biến (đường, đá, topping, nhiệt độ)
 */
function extractNoteAndOptions(text: string): { cleanText: string; note: string } {
  const notes: string[] = [];
  let remaining = text;

  // Tùy chọn đá / nóng
  const tempMatch = remaining.match(/(\d+%\s*da|khong\s*da|it\s*da|nhieu\s*da|nong)/i);
  if (tempMatch) {
    notes.push(tempMatch[0].trim());
    remaining = remaining.replace(tempMatch[0], ' ');
  }

  // Tùy chọn đường
  const sugarMatch = remaining.match(/(\d+%\s*duong|khong\s*duong|it\s*duong|nhieu\s*duong|it\s*ngot)/i);
  if (sugarMatch) {
    notes.push(sugarMatch[0].trim());
    remaining = remaining.replace(sugarMatch[0], ' ');
  }

  // Topping nếu có
  const toppingMatch = remaining.match(/(them|kem)?\s*(tran chau( trang| den)?|thach( cu nang| pho mai| suong sao)?|pudding( trung)?)/i);
  if (toppingMatch) {
    notes.push(toppingMatch[0].trim());
    remaining = remaining.replace(toppingMatch[0], ' ');
  }

  return {
    cleanText: remaining.replace(/\s+/g, ' ').trim(),
    note: notes.join(', '),
  };
}

/**
 * Phân tích câu lệnh dựa trên quy tắc và từ điển alias (không tốn chi phí LLM)
 */
export function matchRuleBased(
  rawMessage: string,
  catalog: any[],
  tables: TableInfo[],
  customAliases?: Record<string, string>
): RuleMatchResult {
  const trimmed = rawMessage.trim();

  // 1. Kiểm tra câu chào hỏi
  if (GREETING_REGEX.test(trimmed)) {
    return {
      matched: true,
      output: {
        action: 'none',
        targetTable: null,
        items: [],
        message: 'Xin chào! Tôi là Trợ lý POS H2 MilkTea. Tôi có thể giúp thêm/bớt món, chuyển bàn hoặc trả lời hướng dẫn nghiệp vụ.',
      },
    };
  }

  // 2. Kiểm tra câu lệnh chỉ chọn hoặc mở bàn
  if (TABLE_ONLY_REGEX.test(trimmed)) {
    const tableRes = resolveTableFromMessage(trimmed, tables);
    if (tableRes && tableRes.table) {
      return {
        matched: true,
        output: {
          action: 'select_table',
          targetTable: tableRes.table,
          items: [],
          message: `Chuyển sang ${tableRes.table.name}.`,
        },
      };
    }
  }

  // 3. Phân tích thêm/bớt món theo mẫu rõ ràng (Rule-based item matching)
  const isRemove = /(bớt|xóa|hủy|giảm)\s+/i.test(trimmed);
  const action = isRemove ? 'remove' : 'add';

  // Tách bàn dựa trên chuỗi chuẩn hóa
  const tableRes = resolveTableFromMessage(trimmed, tables);
  let workingText = normalizeSearchText(trimmed);

  if (tableRes && tableRes.matchedText) {
    const tablePattern = new RegExp(`(cho|vao|o|sang)?\\s*${tableRes.matchedText}`, 'gi');
    workingText = workingText.replace(tablePattern, ' ');
  }

  // Tách từ khóa hành động ở đầu
  workingText = workingText.replace(/^(cho|them|lay|goi|bot|xoa|huy)\s+/i, '').trim();

  // Tách các món: hỗ trợ dấu phẩy, "va", "voi", "kem", "+", hoặc khoảng trắng trước số lượng tiếp theo (vd: "2 bx 1 cf")
  const parts = workingText
    .split(/,|\bva\b|\bvoi\b|\bkem\b|\+|\s+(?=\d+\s*[a-z]+)/i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { matched: false };
  }

  const parsedItems: ParsedItem[] = [];

  for (const part of parts) {
    // Tìm số lượng ở đầu chuỗi (ví dụ: "2 ts", "1 ly tra dao")
    const qtyMatch = part.match(/^(\d+)\s*(ly|coc|phan|chai)?\s*(.*)$/i);
    let quantity = 1;
    let queryPart = part;

    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      queryPart = qtyMatch[3] || '';
    }

    if (quantity > 10) {
      return {
        matched: true,
        output: {
          action: 'none',
          targetTable: tableRes?.table || null,
          items: [],
          message: `Yêu cầu gọi ${quantity} ly vượt quá giới hạn an toàn (tối đa 10 ly/lần). Vui lòng nhờ quản lý xác nhận số lượng lớn.`,
        },
      };
    }

    const { cleanText, note } = extractNoteAndOptions(queryPart);
    if (!cleanText) continue;

    // Mở rộng alias
    const expanded = expandAliasesWithDict(cleanText, customAliases);

    // Tìm trong catalog món
    const resolved = resolveProduct(expanded, catalog);
    if (resolved.status === 'resolved' && resolved.score >= 0.7) {
      parsedItems.push({
        productId: resolved.product.id,
        productName: resolved.product.name,
        quantity,
        note,
      });
    } else {
      // Nếu có món không nhận diện được chắc chắn -> bàn giao cho LLM xử lý
      return { matched: false };
    }
  }

  if (parsedItems.length > 0) {
    const tableSuffix = tableRes?.table ? ` cho ${tableRes.table.name}` : '';
    const itemNames = parsedItems.map((i) => `${i.quantity}x ${i.productName}${i.note ? ` (${i.note})` : ''}`).join(', ');
    const msg = action === 'remove'
      ? `Đã nhận diện bớt: ${itemNames}${tableSuffix}. Vui lòng xác nhận.`
      : `Đã nhận diện thêm: ${itemNames}${tableSuffix}. Vui lòng xác nhận.`;

    return {
      matched: true,
      output: {
        action,
        targetTable: tableRes?.table || null,
        items: parsedItems,
        message: msg,
      },
    };
  }

  return { matched: false };
}
