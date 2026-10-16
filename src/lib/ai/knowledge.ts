/**
 * Knowledge Base cho Trợ lý AI POS H2 MilkTea
 * Trích xuất từ tài liệu hướng dẫn sử dụng hệ thống (/user-guide)
 */

export interface KnowledgeTopic {
  id: string;
  title: string;
  keywords: string[];
  summary: string;
  steps?: string[];
  shortcuts?: Record<string, string>;
}

export const POS_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  {
    id: 'add-product',
    title: 'Cách thêm sản phẩm / món mới vào menu',
    keywords: ['thêm món', 'món mới', 'sản phẩm mới', 'thêm sản phẩm', 'tạo món', 'menu', 'thực đơn'],
    summary: 'Để thêm sản phẩm mới vào danh mục bán lẻ của quán:',
    steps: [
      'Bước 1: Vào mục "Menu & Sản phẩm" hoặc "Sản phẩm" trên thanh menu bên trái.',
      'Bước 2: Bấm nút "+ Thêm sản phẩm" ở góc trên bên phải.',
      'Bước 3: Nhập Tên sản phẩm, Đơn giá bán, Loại sản phẩm (Trà sữa, Cà phê, Nước ép...), và Đơn vị tính (Ly, Chai...).',
      'Bước 4: (Tùy chọn) Tải ảnh sản phẩm lên Cloudinary hoặc chọn ảnh có sẵn.',
      'Bước 5: Bấm "Lưu" để hoàn tất. Sản phẩm sẽ xuất hiện ngay trên màn hình POS.',
    ],
  },
  {
    id: 'edit-price',
    title: 'Cách chỉnh sửa giá bán hoặc thông tin sản phẩm',
    keywords: ['sửa giá', 'đổi giá', 'chỉnh giá', 'sửa món', 'cập nhật món', 'ngừng bán'],
    summary: 'Cách cập nhật giá hoặc trạng thái món:',
    steps: [
      'Bước 1: Truy cập trang "Sản phẩm".',
      'Bước 2: Tìm sản phẩm cần sửa bằng thanh tìm kiếm.',
      'Bước 3: Bấm vào biểu tượng cây bút (Chỉnh sửa) ở dòng sản phẩm đó.',
      'Bước 4: Thay đổi đơn giá bán hoặc chuyển Trạng thái thành "Ngừng hoạt động" nếu tạm hết hàng.',
      'Bước 5: Bấm "Lưu thay đổi".',
    ],
  },
  {
    id: 'shortcuts',
    title: 'Danh sách phím tắt bán hàng trên POS',
    keywords: ['phím tắt', 'shortcut', 'bấm nhanh', 'hotkey', 'f1', 'f3', 'f4', 'f5', 'esc'],
    summary: 'Hệ thống hỗ trợ các phím tắt nhanh để thu ngân thao tác tốc độ cao:',
    shortcuts: {
      'F4': 'Thanh toán nhanh (Mở hộp thoại thanh toán khi giỏ hàng đã có món)',
      'Escape (Esc)': 'Xóa toàn bộ giỏ hàng hiện tại',
      'F1': 'Reset bộ lọc sản phẩm về mặc định',
      'F3': 'Mở hộp thoại tìm kiếm và chọn khách hàng thân thiết',
      'F5': 'Đồng bộ lại toàn bộ dữ liệu (Sản phẩm, Bàn, Khách hàng) từ máy chủ',
    },
  },
  {
    id: 'printer-setup',
    title: 'Cách cài đặt máy in hóa đơn và in bếp',
    keywords: ['máy in', 'cài máy in', 'in hóa đơn', 'in bếp', 'khổ giấy', 'k80', 'k57', 'kết nối máy in'],
    summary: 'Thiết lập máy in nhiệt:',
    steps: [
      'Bước 1: Vào mục "Cài đặt" ➔ "Cài đặt in hóa đơn" (/receipt-settings).',
      'Bước 2: Chọn khổ giấy phù hợp với máy in tại quầy: K80 (80mm) hoặc K57 (58mm).',
      'Bước 3: Điền thông tin tiêu đề quán (H2 MilkTea), địa chỉ, hotline và lời cảm ơn in ở chân hóa đơn.',
      'Bước 4: Bật tùy chọn "Tự động in khi thanh toán" hoặc "Tự động in đơn bếp" nếu cần.',
      'Bước 5: Bấm "In thử nghiệm" để kiểm tra kết nối với máy in nhiệt.',
    ],
  },
  {
    id: 'table-management',
    title: 'Quản lý bàn và chuyển bàn',
    keywords: ['đổi bàn', 'chuyển bàn', 'mở bàn', 'trạng thái bàn', 'ghép bàn', 'bàn trống'],
    summary: 'Thao tác với bàn trên màn hình POS:',
    steps: [
      'Chọn bàn: Bấm vào nút "Chọn bàn" hoặc bấm trực tiếp vào thẻ bàn trên giao diện.',
      'Trạng thái bàn: Màu xanh lá là Bàn trống, màu cam/đỏ là Bàn đang có khách (đang có giỏ hàng).',
      'Khách mua về: Chọn bàn "Khách mua về" cho các đơn mang đi không ngồi tại quán.',
      'Chuyển bàn: Vào chức năng "Đổi bàn", chọn bàn đích để chuyển toàn bộ món sang bàn mới.',
    ],
  },
  {
    id: 'customer-points',
    title: 'Chính sách khách hàng thân thiết và tích điểm',
    keywords: ['khách hàng', 'tích điểm', 'thành viên', 'vip', 'kim cương', 'giảm giá thành viên'],
    summary: 'Chính sách ưu đãi tự động theo cấp bậc thành viên:',
    steps: [
      'Khách thường: Tích điểm theo tổng chi tiêu đơn hàng.',
      'Khách VIP: Tự động giảm giá 10% trên tạm tính (subtotal) của đơn hàng.',
      'Khách Kim Cương: Tự động giảm giá 20% trên tạm tính của đơn hàng.',
      'Cách chọn khách: Bấm phím F3 trên màn hình POS hoặc bấm nút "Chọn khách hàng", nhập số điện thoại hoặc tên khách.',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Xử lý các lỗi thường gặp',
    keywords: ['lỗi', 'mất mạng', 'không in được', 'xung đột', 'không lưu được', 'treo'],
    summary: 'Cách khắc phục sự cố nhanh:',
    steps: [
      'Mất kết nối mạng / Ngoại tuyến: Hệ thống có cơ chế Offline Cart, giỏ hàng vẫn lưu tạm trên máy. Khi có mạng trở lại bấm F5 để đồng bộ.',
      'Máy in không in: Kiểm tra dây cáp USB/LAN của máy in nhiệt, kiểm tra khay giấy in xem có bị kẹt hoặc hết giấy không.',
      'Xung đột giỏ hàng: Khi 2 thu ngân cùng sửa một bàn, hệ thống sẽ cảnh báo "Xung đột giỏ hàng", hãy bấm F5 để tải bản mới nhất.',
    ],
  },
];

