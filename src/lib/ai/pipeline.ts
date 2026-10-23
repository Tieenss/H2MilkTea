import { checkSecurityGuardrails } from './security';
import { matchRuleBased } from './ruleEngine';
import { resolveProduct } from './catalog';
import { resolveTableFromMessage } from './table';
import { getKnowledgeBasePrompt, appendCitationIfMissing, findRelevantKnowledge } from './knowledge';
import { createAuditLog } from './auditLogger';
import { AiOutputSchema, type AiOutput, type ParsedItem } from './schema';
import type { CatalogItem, CatalogProduct, TableInfo } from './types';

export const PROMPT_VERSION = 'v1.1.0';
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Rate limiting: Tối đa 20 yêu cầu / phút / nhân viên
const staffRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

export function checkStaffRateLimit(staffId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (staffRateLimitMap.get(staffId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  staffRateLimitMap.set(staffId, timestamps);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - timestamps.length };
}

/**
 * Trích xuất khối JSON sạch từ phản hồi thô của LLM
 */
function extractLlmJson(rawText: string): Record<string, unknown> | null {
  if (!rawText) return null;
  const cleaned = rawText.trim();

  // 1. Thử parse trực tiếp sau khi bỏ code block markdown
  const directClean = cleaned.replace(/^```json\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(directClean);
  } catch {
    // 2. Tìm khối JSON từ dấu { đầu tiên đến dấu } cuối cùng
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Fallback: sửa lỗi dấu phẩy thừa trước ngoặc đóng
        try {
          const relaxed = candidate.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(relaxed);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

export interface PipelineParams {
  rawMessage: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentTable?: string;
  currentCart?: unknown[];
  currentRoute?: string;
  pageContext?: string;
  staff: { id: string; name?: string; role?: string; isAdmin?: boolean };
  catalog: CatalogProduct[]; // active catalog products
  tables: TableInfo[];
  customFaqs?: unknown;
  customAliases?: Record<string, string>;
  apiKey?: string;
}

export interface PipelineResult {
  success: boolean;
  action: 'add' | 'remove' | 'select_table' | 'qa' | 'none';
  targetTable: TableInfo | null;
  items: ParsedItem[];
  message: string;
  logId?: string;
  source: 'rule' | 'llm' | 'fallback';
  isBlocked?: boolean;
  blockedReason?: string | null;
  error?: string;
}

export async function processAiPipeline(params: PipelineParams): Promise<PipelineResult> {
  const startTime = Date.now();
  const { rawMessage, staff, catalog, tables, customFaqs, customAliases, apiKey } = params;
  const message = rawMessage.trim();

  // 1. Kiểm tra giới hạn tần suất (Rate limit)
  const rateLimit = checkStaffRateLimit(staff.id);
  if (!rateLimit.allowed) {
    return {
      success: false,
      action: 'none',
      targetTable: null,
      items: [],
      message: 'Bạn đã gửi quá nhiều yêu cầu AI trong thời gian ngắn (tối đa 20 yêu cầu/phút). Vui lòng đợi giây lát.',
      source: 'fallback',
      error: 'Vượt quá giới hạn tần suất sử dụng AI.',
    };
  }

  // 2. Kiểm tra hàng rào an toàn & Chống Prompt Injection
  const securityCheck = checkSecurityGuardrails(message, staff.role);
  if (securityCheck.violated) {
    const latencyMs = Date.now() - startTime;
    const logId = await createAuditLog({
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      rawMessage: message,
      parsedAction: { action: 'none', securityViolation: securityCheck.type },
      source: 'rule',
      status: 'blocked',
      blockedReason: securityCheck.reason,
      latencyMs,
      promptVersion: PROMPT_VERSION,
    });

    return {
      success: true,
      action: 'none',
      targetTable: null,
      items: [],
      message: securityCheck.reason || 'Yêu cầu không hợp lệ.',
      logId,
      source: 'rule',
      isBlocked: true,
      blockedReason: securityCheck.reason,
    };
  }

  // 3. Phân tích qua Bộ luật & Từ điển Alias (Rule Engine)
  const ruleResult = matchRuleBased(message, catalog, tables, customAliases);
  if (ruleResult.matched && ruleResult.output) {
    const latencyMs = Date.now() - startTime;
    const logId = await createAuditLog({
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      rawMessage: message,
      parsedAction: ruleResult.output as unknown as Record<string, unknown>,
      source: 'rule',
      status: ruleResult.output.isBlocked ? 'blocked' : 'previewed',
      blockedReason: ruleResult.output.blockedReason,
      latencyMs,
      promptVersion: PROMPT_VERSION,
    });

    return {
      success: true,
      action: ruleResult.output.action,
      targetTable: ruleResult.output.targetTable || null,
      items: ruleResult.output.items || [],
      message: ruleResult.output.message,
      logId,
      source: 'rule',
      isBlocked: ruleResult.output.isBlocked,
      blockedReason: ruleResult.output.blockedReason,
    };
  }

  // 4. Nếu mơ hồ -> Chuyển cho LLM (Gemini) xử lý
  if (!apiKey) {
    return {
      success: false,
      action: 'none',
      targetTable: null,
      items: [],
      message: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.',
      source: 'fallback',
      error: 'Thiếu API key của Gemini.',
    };
  }

  const catalogItems: CatalogItem[] = catalog.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
  }));
  const preResolvedTable = resolveTableFromMessage(message, tables);
  const knowledgePrompt = getKnowledgeBasePrompt(customFaqs as any);

  const systemPrompt = [
    'Bạn là trợ lý AI thông minh cho hệ thống POS H2 MilkTea.',
    `Nhân viên đăng nhập: ${staff.name || 'Thu ngân'} (Vai trò: ${staff.role || 'Nhân viên'}, Admin: ${staff.isAdmin ? 'Có' : 'Không'}).`,
    `Vị trí trang hiện tại: ${params.currentRoute || '/pos'} (${params.pageContext || 'Máy bán hàng POS'}).`,
    `Phiên bản prompt: ${PROMPT_VERSION}.`,
    '',
    'NGUYÊN TẮC AN TOÀN TUYỆT ĐỐI:',
    '- BẠN KHÔNG BAO GIỜ được tự ý thanh toán, xóa bàn, sửa giá hoặc cấp quyền quản trị.',
    '- Nếu người dùng yêu cầu thanh toán, sửa giá, xóa bàn -> trả về action = "none" và nhắc nhở không có quyền.',
    '',
    'NHIỆM VỤ:',
    '1. GỌI MÓN & CHỌN BÀN (action: "add" | "remove" | "select_table"):',
    '   - Trả về JSON đúng cấu trúc: { action, targetTable, items, message }',
    '   - targetTable: { id, name } nếu có đề cập đến bàn hoặc mang về, ngược lại null.',
    '   - Mỗi item: { productId, productName, quantity, note, size, sugar, ice, toppings }.',
    '     * quantity: Số nguyên từ 1 đến 10 (mặc định 1).',
    '     * size: "S" | "M" | "L" (mặc định "M")',
    '     * sugar: "0%" | "30%" | "50%" | "70%" | "100%" (mặc định "100%")',
    '     * ice: "không đá" | "ít đá" | "100% đá" | "nhiều đá" | "nóng" (mặc định "100% đá")',
    '     * toppings: mảng tên topping (ví dụ: ["trân châu đen"]) hoặc []',
    '   - Nhận diện linh hoạt lỗi gõ phím tiếng Việt (vd: "lước" = "nước", "ép dưa" = "Ép dưa hấu", "nâu đá" = "Cafe sữa đá").',
    '   - Luôn ưu tiên chọn đúng productName và productId từ Catalog món.',
    '',
    '3. ĐIỀU HƯỚNG & HỖ TRỢ NGỮ CẢNH CÁC TRANG TOÀN HỆ THỐNG (Mục #16):',
    '   - Bạn là trợ lý cho toàn bộ phần mềm H2 MilkTea (POS, Bếp, Kho, Thực đơn, Khách hàng, Cài đặt).',
    '   - Nếu người dùng muốn chuyển trang, hãy giải thích và đính kèm đường link Markdown: [Đến máy POS](/pos), [Mở màn hình Bếp](/kitchen), [Quản lý Thực đơn](/menu/products), [Quản lý Kho](/inventory), [Khách hàng](/khachhang), [Cài đặt Mẫu in & VAT](/receipt-settings).',
    '',
    '2. HỎI ĐÁP TIỆN ÍCH & HƯỚNG DẪN (action: "qa"):',
    '   - Khi người dùng hỏi pass wifi, giờ mở cửa, menu, phím tắt, cách in bill, hướng dẫn phần mềm...',
    '   - Đặt action = "qa", targetTable = null, items = [].',
    '   - Trả lời bằng tiếng Việt thân thiện dựa trên CẨM NANG HƯỚNG DẪN bên dưới.',
    '   - BẮT BUỘC: Khi trả lời câu hỏi nghiệp vụ cẩm nang, ở cuối câu trả lời luôn luôn đính kèm trích dẫn nguồn chuẩn: [Nguồn: Hướng dẫn sử dụng > {Tên mục}](/user-guide#{sectionId}).',
    '',
    'VÍ DỤ MẪU:',
    '- "thêm cho tôi 3 lước ép dưa vào bàn 6" -> { "action": "add", "targetTable": { "name": "Bàn 6" }, "items": [{ "productName": "Ép dưa hấu", "quantity": 3 }], "message": "Đã nhận diện thêm 3x Ép dưa hấu cho Bàn 6." }',
    '- "cho 2 ts tc đen 50 đường mang về" -> { "action": "add", "targetTable": { "name": "Mang về" }, "items": [{ "productName": "Trà sữa trân châu đen", "quantity": 2, "sugar": "50%" }] }',
    '',
    `Danh sách Bàn hợp lệ: ${JSON.stringify(tables.map((t) => ({ id: t.id, name: t.name })))}`,
    `Catalog món hợp lệ: ${JSON.stringify(catalogItems)}`,
    '',
    knowledgePrompt,
  ].join('\n');

  const history = Array.isArray(params.history) ? params.history.slice(-6) : [];
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...history.map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const modelToUse = DEFAULT_MODEL;
  let responseText = '{}';
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }
    );

    const data = await response.json();
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error(data.error?.message || `Lỗi từ Gemini (${response.status})`);
    }
  } catch (llmErr) {
    console.warn('Lỗi gọi Gemini LLM:', llmErr);
    // Không làm sập POS khi AI lỗi, trả về fallback thân thiện
    return {
      success: true,
      action: 'none',
      targetTable: null,
      items: [],
      message: 'Hệ thống AI hiện đang bận hoặc quá tải. Vui lòng thao tác trực tiếp trên màn hình POS.',
      source: 'fallback',
    };
  }

  // 5. Kiểm tra và Ép schema đầu ra bằng Zod (Khoan dung & Tự phục hồi dữ liệu)
  const parsedJson = extractLlmJson(responseText) || {};
  const zodValidation = AiOutputSchema.safeParse(parsedJson);

  let validatedOutput: AiOutput;
  if (zodValidation.success) {
    validatedOutput = zodValidation.data;
  } else {
    // Tự động phục hồi dữ liệu từ parsedJson nếu Zod có cảnh báo nhỏ
    console.warn('Zod parse cảnh báo định dạng AI, đang phục hồi:', zodValidation.error?.format());
    const rawItems = Array.isArray(parsedJson?.items) ? (parsedJson.items as unknown[]) : [];
    const recoveredItems: ParsedItem[] = rawItems
      .map((itemVal: unknown) => {
        if (!itemVal || typeof itemVal !== 'object') return null;
        const it = itemVal as Record<string, unknown>;
        return {
          productId: String(it.productId || ''),
          productName: String(it.productName || it.name || ''),
          quantity: Math.max(1, Math.min(Number(it.quantity) || 1, 10)),
          note: String(it.note || ''),
          size: String(it.size || 'M'),
          sugar: String(it.sugar || '100%'),
          ice: String(it.ice || '100% đá'),
          toppings: Array.isArray(it.toppings) ? it.toppings.map(String) : [],
        };
      })
      .filter((it): it is ParsedItem => Boolean(it && it.productName));

    validatedOutput = {
      action: recoveredItems.length > 0 ? 'add' : parsedJson?.message ? 'qa' : 'none',
      targetTable: (parsedJson?.targetTable as TableInfo) || null,
      items: recoveredItems,
      message: String(parsedJson?.message || (recoveredItems.length ? 'Đã nhận diện món từ yêu cầu.' : 'Chưa rõ yêu cầu, vui lòng thử lại.')),
      isBlocked: false,
      blockedReason: null,
    };
  }

  // 6. Server-Side Validation: Món phải có trong catalog và Trạng thái Hoạt động
  const validProductsMap = new Map(catalog.map((p) => [p.id, p]));
  const finalItems: ParsedItem[] = [];

  if (validatedOutput.action === 'add' || validatedOutput.action === 'remove') {
    for (const item of validatedOutput.items) {
      let matched = validProductsMap.get(item.productId);
      if (!matched && item.productName) {
        const resolved = resolveProduct(item.productName, catalog);
        if (resolved.status === 'resolved') {
          matched = validProductsMap.get(resolved.product.id);
        }
      }

      if (matched) {
        finalItems.push({
          productId: matched.id,
          productName: matched.name,
          quantity: Math.max(1, Math.min(item.quantity, 10)), // Ngưỡng an toàn tối đa 10 ly
          note: item.note || '',
          size: item.size || 'M',
          sugar: item.sugar || '100%',
          ice: item.ice || '100% đá',
          toppings: Array.isArray(item.toppings) ? item.toppings : [],
        });
      }
    }
  }

  // Nhận diện bàn chuẩn hóa
  let finalTargetTable: TableInfo | null = null;
  if (validatedOutput.targetTable) {
    const rawTableId = validatedOutput.targetTable.id;
    const rawTableName = validatedOutput.targetTable.name;
    const found = tables.find(
      (t) => t.id === rawTableId || t.name.toLowerCase() === rawTableName?.toLowerCase() || t.id === rawTableName
    );
    if (found) {
      finalTargetTable = found;
    }
  }

  if (!finalTargetTable && preResolvedTable) {
    finalTargetTable = preResolvedTable.table;
  }

  // Xử lý thông điệp và đính kèm trích dẫn nguồn nếu là action QA
  let finalMessage = validatedOutput.message || '';
  if (validatedOutput.action === 'qa') {
    const matchedTopic = findRelevantKnowledge(message);
    finalMessage = appendCitationIfMissing(finalMessage || 'Đã trả lời hướng dẫn.', matchedTopic);
  } else if (!finalMessage) {
    finalMessage = finalItems.length
      ? 'Đã nhận diện món. Vui lòng xác nhận.'
      : validatedOutput.action === 'select_table' && finalTargetTable
        ? `Chuyển sang ${finalTargetTable.name}.`
        : 'Chưa nhận diện được yêu cầu.';
  }

  const latencyMs = Date.now() - startTime;
  const logId = await createAuditLog({
    staffId: staff.id,
    staffName: staff.name,
    staffRole: staff.role,
    rawMessage: message,
    parsedAction: {
      action: validatedOutput.action,
      targetTable: finalTargetTable,
      items: finalItems,
      message: finalMessage,
    },
    source: 'llm',
    status: 'previewed',
    latencyMs,
    promptVersion: PROMPT_VERSION,
  });

  return {
    success: true,
    action: validatedOutput.action,
    targetTable: finalTargetTable,
    items: finalItems,
    message: finalMessage,
    logId,
    source: 'llm',
    isBlocked: false,
    blockedReason: null,
  };
}
