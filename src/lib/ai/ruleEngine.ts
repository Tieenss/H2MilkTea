import type { TableInfo, CatalogProduct, DisambiguationItem, CartDiffItem } from './types';
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

const TOPPING_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /^tran\s*chau\s*duong\s*den$/i, name: 'Trân châu đường đen' },
  { regex: /^tran\s*chau\s*hoang\s*kim$/i, name: 'Trân châu hoàng kim' },
  { regex: /^tran\s*chau\s*trang$/i, name: 'Trân châu trắng' },
  { regex: /^tran\s*chau\s*den$/i, name: 'Trân châu đen' },
  { regex: /^tran\s*chau$/i, name: 'Trân châu' },
  { regex: /^(?:kem\s*cheese(?:\s*milk\s*foam)?|milk\s*foam|cheese\s*foam|macchiato)$/i, name: 'Kem cheese' },
  { regex: /^kem\s*pho\s*mai$/i, name: 'Kem phô mai' },
  { regex: /^kem\s*trung(?:\s*chay)?$/i, name: 'Kem trứng' },
  { regex: /^(?:thach\s*pho\s*mai|pho\s*mai\s*vien|pho\s*mai)$/i, name: 'Thạch phô mai' },
  { regex: /^(?:thach\s*cu\s*nang|cu\s*nang)$/i, name: 'Thạch củ năng' },
  { regex: /^(?:thach\s*suong\s*sao|suong\s*sao)$/i, name: 'Thạch sương sáo' },
  { regex: /^(?:thach\s*dua|dua\s*mieng)$/i, name: 'Thạch dừa' },
  { regex: /^(?:thach\s*nha\s*dam|nha\s*dam)$/i, name: 'Thạch nha đam' },
  { regex: /^(?:thach\s*trai\s*cay|thach\s*rau\s*cau)$/i, name: 'Thạch trái cây' },
  { regex: /^pudding(?:\s*(?:trung|dau|socola))?$/i, name: 'Pudding trứng' },
  { regex: /^dao\s*(?:mieng|ngam)$/i, name: 'Đào miếng' },
  { regex: /^(?:vai\s*(?:mieng|ngam)|trai\s*vai)$/i, name: 'Vải miếng' },
  { regex: /^hat\s*dac$/i, name: 'Hạt đác' },
  { regex: /^dau\s*do$/i, name: 'Đậu đỏ' },
  { regex: /^khuc\s*bach$/i, name: 'Khúc bạch' },
  { regex: /^(?:banh\s*flan|flan)$/i, name: 'Bánh flan' },
  { regex: /^(?:banh\s*oreo|oreo)$/i, name: 'Oreo' },
];

const SINGLE_TOPPING_SOURCE =
  '(?:tran\\s*chau(?:\\s*(?:duong\\s*den|hoang\\s*kim|trang|den))?|kem\\s*cheese(?:\\s*milk\\s*foam)?|milk\\s*foam|cheese\\s*foam|macchiato|kem\\s*pho\\s*mai|kem\\s*trung(?:\\s*chay)?|thach\\s*(?:pho\\s*mai|cu\\s*nang|suong\\s*sao|dua|nha\\s*dam|trai\\s*cay|rau\\s*cau)|pho\\s*mai(?:\\s*vien)?|cu\\s*nang|suong\\s*sao|nha\\s*dam|pudding(?:\\s*(?:trung|dau|socola))?|dao\\s*(?:mieng|ngam)|vai\\s*(?:mieng|ngam)|trai\\s*vai|hat\\s*dac|dau\\s*do|khuc\\s*bach|banh\\s*flan|flan|banh\\s*oreo|oreo)';

const TOPPING_SEP_SOURCE =
  '(?:\\s*(?:,|\\+|\\bva\\b|\\bvoi\\b|\\bkem(?!\\s*(?:cheese|pho\\s*mai|trung|foam|macchiato|sua|tuoi))\\b)\\s*(?:them\\s+|topping\\s+)?|\\s+(?:them\\s+|topping\\s+)?)';

