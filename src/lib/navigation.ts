import {
    LayoutDashboard,
    Palette,
    Users,
    Package,
    ShoppingCart,
    Settings,
    CheckSquare,
    Warehouse,
    Truck,
    Home,
    BarChart3,
    DollarSign,
    PieChart,
    Calculator,
    Coffee,
    UtensilsCrossed,
    Store,
    Gift,
    TrendingUp,
    Monitor,
    Heart,
    Printer,
    BookOpen,
    Database,
    Save,
    ClipboardList,
    BarChart,
    Calendar,
    AlertTriangle,
    Bot,
    Bell,
} from 'lucide-react';

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
}

export const navigation: NavigationItem[] = [
    {
        name: 'Trang chủ',
        href: '/dashboard',
        icon: Home,
        dashboard: true,
        sidebar: true,
        color: '#0065F8',
        description: 'Tổng quan quán cafe'
    },

    // Group: POS & Bán hàng
    {
        name: 'POS & Bán hàng',
        href: '/pos-hub',
        icon: ShoppingCart,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        description: 'Trung tâm bán hàng, màn hình bếp KDS, sơ đồ bàn và đơn gọi món',
        children: [
            {
                name: 'POS Bán hàng',
                href: '/pos',
                icon: Monitor,
                dashboard: true,
                sidebar: true,
                color: '#0ABAB5',
                badge: 'Hot',
                description: 'Màn hình bán hàng chính'
            },
            {
                name: 'Màn hình Bếp / Pha chế',
                href: '/kitchen',
                icon: UtensilsCrossed,
                dashboard: true,
                sidebar: true,
                color: '#EA580C',
                badge: 'KDS',
                description: 'Màn hình điều phối chế biến & trả món thời gian thực'
            },
            {
                name: 'Đơn hàng',
                href: '/orders',
                icon: ShoppingCart,
                dashboard: true,
                sidebar: true,
                color: '#578FCA',
                description: 'Quản lý đơn hàng & hóa đơn'
            },
            {
                name: 'Khách hàng',
                href: '/khachhang',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#FF6347',
                description: 'Quản lý khách hàng thân thiết'
            },
            {
                name: 'Bàn ',
                href: '/tables',
                icon: Store,
                dashboard: true,
                sidebar: true,
                color: '#CD853F',
                description: 'Sơ đồ bàn, mã QR và khu vực'
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
        description: 'Quản lý menu, danh mục món và định lượng nguyên liệu',
        children: [
            {
                name: 'Danh sách sản phẩm',
                href: '/menu/products',
                icon: Coffee,
                dashboard: true,
                sidebar: true,
                color: '#8B4513',
                description: 'Quản lý menu đồ uống & món ăn'
            },
            {
                name: 'Cấu hình nguyên liệu',
                href: '/menu/cauhinhnguyenlieu',
                icon: Gift,
                dashboard: true,
                sidebar: true,
                color: '#CD853F',
                description: 'Định mức công thức pha chế'
            },
            {
                name: 'Nguyên liệu',
                href: '/menu/nguyenlieu',
                icon: Package,
                dashboard: true,
                sidebar: true,
                color: '#D2691E',
                description: 'Quản lý nguyên vật liệu'
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
        description: 'Quản lý nhập xuất tồn kho, kiểm kê và dự báo nhu cầu',
        children: [
            {
                name: 'Nhập/xuất kho',
                href: '/inventory/transactions',
                icon: Truck,
                dashboard: true,
                sidebar: true,
                color: '#2E8B57',
                description: 'Theo dõi hàng nhập/xuất'
            },
            {
                name: 'Kiểm kê kho',
                href: '/inventory/stocktake',
                icon: ClipboardList,
                dashboard: true,
                sidebar: true,
                color: '#FF8C00',
                description: 'Kiểm kê định kỳ và cảnh báo'
            },
            {
                name: 'Nhà cung cấp',
                href: '/inventory/suppliers',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#4169E1',
                description: 'Quản lý nhà cung cấp'
            },
            {
                name: 'Dự báo nhu cầu',
                href: '/inventory/forecast',
                icon: TrendingUp,
                dashboard: true,
                sidebar: true,
                color: '#8A2BE2',
                description: 'AI dự đoán lượng hàng cần nhập'
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
        description: 'Báo cáo doanh thu, món bán chạy và hiệu suất kinh doanh',
        children: [
            {
                name: 'Dashboard tổng quan',
                href: '/reports/dashboard',
                icon: LayoutDashboard,
                dashboard: true,
                sidebar: true,
                color: '#800080',
                description: 'Tổng quan kinh doanh'
            },
            {
                name: 'Báo cáo bán hàng',
                href: '/reports/sales',
                icon: BarChart3,
                dashboard: true,
                sidebar: true,
                color: '#9932CC',
                description: 'Thống kê doanh thu bán hàng'
            },
            {
                name: 'Báo cáo món bán chạy',
                href: '/reports/bestsellers',
                icon: TrendingUp,
                dashboard: true,
                sidebar: true,
                color: '#BA55D3',
                description: 'Top món bán chạy'
            },
            {
                name: 'Báo cáo sản phẩm',
                href: '/reports/products',
                icon: Package,
                dashboard: true,
                sidebar: true,
                color: '#9333EA',
                description: 'Phân tích lợi nhuận & hiệu quả sản phẩm'
            },
            {
                name: 'Báo cáo nhân viên',
                href: '/reports/staff',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#DA70D6',
                description: 'Hiệu suất nhân viên'
            },
            {
                name: 'Báo cáo khách hàng',
                href: '/reports/customers',
                icon: Heart,
                dashboard: true,
                sidebar: true,
                color: '#EC4899',
                description: 'Phân tích tần suất & chi tiêu khách hàng'
            },
            {
                name: 'Báo cáo tổng hợp',
                href: '/reports/comprehensive',
                icon: BarChart,
                dashboard: true,
                sidebar: true,
                color: '#6366F1',
                description: 'Báo cáo tài chính & vận hành toàn diện'
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
        description: 'Cài đặt giao diện, font chữ, mẫu in, chatbot và dữ liệu',
        children: [
            {
                name: 'Giao diện & Font chữ',
                href: '/settings/appearance',
                icon: Palette,
                dashboard: true,
                sidebar: true,
                color: '#6366F1',
                badge: 'Mới',
                description: 'Tùy chỉnh font chữ, kích thước hiển thị và chủ đề màu sắc'
            },
            {
                name: 'Quản lý nhân viên',
                href: '/nhanvien',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#4169E1',
                description: 'Danh sách nhân viên'
            },
            {
                name: 'Cài đặt data',
                href: '/settingdata',
                icon: Settings,
                dashboard: true,
                sidebar: true,
                color: '#4682B4',
                description: 'Cấu hình data hệ thống'
            },
            {
                name: 'Cài đặt chatbot AI',
                href: '/settings/ai',
                icon: Bot,
                dashboard: true,
                sidebar: true,
                color: '#4F46E5',
                description: 'Bật/tắt trợ lý AI cho toàn hệ thống'
            },
            {
                name: 'Cài đặt mẫu in',
                href: '/receipt-settings',
                icon: Printer,
                dashboard: true,
                sidebar: true,
                color: '#FF6347',
                description: 'Cấu hình mẫu in cho POS, bếp và báo cáo'
            },
            {
                name: 'Hướng dẫn sử dụng',
                href: '/user-guide',
                icon: BookOpen,
                dashboard: true,
                sidebar: true,
                color: '#32CD32',
                description: 'Tài liệu hướng dẫn chi tiết'
            },
            {
                name: 'Trung tâm thông báo',
                href: '/notifications',
                icon: Bell,
                dashboard: true,
                sidebar: true,
                color: '#10B981',
                description: 'Quản lý cảnh báo và thông báo toàn hệ thống'
            },
        ]
    }
];

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
