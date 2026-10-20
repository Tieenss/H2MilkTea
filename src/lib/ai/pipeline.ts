import { checkSecurityGuardrails } from './security';
import { matchRuleBased } from './ruleEngine';
import { resolveProduct, toActiveCatalog } from './catalog';
import { resolveTableFromMessage } from './table';
import { getKnowledgeBasePrompt, appendCitationIfMissing, findRelevantKnowledge } from './knowledge';
import { createAuditLog } from './auditLogger';
import { AiOutputSchema, type AiOutput, type ParsedItem } from './schema';
import type { CatalogItem, TableInfo } from './types';

export const PROMPT_VERSION = 'v1.0.0';
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

export interface PipelineParams {
  rawMessage: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentTable?: string;
  currentCart?: unknown[];
  currentRoute?: string;
  pageContext?: string;
  staff: { id: string; name?: string; role?: string; isAdmin?: boolean };
  catalog: any[]; // active catalog products
  tables: TableInfo[];
  customFaqs?: any;
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
  const knowledgePrompt = getKnowledgeBasePrompt(customFaqs);

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
    '     * size: "S" | "M" | "L" (mặc định "M")',
    '     * sugar: "0%" | "30%" | "50%" | "70%" | "100%" (mặc định "100%")',
    '     * ice: "không đá" | "ít đá" | "100% đá" | "nhiều đá" | "nóng" (mặc định "100% đá")',
    '     * toppings: mảng tên topping (ví dụ: ["trân châu đen"]) hoặc []',
    '   - quantity là số nguyên từ 1 đến 10. Nếu khách gọi > 10 ly, giải thích cần quản lý duyệt.',
    '   - Chỉ chọn productId có trong catalog. Nếu không có món trong catalog, không đưa vào items và giải thích trong message.',
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

  // 5. Kiểm tra và Ép schema đầu ra bằng Zod (Step 3)
  let parsedJson: any = {};
  try {
    parsedJson = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    parsedJson = { action: 'none', message: 'Không thể giải mã phản hồi từ AI.' };
  }

  const zodValidation = AiOutputSchema.safeParse(parsedJson);
  const validatedOutput: AiOutput = zodValidation.success
    ? zodValidation.data
    : {
        action: 'none',
        targetTable: null,
        items: [],
        message: 'Định dạng câu trả lời của AI chưa chuẩn xác. Vui lòng thử lại.',
      };

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

  // Nhận diện bàn
  let finalTargetTable: TableInfo | null = validatedOutput.targetTable?.id
    ? validatedOutput.targetTable
    : (preResolvedTable ? preResolvedTable.table : null);

  if (finalTargetTable && !tables.some((t) => t.id === finalTargetTable?.id)) {
    finalTargetTable = null;
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
    modelName: modelToUse,
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
  };
}
