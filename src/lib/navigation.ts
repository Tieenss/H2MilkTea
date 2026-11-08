import {
    LayoutDashboard,
    Palette,
    Users,
    Package,
    ShoppingCart,
    Settings,
    Sliders,
    Warehouse,
    Truck,
    Home,
    BarChart3,
    PieChart,
    Coffee,
    UtensilsCrossed,
    Store,
    Gift,
    TrendingUp,
    Monitor,
    Heart,
    Printer,
    BookOpen,
    ClipboardList,
    BarChart,
    Bot,
    Bell,
} from 'lucide-react';

export type NavigationSectionId = 'core' | 'management' | 'system';

export interface NavigationSectionMeta {
    id: NavigationSectionId;
    label: string;
    shortLabel: string;
    emoji: string;
    description: string;
}

export const NAVIGATION_SECTIONS: NavigationSectionMeta[] = [
    {
        id: 'core',
        label: 'VẬN HÀNH CHÍNH (QUẦY & BẾP)',
        shortLabel: 'Chính',
        emoji: '🔥',
        description: 'Các chức năng cốt lõi sử dụng liên tục hàng phút tại quầy thu ngân, bàn khách và quầy pha chế.'
    },
    {
        id: 'management',
        label: 'QUẢN LÝ NGHIỆP VỤ & KHO',
        shortLabel: 'Quản lý',
        emoji: '📦',
        description: 'Quản lý thực đơn, công thức định mức BOM, tồn kho nguyên vật liệu và phân tích báo cáo doanh thu.'
    },
    {
        id: 'system',
        label: 'HỆ THỐNG & CÀI ĐẶT PHỤ TRỢ',
        shortLabel: 'Cài đặt',
        emoji: '⚙️',
        description: 'Cấu hình tính năng, quản trị kho tri thức AI RAG, phân quyền nhân sự, mẫu in và sao lưu dữ liệu.'
    }
];

export interface NavigationItem {
    name: string;
    href?: string;
    icon: React.ElementType;
    dashboard: boolean;
    sidebar: boolean;
    color?: string;
    group?: string;
    children?: NavigationItem[];
    isGroup?: boolean;
    badge?: string;
    description?: string;
    section?: NavigationSectionId;
    tierLabel?: string;
    roleHint?: string;
    highlights?: string[];
}

