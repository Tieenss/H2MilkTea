import type { TableInfo, CatalogProduct } from './types';
import { resolveTableFromMessage } from './table';
import { expandAliasesWithDict } from './aliases';
import { resolveProduct, normalizeSearchText } from './catalog';
import type { AiOutput, ParsedItem } from './schema';

export interface RuleMatchResult {
  matched: boolean;
  output?: AiOutput;
}

const GREETING_REGEX = /^(xin chào(\s+(bạn|bot|em|shop|ad|trợ lý|ai))?|chào(\s+(bạn|bot|em|shop|ad|trợ lý|ai|buổi sáng|buổi trưa|buổi chiều|buổi tối))?|hello(\s+(bạn|bot|trợ lý|ai))?|hi(\s+(bạn|bot))?|alo(\s+(bạn|bot))?|hey)[!. ]*$/i;
const OPEN_TABLE_REGEX = /^(?:mở|chuyển(?:\s+sang)?|chọn|vào)\s+(?:bàn\s+[a-z0-9]+|khách mua về|mang về)(?:\s*(?:và|rồi|để)?\s*(?:thêm món|gọi món|order|lên đơn))?[!. ]*$/i;

/**
 * Trích xuất các tùy chọn phổ biến (size, đường, đá, topping, nhiệt độ)
 */
function extractNoteAndOptions(text: string): {
  cleanText: string;
  note: string;
  size: string;
  sugar: string;
  ice: string;
  toppings: string[];
} {
  const notes: string[] = [];
  let remaining = text;
  let size = 'M';
  let sugar = '100%';
  let ice = '100% đá';
  const toppings: string[] = [];

  // Tùy chọn size (S / M / L)
  const sizeMatch = remaining.match(/\b(size\s*[sml]|ly\s*(lon|vua|nho)|size\s*(lon|vua|nho))\b/i);
  if (sizeMatch) {
    const rawVal = sizeMatch[0].toLowerCase().replace(/^(size|ly)\s*/i, '').trim();
    if (rawVal === 's' || rawVal === 'nho') size = 'S';
    else if (rawVal === 'l' || rawVal === 'lon') size = 'L';
    else size = 'M';
    remaining = remaining.replace(sizeMatch[0], ' ');
  }

  // Tùy chọn đá / nóng
  const tempMatch = remaining.match(/(\d+\s*%?\s*da|khong\s*da|it\s*da|nhieu\s*da|nong)/i);
  if (tempMatch) {
    const rawIce = tempMatch[0].trim();
    notes.push(rawIce);
    const numMatch = rawIce.match(/^(\d+)/);
    if (numMatch) {
      ice = `${numMatch[1]}% đá`;
    } else if (/khong\s*da/i.test(rawIce)) {
      ice = 'không đá';
    } else if (/it\s*da/i.test(rawIce)) {
      ice = 'ít đá';
    } else if (/nhieu\s*da/i.test(rawIce)) {
      ice = 'nhiều đá';
    } else if (/nong/i.test(rawIce)) {
      ice = 'nóng';
    } else {
      ice = rawIce;
    }
    remaining = remaining.replace(tempMatch[0], ' ');
  }

  // Tùy chọn đường
  const sugarMatch = remaining.match(/(\d+\s*%?\s*duong|khong\s*duong|it\s*duong|nhieu\s*duong|it\s*ngot)/i);
  if (sugarMatch) {
    const rawSugar = sugarMatch[0].trim();
    notes.push(rawSugar);
    const numMatch = rawSugar.match(/^(\d+)/);
    if (numMatch) {
      sugar = `${numMatch[1]}%`;
    } else if (/khong\s*duong/i.test(rawSugar)) {
      sugar = '0%';
    } else if (/it\s*duong|it\s*ngot/i.test(rawSugar)) {
      sugar = '50%';
    } else if (/nhieu\s*duong/i.test(rawSugar)) {
      sugar = '100%';
    } else {
      sugar = rawSugar;
    }
    remaining = remaining.replace(sugarMatch[0], ' ');
  }

  // Topping nếu có (phải có từ chỉ định như "thêm", "kèm", "topping", "+" hoặc nằm sau cùng)
  const toppingMatch = remaining.match(/(?:them|kem|topping|\+)\s*(tran chau( trang| den)?|thach( cu nang| pho mai| suong sao)?|pudding( trung)?)/i);
  if (toppingMatch) {
    const rawTopping = toppingMatch[0].trim();
    const toppingName = rawTopping.replace(/^(?:them|kem|topping|\+)\s*/i, '');
    notes.push(`Thêm ${toppingName}`);
    toppings.push(toppingName);
    remaining = remaining.replace(toppingMatch[0], ' ');
  }

  return {
    cleanText: remaining.replace(/\s+/g, ' ').trim(),
    note: notes.join(', '),
    size,
    sugar,
    ice,
    toppings,
  };
}

