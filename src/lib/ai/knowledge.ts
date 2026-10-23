/**
 * Knowledge Base cho Trợ lý AI POS H2 MilkTea
 * Trích xuất từ tài liệu hướng dẫn sử dụng hệ thống (/user-guide)
 */

export interface KnowledgeTopic {
  id: string;
  title: string;
  sectionId: string;
  sectionTitle: string;
  keywords: string[];
  summary: string;
  steps?: string[];
  shortcuts?: Record<string, string>;
}

export const POS_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  {
    id: 'introduction',
    title: 'Tổng quan và giới thiệu hệ thống POS H2 MilkTea',
    sectionId: 'introduction',
    sectionTitle: 'Giới thiệu chung',
    keywords: ['hướng dẫn sử dụng', 'cẩm nang', 'giới thiệu chung', 'tổng quan', 'hướng dẫn pos', 'cách dùng pos', 'hướng dẫn hệ thống'],
    summary: 'Hệ thống quản lý bán hàng H2 MilkTea hỗ trợ bán hàng, quản lý bàn, in hóa đơn, tích điểm khách hàng và báo cáo doanh thu.',
  },
  {
    id: 'add-product',
    title: 'Cách thêm sản phẩm / món mới vào menu',
    sectionId: 'menu',
    sectionTitle: 'Menu & Sản phẩm',
    keywords: ['thêm món', 'tạo món', 'món mới', 'sản phẩm mới', 'thêm sản phẩm', 'tạo sản phẩm', 'cài đặt menu', 'tạo menu', 'tạo thực đơn'],
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
    sectionId: 'menu',
    sectionTitle: 'Menu & Sản phẩm',
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
    sectionId: 'shortcuts',
    sectionTitle: 'Phím tắt',
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
    sectionId: 'settings',
    sectionTitle: 'Cài đặt hệ thống',
    keywords: ['máy in', 'cài máy in', 'in hóa đơn', 'in bếp', 'khổ giấy', 'k80', 'k57', 'kết nối máy in', 'cách in'],
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
    sectionId: 'pos',
    sectionTitle: 'POS Bán hàng',
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
    sectionId: 'customers',
    sectionTitle: 'Quản lý khách hàng',
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
    id: 'order-management',
    title: 'Quản lý đơn hàng và hóa đơn',
    sectionId: 'orders',
    sectionTitle: 'Quản lý đơn hàng',
    keywords: ['hóa đơn', 'đơn hàng', 'lịch sử đơn', 'in lại bill', 'hủy đơn'],
    summary: 'Tra cứu lịch sử đơn hàng, xem chi tiết hóa đơn và in lại bill cho khách:',
    steps: [
      'Bước 1: Vào mục "Đơn hàng" trên thanh điều hướng.',
      'Bước 2: Tìm hóa đơn theo mã đơn, ngày tạo hoặc tên khách.',
      'Bước 3: Bấm xem chi tiết để in lại hóa đơn hoặc kiểm tra lịch sử thanh toán.',
    ],
  },
  {
    id: 'qr-ordering',
    title: 'Khách tự đặt món qua mã QR tại bàn',
    sectionId: 'mobile',
    sectionTitle: 'Hỗ trợ di động',
    keywords: ['qr', 'quét mã', 'đặt món tại bàn', 'đơn qr', 'hỗ trợ di động'],
    summary: 'Khách hàng tự quét mã QR tại bàn để xem menu và gửi đơn:',
    steps: [
      'Khách dùng camera điện thoại quét mã QR dán tại bàn.',
      'Chọn món, tùy chỉnh size, đường, đá và bấm Gửi đơn.',
      'Đơn hàng QR sẽ đổ về hộp thư "Đơn QR tại bàn" trên màn hình POS để thu ngân xác nhận.',
    ],
  },
  {
    id: 'reports',
    title: 'Báo cáo doanh thu và thống kê',
    sectionId: 'reports',
    sectionTitle: 'Báo cáo & Thống kê',
    keywords: ['doanh thu', 'báo cáo', 'thống kê', 'doanh số', 'cuối ngày'],
    summary: 'Theo dõi tình hình kinh doanh của quán theo thời gian thực:',
    steps: [
      'Vào mục "Báo cáo" để xem tổng doanh thu trong ngày, tuần, tháng.',
      'Biểu đồ trực quan giúp nhận biết khung giờ cao điểm và top món bán chạy.',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Xử lý các lỗi thường gặp',
    sectionId: 'troubleshooting',
    sectionTitle: 'Xử lý lỗi',
    keywords: ['lỗi', 'mất mạng', 'không in được', 'xung đột', 'không lưu được', 'treo'],
    summary: 'Cách khắc phục sự cố nhanh:',
    steps: [
      'Mất kết nối mạng / Ngoại tuyến: Hệ thống có cơ chế Offline Cart, giỏ hàng vẫn lưu tạm trên máy. Khi có mạng trở lại bấm F5 để đồng bộ.',
      'Máy in không in: Kiểm tra dây cáp USB/LAN của máy in nhiệt, kiểm tra khay giấy in xem có bị kẹt hoặc hết giấy không.',
      'Xung đột giỏ hàng: Khi 2 thu ngân cùng sửa một bàn, hệ thống sẽ cảnh báo "Xung đột giỏ hàng", hãy bấm F5 để tải bản mới nhất.',
    ],
  },
];

export function formatCitation(sectionTitle: string, sectionId: string): string {
  return `[Nguồn: Hướng dẫn sử dụng > ${sectionTitle}](/user-guide#${sectionId})`;
}

/**
 * Xóa trích dẫn nguồn nếu câu trả lời không phải là hỏi đáp nghiệp vụ POS
 */
export function removeCitation(answer: string): string {
  return answer
    .replace(/\n*\[Nguồn:\s*Hướng dẫn sử dụng\s*>[^\]]*\]\([^)]+\)/gi, '')
    .trim();
}

/**
 * Chỉ đính kèm trích dẫn khi có topic nghiệp vụ hợp lệ.
 * Tuyệt đối không fallback ép người dùng xem trích dẫn khi chào hỏi hoặc tư vấn món.
 */
export function appendCitationIfMissing(answer: string, topic?: KnowledgeTopic | null): string {
  if (/\[Nguồn:\s*Hướng dẫn sử dụng\s*>/i.test(answer)) {
    return answer;
  }
  if (topic && topic.sectionTitle && topic.sectionId) {
    return `${answer.trim()}\n\n${formatCitation(topic.sectionTitle, topic.sectionId)}`;
  }
  return answer.trim();
}

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
    'HƯỚNG DẪN SỬ DỤNG HỆ THỐNG POS H2 MILKTEA (dùng để trả lời khi người dùng hỏi nghiệp vụ - action: "qa"):',
    ...POS_KNOWLEDGE_BASE.map((topic) => {
      const parts = [
        `- ${topic.title} (Đề mục: "${topic.sectionTitle}", liên kết: /user-guide#${topic.sectionId}): ${topic.summary}`
      ];
      if (topic.steps) {
        parts.push(`  + Các bước: ${topic.steps.join(' ')}`);
      }
      if (topic.shortcuts) {
        const scList = Object.entries(topic.shortcuts).map(([k, v]) => `${k} (${v})`).join(', ');
        parts.push(`  + Phím tắt: ${scList}`);
      }
      parts.push(`  + Nguồn trích dẫn: [Nguồn: Hướng dẫn sử dụng > ${topic.sectionTitle}](/user-guide#${topic.sectionId})`);
      return parts.join('\n');
    }),
  ].join('\n\n');

  return faqSection ? `${faqSection}\n\n${userGuideSection}` : userGuideSection;
}