export const navigation: NavigationItem[] = [
    {
        name: 'Trang chủ',
        href: '/dashboard',
        icon: Home,
        dashboard: true,
        sidebar: true,
        color: '#0065F8',
        section: 'core',
        tierLabel: 'Chức năng chính',
        roleHint: 'Admin, Quản lý, Thu ngân',
        description: 'Bảng điều khiển trung tâm hiển thị nhanh doanh thu trong ngày, trạng thái bàn đang phục vụ và lối tắt tới 21 phân hệ.',
        highlights: [
            'Xem nhanh KPI doanh thu & số đơn hôm nay',
            'Truy cập nhanh toàn bộ phân hệ theo quyền'
        ]
    },

    // Group: POS & Bán hàng
    {
        name: 'POS & Bán hàng',
        href: '/pos-hub',
        icon: ShoppingCart,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        color: '#0ABAB5',
        section: 'core',
        tierLabel: 'Nhóm vận hành chính',
        roleHint: 'Thu ngân, Pha chế, Quản lý',
        description: 'Phân hệ cốt lõi phục vụ bán hàng tại quầy POS, duyệt đơn khách quét QR, điều phối pha chế KDS và quản lý sơ đồ bàn.',
        highlights: [
            'Đồng bộ giỏ hàng đa thiết bị thời gian thực (OCC)',
            'Tự động đối soát chuyển khoản VietQR & SePay',
            'Điều phối bếp KDS 1 chạm & Gộp món thông minh'
        ],
        children: [
            {
                name: 'POS Bán hàng',
                href: '/pos',
                icon: Monitor,
                dashboard: true,
                sidebar: true,
                color: '#0ABAB5',
                badge: 'Hot',
                section: 'core',
                tierLabel: 'Chức năng chính • Cốt lõi',
                roleHint: 'Thu ngân, Quản lý, Admin',
                description: 'Màn hình bán hàng chính tại quầy: chọn bàn theo khu vực, gọi món, duyệt đơn QR, gọi AI lên đơn 0.01s và thanh toán VietQR/Tiền mặt.',
                highlights: [
                    'Chọn bàn theo 4 khu vực chuẩn (xếp A → Z)',
                    'Trợ lý AI gọi món giọng nói & kiểm soát xung đột OCC',
                    'In hóa đơn K80 & tem nhãn dán cốc tự động'
                ]
            },
            {
                name: 'Màn hình Bếp / Pha chế',
                href: '/kitchen',
                icon: UtensilsCrossed,
                dashboard: true,
                sidebar: true,
                color: '#EA580C',
                badge: 'KDS',
                section: 'core',
                tierLabel: 'Chức năng chính • Quầy Bar',
                roleHint: 'Pha chế (Barista), Quản lý',
                description: 'Màn hình điều phối pha chế thời gian thực (KDS): nhận đơn tức thì từ POS, cảnh báo đơn trễ SLA > 10 phút và hỗ trợ chế độ Điện thoại 1 chạm.',
                highlights: [
                    'Chế độ Điện thoại 1 chạm (Barista Mobile 1-Tap)',
                    'Gộp món thông minh (Smart Batch Prep) cùng loại',
                    'Cảnh báo màu sắc theo thời gian chờ SLA'
                ]
            },
            {
                name: 'Đơn hàng',
                href: '/orders',
                icon: ShoppingCart,
                dashboard: true,
                sidebar: true,
                color: '#578FCA',
                section: 'core',
                tierLabel: 'Chức năng vận hành',
                roleHint: 'Thu ngân, Quản lý, Admin',
                description: 'Tra cứu lịch sử hóa đơn trong ngày và toàn thời gian, xem chi tiết món, in lại hóa đơn hoặc hủy đơn an toàn (Soft Delete).',
                highlights: [
                    'Chống thất thoát doanh thu bằng cơ chế Xóa mềm',
                    'Xem chi tiết phương thức thanh toán & nhân viên thu'
                ]
            },
            {
                name: 'Bàn ',
                href: '/tables',
                icon: Store,
                dashboard: true,
                sidebar: true,
                color: '#CD853F',
                section: 'core',
                tierLabel: 'Chức năng vận hành',
                roleHint: 'Quản lý, Admin, Thu ngân',
                description: 'Quản lý sơ đồ bàn chia theo 4 khu vực (Quầy, Phòng hát, Vườn, Mang về), tạo nhanh dải bàn hàng loạt (BAN01→BAN15) và xuất mã QR đặt món.',
                highlights: [
                    'Tạo nhanh bàn hàng loạt theo dải số & khu vực',
                    'Chia khối khu vực trực quan & sắp xếp A → Z',
                    'Tải xuống & in thẻ mã QR định danh từng bàn'
                ]
            },
            {
                name: 'Khách hàng',
                href: '/khachhang',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#FF6347',
                section: 'core',
                tierLabel: 'Chức năng phụ trợ POS',
                roleHint: 'Thu ngân, Quản lý, Admin',
                description: 'Quản lý hồ sơ khách hàng thân thiết (CRM), hạng thành viên, tích điểm đổi quà và theo dõi sổ công nợ khách quen.',
                highlights: [
                    'Tự động tích điểm & nâng hạng thành viên khi thanh toán',
                    'Quản lý ghi nợ & thanh toán công nợ khách hàng'
                ]
            },
        ]
    },

    // Group: Menu & Sản phẩm
    {
        name: 'Menu & Sản phẩm',
        href: '/menu',
        icon: Coffee,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        color: '#8B4513',
        section: 'management',
        tierLabel: 'Nhóm quản lý danh mục',
        roleHint: 'Quản lý, Admin',
        description: 'Thiết lập danh mục 53 món đồ uống, cấu hình công thức định lượng nguyên liệu (BOM) và danh mục nguyên vật liệu pha chế.',
        highlights: [
            'Quét ảnh Menu bằng AI OCR để tạo món nhanh',
            'Liên kết chặt chẽ món bán ra với định mức trừ kho BOM'
        ],
        children: [
            {
                name: 'Danh sách sản phẩm',
                href: '/menu/products',
                icon: Coffee,
                dashboard: true,
                sidebar: true,
                color: '#8B4513',
                section: 'management',
                tierLabel: 'Chức năng quản lý chính',
                roleHint: 'Quản lý, Admin',
                description: 'Thêm, sửa, cập nhật giá bán, hình ảnh và trạng thái kinh doanh cho các món trà sữa, cà phê, trà trái cây và topping.',
                highlights: [
                    'Phân loại 11 nhóm thực đơn chuẩn hóa',
                    'Hỗ trợ quét thực đơn bằng AI tạo sản phẩm tự động'
                ]
            },
            {
                name: 'Cấu hình nguyên liệu',
                href: '/menu/cauhinhnguyenlieu',
                icon: Gift,
                dashboard: true,
                sidebar: true,
                color: '#CD853F',
                section: 'management',
                tierLabel: 'Chức năng quản lý BOM',
                roleHint: 'Quản lý, Admin',
                description: 'Thiết lập định mức công thức pha chế (Bill of Materials - BOM): quy định 1 ly đồ uống tiêu hao bao nhiêu gam/ml nguyên liệu để tự động trừ kho.',
                highlights: [
                    '129 dòng định mức nguyên liệu chuẩn hóa',
                    'Tự động tính giá vốn (COGS) & trừ tồn kho khi thanh toán'
                ]
            },
            {
                name: 'Nguyên liệu',
                href: '/menu/nguyenlieu',
                icon: Package,
                dashboard: true,
                sidebar: true,
                color: '#D2691E',
                section: 'management',
                tierLabel: 'Chức năng quản lý danh mục',
                roleHint: 'Quản lý, Admin',
                description: 'Quản lý danh mục 52 nguyên vật liệu pha chế, đơn vị tính, giá nhập chuẩn và ngưỡng cảnh báo tồn kho tối thiểu.',
                highlights: [
                    'Thiết lập ngưỡng tồn tối thiểu để cảnh báo tự động',
                    'Theo dõi số lượng tồn kho thực tế theo thời gian thực'
                ]
            },
        ]
    },

    // Group: Quản lý kho
    {
        name: 'Quản lý kho',
        href: '/inventory',
        icon: Warehouse,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        color: '#2E8B57',
        section: 'management',
        tierLabel: 'Nhóm quản trị kho bãi',
        roleHint: 'Quản lý, Admin, Thủ kho',
        description: 'Quản lý toàn diện vòng đời kho nguyên vật liệu: lập phiếu nhập/xuất kho, cân bằng kiểm kê thực tế, quản lý nhà cung cấp và dự báo nhập hàng 30 ngày.',
        highlights: [
            'Đối chiếu chênh lệch tồn lý thuyết vs tồn kiểm kê thực tế',
            'Dự báo lượng nguyên liệu cần nhập 30 ngày tới'
        ],
        children: [
            {
                name: 'Nhập/xuất kho',
                href: '/inventory/transactions',
                icon: Truck,
                dashboard: true,
                sidebar: true,
                color: '#2E8B57',
                section: 'management',
                tierLabel: 'Chức năng quản lý kho',
                roleHint: 'Quản lý, Admin',
                description: 'Lập phiếu nhập hàng từ nhà cung cấp hoặc phiếu xuất hủy nguyên liệu hỏng/hết hạn, tự động cộng/trừ tồn kho tức thì.',
                highlights: [
                    'Lưu vết lịch sử nhập/xuất kèm đơn giá và nhà cung cấp',
                    'Cập nhật số lượng tồn kho nguyên tử'
                ]
            },
            {
                name: 'Kiểm kê kho',
                href: '/inventory/stocktake',
                icon: ClipboardList,
                dashboard: true,
                sidebar: true,
                color: '#FF8C00',
                section: 'management',
                tierLabel: 'Chức năng kiểm soát thất thoát',
                roleHint: 'Quản lý, Admin',
                description: 'Tạo biên bản kiểm kê kho cuối ca/cuối tuần, tự động tính toán độ lệch giữa sổ sách và thực tế để phát hiện hao hụt nguyên liệu.',
                highlights: [
                    'Tự động tính tỷ lệ chênh lệch & giá trị hao hụt',
                    'Cân bằng lại tồn kho thực tế sau khi duyệt biên bản'
                ]
            },
            {
                name: 'Nhà cung cấp',
                href: '/inventory/suppliers',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#4169E1',
                section: 'management',
                tierLabel: 'Chức năng danh mục kho',
                roleHint: 'Quản lý, Admin',
                description: 'Lưu trữ thông tin liên hệ, mã số thuế, danh mục mặt hàng cung ứng và lịch sử nhập hàng của các đối tác nhà cung cấp.',
                highlights: [
                    'Tra cứu nhanh đầu mối cung cấp từng loại nguyên liệu'
                ]
            },
            {
                name: 'Dự báo nhu cầu',
                href: '/inventory/forecast',
                icon: TrendingUp,
                dashboard: true,
                sidebar: true,
                color: '#8A2BE2',
                section: 'management',
                tierLabel: 'Chức năng phân tích AI',
                roleHint: 'Quản lý, Admin',
                description: 'Phân tích tốc độ tiêu hao nguyên liệu lịch sử để dự báo nhu cầu nhập hàng trong 7–30 ngày tới, ngăn chặn đứt gãy nguyên liệu giờ cao điểm.',
                highlights: [
                    'Gợi ý số lượng cần đặt thêm theo mức tiêu thụ thực tế',
                    'Cảnh báo sớm các mặt hàng có nguy cơ hết kho'
                ]
            },
        ]
    },

    // Group: Báo cáo & Thống kê
    {
        name: 'Báo cáo',
        href: '/reports',
        icon: PieChart,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        color: '#9333EA',
        section: 'management',
        tierLabel: 'Nhóm phân tích BI',
        roleHint: 'Chủ quán (Admin), Quản lý',
        description: 'Hệ thống 07 báo cáo quản trị thông minh (BI): phân tích doanh thu theo thời gian, top món bán chạy, lợi nhuận sản phẩm, hiệu suất nhân viên và xuất Excel.',
        highlights: [
            'Biểu đồ trực quan theo ngày/tuần/tháng/khung giờ',
            'Xuất báo cáo tổng hợp ra tệp Excel phục vụ kế toán'
        ],
        children: [
            {
                name: 'Dashboard tổng quan',
                href: '/reports/dashboard',
                icon: LayoutDashboard,
                dashboard: true,
                sidebar: true,
                color: '#800080',
                section: 'management',
                tierLabel: 'Báo cáo chính',
                roleHint: 'Admin, Quản lý',
                description: 'Bức tranh toàn cảnh về sức khỏe tài chính của quán: tổng doanh thu, số đơn, giá trị đơn trung bình (AOV) và xu hướng tăng trưởng.',
                highlights: ['So sánh doanh thu kỳ này với kỳ trước', 'Biểu đồ khung giờ vàng đông khách']
            },
            {
                name: 'Báo cáo bán hàng',
                href: '/reports/sales',
                icon: BarChart3,
                dashboard: true,
                sidebar: true,
                color: '#9932CC',
                section: 'management',
                tierLabel: 'Báo cáo tài chính',
                roleHint: 'Admin, Quản lý',
                description: 'Thống kê chi tiết doanh thu thực thu, chiết khấu, doanh thu theo phương thức thanh toán (Tiền mặt / Chuyển khoản VietQR).',
                highlights: ['Đối soát tiền mặt tại két và tiền chuyển khoản ngân hàng']
            },
            {
                name: 'Báo cáo món bán chạy',
                href: '/reports/bestsellers',
                icon: TrendingUp,
                dashboard: true,
                sidebar: true,
                color: '#BA55D3',
                section: 'management',
                tierLabel: 'Báo cáo thực đơn',
                roleHint: 'Admin, Quản lý',
                description: 'Xếp hạng Top sản phẩm mang lại sản lượng và doanh thu cao nhất để tối ưu menu và chuẩn bị nguyên liệu.',
                highlights: ['Nhận diện món ngôi sao (Best-sellers) & món bán chậm']
            },
            {
                name: 'Báo cáo sản phẩm',
                href: '/reports/products',
                icon: Package,
                dashboard: true,
                sidebar: true,
                color: '#9333EA',
                section: 'management',
                tierLabel: 'Báo cáo chi tiết',
                roleHint: 'Admin, Quản lý',
                description: 'Phân tích tỷ trọng doanh thu và biên lợi nhuận theo từng nhóm danh mục sản phẩm (Trà sữa, Cà phê, Trà trái cây, Topping).',
                highlights: ['Đánh giá hiệu quả kinh doanh theo nhóm món']
            },
            {
                name: 'Báo cáo nhân viên',
                href: '/reports/staff',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#DA70D6',
                section: 'management',
                tierLabel: 'Báo cáo nhân sự',
                roleHint: 'Admin, Quản lý',
                description: 'Đo lường số lượng đơn hàng đã xử lý và doanh thu phụ trách của từng nhân viên thu ngân theo ca làm việc.',
                highlights: ['Cơ sở đánh giá KPI và thưởng doanh số nhân viên']
            },
            {
                name: 'Báo cáo khách hàng',
                href: '/reports/customers',
                icon: Heart,
                dashboard: true,
                sidebar: true,
                color: '#EC4899',
                section: 'management',
                tierLabel: 'Báo cáo CRM',
                roleHint: 'Admin, Quản lý',
                description: 'Phân tích tần suất quay lại, tổng chi tiêu tích lũy và nhóm khách hàng VIP của cửa hàng.',
                highlights: ['Xác định tệp khách hàng trung thành']
            },
            {
                name: 'Báo cáo tổng hợp',
                href: '/reports/comprehensive',
                icon: BarChart,
                dashboard: true,
                sidebar: true,
                color: '#6366F1',
                section: 'management',
                tierLabel: 'Báo cáo toàn diện',
                roleHint: 'Admin, Quản lý',
                description: 'Tổng hợp toàn bộ chỉ số bán hàng, kho, sản phẩm và khách hàng trong một bảng điều khiển duy nhất kèm tính năng xuất tệp.',
                highlights: ['Tổng kết hoạt động kinh doanh cuối tháng/quý']
            },
        ]
    },

    // Group: Cài đặt hệ thống
    {
        name: 'Cài đặt',
        href: '/settings',
        icon: Settings,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        color: '#4F46E5',
        section: 'system',
        tierLabel: 'Nhóm cấu hình phụ trợ',
        roleHint: 'Admin (Toàn quyền), Nhân viên (Xem hướng dẫn)',
        description: 'Cấu hình công tắc tính năng hệ thống, quản trị Trợ lý AI & Kho tri thức Hybrid RAG, tùy biến giao diện, mẫu in nhiệt và sao lưu dữ liệu.',
        highlights: [
            'Quản trị Kho tri thức In-App Hybrid RAG & RAG Playground',
            'Bật/tắt linh hoạt phân hệ KDS, In tem cốc, Chế độ Dễ nhìn'
        ],
        children: [
            {
                name: 'Cài đặt chức năng',
                href: '/settings/features',
                icon: Sliders,
                dashboard: true,
                sidebar: true,
                color: '#10B981',
                badge: 'Mới',
                section: 'system',
                tierLabel: 'Cấu hình vận hành',
                roleHint: 'Admin',
                description: 'Bật/tắt các công tắc tính năng (Feature Flags) như Màn hình Bếp KDS, In tem nhãn cốc, thuế VAT và phân quyền thao tác mở rộng.',
                highlights: ['Tùy biến quy trình phù hợp ca vắng khách hoặc giờ cao điểm']
            },
            {
                name: 'Cài đặt chatbot AI',
                href: '/settings/ai',
                icon: Bot,
                dashboard: true,
                sidebar: true,
                color: '#4F46E5',
                badge: 'RAG',
                section: 'system',
                tierLabel: 'Quản trị AI & Tri thức RAG',
                roleHint: 'Admin',
                description: 'Trung tâm quản trị Trợ lý ảo AI: bật/tắt Kill-switch, quản lý 04 nguồn tri thức In-App Hybrid RAG, thử nghiệm RAG Playground và xem Nhật ký kiểm toán AI.',
                highlights: [
                    'Visual RAG Knowledge Manager (Tài liệu dự án, FAQ, Công thức, BOM)',
                    'Phòng thử nghiệm truy xuất Top-K (RAG Playground)',
                    'Giám sát nhật ký kiểm toán an toàn (ai_audit_logs)'
                ]
            },
            {
                name: 'Giao diện & Font chữ',
                href: '/settings/appearance',
                icon: Palette,
                dashboard: true,
                sidebar: true,
                color: '#6366F1',
                badge: 'Mới',
                section: 'system',
                tierLabel: 'Cá nhân hóa hiển thị',
                roleHint: 'Tất cả người dùng',
                description: 'Tùy chỉnh chế độ Sáng/Tối (Dark Mode), kích thước phông chữ, màu chủ đạo và Chế độ Dễ nhìn (Accessibility 2.0).',
                highlights: ['Đồng bộ tức thời không cần tải lại trang']
            },
            {
                name: 'Quản lý nhân viên',
                href: '/nhanvien',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#4169E1',
                section: 'system',
                tierLabel: 'Quản trị nhân sự & RBAC',
                roleHint: 'Độc quyền Admin',
                description: 'Quản lý tài khoản nhân viên (DSNV), cấp quyền theo vai trò (Admin, Quản lý, Thu ngân, Pha chế) và phân quyền xem từng menu.',
                highlights: ['Bảo mật phân quyền RBAC đồng bộ Supabase Auth']
            },
            {
                name: 'Cài đặt mẫu in',
                href: '/receipt-settings',
                icon: Printer,
                dashboard: true,
                sidebar: true,
                color: '#FF6347',
                section: 'system',
                tierLabel: 'Cấu hình phần cứng in',
                roleHint: 'Admin, Quản lý',
                description: 'Thiết lập thông tin quán trên đầu phiếu in nhiệt K80, lời chào cuối phiếu và định dạng tem nhãn dán cốc trà sữa.',
                highlights: ['Xem trước mẫu phiếu in K80 và tem cốc trực quan']
            },
            {
                name: 'Cài đặt data',
                href: '/settingdata',
                icon: Settings,
                dashboard: true,
                sidebar: true,
                color: '#4682B4',
                section: 'system',
                tierLabel: 'Sao lưu & Đồng bộ dữ liệu',
                roleHint: 'Admin',
                description: 'Sao lưu dữ liệu toàn hệ thống ra tệp Excel/JSON và cấu hình đồng bộ tự động lên đám mây Google Drive.',
                highlights: ['Chống mất mát dữ liệu với cơ chế Auto-Backup']
            },
            {
                name: 'Hướng dẫn sử dụng',
                href: '/user-guide',
                icon: BookOpen,
                dashboard: true,
                sidebar: true,
                color: '#32CD32',
                section: 'system',
                tierLabel: 'Tài liệu đào tạo nội bộ',
                roleHint: 'Tất cả nhân sự',
                description: 'Cẩm nang hướng dẫn chi tiết từng bước cho nhân viên mới (Thu ngân, Pha chế, Quản lý) tích hợp xuất tài liệu PDF.',
                highlights: ['Đào tạo nhân viên mới nắm quy trình trong 15 phút']
            },
            {
                name: 'Trung tâm thông báo',
                href: '/notifications',
                icon: Bell,
                dashboard: true,
                sidebar: true,
                color: '#10B981',
                section: 'system',
                tierLabel: 'Tiện ích hệ thống',
                roleHint: 'Tất cả nhân sự',
                description: 'Theo dõi tập trung các thông báo đơn QR mới, yêu cầu khách gọi nhân viên tại bàn và cảnh báo nguyên liệu sắp hết.',
                highlights: ['Lưu trữ lịch sử cảnh báo theo thời gian thực']
            },
        ]
    }
];