import defaultStoreFaqs from '@/data/store_faq.json';

export interface StoreFAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  isActive: boolean;
  order: number;
}

/**
 * Tìm kiếm câu hỏi FAQ quán phù hợp nhất dựa trên từ khóa câu hỏi
 */
export function findRelevantFAQ(query: string, faqs?: StoreFAQItem[] | null): StoreFAQItem | null {
  const normalized = query.toLowerCase();
  const list = Array.isArray(faqs) && faqs.length > 0 ? faqs : (defaultStoreFaqs as StoreFAQItem[]);
  let bestItem: StoreFAQItem | null = null;
  let maxMatched = 0;

  for (const item of list) {
    if (item.isActive === false) continue;
    let score = 0;
    if (normalized.includes(item.question.toLowerCase())) score += 3;
    for (const kw of item.keywords || []) {
      if (kw && normalized.includes(kw.toLowerCase())) score += 1;
    }
    if (score > maxMatched) {
      maxMatched = score;
      bestItem = item;
    }
  }

  return maxMatched > 0 ? bestItem : null;
}

/**
 * Tạo prompt danh sách FAQ tùy biến của quán
 */
export function getStoreFAQPrompt(faqs?: StoreFAQItem[] | null): string {
  const activeFaqs = Array.isArray(faqs) && faqs.length > 0
    ? faqs.filter((f) => f.isActive !== false)
    : (defaultStoreFaqs as StoreFAQItem[]).filter((f) => f.isActive !== false);

  if (activeFaqs.length === 0) return '';

  return [
    'THÔNG TIN & TIỆN ÍCH QUÁN H2 MILKTEA (Dùng để trả lời khi khách hoặc thu ngân hỏi thông tin quán):',
    ...activeFaqs.map((f, i) => `${i + 1}. [${f.category}] ${f.question}\n   ➔ Trả lời: ${f.answer}`),
  ].join('\n\n');
}

/**
 * Tìm kiếm thông tin hướng dẫn liên quan nhất dựa trên câu hỏi
 */
export function findRelevantKnowledge(query: string): KnowledgeTopic | null {
  const normalized = query.toLowerCase();
  let bestTopic: KnowledgeTopic | null = null;
  let maxMatched = 0;

  for (const topic of POS_KNOWLEDGE_BASE) {
    const matched = topic.keywords.filter((kw) => normalized.includes(kw.toLowerCase())).length;
    if (matched > maxMatched) {
      maxMatched = matched;
      bestTopic = topic;
    }
  }

  return maxMatched > 0 ? bestTopic : null;
}

/**
 * Tạo prompt kiến thức rút gọn để tiêm vào System Instruction của AI
 */
export function getKnowledgeBasePrompt(customFaqs?: StoreFAQItem[] | null): string {
  const faqSection = getStoreFAQPrompt(customFaqs);
  const userGuideSection = [
    'HƯỚNG DẪN SỬ DỤNG HỆ THỐNG POS H2 MILKTEA (dùng để trả lời khi người dùng hỏi nghiệp vụ):',
    ...POS_KNOWLEDGE_BASE.map((topic) => {
      const parts = [`- ${topic.title}: ${topic.summary}`];
      if (topic.steps) {
        parts.push(`  + Các bước: ${topic.steps.join(' ')}`);
      }
      if (topic.shortcuts) {
        const scList = Object.entries(topic.shortcuts).map(([k, v]) => `${k} (${v})`).join(', ');
        parts.push(`  + Phím tắt: ${scList}`);
      }
      return parts.join('\n');
    }),
  ].join('\n\n');

  return faqSection ? `${faqSection}\n\n${userGuideSection}` : userGuideSection;
}

