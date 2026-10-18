export interface SecurityCheckResult {
  violated: boolean;
  reason?: string;
  type?: 'forbidden_action' | 'prompt_injection' | 'unauthorized';
}

const FORBIDDEN_ACTION_PATTERNS = [
  // Lệnh ép thực hiện thanh toán/checkout trực tiếp (không chặn câu hỏi về thanh toán)
  {
    pattern: /(thanh toán (tiền|hóa đơn|luôn|cho|giùm|bàn)|tính tiền (hóa đơn|luôn|bàn|cho|giùm)|bấm checkout|checkout đơn|hoàn tất đơn( hàng)?|tự thanh toán|trả tiền bàn|xuất hóa đơn luôn)/i,
    reason: 'AI không được phép tự thanh toán hóa đơn. Thu ngân vui lòng thao tác trực tiếp trên giao diện POS.',
  },
  {
    pattern: /(xóa bàn|hủy bàn|dọn bàn trống|delete table|clear table)/i,
    reason: 'AI không được phép xóa hoặc hủy bàn ăn.',
  },
  {
    pattern: /(đổi giá|sửa giá|giảm giá 100%|miễn phí( hoàn toàn)?|tặng miễn phí|set price|discount 100%)/i,
    reason: 'AI không được phép tự ý thay đổi đơn giá món hoặc áp dụng chiết khấu tùy tiện.',
  },
  {
    pattern: /(xóa dữ liệu|drop table|delete from|update pos_|update hoadon|tamper)/i,
    reason: 'Phát hiện yêu cầu thao tác cơ sở dữ liệu trái phép.',
  },
  {
    pattern: /(cấp quyền admin|thêm quyền quản trị|set role admin)/i,
    reason: 'AI không được phép tự ý cấp hoặc thay đổi quyền quản trị viên.',
  },
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /system prompt/i,
  /you are now/i,
  /jailbreak/i,
  /đóng vai (admin|root|hacker)/i,
  /bỏ qua (mọi )?hướng dẫn/i,
  /ghi đè chỉ thị/i,
  /hãy quên/i,
  /override system/i,
  /delete all orders/i,
];

/**
 * Kiểm tra câu lệnh xem có vi phạm quy tắc an toàn hoặc cố ý tấn công prompt hay không
 */
export function checkSecurityGuardrails(
  message: string,
  userRole?: string
): SecurityCheckResult {
  const trimmed = message.trim();

  // 1. Kiểm tra Prompt Injection trước tiên (ưu tiên tuyệt đối)
  for (const regex of PROMPT_INJECTION_PATTERNS) {
    if (regex.test(trimmed)) {
      return {
        violated: true,
        type: 'prompt_injection',
        reason: 'Phát hiện dấu hiệu tấn công chỉ thị hệ thống (Prompt Injection). Yêu cầu đã bị chặn.',
      };
    }
  }

  // 2. Nếu là câu hỏi hướng dẫn / tiện ích / phương thức thanh toán -> Cho phép đi tiếp vào QA
  const isQuestion = /(quán có|hướng dẫn|chỉ anh|chỉ em|cách|hỏi về|có được|không\??$)/i.test(trimmed);
  if (!isQuestion) {
    // 3. Kiểm tra Hành động bị cấm tuyệt đối
    for (const { pattern, reason } of FORBIDDEN_ACTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          violated: true,
          type: 'forbidden_action',
          reason,
        };
      }
    }
  }

  // 4. Phân quyền vai trò: Nhân viên không được xem báo cáo tài chính qua chatbot
  if (userRole && userRole !== 'Quản trị viên' && userRole !== 'Admin') {
    if (/(báo cáo doanh thu|lợi nhuận|doanh số|quản trị hệ thống|phân quyền nhân viên)/i.test(trimmed)) {
      return {
        violated: true,
        type: 'unauthorized',
        reason: 'Tài khoản nhân viên hiện tại không có quyền truy cập thông tin báo cáo tài chính hoặc cấu hình hệ thống.',
      };
    }
  }

  return { violated: false };
}
