import { checkSecurityGuardrails } from './security';
import { matchRuleBased, applyNegativeCartGuard, computeCartDiff } from './ruleEngine';
import { resolveProduct, normalizeSearchText } from './catalog';
import { resolveTableFromMessage } from './table';
import { appendCitationIfMissing, findRelevantKnowledge, removeCitation } from './knowledge';
import { buildSelectiveRagPrompt, retrieveProjectKnowledge, type ProjectKnowledgeChunk } from './ragEngine';
import { createAuditLog } from './auditLogger';
import { AiOutputSchema, type AiOutput, type ParsedItem } from './schema';
import type { CatalogItem, CatalogProduct, TableInfo, DisambiguationItem, CartDiffItem } from './types';

export const PROMPT_VERSION = 'v1.3.0-rag';
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
  customRagChunks?: ProjectKnowledgeChunk[] | null;
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
  disambiguation?: DisambiguationItem[];
  cartDiff?: CartDiffItem[];
  error?: string;
}

export async function processAiPipeline(params: PipelineParams): Promise<PipelineResult> {
  const startTime = Date.now();
  const {
    rawMessage,
    staff,
    catalog,
    tables,
    customFaqs,
    customAliases,
    customRagChunks,
    apiKey,
    currentCart,
  } = params;
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

  // 3. Phân tích qua Bộ luật, Từ điển Alias & Hybrid RAG Engine (0ms)
  const ruleResult = matchRuleBased(message, catalog, tables, customAliases, currentCart, {
    currentTable: params.currentTable,
    history: params.history,
    customChunks: customRagChunks,
    customFaqs: Array.isArray(customFaqs) ? (customFaqs as any) : null,
  });
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

    const ruleItems = ruleResult.output.items || [];
    const computedDiff =
      ruleResult.output.cartDiff ||
      computeCartDiff(ruleResult.output.action, ruleItems, currentCart, catalog);

    return {
      success: true,
      action: ruleResult.output.action,
      targetTable: ruleResult.output.targetTable || null,
      items: ruleItems,
      message: ruleResult.output.message,
      logId,
      source: 'rule',
      isBlocked: ruleResult.output.isBlocked,
      blockedReason: ruleResult.output.blockedReason,
      ...(ruleResult.output.disambiguation ? { disambiguation: ruleResult.output.disambiguation } : {}),
      ...(computedDiff.length > 0 ? { cartDiff: computedDiff } : {}),
    };
  }

  // 4. Nếu mơ hồ -> Chuyển cho LLM (Gemini) xử lý kèm Selective Top-K RAG Context
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

  // Nếu người dùng yêu cầu số bàn cụ thể mà bàn này KHÔNG TỒN TẠI trong quán
  if (preResolvedTable?.isNotFound) {
    const activeNames = tables.map((t) => t.name).join(', ');
    return {
      success: true,
      action: 'none',
      targetTable: null,
      items: [],
      message: `⚠️ Quán không có "${preResolvedTable.requestedName}" trong hệ thống (hoặc bàn đang ngừng hoạt động). Quán hiện có các bàn: ${activeNames}. Vui lòng chọn lại đúng bàn.`,
      source: 'rule',
      isBlocked: false,
    };
  }

  // Selective RAG Prompt: Chỉ nạp Top-K đoạn kiến thức liên quan nhất với câu hỏi thay vì nhồi toàn bộ
  const { prompt: selectiveRagPrompt } = buildSelectiveRagPrompt(message, {
    topK: 5,
    roleScope: 'staff',
    customChunks: customRagChunks,
    customFaqs: Array.isArray(customFaqs) ? (customFaqs as any) : null,
  });

  const systemPrompt = [
    'Bạn là trợ lý AI thông minh cho hệ thống POS H2 MilkTea.',
    `Nhân viên đăng nhập: ${staff.name || 'Thu ngân'} (Vai trò: ${staff.role || 'Nhân viên'}, Admin: ${staff.isAdmin ? 'Có' : 'Không'}).`,
    `Vị trí trang hiện tại: ${params.currentRoute || '/pos'} (${params.pageContext || 'Máy bán hàng POS'}).`,
    `Bàn đang mở trên màn hình POS hiện tại: ${params.currentTable || 'Chưa chọn'}.`,
    `Phiên bản prompt: ${PROMPT_VERSION}.`,
    '',
    'NGUYÊN TẮC AN TOÀN TUYỆT ĐỐI:',
    '- BẠN KHÔNG BAO GIỜ được tự ý thanh toán, xóa bàn, sửa giá hoặc cấp quyền quản trị.',
    '- Nếu người dùng yêu cầu thanh toán, sửa giá, xóa bàn -> trả về action = "none" và nhắc nhở không có quyền.',
    '- BẠN KHÔNG BAO GIỜ được tự báo "đã thêm đơn thành công" khi người dùng chưa xác nhận duyệt bằng tay.',
    '',
    'NGUYÊN TẮC QUAN TRỌNG VỀ BÀN VÀ MÓN:',
    `1. Danh sách Bàn hợp lệ trong quán: ${tables.map((t) => t.name).join(', ')}.`,
    '2. NẾU NGƯỜI DÙNG YÊU CẦU MỘT BÀN KHÔNG CÓ TRONG DANH SÁCH (ví dụ Bàn 99):',
    '   - TUYỆT ĐỐI KHÔNG tự nhận là bàn đó.',
    '   - Đặt action = "none", targetTable = null, items = [].',
    `   - message: Cảnh báo không tìm thấy bàn đó và liệt kê các bàn đang có: ${tables.map((t) => t.name).join(', ')}.`,
    '3. NẾU NGƯỜI DÙNG NÓI "MỞ BÀN ... VÀ THÊM MÓN" HOẶC "GỌI MÓN" NHƯNG CHƯA NÊU RÕ TÊN MÓN CỤ THỂ:',
    '   - TUYỆT ĐỐI KHÔNG tự bịa ra món và không nói "đã thêm đơn thành công".',
    '   - Đặt action = "select_table", items = [].',
    '   - message: Thông báo đã chọn bàn đó và hỏi người dùng muốn gọi thêm những món gì cho bàn.',
    '4. NẾU CÓ MÓN CỤ THỂ ĐƯỢC NÊU:',
    '   - Bóc tách đúng action: "add" | "remove", targetTable (nếu câu hiện tại không nêu tên bàn, kế thừa bàn đang mở hoặc bàn từ lượt chat trước), items.',
    '   - Mỗi item: { productId, productName, quantity, size, sugar, ice, toppings, note }.',
    '   - message: Tóm tắt món đã nhận diện và kết thúc bằng câu nhắc: "Vui lòng kiểm tra và duyệt đơn bên dưới."',
    '',
    'VÍ DỤ MẪU:',
    '- "mở bàn 3 và thêm món" -> { "action": "select_table", "targetTable": { "name": "Bàn 03" }, "items": [], "message": "Đã chọn Bàn 03. Bạn muốn gọi thêm những món gì cho bàn này ạ?" }',
    '- "cho 2 ts nướng size L 50 đường vào bàn 3" -> { "action": "add", "targetTable": { "name": "Bàn 03" }, "items": [{ "productName": "Trà sữa topping thạch củ năng", "quantity": 2, "size": "L", "sugar": "50%" }], "message": "Đã nhận diện: 2x Trà sữa nướng (Size L, 50% đường) cho Bàn 03. Vui lòng kiểm tra và duyệt đơn bên dưới." }',
    '- "cho 1 ly trà đào mang về" -> { "action": "add", "targetTable": { "name": "Khách mua về" }, "items": [{ "productName": "Trà đào cam sả", "quantity": 1 }], "message": "Đã nhận diện: 1x Trà đào cam sả mang về. Vui lòng kiểm tra và duyệt đơn bên dưới." }',
    '',
    `Danh sách Bàn hợp lệ: ${JSON.stringify(tables.map((t) => ({ id: t.id, name: t.name })))}`,
    `Catalog món hợp lệ: ${JSON.stringify(catalogItems)}`,
    '',
    selectiveRagPrompt,
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
    return {
      success: true,
      action: 'none',
      targetTable: null,
      items: [],
      message: 'Hệ thống AI hiện đang bận hoặc quá tải. Vui lòng thao tác trực tiếp trên màn hình POS.',
      source: 'fallback',
    };
  }

  // 5. Kiểm tra và Ép schema đầu ra bằng Zod
  const parsedJson = extractLlmJson(responseText) || {};
  const zodValidation = AiOutputSchema.safeParse(parsedJson);

  let validatedOutput: AiOutput;
  if (zodValidation.success) {
    validatedOutput = zodValidation.data;
  } else {
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
  let finalItems: ParsedItem[] = [];
  let disambiguationList: DisambiguationItem[] | undefined = validatedOutput.disambiguation;

  if (validatedOutput.action === 'add' || validatedOutput.action === 'remove') {
    for (const item of validatedOutput.items) {
      let matched = validProductsMap.get(item.productId);
      if (!matched && item.productName) {
        const resolved = resolveProduct(item.productName, catalog);
        if (resolved.status === 'resolved') {
          matched = validProductsMap.get(resolved.product.id);
        } else if (resolved.status === 'ambiguous' && (!disambiguationList || disambiguationList.length === 0)) {
          disambiguationList = resolved.candidates.slice(0, 5).map((c) => ({
            id: c.product.id,
            name: c.product.name,
            price: c.product.price,
            category: c.product.category,
          }));
        }
      }

      if (matched) {
        finalItems.push({
          productId: matched.id,
          productName: matched.name,
          quantity: Math.max(1, Math.min(item.quantity, 10)),
          note: item.note || '',
          size: item.size || 'M',
          sugar: item.sugar || '100%',
          ice: item.ice || '100% đá',
          toppings: Array.isArray(item.toppings) ? item.toppings : [],
        });
      }
    }
  }

  // 7. Server-Side Table Validation
  let finalTargetTable: TableInfo | null = null;
  if (validatedOutput.targetTable) {
    const rawTableId = validatedOutput.targetTable.id;
    const rawTableName = validatedOutput.targetTable.name;
    const found = tables.find(
      (t) =>
        t.id === rawTableId ||
        t.name.toLowerCase() === rawTableName?.toLowerCase() ||
        normalizeSearchText(t.name) === normalizeSearchText(rawTableName || '') ||
        t.id === rawTableName
    );

    if (found) {
      finalTargetTable = found;
    } else if (rawTableName) {
      // LLM phán đoán bàn không tồn tại trong danh mục quán
      const activeNames = tables.map((t) => t.name).join(', ');
      return {
        success: true,
        action: 'none',
        targetTable: null,
        items: [],
        message: `⚠️ Quán không có "${rawTableName}" trong hệ thống (hoặc bàn đang ngừng hoạt động). Quán hiện có các bàn: ${activeNames}. Vui lòng chọn lại đúng bàn.`,
        source: 'llm',
        isBlocked: false,
      };
    }
  }

  if (!finalTargetTable && preResolvedTable?.table) {
    finalTargetTable = preResolvedTable.table;
  }

  // Nếu có disambiguation mà chưa chốt được món cụ thể
  if (disambiguationList && disambiguationList.length > 0 && finalItems.length === 0) {
    validatedOutput.action = 'none';
    validatedOutput.message = `Quán có nhiều món khớp với yêu cầu của bạn (${disambiguationList.map((c) => c.name).join(', ')}). Bạn muốn chọn cụ thể món nào ạ?`;
  }

  // 8. Nếu có bàn nhưng không có món nào -> Chuyển sang action select_table
  if (
    finalTargetTable &&
    finalItems.length === 0 &&
    !disambiguationList?.length &&
    (validatedOutput.action === 'add' || validatedOutput.action === 'select_table')
  ) {
    validatedOutput.action = 'select_table';
  }

  // 9. Xử lý thông điệp rõ ràng, không bao giờ tự ý báo "đã thêm đơn thành công"
  let finalMessage = validatedOutput.message || '';
  if (validatedOutput.action === 'qa') {
    const ragHits = retrieveProjectKnowledge(message, {
      topK: 1,
      minScore: 4,
      roleScope: 'staff',
      customChunks: customRagChunks,
      customFaqs: Array.isArray(customFaqs) ? (customFaqs as any) : null,
    });
    const matchedTopic = findRelevantKnowledge(message);
    if (ragHits.length > 0 && !finalMessage.includes('[Nguồn:')) {
      finalMessage = `${finalMessage || ragHits[0].content}\n\n${ragHits[0].citation}`;
    } else if (matchedTopic) {
      finalMessage = appendCitationIfMissing(finalMessage || 'Đã trả lời hướng dẫn.', matchedTopic);
    } else {
      finalMessage = removeCitation(finalMessage || 'Xin chào! Tôi có thể hỗ trợ gì cho bạn?');
    }
  } else if (validatedOutput.action === 'select_table' && finalTargetTable) {
    finalMessage = `Đã chọn ${finalTargetTable.name}. Bàn hiện chưa có món nào, bạn muốn gọi thêm những món gì cho bàn này ạ? (Gợi ý: Trà sữa nướng, Trà đào, Cà phê muối...)`;
  } else if (finalItems.length > 0) {
    const tableText = finalTargetTable ? ` cho ${finalTargetTable.name}` : '';
    finalMessage =
      validatedOutput.action === 'remove'
        ? `Đã nhận diện yêu cầu bớt ${finalItems.length} món${tableText}. Vui lòng kiểm tra và duyệt đơn bên dưới.`
        : `Đã nhận diện ${finalItems.length} món${tableText}. Vui lòng kiểm tra và duyệt đơn bên dưới.`;
  } else if (!finalMessage) {
    finalMessage = 'Chưa nhận diện được yêu cầu. Bạn có thể nói rõ hơn món hoặc bàn cần phục vụ nhé!';
  }

  // 10. Chặn bớt món âm giỏ (Negative Cart Guard) & tính toán Cart Diff
  if (validatedOutput.action === 'remove' && finalItems.length > 0) {
    const guarded = applyNegativeCartGuard(validatedOutput.action, finalItems, currentCart, finalMessage);
    validatedOutput.action = guarded.action;
    finalItems = guarded.items;
    finalMessage = guarded.message;
  }

  const cartDiff = computeCartDiff(validatedOutput.action, finalItems, currentCart, catalog);

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
      ...(disambiguationList?.length ? { disambiguation: disambiguationList } : {}),
      ...(cartDiff.length ? { cartDiff } : {}),
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
    ...(disambiguationList?.length ? { disambiguation: disambiguationList } : {}),
    ...(cartDiff.length ? { cartDiff } : {}),
  };
}