const MULTI_TOPPING_CLAUSE_REGEX = new RegExp(
  `(?:\\b(?:them\\s+topping|topping|them|kem(?!\\s*(?:cheese|pho\\s*mai|trung|foam|macchiato|sua|tuoi)))|\\+)\\s*(${SINGLE_TOPPING_SOURCE}(?:${TOPPING_SEP_SOURCE}${SINGLE_TOPPING_SOURCE})*)`,
  'gi'
);

const SINGLE_TOPPING_GLOBAL_REGEX = new RegExp(SINGLE_TOPPING_SOURCE, 'gi');

export function normalizeToppingName(raw: string): string {
  const norm = normalizeSearchText(raw);
  for (const entry of TOPPING_PATTERNS) {
    if (entry.regex.test(norm)) {
      return entry.name;
    }
  }
  return raw.trim();
}

function attachLegacyNormalizedSome(arr: string[]): string[] {
  const origSome = Array.prototype.some;
  Object.defineProperty(arr, 'some', {
    value: function (
      predicate: (value: string, index: number, array: string[]) => unknown,
      thisArg?: unknown
    ) {
      if (origSome.call(this, predicate, thisArg)) return true;
      const normalizedArr = this.map((item: string) => normalizeSearchText(String(item)));
      return origSome.call(normalizedArr, predicate, thisArg);
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return arr;
}

function normalizeForRuleEngine(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9,+%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Trích xuất các tùy chọn phổ biến (size, đường, đá, nhiều topping, nhiệt độ)
 */
export function extractNoteAndOptions(text: string): {
  cleanText: string;
  note: string;
  size: string;
  sugar: string;
  ice: string;
  toppings: string[];
} {
  const notes: string[] = [];
  let remaining = normalizeForRuleEngine(text);
  let size = 'M';
  let sugar = '100%';
  let ice = '100% đá';
  const toppingsList: string[] = [];

  // 1. Tùy chọn Topping (hỗ trợ nhiều topping cùng lúc, thực hiện trước để tránh từ "vừa"/"lớn" hoặc dấu "+" bị cắt nhầm)
  const toppingMatches = Array.from(remaining.matchAll(MULTI_TOPPING_CLAUSE_REGEX));
  for (const match of toppingMatches) {
    const fullClause = match[0];
    const itemsPart = match[1] || '';
    // Tránh cắt nhầm tên món gốc "Trà sữa topping thạch củ năng"
    const beforeClause = remaining.slice(0, match.index ?? 0).trim();
    if (
      /^tra\s*sua$/i.test(beforeClause) &&
      /^topping\s+thach\s+cu\s+nang$/i.test(fullClause.trim())
    ) {
      continue;
    }

    const rawToppings = itemsPart.match(SINGLE_TOPPING_GLOBAL_REGEX) || [];
    for (const rawT of rawToppings) {
      const normalizedName = normalizeToppingName(rawT);
      if (normalizedName && !toppingsList.includes(normalizedName)) {
        toppingsList.push(normalizedName);
      }
    }
    remaining = remaining.replace(fullClause, ' ');
  }

  if (toppingsList.length > 0) {
    notes.push(`Thêm ${toppingsList.join(', ')}`);
  }

  // 2. Tùy chọn Size (S / M / L)
  const sizeMatch = remaining.match(
    /\b(size\s*[sml]|(size|ly|coc|co)\s*(lon|to|vua|nho|be|[sml]))\b/i
  );
  if (sizeMatch) {
    const rawVal = sizeMatch[0]
      .toLowerCase()
      .replace(/^(size|ly|coc|co)\s*/i, '')
      .trim();
    if (rawVal === 's' || rawVal === 'nho' || rawVal === 'be') size = 'S';
    else if (rawVal === 'l' || rawVal === 'lon' || rawVal === 'to') size = 'L';
    else size = 'M';
    remaining = remaining.replace(sizeMatch[0], ' ');
  }

  // 3. Tùy chọn Đá / Nhiệt độ (0%, 30%, 50%, 70%, 100% đá, đá riêng, ít đá, không đá, nóng)
  const tempMatch = remaining.match(
    /\b(da\s*de\s*rieng|de\s*da\s*rieng|da\s*rieng|tach\s*da|\d+\s*%?\s*da|khong\s*da|ko\s*da|it\s*da|nua\s*da|vua\s*da|nhieu\s*da|da\s*binh\s*thuong|binh\s*thuong\s*da|uong\s*nong|nong|am)\b/i
  );
  if (tempMatch) {
    const rawIce = tempMatch[0].trim();
    notes.push(rawIce);
    const numMatch = rawIce.match(/^(\d+)/);
    if (numMatch) {
      ice = `${numMatch[1]}% đá`;
    } else if (/da\s*de\s*rieng|de\s*da\s*rieng|da\s*rieng|tach\s*da/i.test(rawIce)) {
      ice = 'đá riêng';
    } else if (/khong\s*da|ko\s*da/i.test(rawIce)) {
      ice = 'không đá';
    } else if (/it\s*da/i.test(rawIce)) {
      ice = 'ít đá';
    } else if (/nua\s*da|vua\s*da/i.test(rawIce)) {
      ice = '50% đá';
    } else if (/nhieu\s*da/i.test(rawIce)) {
      ice = 'nhiều đá';
    } else if (/binh\s*thuong/i.test(rawIce)) {
      ice = '100% đá';
    } else if (/nong|am/i.test(rawIce)) {
      ice = 'nóng';
    } else {
      ice = rawIce;
    }
    remaining = remaining.replace(tempMatch[0], ' ');
  }

  // 4. Tùy chọn Đường (0%, 30%, 50%, 70%, 100%)
  const sugarMatch = remaining.match(
    /\b(\d+\s*%?\s*(?:duong|ngot)|khong\s*duong|ko\s*duong|khong\s*ngot|rat\s*it\s*(?:duong|ngot)|it\s*duong|it\s*ngot|nua\s*duong|vua\s*duong|hoi\s*ngot|nhieu\s*duong|ngot\s*nhieu|(?:duong\s*)?binh\s*thuong(?:\s*duong)?)\b/i
  );
  if (sugarMatch) {
    const rawSugar = sugarMatch[0].trim();
    notes.push(rawSugar);
    const numMatch = rawSugar.match(/^(\d+)/);
    if (numMatch) {
      sugar = `${numMatch[1]}%`;
    } else if (/khong\s*duong|ko\s*duong|khong\s*ngot/i.test(rawSugar)) {
      sugar = '0%';
    } else if (/rat\s*it/i.test(rawSugar)) {
      sugar = '30%';
    } else if (/nua\s*duong|vua\s*duong/i.test(rawSugar)) {
      sugar = '50%';
    } else if (/it\s*duong|it\s*ngot/i.test(rawSugar)) {
      sugar = '50%';
    } else if (/hoi\s*ngot/i.test(rawSugar)) {
      sugar = '70%';
    } else if (/nhieu\s*duong|ngot\s*nhieu|binh\s*thuong/i.test(rawSugar)) {
      sugar = '100%';
    } else {
      sugar = rawSugar;
    }
    remaining = remaining.replace(sugarMatch[0], ' ');
  }

  const cleanText = normalizeSearchText(remaining);
  return {
    cleanText,
    note: notes.join(', '),
    size,
    sugar,
    ice,
    toppings: attachLegacyNormalizedSome(toppingsList),
  };
}

const GENERIC_CATEGORY_QUERIES = new Set([
  'tra sua',
  'ca phe',
  'cafe',
  'tra',
  'nuoc ep',
  'ep',
  'sinh to',
  'sua chua',
]);

function findGenericCategoryCandidates(
  cleanQuery: string,
  catalog: CatalogProduct[]
): CatalogProduct[] {
  if (!GENERIC_CATEGORY_QUERIES.has(cleanQuery)) return [];

  if (cleanQuery === 'tra') {
    const pureTeas = catalog.filter((p) => {
      const normName = normalizeSearchText(p.name);
      const normCat = normalizeSearchText(p.category || '');
      return (
        (normName.startsWith('tra ') && !normName.startsWith('tra sua')) ||
        normCat === 'tra' ||
        normCat.includes('tra trai cay')
      );
    });
    if (pureTeas.length >= 2) return pureTeas;
  }

  return catalog.filter((p) => {
    const normName = normalizeSearchText(p.name);
    const normCat = normalizeSearchText(p.category || '');
    if (cleanQuery === 'ca phe' || cleanQuery === 'cafe') {
      return (
        normName.includes('ca phe') ||
        normName.includes('cafe') ||
        normCat.includes('ca phe')
      );
    }
    if (cleanQuery === 'nuoc ep' || cleanQuery === 'ep') {
      return (
        normName.includes('nuoc ep') ||
        normName.startsWith('ep ') ||
        normCat.includes('nuoc ep')
      );
    }
    return normName.includes(cleanQuery) || normCat.includes(cleanQuery);
  });
}

export function getCartItemQuantity(
  currentCart: unknown[] | undefined,
  productId: string,
  productName: string
): number {
  if (!Array.isArray(currentCart) || currentCart.length === 0) return 0;
  const normTargetName = normalizeSearchText(productName);
  let total = 0;

  for (const raw of currentCart) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const cId = String(item.productId || item.id || item.IDSP || '').trim();
    const cName = String(item.productName || item.name || item['Tên sản phẩm'] || '').trim();
    const qty = Number(item.quantity ?? item.qty ?? 1);

    if (
      (productId && cId && cId === productId) ||
      (normTargetName && cName && normalizeSearchText(cName) === normTargetName)
    ) {
      total += Number.isFinite(qty) && qty > 0 ? qty : 0;
    }
  }
  return total;
}

export function applyNegativeCartGuard(
  action: 'add' | 'remove' | 'select_table' | 'qa' | 'none',
  items: ParsedItem[],
  currentCart: unknown[] | undefined,
  defaultMessage: string
): {
  action: 'add' | 'remove' | 'select_table' | 'qa' | 'none';
  items: ParsedItem[];
  message: string;
} {
  if (action !== 'remove' || !Array.isArray(currentCart) || items.length === 0) {
    return { action, items, message: defaultMessage };
  }

  const guardedItems: ParsedItem[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const beforeQty = getCartItemQuantity(currentCart, item.productId, item.productName);
    if (beforeQty <= 0) {
      warnings.push(
        `⚠️ Chặn bớt món âm giỏ: Món "${item.productName}" hiện chưa có trong giỏ hàng nên không thể bớt.`
      );
      continue;
    }

    if (item.quantity > beforeQty) {
      guardedItems.push({
        ...item,
        quantity: beforeQty,
      });
      warnings.push(
        `⚠️ Trong giỏ hiện chỉ có ${beforeQty}x ${item.productName}, hệ thống đã tự động điều chỉnh mức bớt tối đa là ${beforeQty} món (chặn âm giỏ).`
      );
    } else {
      guardedItems.push(item);
    }
  }

  if (guardedItems.length === 0) {
    return {
      action: 'none',
      items: [],
      message:
        warnings.join(' ') ||
        '⚠️ Chặn bớt món âm giỏ: Món yêu cầu hiện chưa có trong giỏ hàng nên không thể bớt.',
    };
  }

  return {
    action: 'remove',
    items: guardedItems,
    message: warnings.length > 0 ? `${warnings.join(' ')} ${defaultMessage}` : defaultMessage,
  };
}

export function computeCartDiff(
  action: 'add' | 'remove' | 'select_table' | 'qa' | 'none',
  items: ParsedItem[],
  currentCart: unknown[] | undefined,
  catalog: CatalogProduct[]
): CartDiffItem[] {
  if ((action !== 'add' && action !== 'remove') || !items || items.length === 0) {
    return [];
  }

  const hasCartContext = Array.isArray(currentCart);
  const catalogById = new Map(catalog.map((p) => [p.id, p]));

  return items.map((item) => {
    const inCartQty = getCartItemQuantity(currentCart, item.productId, item.productName);
    const beforeQty = action === 'remove' && !hasCartContext ? item.quantity : inCartQty;
    const delta = action === 'remove' ? -item.quantity : item.quantity;
    const afterQty = Math.max(0, beforeQty + delta);
    const matchedProd =
      catalogById.get(item.productId) ||
      catalog.find((p) => normalizeSearchText(p.name) === normalizeSearchText(item.productName));

    return {
      productId: item.productId,
      productName: item.productName,
      beforeQty,
      afterQty,
      delta,
      unitPrice: matchedProd?.price ?? 0,
    };
  });
}

/**
 * Phân tích câu lệnh dựa trên quy tắc và từ điển alias (không tốn chi phí LLM)
 */
export function matchRuleBased(
  rawMessage: string,
  catalog: CatalogProduct[],
  tables: TableInfo[],
  customAliases?: Record<string, string>,
  currentCart?: unknown[]
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
        message:
          'Xin chào! Tôi là Trợ lý POS H2 MilkTea. Tôi có thể giúp thêm/bớt món, chuyển bàn hoặc trả lời hướng dẫn nghiệp vụ.',
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
  const initialAction: 'add' | 'remove' = isRemove ? 'remove' : 'add';

  let workingText = normalizeForRuleEngine(trimmed);

  // Xóa phần bàn ra khỏi chuỗi để phân tích món
  if (tableRes && tableRes.matchedText) {
    const normMatched = normalizeSearchText(tableRes.matchedText);
    const tablePattern = new RegExp(
      `(?:cho|vao|o|sang|mo)?\\s*(?:${tableRes.matchedText}|${normMatched})`,
      'gi'
    );
    workingText = workingText.replace(tablePattern, ' ');
  }

  // Tách từ khóa hành động và các cụm đại từ xưng hô tự nhiên
  workingText = workingText
    .trim()
    .replace(
      /^(?:mo|cho|them|lay|goi|order|len don|bot|xoa|huy|giam|chon|chuyen sang|chuyen|vao)(\s+(?:cho|gium|ho)?\s*(?:toi|tao|minh|em|anh|chi|khach|ban))?\s+/i,
      ' '
    )
    .replace(/\b(?:cho|gium|ho)\s+(?:toi|tao|minh|em|anh|chi|khach)\b/gi, ' ')
    .trim();

  // Bảo vệ các cụm nhiều topping (ví dụ: "thêm trân châu đen và kem cheese", "kèm pudding trứng, thạch củ năng")
  // để không bị tách nhầm thành các món riêng biệt khi split câu lệnh
  const savedToppingClauses: string[] = [];
  const maskedWorkingText = workingText.replace(MULTI_TOPPING_CLAUSE_REGEX, (fullMatch, _g1, offset) => {
    const before = workingText.slice(0, Number(offset)).trim();
    if (
      /tra\s*sua$/i.test(before) &&
      /^topping\s+thach\s+cu\s+nang$/i.test(fullMatch.trim())
    ) {
      return fullMatch;
    }
    const idx = savedToppingClauses.length;
    savedToppingClauses.push(fullMatch);
    return ` __toppingclause${idx}__ `;
  });

  // Tách các món: hỗ trợ dấu phẩy, "va", "voi", "kem" (không phải kem cheese/kem phô mai), "+", hoặc khoảng trắng trước số lượng tiếp theo
  const parts = maskedWorkingText
    .split(
      /,|\bva\b|\bvoi\b|\bkem(?!\s*(?:cheese|pho\s*mai|trung|foam|macchiato|sua|tuoi))\b|\+|\s+(?=\d+\s*(?!%|\s*(?:duong|da|ngot)\b)[a-z]+)/i
    )
    .filter((p): p is string => typeof p === 'string')
    .map((p) =>
      p
        .replace(/__toppingclause(\d+)__/g, (_, idxStr) => savedToppingClauses[Number(idxStr)] || '')
        .trim()
    )
    .filter(Boolean);

  if (parts.length === 0) {
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
    const cleanPart = part
      .replace(
        /^(?:(?:cho|lay|them|order|goi)\s+)?(?:cho\s+|gium\s+|ho\s+)?(?:toi|tao|minh|em|anh|chi|khach|ban)\s+/i,
        ''
      )
      .trim();

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

    // Kiểm tra trường hợp câu lệnh gọi tên danh mục chung mơ hồ (vd: "cho 2 trà sữa", "lấy 1 cà phê", "thêm 1 trà", "1 nước ép")
    const genericCandidates = findGenericCategoryCandidates(cleanText, catalog);
    if (genericCandidates.length >= 2) {
      const topCandidates: DisambiguationItem[] = genericCandidates.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
      }));
      return {
        matched: true,
        output: {
          action: 'none',
          targetTable: tableRes?.table || null,
          items: [],
          disambiguation: topCandidates,
          message: `Quán có nhiều món khớp với yêu cầu "${cleanText}" của bạn (${topCandidates.map((c) => c.name).join(', ')}). Bạn muốn chọn cụ thể món nào ạ?`,
          isBlocked: false,
          blockedReason: null,
        },
      };
    }

    // Mở rộng alias & sửa lỗi gõ phím / ngữ âm
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
      } else if (resolved.status === 'ambiguous' || fallbackResolved.status === 'ambiguous') {
        const rawCandidates =
          resolved.status === 'ambiguous' ? resolved.candidates : fallbackResolved.candidates;
        const topCandidates: DisambiguationItem[] = rawCandidates.slice(0, 5).map((c) => ({
          id: c.product.id,
          name: c.product.name,
          price: c.product.price,
          category: c.product.category,
        }));
        return {
          matched: true,
          output: {
            action: 'none',
            targetTable: tableRes?.table || null,
            items: [],
            disambiguation: topCandidates,
            message: `Quán có nhiều món khớp với yêu cầu "${cleanText}" của bạn (${topCandidates.map((c) => c.name).join(', ')}). Bạn muốn chọn cụ thể món nào ạ?`,
            isBlocked: false,
            blockedReason: null,
          },
        };
      } else {
        // Nếu có món không nhận diện được chắc chắn -> bàn giao cho LLM xử lý
        return { matched: false };
      }
    }
  }

  if (parsedItems.length > 0) {
    const tableSuffix = tableRes?.table ? ` cho ${tableRes.table.name}` : '';
    const formatItemSummary = (itemsToFormat: ParsedItem[]) =>
      itemsToFormat
        .map((i) => {
          const opts = [
            i.size && i.size !== 'M' ? `Size ${i.size}` : null,
            i.sugar && i.sugar !== '100%' ? `${i.sugar} đường` : null,
            i.ice && i.ice !== '100% đá' ? i.ice : null,
            i.toppings?.length ? i.toppings.join(', ') : null,
            i.note,
          ].filter(Boolean);
          const uniqueOpts = Array.from(new Set(opts));
          return `${i.quantity}x ${i.productName}${uniqueOpts.length ? ` (${uniqueOpts.join(', ')})` : ''}`;
        })
        .join(', ');

    const defaultMsg =
      initialAction === 'remove'
        ? `Đã nhận diện bớt: ${formatItemSummary(parsedItems)}${tableSuffix}. Vui lòng kiểm tra và duyệt đơn bên dưới.`
        : `Đã nhận diện thêm: ${formatItemSummary(parsedItems)}${tableSuffix}. Vui lòng kiểm tra và duyệt đơn bên dưới.`;

    // Kiểm tra chặn bớt món âm giỏ (Negative Cart Guard)
    const guarded = applyNegativeCartGuard(initialAction, parsedItems, currentCart, defaultMsg);
    const cartDiff = computeCartDiff(guarded.action, guarded.items, currentCart, catalog);

    return {
      matched: true,
      output: {
        action: guarded.action,
        targetTable: tableRes?.table || null,
        items: guarded.items,
        message: guarded.message,
        isBlocked: false,
        blockedReason: null,
        ...(cartDiff.length > 0 ? { cartDiff } : {}),
      },
    };
  }

  return { matched: false };
}