export interface ActiveNavigationContext {
    activeItem: NavigationItem | null;
    parentGroup: NavigationItem | null;
    sectionMeta: NavigationSectionMeta | null;
}

/**
 * Tìm chính xác mục chức năng và nhóm cha đang được chọn theo `pathname`.
 * Hỗ trợ khớp chính xác và khớp tiền tố cho các trang con.
 */
export function findActiveNavigationContext(pathname: string | null | undefined): ActiveNavigationContext {
    if (!pathname) {
        return { activeItem: null, parentGroup: null, sectionMeta: null };
    }

    const cleanPath = pathname.split('?')[0];

    for (const item of navigation) {
        if (!item.isGroup && item.href) {
            if (cleanPath === item.href || (item.href !== '/dashboard' && cleanPath.startsWith(item.href + '/'))) {
                const sectionMeta = NAVIGATION_SECTIONS.find(s => s.id === (item.section || 'core')) || null;
                return { activeItem: item, parentGroup: null, sectionMeta };
            }
        }

        if (item.isGroup && item.children) {
            for (const child of item.children) {
                if (child.href && (cleanPath === child.href || cleanPath.startsWith(child.href + '/'))) {
                    const sectionMeta = NAVIGATION_SECTIONS.find(s => s.id === (child.section || item.section || 'core')) || null;
                    return { activeItem: child, parentGroup: item, sectionMeta };
                }
            }
            if (item.href && cleanPath === item.href) {
                const sectionMeta = NAVIGATION_SECTIONS.find(s => s.id === (item.section || 'core')) || null;
                return { activeItem: item, parentGroup: item, sectionMeta };
            }
        }
    }

    return { activeItem: null, parentGroup: null, sectionMeta: null };
}

