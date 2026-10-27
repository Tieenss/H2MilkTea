import { NextRequest, NextResponse } from 'next/server';

function parseJsonSafely(rawText: string): any {
  const trimmed = rawText.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFences);
  } catch {
    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Phản hồi từ AI không đúng định dạng JSON.');
  }
}

function normalizePrice(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseFloat(String(val).replace(/[^\d.]/g, ''));
  if (isNaN(num) || num <= 0) return 0;
  // Nếu viết tắt dạng 22, 35 (tức 22k, 35k)
  if (num > 0 && num < 500) return Math.round(num * 1000);
  return Math.round(num);
}

function guessBaseUnitAndFactor(unit: string): { baseUnit: string; factor: number } {
  const norm = (unit || '').toLowerCase();
  if (norm.includes('kg')) return { baseUnit: 'Gram', factor: 1000 };
  if (norm.includes('lít') || norm.includes('lit') || norm.includes('1l')) return { baseUnit: 'Ml', factor: 1000 };
  if (norm.includes('thùng')) return { baseUnit: 'Hộp', factor: 12 };
  return { baseUnit: norm ? unit : 'Cái', factor: 1 };
}

async function callGeminiWithFallback(apiKey: string, parts: any[]): Promise<any> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = 'Không thể kết nối tới mô hình AI.';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.15,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        lastError = data?.error?.message || `Lỗi Gemini (${model}): HTTP ${response.status}`;
        continue;
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      return parseJsonSafely(rawText);
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  throw new Error(lastError);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'prompt', prompt = '', imageBase64 = '', currentMaterials = [] } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống.' },
        { status: 500 }
      );
    }

    const existingList = Array.isArray(currentMaterials)
      ? currentMaterials.map((m: any) => ({
          id: m.IDNguyenLieu,
          name: m['Tên nguyên liệu'],
          unit: m['Đơn vị tính'],
        }))
      : [];

    const systemPrompt = `Bạn là Trợ lý AI Quản lý Kho & Nguyên vật liệu cho quán H2 MilkTea.
Nhiệm vụ của bạn là bóc tách danh sách nguyên vật liệu và số lượng nhập/xuất từ yêu cầu văn bản hoặc hình ảnh hóa đơn/phiếu nhập hàng.

Danh sách nguyên vật liệu ĐÃ CÓ trong kho của quán:
${JSON.stringify(existingList)}

Quy tắc xử lý:
1. Nếu tên nguyên liệu người dùng nhập trùng hoặc tương đương với một nguyên liệu đã có trong danh sách trên, hãy điền đúng "matchedId" là "id" của nguyên liệu đó và chuẩn hóa "name" theo tên chuẩn trong hệ thống. Nếu là nguyên liệu mới chưa có, trả về "matchedId": null.
2. Về "unitPrice" (đơn giá nhập 1 đơn vị): nếu ghi 25k hoặc 25 thì quy đổi thành 25000. Nếu không nhắc tới đơn giá thì trả về 0.
3. Về "transactionType": nếu người dùng nói "xuất kho / dùng hết / hủy" thì trả về "Xuất kho", mặc định trả về "Nhập kho".
4. Trả về định dạng JSON DUY NHẤT:
{
  "transactionType": "Nhập kho" hoặc "Xuất kho",
  "supplier": "Tên nhà cung cấp nếu có, hoặc chuỗi rỗng",
  "note": "Ghi chú ngắn gọn cho phiếu kho",
  "items": [
    {
      "matchedId": "Mã NVL đã có (vd: NVL001) hoặc null nếu là nguyên liệu mới",
      "name": "Tên nguyên vật liệu chuẩn",
      "unit": "Đơn vị tính (Kg, Hộp 1L, Lon, Chai, Túi, Gói, Cái...)",
      "quantity": số lượng (số thực dương, vd: 10, 2.5),
      "unitPrice": số nguyên đơn giá nhập (hoặc 0 nếu không có),
      "warningThreshold": mức cảnh báo tồn kho tối thiểu gợi ý (vd: 5 hoặc 10)
    }
  ]
}`;

    let parsed: any;

    if (mode === 'scan_invoice') {
      if (!imageBase64) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng tải lên ảnh phiếu giao hàng hoặc hóa đơn.' },
          { status: 400 }
        );
      }
      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
      const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
      const cleanBase64 = imageBase64.replace(/^data:image\/[^;]+;base64,/i, '').trim();

      parsed = await callGeminiWithFallback(apiKey, [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
      ]);
    } else {
      if (!prompt || !String(prompt).trim()) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng nhập nội dung nguyên vật liệu cần thêm.' },
          { status: 400 }
        );
      }

      parsed = await callGeminiWithFallback(apiKey, [
        { text: `${systemPrompt}\n\nNội dung người dùng nhập: "${prompt}"` },
      ]);
    }

    const rawItems: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalizedItems = rawItems
      .map((item) => {
        const rawName = String(item?.name || '').trim();
        if (!rawName) return null;

        // Kiểm tra lại với currentMaterials để đảm bảo khớp chính xác
        const existingMat = currentMaterials.find(
          (m: any) =>
            (item.matchedId && m.IDNguyenLieu === item.matchedId) ||
            String(m['Tên nguyên liệu'] || '').trim().toLowerCase() === rawName.toLowerCase()
        );

        const unit = existingMat?.['Đơn vị tính'] || item.unit || 'Kg';
        const { baseUnit, factor } = guessBaseUnitAndFactor(unit);
        const quantity = Math.max(0, parseFloat(item.quantity) || 1);
        const unitPrice = normalizePrice(item.unitPrice);

        return {
          matchedId: existingMat?.IDNguyenLieu || null,
          isExisting: Boolean(existingMat),
          name: existingMat?.['Tên nguyên liệu'] || rawName,
          unit,
          quantity,
          unitPrice,
          totalPrice: Math.round(quantity * unitPrice),
          warningThreshold: Number(existingMat?.['Số lượng cảnh báo']) || Number(item.warningThreshold) || 5,
          baseUnit: existingMat?.['Đơn vị cơ sở'] || baseUnit,
          conversionFactor: Number(existingMat?.['Hệ số quy đổi']) || factor,
          selected: true,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      transactionType: parsed?.transactionType === 'Xuất kho' ? 'Xuất kho' : 'Nhập kho',
      supplier: parsed?.supplier || '',
      note: parsed?.note || 'Nhập nhanh nguyên vật liệu bằng Trợ lý AI',
      items: normalizedItems,
    });
  } catch (error: any) {
    console.error('AI Inventory Helper Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Lỗi khi phân tích nguyên vật liệu bằng AI.',
      },
      { status: 500 }
    );
  }
}