/**
 * Phân tích câu lệnh dựa trên quy tắc và từ điển alias (không tốn chi phí LLM)
 */
export function matchRuleBased(
  rawMessage: string,
  catalog: CatalogProduct[],
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
        isBlocked: false,
        blockedReason: null,
      },
    };
  }

  // Phân giải bàn từ câu lệnh
  const tableRes = resolveTableFromMessage(trimmed, tables);

  // 2. Nếu người dùng chỉ định một bàn KHÔNG TỒN TẠI trong quán -> Báo lỗi ngay lập tức
  if (tableRes?.isNotFound) {
    const activeNames = tables.map((t) => t.name).join(', ');
    return {
      matched: true,
      output: {
        action: 'none',
        targetTable: null,
        items: [],
        message: `⚠️ Quán không có "${tableRes.requestedName}" trong hệ thống (hoặc bàn đang ngừng hoạt động). Quán hiện có các bàn: ${activeNames}. Vui lòng chọn lại đúng bàn.`,
        isBlocked: false,
        blockedReason: null,
      },
    };
  }

  // 3. Kiểm tra câu lệnh chỉ mở bàn hoặc "mở bàn X và thêm món" nhưng chưa nói rõ món cụ thể
  if (OPEN_TABLE_REGEX.test(trimmed) && tableRes?.table) {
    return {
      matched: true,
      output: {
        action: 'select_table',
        targetTable: tableRes.table,
        items: [],
        message: `Đã chọn ${tableRes.table.name}. Bàn hiện chưa có món nào, bạn muốn gọi thêm những món gì cho bàn này ạ? (Gợi ý: Trà sữa nướng, Trà đào, Cà phê muối...)`,
        isBlocked: false,
        blockedReason: null,
      },
    };
  }

  // 4. Phân tích thêm/bớt món theo mẫu rõ ràng (Rule-based item matching)
  const isRemove = /(bớt|xóa|hủy|giảm)\s+/i.test(trimmed);
  const action = isRemove ? 'remove' : 'add';

  let workingText = normalizeSearchText(trimmed);

  // Xóa phần bàn ra khỏi chuỗi để phân tích món
  if (tableRes && tableRes.matchedText) {
    const normMatched = normalizeSearchText(tableRes.matchedText);
    const tablePattern = new RegExp(`(?:cho|vao|o|sang|mo)?\\s*(?:${tableRes.matchedText}|${normMatched})`, 'gi');
    workingText = workingText.replace(tablePattern, ' ');
  }

  // Tách từ khóa hành động và các cụm đại từ xưng hô tự nhiên (vd: "thêm cho tôi", "cho mình", "lấy giùm anh", "order giúp em")
  workingText = workingText.trim()
    .replace(/^(?:mo|cho|them|lay|goi|order|len don|bot|xoa|huy|giam|chon|chuyen sang|chuyen|vao)(\s+(?:cho|gium|ho)?\s*(?:toi|tao|minh|em|anh|chi|khach|ban))?\s+/i, ' ')
    .replace(/\b(?:cho|gium|ho)\s+(?:toi|tao|minh|em|anh|chi|khach)\b/gi, ' ')
    .trim();

  // Tách các món: hỗ trợ dấu phẩy, "va", "voi", "kem", "+", hoặc khoảng trắng trước số lượng tiếp theo (vd: "2 bx 1 cf")
  const parts = workingText
    .split(/,|\bva\b|\bvoi\b|\bkem\b|\+|\s+(?=\d+\s*(?!(?:duong|da)\b)[a-z]+)/i)
    .filter((p): p is string => typeof p === 'string')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    // Nếu chỉ có ý định chọn bàn
    if (tableRes?.table) {
      return {
        matched: true,
        output: {
          action: 'select_table',
          targetTable: tableRes.table,
          items: [],
          message: `Đã chọn ${tableRes.table.name}. Bàn hiện chưa có món nào, bạn muốn gọi thêm những món gì cho bàn này ạ?`,
          isBlocked: false,
          blockedReason: null,
        },
      };
    }
    return { matched: false };
  }

  const parsedItems: ParsedItem[] = [];

  for (const part of parts) {
    // Loại bỏ từ xưng hô nếu còn sót ở từng phần (vd: "cho toi 3 luoc ep dua" -> "3 luoc ep dua")
    const cleanPart = part
      .replace(/^(?:(?:cho|lay|them|order|goi)\s+)?(?:cho\s+|gium\s+|ho\s+)?(?:toi|tao|minh|em|anh|chi|khach|ban)\s+/i, '')
      .trim();

    // Tìm số lượng ở đầu chuỗi (ví dụ: "3 luoc ep dua", "2 ts", "1 ly tra dao")
    const qtyMatch = cleanPart.match(/^(\d+)\s*(ly|coc|phan|chai|suat|dia|tach)?\s*(.*)$/i);
    let quantity = 1;
    let queryPart = cleanPart;

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
          isBlocked: false,
          blockedReason: null,
        },
      };
    }

    const { cleanText, note, size, sugar, ice, toppings } = extractNoteAndOptions(queryPart);
    if (!cleanText) continue;

    // Mở rộng alias & sửa lỗi gõ phím / ngữ âm (lước -> nước, ep dua -> ep dua hau)
    const expanded = expandAliasesWithDict(cleanText, customAliases);

    // Tìm trong catalog món
    const resolved = resolveProduct(expanded, catalog);
    if (resolved.status === 'resolved' && resolved.score >= 0.7) {
      parsedItems.push({
        productId: resolved.product.id,
        productName: resolved.product.name,
        quantity,
        note,
        size,
        sugar,
        ice,
        toppings,
      });
    } else {
      // Thử tìm với cleanText gốc nếu alias không match
      const fallbackResolved = resolveProduct(cleanText, catalog);
      if (fallbackResolved.status === 'resolved' && fallbackResolved.score >= 0.7) {
        parsedItems.push({
          productId: fallbackResolved.product.id,
          productName: fallbackResolved.product.name,
          quantity,
          note,
          size,
          sugar,
          ice,
          toppings,
        });
      } else {
        // Nếu có món không nhận diện được chắc chắn -> bàn giao cho LLM xử lý
        return { matched: false };
      }
    }
  }

  if (parsedItems.length > 0) {
    const tableSuffix = tableRes?.table ? ` cho ${tableRes.table.name}` : '';
    const itemNames = parsedItems.map((i) => {
      const opts = [
        i.size && i.size !== 'M' ? `Size ${i.size}` : null,
        i.sugar && i.sugar !== '100%' ? `${i.sugar} đường` : null,
        i.ice && i.ice !== '100% đá' ? i.ice : null,
        i.toppings?.length ? i.toppings.join(', ') : null,
        i.note,
      ].filter(Boolean);
      const uniqueOpts = Array.from(new Set(opts));
      return `${i.quantity}x ${i.productName}${uniqueOpts.length ? ` (${uniqueOpts.join(', ')})` : ''}`;
    }).join(', ');
    const msg = action === 'remove'
      ? `Đã nhận diện bớt: ${itemNames}${tableSuffix}. Vui lòng kiểm tra và duyệt đơn bên dưới.`
      : `Đã nhận diện thêm: ${itemNames}${tableSuffix}. Vui lòng kiểm tra và duyệt đơn bên dưới.`;

    return {
      matched: true,
      output: {
        action,
        targetTable: tableRes?.table || null,
        items: parsedItems,
        message: msg,
        isBlocked: false,
        blockedReason: null,
      },
    };
  }

  return { matched: false };
}