export const getNavigationByGroup = (groupName: string): NavigationItem[] => {
    const group = navigation.find(item => item.name === groupName && item.isGroup);
    return group?.children || [];
};

export const getDashboardItems = (): NavigationItem[] => {
    const dashboardItems: NavigationItem[] = [];

    navigation.forEach(item => {
        if (item.isGroup && item.children) {
            item.children.forEach(child => {
                if (child.dashboard) {
                    dashboardItems.push(child);
                }
            });
        } else if (item.dashboard) {
            dashboardItems.push(item);
        }
    });

    return dashboardItems;
};

export const getSidebarItems = (): NavigationItem[] => {
    return navigation.filter(item => item.sidebar);
};

export const getItemsByColor = (color: string): NavigationItem[] => {
    const items: NavigationItem[] = [];

    navigation.forEach(item => {
        if (item.isGroup && item.children) {
            item.children.forEach(child => {
                if (child.color === color) {
                    items.push(child);
                }
            });
        } else if (item.color === color) {
            items.push(item);
        }
    });

    return items;
};

export const getMenuByType = (type: 'beverages' | 'food' | 'dessert'): NavigationItem[] => {
    const menuGroup = navigation.find(item => item.name === 'Menu & Sản phẩm');
    if (!menuGroup?.children) return [];

    switch (type) {
        case 'beverages':
            return menuGroup.children.filter(item =>
                item.name.includes('đồ uống') || item.icon === Coffee
            );
        case 'food':
            return menuGroup.children.filter(item =>
                item.name.includes('đồ ăn') || item.icon === UtensilsCrossed
            );
        case 'dessert':
            return menuGroup.children.filter(item =>
                item.name.includes('tráng miệng') || item.name.includes('bánh')
            );
        default:
            return [];
    }
};

export const getPOSFeatures = (): NavigationItem[] => {
    const posGroup = navigation.find(item => item.name === 'POS & Bán hàng');
    return posGroup?.children?.filter(item =>
        item.name.includes('POS') ||
        item.name.includes('Bếp') ||
        item.name.includes('Đơn hàng') ||
        item.name.includes('Bàn')
    ) || [];
};

export const getSystemManagementFeatures = (): NavigationItem[] => {
    const systemGroup = navigation.find(item => item.name === 'Cài đặt');
    return systemGroup?.children?.filter(item =>
        item.name.includes('Cài đặt data') ||
        item.name.includes('Cài đặt mẫu in')
    ) || [];
};
