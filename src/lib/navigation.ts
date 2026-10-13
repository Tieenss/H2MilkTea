import {
    LayoutDashboard,
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
    badge?: string; // Thêm badge để hiển thị số thông báo
    description?: string; // Mô tả cho từng item
}

export const navigation: NavigationItem[] = [
    {
        name: 'Trang chủ',
        href: '/dashboard',
        icon: Home,
        dashboard: true,
        sidebar: true,
        color: '#0065F8', // brown
        description: 'Tổng quan quán cafe'
    },

    // Group: POS & Bán hàng
    {
        name: 'POS & Bán hàng',
        icon: ShoppingCart,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        children: [
            {
                name: 'POS Bán hàng',
                href: '/pos',
                icon: Monitor,
                dashboard: true,
                sidebar: true,
                color: '#0ABAB5', // chocolate
                badge: 'Hot',
                description: 'Màn hình bán hàng chính'
            },
            {
                name: 'Đơn hàng',
                href: '/orders',
                icon: ShoppingCart,
                dashboard: true,
                sidebar: true,
                color: '#578FCA', // saddle brown
                description: 'Quản lý đơn hàng'
            },
            {
                name: 'Khách hàng',
                href: '/khachhang',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#FF6347', // tomato
                description: 'Quản lý khách hàng'
            },
          
           
            {
                name: 'Bàn ',
                href: '/tables',
                icon: Store,
                dashboard: true,
                sidebar: true,
                color: '#CD853F', // peru
                description: 'Sơ đồ bàn và khu vực'
            },

        ]
    },

    // Group: Menu & Sản phẩm
    {
        name: 'Menu & Sản phẩm',
        icon: Coffee,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        children: [
            {
                name: 'Danh sách sản phẩm',
                href: '/menu/products',
                icon: Coffee,
                dashboard: true,
                sidebar: true,
                color: '#8B4513', // saddle brown
                description: 'Quản lý menu đồ uống'
            },

            {
                name: 'Cấu hình nguyên liệu',
                href: '/menu/cauhinhnguyenlieu',
                icon: Gift,
                dashboard: true,
                sidebar: true,
                color: '#CD853F', // peru
                description: 'Combo và set meal'
            },
            {
                name: 'Nguyên liệu',
                href: '/menu/nguyenlieu',
                icon: Package,
                dashboard: true,
                sidebar: true,
                color: '#D2691E', // chocolate
                description: 'Quản lý nguyên liệu'
            },


        ]
    },

    // Group: Quản lý kho
    {
        name: 'Quản lý kho',
        icon: Warehouse,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        children: [
            {
                name: 'Nhập/xuất kho',
                href: '/inventory/transactions',
                icon: Truck,
                dashboard: true,
                sidebar: true,
                color: '#2E8B57', // sea green
                description: 'Theo dõi hàng nhập/xuất'
            },
            {
                name: 'Kiểm kê kho',
                href: '/inventory/stocktake',
                icon: ClipboardList,
                dashboard: true,
                sidebar: true,
                color: '#FF8C00', // dark orange
                description: 'Kiểm kê định kỳ và cảnh báo'
            },
            {
                name: 'Nhà cung cấp',
                href: '/inventory/suppliers',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#4169E1', // royal blue
                description: 'Quản lý nhà cung cấp'
            },
            {
                name: 'Dự báo nhu cầu',
                href: '/inventory/forecast',
                icon: TrendingUp,
                dashboard: true,
                sidebar: true,
                color: '#8A2BE2', // blue violet
                description: 'AI dự đoán lượng hàng cần nhập'
            },
        ]
    },

    // Group: Báo cáo & Thống kê
    {
        name: 'Báo cáo',
        icon: PieChart,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        children: [
            {
                name: 'Dashboard tổng quan',
                href: '/reports/dashboard',
                icon: LayoutDashboard,
                dashboard: true,
                sidebar: true,
                color: '#800080', // purple
                description: 'Tổng quan kinh doanh'
            },
            {
                name: 'Báo cáo bán hàng',
                href: '/reports/sales',
                icon: BarChart3,
                dashboard: true,
                sidebar: true,
                color: '#9932CC', // dark orchid
                description: 'Thống kê bán hàng'
            },
            {
                name: 'Báo cáo món bán chạy',
                href: '/reports/bestsellers',
                icon: TrendingUp,
                dashboard: true,
                sidebar: true,
                color: '#BA55D3', // medium orchid
                description: 'Top món bán chạy'
            },
            {
                name: 'Báo cáo nhân viên',
                href: '/reports/staff',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#DA70D6', // orchid
                description: 'Hiệu suất nhân viên'
            },

        ]
    },


    // Group: Cài đặt hệ thống
    {
        name: 'Cài đặt',
        icon: Settings,
        dashboard: true,
        sidebar: true,
        isGroup: true,
        children: [

            {
                name: 'Quản lý nhân viên',
                href: '/nhanvien',
                icon: Users,
                dashboard: true,
                sidebar: true,
                color: '#4169E1', // royal blue
                description: 'Danh sách nhân viên'
            },
            {
                name: 'Cài đặt data',
                href: '/settingdata',
                icon: Settings,
                dashboard: true,
                sidebar: true,
                color: '#4682B4', // steel blue
                description: 'Cấu hình data hệ thống'
            },
            {
                name: 'Cài đặt mẫu in',
                href: '/receipt-settings',
                icon: Printer,
                dashboard: true,
                sidebar: true,
                color: '#FF6347', // tomato
                description: 'Cấu hình mẫu in cho POS, bếp và báo cáo'
            },
            {
                name: 'Hướng dẫn sử dụng',
                href: '/user-guide',
                icon: BookOpen,
                dashboard: true,
                sidebar: true,
                color: '#32CD32', // lime green
                description: 'Tài liệu hướng dẫn chi tiết'
            },

         

        ]
    }
];

// Helper functions để làm việc với navigation
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

// Helper function để lấy menu theo loại
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

// Helper function để lấy các chức năng POS
export const getPOSFeatures = (): NavigationItem[] => {
    const posGroup = navigation.find(item => item.name === 'POS & Bán hàng');
    return posGroup?.children?.filter(item =>
        item.name.includes('POS') ||
        item.name.includes('Đơn hàng') ||
        item.name.includes('Bàn')
    ) || [];
};

// Helper function để lấy các chức năng quản lý hệ thống
export const getSystemManagementFeatures = (): NavigationItem[] => {
    const systemGroup = navigation.find(item => item.name === 'Cài đặt');
    return systemGroup?.children?.filter(item =>
        item.name.includes('Cài đặt data') ||
        item.name.includes('Cài đặt mẫu in')
    ) || [];
};

