import config from '../config/config';
import { createClient } from '../lib/supabase/client';
import * as XLSX from 'xlsx';
import GoogleDriveUtils from './googleDriveUtils';
// Import dữ liệu demo
import DSNV_DATA from '../data/DSNV.json';
import DSBAN_DATA from '../data/DSBAN.json';
import HOADON_DATA from '../data/HOADON.json';
import HOADONDETAIL_DATA from '../data/HOADONDETAIL.json';
import DMHH_DATA from '../data/DMHH.json';
import NGUYENLIEU_DATA from '../data/NGUYENLIEU.json';
import CAUHINH_DATA from '../data/CAUHINH.json';
import KHACHHANG_DATA from '../data/KHACHHANG.json';
import KIEMKEKHO_DATA from '../data/KIEMKEKHO.json';
import NHAPXUATKHO_DATA from '../data/NHAPXUATKHO.json';
import NHACUNGCAP_DATA from '../data/NHACUNGCAP.json';

const ROOT_ADMIN_FALLBACK_KEY = 'h2_root_admin_fallback';
const LEGACY_DEMO_DATA_KEYS = [
    'demoData',
    'demoData_backup',
    'demoData_timestamp',
    'demoData_import_backup',
    'demoData_excel_import_backup',
    'demoData_restore_backup',
];

export interface DataActivityLogItem {
    id: string;
    timestamp: string;
    action: string;
    detail: string;
    status: 'success' | 'warning' | 'error';
}

export interface SelectiveClearOptions {
    resetTableStatus?: boolean;
    resetMaterialStock?: boolean;
    clearPrintQueue?: boolean;
}

class AuthUtils {
    private demoData: { [key: string]: any[] } = {};
    private isInitialized = false;
    private lastSyncedAt: string | null = null;
    private activityLogs: DataActivityLogItem[] = [];
    private recoveryInterval: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.purgeLegacyLocalStorageData();
            this.ensureRootAdminFallback();
            this.initializeDemoData();
        }
    }

    // Dọn dẹp triệt để các key dữ liệu bảng cũ trong localStorage (không dùng localStorage lưu DB nữa)
    public purgeLegacyLocalStorageData() {
        if (!this.isClient() || !this.isLocalStorageAvailable()) return;
        try {
            LEGACY_DEMO_DATA_KEYS.forEach((key) => {
                localStorage.removeItem(key);
            });
        } catch {
            // Bỏ qua nếu trình duyệt chặn
        }
    }

    // Chỉ giữ duy nhất 1 tài khoản Admin gốc dự phòng trong localStorage để khi xóa trắng DB vẫn đăng nhập vào webapp khôi phục backup được
    public ensureRootAdminFallback(customAdminRecord?: any, plainPassword?: string) {
        if (!this.isClient() || !this.isLocalStorageAvailable()) return;
        try {
            const existingRaw = localStorage.getItem(ROOT_ADMIN_FALLBACK_KEY);
            let existing: any = null;
            if (existingRaw) {
                try {
                    existing = JSON.parse(existingRaw);
                } catch {
                    existing = null;
                }
            }

            const defaultSeedAdmin = (DSNV_DATA as any[]).find(
                (u) => String(u?.username || '').toLowerCase() === 'admin'
            ) || {
                _RowNumber: '2',
                username: 'admin',
                'Họ và Tên': 'Trần Văn Tiến',
                'Chức vụ': 'Quản lý',
                'Phòng': 'Quản lý',
                'Phân quyền': 'Admin',
                Email: 'admin@h2.com',
                'Quyền View': 'POS,KITCHEN,TABLES,ORDERS,CUSTOMERS,PRODUCTS,MATERIALS,RECIPES,STOCKTAKE,TRANSACTIONS,SUPPLIERS,EMPLOYEES,REPORTS,SETTINGS',
            };

            const fallbackAccount = {
                ...(existing || defaultSeedAdmin),
                ...(customAdminRecord || {}),
                username: customAdminRecord?.username || existing?.username || 'admin',
                'Họ và Tên': customAdminRecord?.['Họ và Tên'] || existing?.['Họ và Tên'] || defaultSeedAdmin['Họ và Tên'] || 'Quản trị viên (Admin)',
                'Chức vụ': customAdminRecord?.['Chức vụ'] || existing?.['Chức vụ'] || 'Quản trị viên',
                'Phân quyền': 'Admin',
                Email: customAdminRecord?.Email || customAdminRecord?.email || existing?.Email || 'admin@h2.com',
                fallbackPassword: plainPassword || existing?.fallbackPassword || defaultSeedAdmin.password || '123456',
                updatedAt: new Date().toISOString(),
            };

            localStorage.setItem(ROOT_ADMIN_FALLBACK_KEY, JSON.stringify(fallbackAccount));
        } catch {
            // Ignore
        }
    }

    public getRootAdminFallback(): any | null {
        if (!this.isClient() || !this.isLocalStorageAvailable()) return null;
        try {
            const raw = localStorage.getItem(ROOT_ADMIN_FALLBACK_KEY);
            if (!raw) {
                this.ensureRootAdminFallback();
                const retry = localStorage.getItem(ROOT_ADMIN_FALLBACK_KEY);
                return retry ? JSON.parse(retry) : null;
            }
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    public recordDataActivity(action: string, detail: string, status: 'success' | 'warning' | 'error' = 'success') {
        const entry: DataActivityLogItem = {
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            action,
            detail,
            status,
        };
        this.activityLogs = [entry, ...this.activityLogs].slice(0, 20);
        this.lastSyncedAt = entry.timestamp;
    }

    public getDataActivityLogs(): DataActivityLogItem[] {
        return [...this.activityLogs];
    }

    private isBrowser() {
        return typeof window !== 'undefined' && typeof window.location !== 'undefined' && typeof window.location.origin === 'string' && window.location.origin.startsWith('http') && !process.env.VITEST;
    }

    private isClient() {
        return typeof window !== 'undefined';
    }

    private isLocalStorageAvailable(): boolean {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    // Parse cả định dạng MM/dd/yyyy HH:mm:ss, dd/MM/yyyy HH:mm:ss và ISO
    public parseFlexibleDate(raw: any): Date | null {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
        const str = String(raw).trim();
        if (!str) return null;

        // Thử match dd/MM/yyyy hoặc MM/dd/yyyy kèm giờ
        const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (slashMatch) {
            const p1 = parseInt(slashMatch[1], 10);
            const p2 = parseInt(slashMatch[2], 10);
            const year = parseInt(slashMatch[3], 10);
            const hours = parseInt(slashMatch[4] || '0', 10);
            const minutes = parseInt(slashMatch[5] || '0', 10);
            const seconds = parseInt(slashMatch[6] || '0', 10);

            // Nếu p1 > 12 -> chắc chắn là dd/MM/yyyy
            // Nếu p2 > 12 -> chắc chắn là MM/dd/yyyy
            let month = p1;
            let day = p2;
            if (p1 > 12) {
                day = p1;
                month = p2;
            } else if (p2 > 12) {
                month = p1;
                day = p2;
            } else {
                // Cả 2 <= 12: mặc định MM/dd/yyyy nếu nằm trong HOADON chuẩn, nhưng vẫn hợp lệ
                month = p1;
                day = p2;
            }
            const d = new Date(year, month - 1, day, hours, minutes, seconds);
            if (!isNaN(d.getTime())) return d;
        }

        const direct = new Date(str);
        return isNaN(direct.getTime()) ? null : direct;
    }

    public formatUSDateTime(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    public formatVNDateTime(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    public formatVNDateOnly(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    // Chuẩn hóa và đồng bộ toàn bộ bảng dữ liệu ở tầng Application Backend (không khóa cứng DB)
    public normalizeAndSyncDemoData() {
        const dmhh = Array.isArray(this.demoData['DMHH']) ? this.demoData['DMHH'] : [...DMHH_DATA];
        const nguyenlieu = Array.isArray(this.demoData['NGUYENLIEU']) ? this.demoData['NGUYENLIEU'] : [...NGUYENLIEU_DATA];
        const cauhinh = Array.isArray(this.demoData['CAUHINH']) ? this.demoData['CAUHINH'] : [...CAUHINH_DATA];
        const dsnv = Array.isArray(this.demoData['DSNV']) ? this.demoData['DSNV'] : [...DSNV_DATA];
        const dsban = Array.isArray(this.demoData['DSBAN']) ? this.demoData['DSBAN'] : [...DSBAN_DATA];
        const khachhang = Array.isArray(this.demoData['KHACHHANG']) ? this.demoData['KHACHHANG'] : [...KHACHHANG_DATA];
        let hoadon = Array.isArray(this.demoData['HOADON']) ? this.demoData['HOADON'] : [...HOADON_DATA];
        let hoadonDetail = Array.isArray(this.demoData['HOADONDETAIL']) ? this.demoData['HOADONDETAIL'] : [...HOADONDETAIL_DATA];
        let nhapxuat = Array.isArray(this.demoData['NHAPXUATKHO']) ? this.demoData['NHAPXUATKHO'] : [...NHAPXUATKHO_DATA];
        let kiemke = Array.isArray(this.demoData['KIEMKEKHO']) ? this.demoData['KIEMKEKHO'] : [...KIEMKEKHO_DATA];
        const nhacungcap = Array.isArray(this.demoData['NHACUNGCAP']) ? this.demoData['NHACUNGCAP'] : [...NHACUNGCAP_DATA];

        const productMap = new Map<string, any>();
        dmhh.forEach((p: any) => {
            if (p && p.IDSP) productMap.set(String(p.IDSP), p);
        });

        const materialMap = new Map<string, any>();
        nguyenlieu.forEach((m: any) => {
            if (m && m.IDNguyenLieu) materialMap.set(String(m.IDNguyenLieu), m);
        });

        // 1. Làm giàu CAUHINH (điền Tên sản phẩm và Tên nguyên liệu nếu trống)
        const normalizedCauHinh = cauhinh.map((cfg: any, idx: number) => {
            const sp = productMap.get(String(cfg.IDSP || ''));
            const nvl = materialMap.get(String(cfg.IDNguyenLieu || ''));
            return {
                ...cfg,
                _RowNumber: cfg._RowNumber || String(idx + 2),
                IDCauHinh: cfg.IDCauHinh || `CFG${String(idx + 1).padStart(3, '0')}`,
                'Tên sản phẩm': cfg['Tên sản phẩm'] || sp?.['Tên sản phẩm'] || '',
                'Tên nguyên liệu': cfg['Tên nguyên liệu'] || nvl?.['Tên nguyên liệu'] || '',
                'Đơn vị gốc': cfg['Đơn vị gốc'] || nvl?.['Đơn vị tính'] || cfg['Đơn vị sử dụng'] || 'Kg',
            };
        });

        // 2. Làm giàu HOADONDETAIL (điền Tên sản phẩm, Đơn vị tính, Đơn giá, Thành tiền từ DMHH nếu trống)
        const invoiceTotalsMap = new Map<string, number>();
        const normalizedDetails = hoadonDetail.map((dt: any, idx: number) => {
            const idHoaDon = String(dt.IDHOADON || dt.IDHD || '');
            const idSP = String(dt.IDSP || '');
            const sp = productMap.get(idSP);
            const qty = Math.max(1, parseFloat(dt['Số lượng']) || 1);
            const unitPrice = parseFloat(dt['Đơn giá']) || parseFloat(sp?.['Đơn giá']) || 25000;
            const lineTotal = parseFloat(dt['Thành tiền']) || (qty * unitPrice);

            if (idHoaDon) {
                invoiceTotalsMap.set(idHoaDon, (invoiceTotalsMap.get(idHoaDon) || 0) + lineTotal);
            }

            return {
                ...dt,
                _RowNumber: dt._RowNumber || String(idx + 2),
                IDHOADONDETAIL: dt.IDHOADONDETAIL || `${idHoaDon}_${idSP}_${idx + 1}`,
                IDHOADON: idHoaDon,
                IDHD: idHoaDon,
                IDSP: idSP,
                'Tên sản phẩm': dt['Tên sản phẩm'] || sp?.['Tên sản phẩm'] || `Sản phẩm ${idSP}`,
                'Đơn vị tính': dt['Đơn vị tính'] || sp?.['Đơn vị tính'] || 'Ly',
                'Đơn giá': String(unitPrice),
                'Số lượng': String(qty),
                'Thành tiền': String(lineTotal),
                'Ghi chú': dt['Ghi chú'] || ''
            };
        });

        // 3. Kiểm tra xem ngày hóa đơn mới nhất có bị cũ quá 10 ngày so với hiện tại không (ví dụ dữ liệu gốc 06/2025)
        const now = new Date();
        let maxInvoiceTime = 0;
        hoadon.forEach((hd: any) => {
            const d = this.parseFlexibleDate(hd['Ngày'] || hd['Thời gian']);
            if (d && d.getTime() > maxInvoiceTime) {
                maxInvoiceTime = d.getTime();
            }
        });

        const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
        const shouldShiftDates = maxInvoiceTime > 0 && (now.getTime() - maxInvoiceTime > tenDaysMs);

        const staffNames = dsnv.map((nv: any) => nv['Họ và Tên'] || nv.username).filter(Boolean);
        const customerNames = khachhang.map((kh: any) => kh['Tên khách hàng']).filter(Boolean);
        const paymentMethods = ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử'];

        // 4. Chuẩn hóa HOADON và dịch chuyển ngày sang tháng hiện tại nếu dữ liệu seed quá cũ
        const normalizedHoaDon = hoadon.map((hd: any, idx: number) => {
            const idHoaDon = String(hd.IDHOADON || hd.IDHD || `INV${Date.now()}_${idx}`);
            let parsedDate = this.parseFlexibleDate(hd['Ngày'] || hd['Thời gian']) || new Date(now.getTime() - idx * 86400000);

            if (shouldShiftDates) {
                // Phân bổ đều các hóa đơn seed vào 25 ngày gần nhất (trong tháng hiện tại) và một phần ở tháng trước để tính tăng trưởng
                const daysAgo = idx < Math.ceil(hoadon.length * 0.7)
                    ? (idx * 2) % 20 // Trong kỳ hiện tại (0 - 19 ngày trước)
                    : 32 + (idx % 20); // Trong kỳ trước (32 - 51 ngày trước) để báo cáo có % tăng trưởng
                const shifted = new Date(now.getTime() - daysAgo * 86400000);
                shifted.setHours(parsedDate.getHours() || (8 + (idx % 12)), parsedDate.getMinutes() || ((idx * 7) % 60), parsedDate.getSeconds() || 0);
                parsedDate = shifted;
            }

            const rawStatus = String(hd['Trạng thái'] || 'Đã thanh toán').trim();
            const normalizedStatus = (rawStatus === 'Đã hoàn thành' || rawStatus === 'Hoàn thành')
                ? 'Đã thanh toán'
                : rawStatus;

            const calculatedSubtotal = invoiceTotalsMap.get(idHoaDon) || 0;
            const rawTotal = parseFloat(hd['Tổng tiền']) || calculatedSubtotal || 45000;
            const discount = parseFloat(hd['Giảm giá']) || 0;
            const vat = parseFloat(hd['VAT']) || 0;
            const paidAmount = parseFloat(hd['Khách trả']) || Math.max(0, rawTotal - discount + vat);

            const staffName = hd['Nhân viên'] || hd['Thu ngân'] || staffNames[idx % Math.max(1, staffNames.length)] || 'Trần Văn Tiến';
            const customerName = hd['Khách hàng'] || customerNames[idx % Math.max(1, customerNames.length)] || 'Khách lẻ';
            const paymentMethod = hd['Loại thanh toán'] || hd['Hình thức thanh toán'] || paymentMethods[idx % paymentMethods.length];
            const tableId = hd.IDBAN || hd['Bàn'] || 'Khách mua về';

            return {
                ...hd,
                _RowNumber: hd._RowNumber || String(idx + 2),
                IDHOADON: idHoaDon,
                IDHD: idHoaDon,
                IDBAN: tableId,
                'Bàn': hd['Bàn'] || tableId,
                'Nhân viên': staffName,
                'Thu ngân': staffName,
                'Khách hàng': customerName,
                'Ngày': this.formatUSDateTime(parsedDate),
                'Thời gian': this.formatVNDateTime(parsedDate),
                'Tổng tiền': String(rawTotal),
                'Giảm giá': String(discount),
                'VAT': String(vat),
                'Khách trả': String(paidAmount),
                'Tiền thừa': String(Math.max(0, paidAmount - (rawTotal - discount + vat))),
                'Loại thanh toán': paymentMethod,
                'Hình thức thanh toán': paymentMethod,
                'Trạng thái': normalizedStatus,
                'Trạng thái sử dụng bàn': hd['Trạng thái sử dụng bàn'] || 'Đã rời bàn',
                'Ghi chú': hd['Ghi chú'] || ''
            };
        });

        // 5. Dịch chuyển ngày cho NHAPXUATKHO và KIEMKEKHO nếu là dữ liệu năm 2025
        nhapxuat = nhapxuat.map((tx: any, idx: number) => {
            const d = this.parseFlexibleDate(tx.NgayGiaoDich);
            if (!d || (now.getTime() - d.getTime() > 45 * 86400000)) {
                const shifted = new Date(now.getTime() - ((idx * 3 + 1) % 25) * 86400000);
                shifted.setHours(9 + (idx % 8), 15, 0);
                return {
                    ...tx,
                    NgayGiaoDich: this.formatVNDateTime(shifted)
                };
            }
            return tx;
        });

        kiemke = kiemke.map((kk: any, idx: number) => {
            const d = this.parseFlexibleDate(kk.NgayKiemKe);
            if (!d || (now.getTime() - d.getTime() > 60 * 86400000)) {
                // Giữ 1 kiểm kê > 31 ngày trước để test cảnh báo quá hạn, các kiểm kê còn lại trong tháng này
                const daysAgo = idx === 0 ? 35 : ((idx * 5 + 2) % 20);
                const shifted = new Date(now.getTime() - daysAgo * 86400000);
                return {
                    ...kk,
                    NgayKiemKe: this.formatVNDateOnly(shifted)
                };
            }
            return kk;
        });

        this.demoData = {
            'DSNV': dsnv.map((item: any) => ({ ...item })),
            'DSBAN': dsban.map((item: any) => ({ ...item })),
            'HOADON': normalizedHoaDon,
            'HOADONDETAIL': normalizedDetails,
            'DMHH': dmhh.map((item: any) => ({ ...item })),
            'NGUYENLIEU': nguyenlieu.map((item: any) => ({ ...item })),
            'CAUHINH': normalizedCauHinh,
            'KHACHHANG': khachhang.map((item: any) => ({ ...item })),
            'KIEMKEKHO': kiemke,
            'NHAPXUATKHO': nhapxuat,
            'NHACUNGCAP': nhacungcap.map((item: any) => ({ ...item }))
        };
    }

    // Khởi tạo dữ liệu trong bộ nhớ
    private initializeInMemoryData() {
        this.demoData = {
            'DSNV': DSNV_DATA.map((item: any) => ({ ...item })),
            'DSBAN': DSBAN_DATA.map((item: any) => ({ ...item })),
            'HOADON': HOADON_DATA.map((item: any) => ({ ...item })),
            'HOADONDETAIL': HOADONDETAIL_DATA.map((item: any) => ({ ...item })),
            'DMHH': DMHH_DATA.map((item: any) => ({ ...item })),
            'NGUYENLIEU': NGUYENLIEU_DATA.map((item: any) => ({ ...item })),
            'CAUHINH': CAUHINH_DATA.map((item: any) => ({ ...item })),
            'KHACHHANG': KHACHHANG_DATA.map((item: any) => ({ ...item })),
            'KIEMKEKHO': KIEMKEKHO_DATA.map((item: any) => ({ ...item })),
            'NHAPXUATKHO': NHAPXUATKHO_DATA.map((item: any) => ({ ...item })),
            'NHACUNGCAP': NHACUNGCAP_DATA.map((item: any) => ({ ...item }))
        };
        this.normalizeAndSyncDemoData();
    }

    // Tạo lại bộ dữ liệu mẫu đồng bộ đầy đủ (60 ngày) để test toàn bộ Báo cáo, Kho, KDS và POS
    public seedSynchronizedTestDatabase() {
        this.initializeInMemoryData();

        const now = new Date();
        const products = this.demoData['DMHH'] || [];
        const staffList = this.demoData['DSNV'] || [];
        const customerList = this.demoData['KHACHHANG'] || [];
        const tables = this.demoData['DSBAN'] || [];
        const paymentTypes = ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử'];

        // Bổ sung thêm 18 hóa đơn mẫu trải đều 45 ngày qua nếu số lượng hóa đơn còn ít (< 25)
        const existingInvoices = [...(this.demoData['HOADON'] || [])];
        const existingDetails = [...(this.demoData['HOADONDETAIL'] || [])];

        if (existingInvoices.length < 25 && products.length > 0) {
            for (let i = 0; i < 18; i++) {
                const daysAgo = i < 12 ? (i * 2) : (31 + (i - 12) * 3);
                const invDate = new Date(now.getTime() - daysAgo * 86400000);
                invDate.setHours(9 + (i % 11), (i * 13) % 60, 0);

                const invId = `INV_SYNC_${invDate.getFullYear()}${String(invDate.getMonth() + 1).padStart(2, '0')}${String(invDate.getDate()).padStart(2, '0')}_${String(i + 1).padStart(3, '0')}`;
                if (existingInvoices.some(h => h.IDHOADON === invId)) continue;

                const itemCount = 2 + (i % 3);
                let invTotal = 0;
                for (let j = 0; j < itemCount; j++) {
                    const prod = products[(i + j * 3) % products.length];
                    const qty = 1 + ((i + j) % 3);
                    const price = parseFloat(prod['Đơn giá']) || 28000;
                    const lineTotal = qty * price;
                    invTotal += lineTotal;

                    existingDetails.push({
                        _RowNumber: String(existingDetails.length + 2),
                        IDHOADONDETAIL: `${invId}_${prod.IDSP}_${j + 1}`,
                        IDHOADON: invId,
                        IDHD: invId,
                        IDSP: prod.IDSP,
                        'Tên sản phẩm': prod['Tên sản phẩm'],
                        'Đơn vị tính': prod['Đơn vị tính'] || 'Ly',
                        'Đơn giá': String(price),
                        'Số lượng': String(qty),
                        'Thành tiền': String(lineTotal),
                        'Ghi chú': ''
                    });
                }

                const discount = i % 4 === 0 ? 5000 : 0;
                const staff = staffList[i % Math.max(1, staffList.length)];
                const customer = customerList[i % Math.max(1, customerList.length)];
                const table = tables[i % Math.max(1, tables.length)];
                const payMethod = paymentTypes[i % paymentTypes.length];

                existingInvoices.push({
                    _RowNumber: String(existingInvoices.length + 2),
                    IDHOADON: invId,
                    IDHD: invId,
                    IDBAN: table?.IDBAN || 'Khách mua về',
                    'Bàn': table?.['Tên bàn'] || 'Khách mua về',
                    'Nhân viên': staff?.['Họ và Tên'] || staff?.username || 'Trần Văn Tiến',
                    'Thu ngân': staff?.['Họ và Tên'] || staff?.username || 'Trần Văn Tiến',
                    'Khách hàng': customer?.['Tên khách hàng'] || 'Khách lẻ',
                    'Ngày': this.formatUSDateTime(invDate),
                    'Thời gian': this.formatVNDateTime(invDate),
                    'Tổng tiền': String(invTotal),
                    'Giảm giá': String(discount),
                    'VAT': '0',
                    'Khách trả': String(invTotal - discount),
                    'Tiền thừa': '0',
                    'Loại thanh toán': payMethod,
                    'Hình thức thanh toán': payMethod,
                    'Trạng thái': 'Đã thanh toán',
                    'Trạng thái sử dụng bàn': 'Đã rời bàn',
                    'Ghi chú': 'Hóa đơn đồng bộ mẫu'
                });
            }
        }

        this.demoData['HOADON'] = existingInvoices;
        this.demoData['HOADONDETAIL'] = existingDetails;
        this.normalizeAndSyncDemoData();
        this.saveDemoData();

        if (this.isBrowser()) {
            void this.syncTablesToCloud(this.demoData, true);
        }
        this.recordDataActivity(
            'Đồng bộ dữ liệu mẫu 60 ngày',
            `Tạo ${this.demoData['HOADON'].length} hóa đơn, ${this.demoData['HOADONDETAIL'].length} chi tiết, ${this.demoData['DMHH'].length} sản phẩm`,
            'success'
        );

        return {
            success: true,
            invoices: this.demoData['HOADON'].length,
            details: this.demoData['HOADONDETAIL'].length,
            message: `Đã đồng bộ cơ sở dữ liệu mẫu thành công (${this.demoData['HOADON'].length} hóa đơn, ${this.demoData['HOADONDETAIL'].length} chi tiết món, ${this.demoData['DMHH'].length} sản phẩm, ${this.demoData['NGUYENLIEU'].length} nguyên liệu)!`,
            counts: this.getRecordCounts()
        };
    }

    public async syncTablesToCloud(
        tablesData: Record<string, any[]>,
        replaceExisting = true
    ): Promise<{ success: boolean; message: string; summary?: any }> {
        if (!this.isBrowser()) {
            return { success: true, message: 'Đã cập nhật dữ liệu trong bộ nhớ phiên.' };
        }
        try {
            const res = await fetch('/api/db/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_tables',
                    tablesData,
                    replaceExisting,
                }),
            });
            const json = await res.json();
            return {
                success: Boolean(res.ok && json?.success !== false),
                message: json?.message || json?.error || 'Đã đồng bộ dữ liệu lên Supabase Cloud!',
                summary: json?.summary,
            };
        } catch (err: any) {
            console.warn('Lỗi đồng bộ bảng lên Cloud:', err);
            return {
                success: false,
                message: 'Không thể kết nối máy chủ để đồng bộ Cloud: ' + (err?.message || 'Lỗi mạng'),
            };
        }
    }

    public async clearSelectedData(
        tablesToClear: string[],
        options: SelectiveClearOptions = {}
    ): Promise<{ success: boolean; message: string; summary?: Record<string, string> }> {
        if (!Array.isArray(tablesToClear) || tablesToClear.length === 0) {
            if (!options.resetTableStatus && !options.resetMaterialStock && !options.clearPrintQueue) {
                return { success: false, message: 'Vui lòng chọn ít nhất 1 hạng mục dữ liệu để dọn dẹp!' };
            }
        }

        try {
            this.purgeLegacyLocalStorageData();
            this.ensureRootAdminFallback(this.getUserData());

            let cloudMessage = '';
            let cloudSummary: Record<string, string> = {};

            if (this.isBrowser()) {
                const res = await fetch('/api/db/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'selective_clear',
                        tables: tablesToClear,
                        options,
                    }),
                });
                const json = await res.json();
                if (!res.ok || json?.success === false) {
                    return {
                        success: false,
                        message: json?.error || json?.message || 'Lỗi khi xóa dữ liệu trên Supabase Cloud',
                    };
                }
                cloudMessage = json?.message || '';
                cloudSummary = json?.summary || {};
            }

            // Đồng bộ xóa ngay trên bộ nhớ RAM hiện tại để UI phản ánh tức thì
            const currentUser = this.getUserData();
            for (const table of tablesToClear) {
                if (table === 'DSNV') {
                    const keepUsernames = new Set(
                        ['admin', String(currentUser?.username || 'admin').toLowerCase()].filter(Boolean)
                    );
                    const currentDsnv = Array.isArray(this.demoData['DSNV']) ? this.demoData['DSNV'] : [];
                    const preserved = currentDsnv.filter((u: any) =>
                        keepUsernames.has(String(u?.username || '').toLowerCase())
                    );
                    this.demoData['DSNV'] =
                        preserved.length > 0
                            ? preserved
                            : [this.getRootAdminFallback()].filter(Boolean);
                } else if (table === 'DSBAN') {
                    this.demoData['DSBAN'] = [
                        {
                            _RowNumber: '2',
                            IDBAN: 'Khách mua về',
                            'Tên bàn': 'Khách mua về',
                            'Sức chứa tối đa': '1',
                            'Trạng thái': 'Đang hoạt động',
                            'Lịch sử  bàn': '',
                        },
                    ];
                } else if (this.demoData[table] !== undefined) {
                    this.demoData[table] = [];
                }
            }

            if (
                !tablesToClear.includes('DSBAN') &&
                (options.resetTableStatus || tablesToClear.includes('HOADON') || tablesToClear.includes('pos_orders'))
            ) {
                if (Array.isArray(this.demoData['DSBAN'])) {
                    this.demoData['DSBAN'] = this.demoData['DSBAN'].map((t: any) => ({
                        ...t,
                        'Trạng thái': t.IDBAN === 'Khách mua về' ? 'Đang hoạt động' : 'Trống',
                        'Lịch sử  bàn': '',
                    }));
                }
            }

            if (!tablesToClear.includes('NGUYENLIEU') && options.resetMaterialStock) {
                if (Array.isArray(this.demoData['NGUYENLIEU'])) {
                    this.demoData['NGUYENLIEU'] = this.demoData['NGUYENLIEU'].map((m: any) => ({
                        ...m,
                        ...(m['Số lượng tồn'] !== undefined ? { 'Số lượng tồn': '0' } : {}),
                    }));
                }
                this.demoData['NHAPXUATKHO'] = [];
                this.demoData['KIEMKEKHO'] = [];
            }

            // Dọn các state tạm của POS / KDS / Thông báo đơn đã xem trong localStorage nếu xóa đơn hàng
            if (
                this.isClient() &&
                this.isLocalStorageAvailable() &&
                (tablesToClear.includes('HOADON') || tablesToClear.includes('pos_orders'))
            ) {
                const posCacheKeys = [
                    'posState',
                    'h2_pos_carts_v1',
                    'h2_pos_active_table_id',
                    'h2_kds_local_orders_v1',
                    'h2_pending_ai_pos_order',
                    'h2_orders_viewed_ids_v1',
                    'h2_orders_last_viewed_time_v1',
                ];
                posCacheKeys.forEach((k) => localStorage.removeItem(k));
            }

            this.saveDemoData();
            const labelList = tablesToClear.map((t) => this.getTableDisplayName(t)).join(', ');
            this.recordDataActivity(
                'Dọn dẹp dữ liệu tùy chọn',
                `Đã xóa: ${labelList || 'Tùy chọn trạng thái bàn/kho'}`,
                'success'
            );

            return {
                success: true,
                message:
                    cloudMessage ||
                    `Đã xóa sạch dữ liệu các mục đã chọn (${labelList}) trên Cloud & Hệ thống!`,
                summary: cloudSummary,
            };
        } catch (error: any) {
            console.error('Error in clearSelectedData:', error);
            return {
                success: false,
                message: 'Lỗi khi dọn dẹp dữ liệu: ' + (error?.message || 'Không xác định'),
            };
        }
    }

    async clearDataExceptDSNV() {
        const allExceptStaff = [
            'HOADONDETAIL',
            'HOADON',
            'pos_cart_drafts',
            'pos_orders',
            'CAUHINH',
            'NHAPXUATKHO',
            'KIEMKEKHO',
            'DMHH',
            'NGUYENLIEU',
            'NHACUNGCAP',
            'KHACHHANG',
            'DSBAN',
            'ai_audit_logs',
        ];
        return await this.clearSelectedData(allExceptStaff, {
            resetTableStatus: true,
            clearPrintQueue: true,
        });
    }

    public downloadExcelTemplate() {
        try {
            const workbook = XLSX.utils.book_new();

            const templateSheets: Record<string, any[]> = {
                'Sản Phẩm': [
                    {
                        IDSP: 'SP001',
                        'Tên sản phẩm': 'Trà Sữa Truyền Thống H2',
                        'Loại sản phẩm': 'Trà sữa',
                        'Đơn vị tính': 'Ly',
                        'Giá vốn': 12000,
                        'Đơn giá': 28000,
                        'Trạng thái': 'Đang bán',
                        'Hình ảnh': '',
                        'Mô tả': 'Trà sữa đậm vị chuẩn H2MilkTea',
                    },
                ],
                'Nguyên Liệu': [
                    {
                        IDNguyenLieu: 'NVL001',
                        'Tên nguyên liệu': 'Hồng trà thượng hạng',
                        'Đơn vị tính': 'Kg',
                        'Số lượng cảnh báo': 2,
                        'Đơn vị cơ sở': 'Gram',
                        'Hệ số quy đổi': 1000,
                        'Ghi chú': 'Bảo quản nơi khô ráo',
                    },
                ],
                'Cấu Hình': [
                    {
                        IDCauHinh: 'CFG001',
                        IDSP: 'SP001',
                        'Tên sản phẩm': 'Trà Sữa Truyền Thống H2',
                        IDNguyenLieu: 'NVL001',
                        'Tên nguyên liệu': 'Hồng trà thượng hạng',
                        'Số lượng cần': 15,
                        'Đơn vị sử dụng': 'Gram',
                        'Đơn vị gốc': 'Kg',
                        'Hệ số quy đổi': 0.001,
                        'Số lượng quy đổi': 0.015,
                        'Trạng thái': 'Hoạt động',
                    },
                ],
                'Bàn': [
                    {
                        IDBAN: 'BAN001',
                        'Tên bàn': 'Bàn 01 - Tầng 1',
                        'Sức chứa tối đa': 4,
                        'Trạng thái': 'Trống',
                        'Khu vực': 'Tầng 1',
                    },
                ],
                'Nhà Cung Cấp': [
                    {
                        IDNhaCungCap: 'NCC001',
                        TenNhaCungCap: 'Công ty Nguyên liệu Trà & Sữa H2',
                        SoDienThoai: '0901234567',
                        Email: 'contact@ncc.vn',
                        DiaChi: 'TP. Hà Nội',
                        NguoiDaiDien: 'Nguyễn Văn A',
                        TrangThai: 'Đang hợp tác',
                    },
                ],
                'Khách Hàng': [
                    {
                        IDKHACHHANG: 'KH001',
                        'Tên khách hàng': 'Nguyễn Thị B',
                        'Số điện thoại': '0987654321',
                        'Loại khách hàng': 'Thân thiết',
                        'Điểm tích lũy': 0,
                        'Tổng chi tiêu': 0,
                        'Trạng thái': 'Hoạt động',
                    },
                ],
            };

            Object.entries(templateSheets).forEach(([sheetName, rows]) => {
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(workbook, ws, sheetName);
            });

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `H2MilkTea-Mau-Nhap-Lieu-Chuan.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.recordDataActivity('Tải file Excel mẫu', 'Đã tải bộ mẫu nhập liệu chuẩn H2MilkTea (.xlsx)', 'success');
            return { success: true, message: 'Đã tải file Excel mẫu chuẩn cho quán H2MilkTea!' };
        } catch (error) {
            return { success: false, message: 'Lỗi tạo file mẫu: ' + (error as Error).message };
        }
    }

    exportToExcel() {
        try {
            const workbook = XLSX.utils.book_new();

            Object.keys(this.demoData).forEach(tableName => {
                const tableData = this.demoData[tableName];
                if (Array.isArray(tableData) && tableData.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(tableData);
                    XLSX.utils.book_append_sheet(workbook, worksheet, this.getTableDisplayName(tableName));
                }
            });

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `restaurant-data-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return { success: true, message: 'Export Excel thành công!' };
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return { success: false, message: 'Lỗi khi export Excel: ' + (error as Error).message };
        }
    }

    async getAllKhachHang() {
        return await this.apiRequest('KHACHHANG', 'getall', {});
    }

    async getKhachHangById(idKhachHang: string) {
        return await this.apiRequest('KHACHHANG', 'find', { filter: { IDKHACHHANG: idKhachHang } });
    }

    async getKhachHangByPhone(soDienThoai: string) {
        return await this.apiRequest('KHACHHANG', 'find', { filter: { 'Số điện thoại': soDienThoai } });
    }

    async addKhachHang(khachHangData: any) {
        return await this.apiRequest('KHACHHANG', 'create', khachHangData);
    }

    async updateKhachHang(idKhachHang: string, khachHangData: any) {
        return await this.apiRequest('KHACHHANG', 'update', { IDKHACHHANG: idKhachHang, ...khachHangData });
    }

    async deleteKhachHang(idKhachHang: string) {
        return await this.apiRequest('KHACHHANG', 'delete', { IDKHACHHANG: idKhachHang });
    }

    exportToCSV(tableName?: string) {
        try {
            if (tableName) {
                const tableData = this.demoData[tableName];
                if (!Array.isArray(tableData) || tableData.length === 0) {
                    throw new Error('Bảng không có dữ liệu');
                }

                const csv = this.convertToCSV(tableData);
                this.downloadCSV(csv, `${this.getTableDisplayName(tableName)}-${new Date().toISOString().split('T')[0]}.csv`);
            } else {
                Object.keys(this.demoData).forEach(table => {
                    const tableData = this.demoData[table];
                    if (Array.isArray(tableData) && tableData.length > 0) {
                        const csv = this.convertToCSV(tableData);
                        this.downloadCSV(csv, `${this.getTableDisplayName(table)}-${new Date().toISOString().split('T')[0]}.csv`);
                    }
                });
            }

            return { success: true, message: 'Export CSV thành công!' };
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return { success: false, message: 'Lỗi khi export CSV: ' + (error as Error).message };
        }
    }

    async importFromExcel(file: File) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            const importedData: { [key: string]: any[] } = {};
            const tableNameMap = this.getTableNameMap();

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const tableName = Object.keys(tableNameMap).find(key =>
                    tableNameMap[key] === sheetName
                ) || sheetName;

                if (this.demoData.hasOwnProperty(tableName)) {
                    importedData[tableName] = jsonData;
                }
            });

            if (Object.keys(importedData).length === 0) {
                throw new Error('Không tìm thấy dữ liệu hợp lệ trong file Excel');
            }

            Object.keys(importedData).forEach(tableName => {
                if (tableName !== 'DSNV' || importedData[tableName].length > 0) {
                    this.demoData[tableName] = importedData[tableName];
                }
            });

            this.saveDemoData();
            const syncRes = await this.syncTablesToCloud(importedData, true);
            this.recordDataActivity(
                'Import Excel',
                `Đã nạp ${Object.keys(importedData).length} bảng dữ liệu lên Cloud`,
                syncRes.success ? 'success' : 'warning'
            );
            return {
                success: true,
                message: syncRes.success
                    ? `Import Excel và đồng bộ lên Cloud thành công (${Object.keys(importedData).map(t => this.getTableDisplayName(t)).join(', ')})!`
                    : `Đã nạp dữ liệu Excel vào phiên làm việc (${syncRes.message})`,
            };
        } catch (error) {
            console.error('Error importing Excel:', error);
            return { success: false, message: 'Lỗi khi import Excel: ' + (error as Error).message };
        }
    }

    async importFromCSV(file: File, tableName: string) {
        try {
            const text = await file.text();
            const rows = text.split('\n').filter(row => row.trim());

            if (rows.length < 2) {
                throw new Error('File CSV phải có ít nhất 2 dòng (header + data)');
            }

            const headers = this.parseCSVRow(rows[0]);
            const data = rows.slice(1).map((row, index) => {
                const values = this.parseCSVRow(row);
                const rowData: any = {};

                headers.forEach((header, i) => {
                    rowData[header] = values[i] || '';
                });

                if (!rowData._RowNumber) {
                    rowData._RowNumber = (index + 1).toString();
                }

                return rowData;
            }).filter(row => Object.values(row).some(value => value !== ''));

            if (data.length === 0) {
                throw new Error('Không có dữ liệu hợp lệ trong file CSV');
            }

            const currentTableData = [...(this.demoData[tableName] || [])];

            this.demoData[tableName] = data;
            this.saveDemoData();
            const syncRes = await this.syncTablesToCloud({ [tableName]: data }, true);
            this.recordDataActivity(
                `Import CSV (${this.getTableDisplayName(tableName)})`,
                `Đã nạp ${data.length} bản ghi lên Cloud`,
                syncRes.success ? 'success' : 'warning'
            );

            return {
                success: true,
                message: `Import CSV và đồng bộ Cloud thành công! Đã nạp ${data.length} bản ghi vào bảng ${this.getTableDisplayName(tableName)}`,
                backup: currentTableData
            };
        } catch (error) {
            console.error('Error importing CSV:', error);
            return { success: false, message: 'Lỗi khi import CSV: ' + (error as Error).message };
        }
    }

    private convertToCSV(data: any[]): string {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');

        const csvRows = data.map(row => {
            return headers.map(header => {
                let value = row[header];
                if (value === null || value === undefined) value = '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    private downloadCSV(csv: string, filename: string) {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private parseCSVRow(row: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                if (inQuotes && row[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    private getTableNameMap(): { [key: string]: string } {
        return {
            'DSNV': 'Nhân Viên',
            'DSBAN': 'Bàn',
            'HOADON': 'Hóa Đơn',
            'HOADONDETAIL': 'Chi Tiết Hóa Đơn',
            'DMHH': 'Sản Phẩm',
            'NGUYENLIEU': 'Nguyên Liệu',
            'CAUHINH': 'Cấu Hình',
            'KHACHHANG': 'Khách Hàng',
            'KIEMKEKHO': 'Kiểm Kê Kho',
            'NHAPXUATKHO': 'Nhập Xuất Kho',
            'NHACUNGCAP': 'Nhà Cung Cấp'
        };
    }

    private getTableDisplayName(tableName: string) {
        const names: { [key: string]: string } = {
            'DSNV': 'Nhân Viên',
            'DSBAN': 'Bàn',
            'HOADON': 'Hóa Đơn',
            'HOADONDETAIL': 'Chi Tiết Hóa Đơn',
            'DMHH': 'Sản Phẩm',
            'NGUYENLIEU': 'Nguyên Liệu',
            'CAUHINH': 'Cấu Hình',
            'KHACHHANG': 'Khách Hàng',
            'KIEMKEKHO': 'Kiểm Kê Kho',
            'NHAPXUATKHO': 'Nhập Xuất Kho',
            'NHACUNGCAP': 'Nhà Cung Cấp'
        };
        return names[tableName] || tableName;
    }

    private validateDataIntegrity(data: any): boolean {
        const requiredTables = ['DSNV', 'DSBAN', 'HOADON', 'HOADONDETAIL', 'DMHH', 'NGUYENLIEU', 'CAUHINH', 'KHACHHANG', 'KIEMKEKHO', 'NHAPXUATKHO', 'NHACUNGCAP'];

        if (!data || typeof data !== 'object') return false;

        for (const table of requiredTables) {
            if (!Array.isArray(data[table])) {
                return false;
            }
        }

        return true;
    }

    private recoverFromBackup(): boolean {
        this.initializeInMemoryData();
        return false;
    }

    public autoRecovery() {
        if (!this.validateDataIntegrity(this.demoData)) {
            this.initializeInMemoryData();
        }
    }

    public startAutoRecoveryCheck() {
        // Đã loại bỏ chế độ tự động phục hồi từ localStorage để tránh ghi đè dữ liệu Cloud
    }

    public stopAutoRecoveryCheck() {
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
        }
    }

    public getDataStatus() {
        return {
            isInitialized: this.isInitialized,
            hasLocalStorage: this.isLocalStorageAvailable(),
            dataIntegrity: this.validateDataIntegrity(this.demoData),
            lastSaved: this.lastSyncedAt,
            totalRecords: Object.values(this.demoData).reduce((sum, table) => sum + (Array.isArray(table) ? table.length : 0), 0),
            hasRootAdminFallback: Boolean(this.getRootAdminFallback()),
        };
    }

    private initializeDemoData() {
        if (this.isInitialized) return;

        this.purgeLegacyLocalStorageData();
        this.ensureRootAdminFallback();
        this.initializeInMemoryData();
        this.lastSyncedAt = new Date().toISOString();
        this.isInitialized = true;
    }

    private saveDemoData() {
        this.lastSyncedAt = new Date().toISOString();
        this.purgeLegacyLocalStorageData();
    }

    // Đồng bộ dữ liệu chuẩn từ Supabase Cloud làm nguồn chân lý duy nhất (Single Source of Truth)
    // Hỗ trợ cả trường hợp bảng trên Cloud đã được xóa trắng (supaData = [])
    private mergeSupabaseData(tableName: string, supaData: any[]) {
        if (!Array.isArray(supaData)) return;

        if (supaData.length === 0) {
            if (tableName === 'DSNV') {
                const rootFallback = this.getRootAdminFallback();
                this.demoData['DSNV'] = rootFallback ? [rootFallback] : [];
            } else {
                this.demoData[tableName] = [];
            }
            this.lastSyncedAt = new Date().toISOString();
            return;
        }

        // Chuẩn hóa và làm giàu dữ liệu từ Cloud về định dạng Frontend cần (bổ sung các alias Bàn, IDHD, IDKH, Thu ngân...)
        const enrichedList = supaData.map(item => {
            const enriched = { ...item };
            if (tableName === 'HOADON') {
                enriched['Bàn'] = enriched['Bàn'] || enriched.IDBAN || 'Khách mua về';
                enriched.IDHD = enriched.IDHD || enriched.IDHOADON;
                enriched['Thu ngân'] = enriched['Thu ngân'] || enriched['Nhân viên'] || 'Thu ngân';
                enriched['Hình thức thanh toán'] = enriched['Hình thức thanh toán'] || enriched['Loại thanh toán'] || 'Tiền mặt';
                enriched['Thời gian'] = enriched['Thời gian'] || enriched['Ngày'];
            } else if (tableName === 'HOADONDETAIL') {
                enriched.IDHD = enriched.IDHD || enriched.IDHOADON;
            } else if (tableName === 'KHACHHANG') {
                enriched.IDKH = enriched.IDKH || enriched.IDKHACHHANG;
            } else if (tableName === 'DSNV') {
                enriched.username = String(enriched.username || '').trim();
                enriched['Họ và Tên'] = enriched['Họ và Tên'] || enriched.username || 'Nhân viên';
                enriched['Phân quyền'] = enriched['Phân quyền'] || 'Nhân viên';
            }
            return enriched;
        });

        this.demoData[tableName] = enrichedList;
        this.lastSyncedAt = new Date().toISOString();
    }

    async apiRequest(tableName: string, action: string, data: any, select: any = {}): Promise<any> {
        try {
            this.initializeDemoData();

            const normalizedAction = action.toLowerCase();

            // 1. Đồng bộ dữ liệu mới nhất từ Cloud qua /api/db (bỏ qua hạn chế RLS)
            // Luôn nhận kết quả thực tế từ Supabase kể cả khi bảng rỗng (json.data = [])
            if (this.isBrowser() && ['getall', 'find', 'get', 'read'].includes(normalizedAction)) {
                try {
                    const res = await fetch(`/api/db?table=${encodeURIComponent(tableName)}`, { cache: 'no-store' });
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success && Array.isArray(json.data)) {
                            this.mergeSupabaseData(tableName, json.data);
                        }
                    }
                } catch {
                    // Fallback về in-memory state khi mất kết nối mạng
                }
            } else if (!this.isBrowser() && ['getall', 'find', 'get', 'read'].includes(normalizedAction)) {
                let supabase: any = null;
                try {
                    supabase = createClient();
                } catch {
                    supabase = null;
                }

                if (supabase) {
                    try {
                        const { data: supaData, error } = await supabase.from(tableName).select('*');
                        if (!error && Array.isArray(supaData) && supaData.length > 0) {
                            this.mergeSupabaseData(tableName, supaData);
                        }
                    } catch {
                        // Fallback về in-memory demoData khi chạy unit test / offline
                    }
                }
            }

            const tableData = this.demoData[tableName] || [];
            const previousTableData = Array.isArray(tableData)
                ? tableData.map((item: any) => ({ ...item }))
                : [];

            let result: any;
            switch (normalizedAction) {
                case 'find':
                case 'get':
                case 'read':
                    result = this.handleFind(tableData, data).map((item: any) => ({ ...item }));
                    break;

                case 'create':
                case 'add':
                case 'insert':
                    result = this.handleCreate(tableName, data);
                    break;

                case 'update':
                case 'edit':
                case 'modify':
                    result = this.handleUpdate(tableName, data);
                    break;

                case 'delete':
                case 'remove':
                    result = this.handleDelete(tableName, data);
                    break;

                case 'getall':
                default:
                    // Luôn trả về bản sao (clone) của mảng để không bao giờ bị mutate state React trực tiếp
                    result = tableData.map((item: any) => ({ ...item }));
            }

            if (['create', 'add', 'insert', 'update', 'edit', 'modify', 'delete', 'remove'].includes(normalizedAction)) {
                if (result && typeof result === 'object' && 'success' in result && result.success === false) {
                    return result;
                }

                this.saveDemoData();

                // Đồng bộ thay đổi đồng bộ (await) xuống Supabase Cloud qua endpoint API /api/db
                if (this.isBrowser()) {
                    try {
                        const res = await fetch('/api/db', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                table: tableName,
                                action: normalizedAction,
                                data: (result && result.data) ? result.data : data
                            })
                        });

                        let resJson: any = null;
                        try {
                            resJson = await res.json();
                        } catch {
                            resJson = null;
                        }

                        // Nếu server trả về lỗi logic/quyền/schema (400, 401, 403, 500), rollback localStorage và báo lỗi rõ ràng
                        if (res.status !== 503 && (!res.ok || (resJson && resJson.success === false))) {
                            this.demoData[tableName] = previousTableData;
                            this.saveDemoData();
                            return {
                                success: false,
                                message: resJson?.error || `Lỗi lưu dữ liệu bảng ${tableName} lên máy chủ (HTTP ${res.status})`
                            };
                        }
                    } catch (e) {
                        console.warn('Lỗi kết nối /api/db:', e);
                        if (tableName === 'DSNV') {
                            this.demoData[tableName] = previousTableData;
                            this.saveDemoData();
                            return {
                                success: false,
                                message: 'Không thể kết nối máy chủ để lưu thông tin nhân viên. Vui lòng kiểm tra kết nối mạng.'
                            };
                        }
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('Demo API request failed:', error);
            this.autoRecovery();
            throw error;
        }
    }

    private handleFind(tableData: any[], data: any) {
        let result = [...tableData];

        if (data?.Properties && data.Properties.Selector) {
            const selector = data.Properties.Selector;
            result = this.parseSelector(result, selector);
        }

        if (data?.filter) {
            Object.keys(data.filter).forEach(key => {
                const value = data.filter[key];
                result = result.filter(item => {
                    if (typeof value === 'string') {
                        return item[key]?.toString().toLowerCase().includes(value.toLowerCase());
                    }
                    return item[key] === value;
                });
            });
        }

        if (data?.id) {
            result = result.filter(item =>
                Object.values(item).some(val =>
                    val?.toString().toLowerCase().includes(data.id.toLowerCase())
                )
            );
        }

        return result;
    }

    // Sinh mã tuần tự không trùng lặp cho bảng
    private generateUniqueSequentialId(tableName: string, prefix: string, primaryKey: string, tableData: any[]): string {
        const existingIds = new Set(tableData.map(item => String(item[primaryKey] || '').toUpperCase()));
        let counter = 1;
        while (true) {
            const candidate = `${prefix}${String(counter).padStart(3, '0')}`;
            if (!existingIds.has(candidate.toUpperCase())) {
                return candidate;
            }
            counter++;
        }
    }

    // Trigger tự động xuất kho nguyên liệu khi tạo HOADONDETAIL
    private triggerInventoryDeductionOnSale(detailRecord: any) {
        try {
            const idSP = detailRecord.IDSP;
            const idHoaDon = detailRecord.IDHOADON || detailRecord.IDHD || 'POS';
            const soldQty = Math.max(1, parseFloat(detailRecord['Số lượng']) || 1);
            if (!idSP) return;

            const configs = (this.demoData['CAUHINH'] || []).filter((c: any) => c.IDSP === idSP);
            if (configs.length === 0) return;

            const materials = this.demoData['NGUYENLIEU'] || [];
            const chiTietXuat: any[] = [];

            configs.forEach((cfg: any) => {
                const idNVL = cfg.IDNguyenLieu;
                const amountPerUnit = parseFloat(cfg['Số lượng quy đổi']) || parseFloat(cfg['Số lượng cần']) || 0;
                if (!idNVL || amountPerUnit <= 0) return;

                const usedAmount = Math.round(soldQty * amountPerUnit * 1000) / 1000;
                const matIndex = materials.findIndex((m: any) => m.IDNguyenLieu === idNVL);
                const mat = matIndex >= 0 ? materials[matIndex] : null;

                if (mat && mat['Số lượng tồn'] !== undefined) {
                    const currentStock = parseFloat(mat['Số lượng tồn']) || 0;
                    materials[matIndex] = {
                        ...mat,
                        'Số lượng tồn': String(Math.max(0, Math.round((currentStock - usedAmount) * 1000) / 1000))
                    };
                }

                chiTietXuat.push({
                    IDNguyenLieu: idNVL,
                    TenNguyenLieu: mat?.['Tên nguyên liệu'] || cfg['Tên nguyên liệu'] || idNVL,
                    SoLuong: usedAmount,
                    DonViTinh: mat?.['Đơn vị tính'] || cfg['Đơn vị sử dụng'] || 'Kg',
                    DonGia: 0,
                    ThanhTien: 0
                });
            });

            if (chiTietXuat.length > 0) {
                const txList = [...(this.demoData['NHAPXUATKHO'] || [])];
                const autoTxId = `GD_AUTO_${idHoaDon}`;
                const existingTxIdx = txList.findIndex(tx => tx.IDGiaoDich === autoTxId);

                if (existingTxIdx >= 0) {
                    const existingTx = txList[existingTxIdx];
                    const mergedDetails = [...(existingTx.ChiTiet || []), ...chiTietXuat];
                    txList[existingTxIdx] = {
                        ...existingTx,
                        ChiTiet: mergedDetails
                    };
                } else {
                    txList.unshift({
                        IDGiaoDich: autoTxId,
                        LoaiGiaoDich: 'Xuất kho',
                        'Loại giao dịch': 'Xuất kho',
                        NgayGiaoDich: this.formatVNDateTime(new Date()),
                        NhaCungCap: '',
                        NhanVienThucHien: 'Hệ thống POS (Tự động)',
                        GhiChu: `Xuất kho tự động theo hóa đơn ${idHoaDon}`,
                        TongTien: 0,
                        TrangThai: 'Hoàn thành',
                        ChiTiet: chiTietXuat
                    });
                }
                this.demoData['NHAPXUATKHO'] = txList;
            }
        } catch (err) {
            console.warn('Trigger trừ kho tự động gặp lỗi nhỏ:', err);
        }
    }

    // CREATE/ADD - Thêm mới (Không mutate mảng gốc + chống trùng ID + chuẩn hóa dữ liệu)
    private handleCreate(tableName: string, rawData: any) {
        const data = (rawData && rawData.Row && typeof rawData.Row === 'object') ? rawData.Row : rawData;
        const tableData = Array.isArray(this.demoData[tableName]) ? [...this.demoData[tableName]] : [];
        const primaryKey = this.getPrimaryKey(tableName);

        const maxRow = tableData.reduce((max, item) => Math.max(max, parseInt(item._RowNumber) || 0), 1);
        const newRowNumber = maxRow + 1;

        // Xác định primaryId ưu tiên mã truyền vào nếu chưa bị trùng
        const providedId = data?.[primaryKey] || (tableName === 'HOADON' ? data?.IDHD : undefined);
        const isProvidedIdDuplicate = providedId
            ? tableData.some(item => String(item[primaryKey] || '').toLowerCase() === String(providedId).toLowerCase())
            : false;

        // Nếu client/người dùng truyền mã cụ thể mà mã này ĐÃ TỒN TẠI trên hệ thống -> Báo lỗi chặn lại, không tự ý âm thầm đổi mã
        if (providedId && isProvidedIdDuplicate) {
            return {
                success: false,
                message: `Mã "${providedId}" đã tồn tại trong danh mục ${tableName}! Vui lòng kiểm tra lại để tránh thêm trùng.`
            };
        }

        let primaryId = '';
        if (providedId) {
            primaryId = String(providedId);
        } else {
            switch (tableName) {
                case 'DSNV':
                    primaryId = providedId || `NV${Date.now()}`;
                    break;
                case 'DSBAN':
                    primaryId = this.generateUniqueSequentialId(tableName, 'BAN', primaryKey, tableData);
                    break;
                case 'HOADON':
                    primaryId = `INV${Date.now()}`;
                    break;
                case 'HOADONDETAIL': {
                    const invId = data?.IDHOADON || data?.IDHD || `INV${Date.now()}`;
                    const spId = data?.IDSP || `SP`;
                    primaryId = `${invId}_${spId}_${Date.now().toString().slice(-4)}`;
                    break;
                }
                case 'DMHH':
                    primaryId = this.generateUniqueSequentialId(tableName, 'SP', primaryKey, tableData);
                    break;
                case 'NGUYENLIEU':
                    primaryId = this.generateUniqueSequentialId(tableName, 'NVL', primaryKey, tableData);
                    break;
                case 'CAUHINH':
                    primaryId = this.generateUniqueSequentialId(tableName, 'CFG', primaryKey, tableData);
                    break;
                case 'KHACHHANG':
                    primaryId = this.generateUniqueSequentialId(tableName, 'KH', primaryKey, tableData);
                    break;
                case 'KIEMKEKHO':
                    primaryId = this.generateUniqueSequentialId(tableName, 'KK', primaryKey, tableData);
                    break;
                case 'NHAPXUATKHO':
                    primaryId = this.generateUniqueSequentialId(tableName, 'GD', primaryKey, tableData);
                    break;
                case 'NHACUNGCAP':
                    primaryId = this.generateUniqueSequentialId(tableName, 'NCC', primaryKey, tableData);
                    break;
                default:
                    primaryId = `ID${Date.now()}`;
            }
        }

        let newRecord: any = {
            _RowNumber: newRowNumber.toString(),
            ...data,
            [primaryKey]: primaryId,
            ...(tableName === 'HOADON' || tableName === 'CAUHINH' ? {
                'Ngày tạo': new Date().toLocaleString('vi-VN'),
                'Ngày cập nhật': new Date().toLocaleString('vi-VN')
            } : {})
        };

        // Chuẩn hóa bản ghi nếu là HOADON hoặc HOADONDETAIL
        if (tableName === 'HOADON') {
            const now = this.parseFlexibleDate(newRecord['Ngày'] || newRecord['Thời gian']) || new Date();
            const rawStatus = String(newRecord['Trạng thái'] || 'Đã thanh toán').trim();
            const normalizedStatus = (rawStatus === 'Đã hoàn thành' || rawStatus === 'Hoàn thành') ? 'Đã thanh toán' : rawStatus;
            const staff = newRecord['Nhân viên'] || newRecord['Thu ngân'] || 'Thu ngân';
            const payMethod = newRecord['Loại thanh toán'] || newRecord['Hình thức thanh toán'] || 'Tiền mặt';

            newRecord = {
                ...newRecord,
                IDHOADON: primaryId,
                IDHD: primaryId,
                IDBAN: newRecord.IDBAN || newRecord['Bàn'] || 'Khách mua về',
                'Bàn': newRecord['Bàn'] || newRecord.IDBAN || 'Khách mua về',
                'Nhân viên': staff,
                'Thu ngân': staff,
                'Khách hàng': newRecord['Khách hàng'] || 'Khách lẻ',
                'Ngày': this.formatUSDateTime(now),
                'Thời gian': this.formatVNDateTime(now),
                'Loại thanh toán': payMethod,
                'Hình thức thanh toán': payMethod,
                'Trạng thái': normalizedStatus
            };
        } else if (tableName === 'HOADONDETAIL') {
            const idHoaDon = String(newRecord.IDHOADON || newRecord.IDHD || '');
            const idSP = String(newRecord.IDSP || '');
            const prod = (this.demoData['DMHH'] || []).find((p: any) => p.IDSP === idSP);
            const qty = Math.max(1, parseFloat(newRecord['Số lượng']) || 1);
            const unitPrice = parseFloat(newRecord['Đơn giá']) || parseFloat(prod?.['Đơn giá']) || 25000;
            const lineTotal = parseFloat(newRecord['Thành tiền']) || (qty * unitPrice);

            newRecord = {
                ...newRecord,
                IDHOADON: idHoaDon,
                IDHD: idHoaDon,
                'Tên sản phẩm': newRecord['Tên sản phẩm'] || prod?.['Tên sản phẩm'] || `Sản phẩm ${idSP}`,
                'Đơn vị tính': newRecord['Đơn vị tính'] || prod?.['Đơn vị tính'] || 'Ly',
                'Đơn giá': String(unitPrice),
                'Số lượng': String(qty),
                'Thành tiền': String(lineTotal)
            };

            // Kích hoạt trigger trừ kho nguyên vật liệu tự động
            this.triggerInventoryDeductionOnSale(newRecord);
        }

        // Gán mảng mới hoàn toàn thay vì .push() để không mutate tham chiếu state React
        this.demoData[tableName] = [...tableData, newRecord];

        return { success: true, data: { ...newRecord }, message: 'Thêm mới thành công!' };
    }

    // UPDATE/EDIT - Cập nhật
    private handleUpdate(tableName: string, data: any) {
        const tableData = Array.isArray(this.demoData[tableName]) ? [...this.demoData[tableName]] : [];
        const primaryKey = this.getPrimaryKey(tableName);
        const recordId = data[primaryKey] || data.id || (tableName === 'HOADON' ? data.IDHD : undefined) || (tableName === 'KHACHHANG' ? (data.IDKH || data.IDKHACHHANG) : undefined);

        if (!recordId) {
            throw new Error('Không tìm thấy ID để cập nhật');
        }

        const recordIndex = tableData.findIndex(item => item[primaryKey] === recordId || (tableName === 'HOADON' && item.IDHD === recordId) || (tableName === 'KHACHHANG' && (item.IDKH === recordId || item.IDKHACHHANG === recordId)));

        if (recordIndex === -1) {
            // Nếu bản ghi chưa có trong local demoData (nhưng có trên Supabase), thêm vào demoData và cho phép cập nhật
            const newRecord = {
                ...data,
                ...(tableName === 'HOADON' || tableName === 'CAUHINH' ? {
                    'Ngày cập nhật': new Date().toLocaleString('vi-VN')
                } : {})
            };
            this.demoData[tableName] = [...tableData, newRecord];
            return { success: true, data: { ...newRecord }, message: 'Cập nhật thành công!' };
        }

        const updatedRecord = {
            ...tableData[recordIndex],
            ...data,
            ...(tableName === 'HOADON' || tableName === 'CAUHINH' ? {
                'Ngày cập nhật': new Date().toLocaleString('vi-VN')
            } : {})
        };

        tableData[recordIndex] = updatedRecord;
        this.demoData[tableName] = tableData;

        return { success: true, data: { ...updatedRecord }, message: 'Cập nhật thành công!' };
    }

    // DELETE - Xóa
    private handleDelete(tableName: string, data: any) {
        const tableData = Array.isArray(this.demoData[tableName]) ? [...this.demoData[tableName]] : [];
        const primaryKey = this.getPrimaryKey(tableName);
        const recordId = data[primaryKey] || data.id || (tableName === 'HOADON' ? data.IDHD : undefined) || (tableName === 'KHACHHANG' ? (data.IDKH || data.IDKHACHHANG) : undefined);

        if (!recordId) {
            throw new Error('Không tìm thấy ID để xóa');
        }

        const recordIndex = tableData.findIndex(item => item[primaryKey] === recordId || (tableName === 'HOADON' && item.IDHD === recordId) || (tableName === 'KHACHHANG' && (item.IDKH === recordId || item.IDKHACHHANG === recordId)));

        if (recordIndex === -1) {
            // Bản ghi không có trong local demoData nhưng có thể có trên Supabase -> vẫn cho phép xóa
            return { success: true, data: { [primaryKey]: recordId }, message: 'Xóa thành công!' };
        }

        const deletedRecord = tableData.splice(recordIndex, 1)[0];
        this.demoData[tableName] = tableData;

        return { success: true, data: deletedRecord, message: 'Xóa thành công!' };
    }

    private getPrimaryKey(tableName: string): string {
        const primaryKeys: { [key: string]: string } = {
            'DSNV': 'username',
            'DSBAN': 'IDBAN',
            'HOADON': 'IDHOADON',
            'HOADONDETAIL': 'IDHOADONDETAIL',
            'DMHH': 'IDSP',
            'NGUYENLIEU': 'IDNguyenLieu',
            'CAUHINH': 'IDCauHinh',
            'KHACHHANG': 'IDKHACHHANG',
            'KIEMKEKHO': 'IDKiemKe',
            'NHAPXUATKHO': 'IDGiaoDich',
            'NHACUNGCAP': 'IDNhaCungCap'
        };
        return primaryKeys[tableName] || 'id';
    }

    private getPrimaryIdField(tableName: string, id: string): any {
        const primaryKey = this.getPrimaryKey(tableName);
        if (tableName === 'KHACHHANG') {
            const newRowNumber = Math.max(...(this.demoData[tableName] || []).map(item => parseInt(item._RowNumber) || 0)) + 1;
            return { [primaryKey]: `KH${String(newRowNumber).padStart(3, '0')}` };
        }
        return { [primaryKey]: id };
    }

    private parseSelector(data: any[], selector: string): any[] {
        try {
            if (selector.includes('Filter(')) {
                const andMatch = selector.match(/Filter\([^,]+,\s*and\(\s*\[([^\]]+)\]\s*=\s*"([^"]+)"\s*,\s*\[([^\]]+)\]\s*=\s*"([^"]+)"\s*\)\)/);
                if (andMatch) {
                    const [, field1, value1, field2, value2] = andMatch;
                    return data.filter(item =>
                        item[field1] === value1 && item[field2] === value2
                    );
                }

                const singleMatch = selector.match(/Filter\([^,]+,\s*\[([^\]]+)\]\s*=\s*"([^"]+)"\)/);
                if (singleMatch) {
                    const [, field, value] = singleMatch;
                    return data.filter(item => item[field] === value);
                }

                const containsMatch = selector.match(/Filter\([^,]+,\s*contains\(\[([^\]]+)\],\s*"([^"]+)"\)\)/);
                if (containsMatch) {
                    const [, field, value] = containsMatch;
                    return data.filter(item =>
                        item[field]?.toString().toLowerCase().includes(value.toLowerCase())
                    );
                }
            }

            return data;
        } catch (error) {
            console.error('Error parsing selector:', error);
            return data;
        }
    }

    saveReturnUrl(url: string) {
        if (!this.isClient()) return;

        if (url && !url.includes('/login') && !url.includes('/?')) {
            try {
                localStorage.setItem('returnUrl', url);
            } catch (error) {
                console.error('Error saving return URL:', error);
            }
        }
    }

    getAndClearReturnUrl() {
        if (!this.isClient()) return config.ROUTES.DASHBOARD;

        try {
            const returnUrl = localStorage.getItem('returnUrl');
            if (returnUrl) {
                localStorage.removeItem('returnUrl');
                return returnUrl;
            }
        } catch (error) {
            console.error('Error getting return URL:', error);
        }

        return config.ROUTES.DASHBOARD;
    }

    saveAuthData(userData: any) {
        if (!this.isClient()) return;

        try {
            const now = new Date();
            const expiryTime = new Date(now.getTime() + config.AUTH.TOKEN_DURATION);
            const token = 'Bearer ' + Math.random().toString(36).substring(7);
            const displayName = userData['Họ và Tên'] || userData.fullName || userData.name || userData.username || 'Thu ngân';

            localStorage.setItem(config.AUTH.TOKEN_KEY, token);
            localStorage.setItem(config.AUTH.USER_DATA_KEY, JSON.stringify(userData));
            localStorage.setItem(config.AUTH.TOKEN_EXPIRY_KEY, expiryTime.toISOString());

            const cookieValue = `authToken=${token}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Strict`;
            document.cookie = cookieValue;

            const staffUserCookie = `staffUser=${encodeURIComponent(JSON.stringify({
                username: userData.username || 'staff',
                name: displayName,
                role: userData['Vai trò'] || userData['Phân quyền'] || 'Thu ngân',
                email: userData.Email || userData.email || '',
            }))}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Lax`;
            document.cookie = staffUserCookie;

            window.dispatchEvent(new Event('h2_auth_changed'));
        } catch (error) {
            console.error('Error saving auth data:', error);
        }
    }

    clearAuthData() {
        if (!this.isClient()) return;

        try {
            localStorage.removeItem(config.AUTH.TOKEN_KEY);
            localStorage.removeItem(config.AUTH.USER_DATA_KEY);
            localStorage.removeItem(config.AUTH.TOKEN_EXPIRY_KEY);
            localStorage.removeItem('returnUrl');
            localStorage.removeItem('h2_session_id');

            // Dọn các key phiên Supabase Auth cũ trong localStorage nếu còn sót
            try {
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach((key) => localStorage.removeItem(key));
            } catch {
                // Bỏ qua nếu localStorage bị hạn chế
            }

            document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'staffUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

            // Xóa thêm cookie phiên Supabase Auth (sb-*) để tránh dính phiên tài khoản cũ
            try {
                const cookies = document.cookie ? document.cookie.split(';') : [];
                for (const entry of cookies) {
                    const eqIdx = entry.indexOf('=');
                    const name = (eqIdx >= 0 ? entry.slice(0, eqIdx) : entry).trim();
                    if (name.startsWith('sb-')) {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    }
                }
            } catch {
                // Bỏ qua lỗi đọc/xóa cookie
            }

            window.dispatchEvent(new Event('h2_auth_changed'));
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
    }

    getUserData() {
        if (!this.isClient()) return null;

        try {
            const userData = localStorage.getItem(config.AUTH.USER_DATA_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    isAuthenticated(currentPath?: string) {
        if (!this.isClient()) return false;

        try {
            const token = localStorage.getItem(config.AUTH.TOKEN_KEY);
            const expiryTime = localStorage.getItem(config.AUTH.TOKEN_EXPIRY_KEY);
            const userData = localStorage.getItem(config.AUTH.USER_DATA_KEY);

            if (!token || !expiryTime || !userData) {
                if (currentPath && !currentPath.includes('/?')) {
                    this.saveReturnUrl(currentPath);
                }
                return false;
            }

            if (new Date() > new Date(expiryTime)) {
                this.clearAuthData();
                if (currentPath && !currentPath.includes('/?')) {
                    this.saveReturnUrl(currentPath);
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    async login(username: string, password: string) {
        const cleanUsername = String(username || '').trim();
        if (!cleanUsername || !password) {
            throw new Error('Vui lòng nhập đầy đủ thông tin đăng nhập!');
        }

        // Dọn sạch phiên cũ trước khi đăng nhập tài khoản mới để tránh dính tên/cookie phiên trước
        this.clearAuthData();

        const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@h2.com`;
        const emailPrefix = email.split('@')[0];

        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error || !data.user) {
            // Cơ chế Root Admin Fallback: Nếu Database hoặc Supabase Auth vừa bị xóa trắng,
            // kiểm tra xem tài khoản đăng nhập có khớp với tài khoản Admin gốc dự phòng lưu trong localStorage không
            const rootFallback = this.getRootAdminFallback();
            const isMatchingFallbackUser =
                rootFallback &&
                (emailPrefix.toLowerCase() === String(rootFallback.username || 'admin').toLowerCase() ||
                    email.toLowerCase() === String(rootFallback.Email || 'admin@h2.com').toLowerCase());
            const isMatchingFallbackPass =
                rootFallback &&
                String(password) === String(rootFallback.fallbackPassword || '123456');

            if (isMatchingFallbackUser && isMatchingFallbackPass) {
                const emergencyAdmin = {
                    ...rootFallback,
                    username: rootFallback.username || 'admin',
                    email: rootFallback.Email || 'admin@h2.com',
                    'Phân quyền': 'Admin',
                    isEmergencyFallback: true,
                };
                delete emergencyAdmin.fallbackPassword;
                const sessionId = 'sess_fallback_' + Date.now();
                emergencyAdmin.auth_session_id = sessionId;
                if (this.isClient()) {
                    localStorage.setItem('h2_session_id', sessionId);
                }
                this.saveAuthData(emergencyAdmin);
                return emergencyAdmin;
            }

            throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
        }

        let userData: any = { email: data.user.email, username: cleanUsername };
        let resolvedDsnv: any = null;
        try {
            const { data: dsnvData } = await supabase
                .from('DSNV')
                .select('*')
                .or(`username.ilike.${emailPrefix},Email.ilike.${email}`)
                .maybeSingle();

            if (dsnvData) resolvedDsnv = dsnvData;
        } catch (e) {
            console.error("Could not fetch DSNV data", e);
        }

        // Fallback qua API /api/db?table=DSNV (bỏ qua RLS) nếu truy vấn client không lấy được hồ sơ DSNV
        if (!resolvedDsnv && this.isBrowser()) {
            try {
                const res = await fetch('/api/db?table=DSNV', { cache: 'no-store' });
                if (res.ok) {
                    const json = await res.json();
                    if (json?.success && Array.isArray(json.data)) {
                        const targetUser = emailPrefix.toLowerCase();
                        const targetEmail = email.toLowerCase();
                        resolvedDsnv = json.data.find(
                            (u: any) =>
                                String(u?.username || '').trim().toLowerCase() === targetUser ||
                                String(u?.Email || u?.email || '').trim().toLowerCase() === targetEmail
                        ) || null;
                    }
                }
            } catch {
                // Tiếp tục fallback về DSNV_DATA nội bộ nếu mạng lỗi
            }
        }

        if (!resolvedDsnv) {
            const targetUser = emailPrefix.toLowerCase();
            const targetEmail = email.toLowerCase();
            resolvedDsnv = (DSNV_DATA as Array<any>).find(
                (u) =>
                    String(u?.username || '').trim().toLowerCase() === targetUser ||
                    String(u?.Email || '').trim().toLowerCase() === targetEmail
            ) || null;
        }

        if (resolvedDsnv) {
            userData = {
                ...resolvedDsnv,
                email: data.user.email || resolvedDsnv.Email,
            };
        } else if (emailPrefix.toLowerCase() === 'admin') {
            // Nếu bảng DSNV đã bị xóa sạch nhưng đăng nhập tài khoản admin thành công -> dùng Root Admin Fallback
            const rootFallback = this.getRootAdminFallback();
            if (rootFallback) {
                userData = {
                    ...rootFallback,
                    email: data.user.email || rootFallback.Email || 'admin@h2.com',
                };
                delete userData.fallbackPassword;
            }
        }

        // Nếu người đăng nhập là Admin, cập nhật lại hồ sơ Root Admin Fallback vào localStorage để luôn có phao cứu sinh mới nhất
        const roleStr = String(userData['Phân quyền'] || userData['Chức vụ'] || '').toLowerCase();
        if (emailPrefix.toLowerCase() === 'admin' || roleStr.includes('admin') || roleStr.includes('quản trị')) {
            this.ensureRootAdminFallback(userData, password);
        }

        const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        (userData as any).auth_session_id = sessionId;
        if (data.user?.id) (userData as any).id = data.user.id;
        if (this.isClient()) {
            localStorage.setItem('h2_session_id', sessionId);
        }

        try {
            if (data.user?.id) {
                let enforceSingleSession = true;
                try {
                    const rawCfg = this.isClient() ? localStorage.getItem('h2_system_features_config') : null;
                    if (rawCfg) {
                        const parsedCfg = JSON.parse(rawCfg);
                        if (parsedCfg?.flags && typeof parsedCfg.flags.enforce_single_device_session === 'boolean') {
                            enforceSingleSession = parsedCfg.flags.enforce_single_device_session;
                        }
                    }
                } catch {
                    // Mặc định enforceSingleSession = true
                }

                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: data.user.id,
                        username: userData.username || cleanUsername,
                        sessionId,
                        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                        enforceSingleSession,
                    }),
                });
            }
        } catch (sessionErr) {
            console.warn('Lỗi đăng ký session duy nhất:', sessionErr);
        }

        this.saveAuthData(userData);
        return userData;
    }

    async logout(skipRemoteSessionRevoke = false) {
        if (!skipRemoteSessionRevoke && this.isBrowser()) {
            try {
                const currentUser = this.getUserData();
                const mySessionId = this.isClient() ? localStorage.getItem('h2_session_id') : null;
                const userId = currentUser?.id || currentUser?.IDNV;
                const username = currentUser?.username;

                if (mySessionId && (userId || username)) {
                    await fetch('/api/auth/session', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            username,
                            targetSessionId: mySessionId,
                            revokedByAdmin: false,
                        }),
                    });
                }
            } catch (e) {
                console.warn('Không thể cập nhật trạng thái tự đăng xuất lên server:', e);
            }
        }

        this.clearAuthData();
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Lỗi đăng xuất Supabase:', err);
        } finally {
            this.clearAuthData();
        }
        return config.ROUTES.LOGIN;
    }

    async resetDemoData() {
        try {
            this.purgeLegacyLocalStorageData();
            this.initializeInMemoryData();
            this.saveDemoData();

            if (this.isBrowser()) {
                await this.syncTablesToCloud(this.demoData, true);
            }
            this.recordDataActivity(
                'Reset dữ liệu hệ thống',
                'Đã khôi phục bộ dữ liệu mặc định và đồng bộ lên Supabase Cloud',
                'success'
            );
            return { success: true, message: 'Đã reset và đồng bộ dữ liệu chuẩn lên Supabase Cloud!' };
        } catch (error) {
            console.error('Error resetting demo data:', error);
            return { success: false, message: 'Lỗi khi reset dữ liệu' };
        }
    }

    async getAllNguyenLieu() {
        return await this.apiRequest('NGUYENLIEU', 'getall', {});
    }

    async getNguyenLieuById(idNguyenLieu: string) {
        return await this.apiRequest('NGUYENLIEU', 'find', { filter: { IDNguyenLieu: idNguyenLieu } });
    }

    async addNguyenLieu(nguyenLieuData: any) {
        return await this.apiRequest('NGUYENLIEU', 'create', nguyenLieuData);
    }

    async updateNguyenLieu(idNguyenLieu: string, nguyenLieuData: any) {
        return await this.apiRequest('NGUYENLIEU', 'update', { IDNguyenLieu: idNguyenLieu, ...nguyenLieuData });
    }

    async deleteNguyenLieu(idNguyenLieu: string) {
        return await this.apiRequest('NGUYENLIEU', 'delete', { IDNguyenLieu: idNguyenLieu });
    }

    async getAllCauHinh() {
        return await this.apiRequest('CAUHINH', 'getall', {});
    }

    async getCauHinhById(idCauHinh: string) {
        return await this.apiRequest('CAUHINH', 'find', { filter: { IDCauHinh: idCauHinh } });
    }

    async addCauHinh(cauHinhData: any) {
        return await this.apiRequest('CAUHINH', 'create', cauHinhData);
    }

    async updateCauHinh(idCauHinh: string, cauHinhData: any) {
        return await this.apiRequest('CAUHINH', 'update', { IDCauHinh: idCauHinh, ...cauHinhData });
    }

    async deleteCauHinh(idCauHinh: string) {
        return await this.apiRequest('CAUHINH', 'delete', { IDCauHinh: idCauHinh });
    }

    async getAllHoaDonDetail() {
        return await this.apiRequest('HOADONDETAIL', 'getall', {});
    }

    async getHoaDonDetailByInvoiceId(idHoaDon: string) {
        return await this.apiRequest('HOADONDETAIL', 'find', { filter: { IDHOADON: idHoaDon } });
    }

    async addHoaDonDetail(detailData: any) {
        return await this.apiRequest('HOADONDETAIL', 'create', detailData);
    }

    async updateHoaDonDetail(idDetail: string, detailData: any) {
        return await this.apiRequest('HOADONDETAIL', 'update', { IDHOADONDETAIL: idDetail, ...detailData });
    }

    async deleteHoaDonDetail(idDetail: string) {
        return await this.apiRequest('HOADONDETAIL', 'delete', { IDHOADONDETAIL: idDetail });
    }

    async getAllNhanVien() {
        return await this.apiRequest('DSNV', 'getall', {});
    }

    async getNhanVienById(username: string) {
        return await this.apiRequest('DSNV', 'find', { filter: { username } });
    }

    async addNhanVien(userData: any) {
        const cleanUsername = String(userData?.username || '').trim();
        const cleanPassword = String(userData?.password || '');
        const fullName = String(userData?.['Họ và Tên'] || '').trim();

        if (!fullName) {
            return { success: false, message: 'Họ và tên nhân viên không được để trống' };
        }
        if (!cleanUsername) {
            return { success: false, message: 'Tên đăng nhập không được để trống' };
        }
        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
            return { success: false, message: 'Tên đăng nhập phải có độ dài từ 3 đến 30 ký tự' };
        }
        const validUsernameRegex = /^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?$/;
        if (!validUsernameRegex.test(cleanUsername)) {
            return {
                success: false,
                message: 'Tên đăng nhập không được chứa khoảng trắng hoặc dấu tiếng Việt (chỉ dùng a-z, 0-9, _, -)',
            };
        }
        if (!cleanPassword || cleanPassword.length < 6) {
            return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
        }

        const normalizedUserData = {
            ...userData,
            username: cleanUsername,
            password: cleanPassword,
            'Họ và Tên': fullName,
            Email: String(userData?.Email || `${cleanUsername}@h2.com`).trim(),
        };

        try {
            const response = await fetch('/api/auth/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: cleanUsername,
                    password: cleanPassword,
                    employeeData: normalizedUserData,
                }),
            });

            const result = await response.json();
            if (!response.ok || result?.success === false) {
                return {
                    success: false,
                    message: result?.error || 'Lỗi khi tạo tài khoản nhân viên trên hệ thống',
                };
            }

            // Nếu /api/auth/create-user đã trực tiếp lưu bản ghi vào bảng DSNV trên Supabase thành công
            if (result?.employee) {
                this.initializeDemoData();
                const currentList = Array.isArray(this.demoData['DSNV']) ? [...this.demoData['DSNV']] : [];
                const existingIdx = currentList.findIndex(
                    (item: any) => String(item?.username || '').toLowerCase() === cleanUsername.toLowerCase()
                );
                const recordToStore = { ...normalizedUserData, ...result.employee };
                delete recordToStore.password;

                if (existingIdx >= 0) {
                    currentList[existingIdx] = recordToStore;
                } else {
                    currentList.push(recordToStore);
                }
                this.demoData['DSNV'] = currentList;
                this.saveDemoData();

                return {
                    success: true,
                    data: recordToStore,
                    message: 'Thêm nhân viên mới thành công!',
                };
            }
        } catch (error) {
            console.error('Lỗi khi gọi API tạo user:', error);
            return { success: false, message: 'Lỗi mạng hoặc máy chủ khi tạo tài khoản nhân viên' };
        }

        return await this.apiRequest('DSNV', 'create', normalizedUserData);
    }

    async updateNhanVien(username: string, userData: any) {
        return await this.apiRequest('DSNV', 'update', { username, ...userData });
    }

    async deleteNhanVien(username: string) {
        return await this.apiRequest('DSNV', 'delete', { username });
    }

    async getAllBan() {
        return await this.apiRequest('DSBAN', 'getall', {});
    }

    async getBanById(idBan: string) {
        return await this.apiRequest('DSBAN', 'find', { filter: { IDBAN: idBan } });
    }

    async addBan(banData: any) {
        return await this.apiRequest('DSBAN', 'create', banData);
    }

    async updateBan(idBan: string, banData: any) {
        return await this.apiRequest('DSBAN', 'update', { IDBAN: idBan, ...banData });
    }

    async deleteBan(idBan: string) {
        return await this.apiRequest('DSBAN', 'delete', { IDBAN: idBan });
    }

    async getAllSanPham() {
        return await this.apiRequest('DMHH', 'getall', {});
    }

    async getSanPhamById(idSP: string) {
        return await this.apiRequest('DMHH', 'find', { filter: { IDSP: idSP } });
    }

    async addSanPham(spData: any) {
        return await this.apiRequest('DMHH', 'create', spData);
    }

    async updateSanPham(idSP: string, spData: any) {
        return await this.apiRequest('DMHH', 'update', { IDSP: idSP, ...spData });
    }

    async deleteSanPham(idSP: string) {
        return await this.apiRequest('DMHH', 'delete', { IDSP: idSP });
    }

    async getAllHoaDon() {
        return await this.apiRequest('HOADON', 'getall', {});
    }

    async getHoaDonById(idHoaDon: string) {
        return await this.apiRequest('HOADON', 'find', { filter: { IDHOADON: idHoaDon } });
    }

    async addHoaDon(hoaDonData: any) {
        return await this.apiRequest('HOADON', 'create', hoaDonData);
    }

    async updateHoaDon(idHoaDon: string, hoaDonData: any) {
        return await this.apiRequest('HOADON', 'update', { IDHOADON: idHoaDon, ...hoaDonData });
    }

    async deleteHoaDon(idHoaDon: string) {
        return await this.apiRequest('HOADON', 'delete', { IDHOADON: idHoaDon });
    }

    async getAllKiemKeKho() {
        return await this.apiRequest('KIEMKEKHO', 'getall', {});
    }

    async getKiemKeKhoById(idKiemKe: string) {
        return await this.apiRequest('KIEMKEKHO', 'find', { filter: { IDKiemKe: idKiemKe } });
    }

    async addKiemKeKho(kiemKeData: any) {
        return await this.apiRequest('KIEMKEKHO', 'create', kiemKeData);
    }

    async updateKiemKeKho(idKiemKe: string, kiemKeData: any) {
        return await this.apiRequest('KIEMKEKHO', 'update', { IDKiemKe: idKiemKe, ...kiemKeData });
    }

    async deleteKiemKeKho(idKiemKe: string) {
        return await this.apiRequest('KIEMKEKHO', 'delete', { IDKiemKe: idKiemKe });
    }

    async getAllNhapXuatKho() {
        return await this.apiRequest('NHAPXUATKHO', 'getall', {});
    }

    async getNhapXuatKhoById(idGiaoDich: string) {
        return await this.apiRequest('NHAPXUATKHO', 'find', { filter: { IDGiaoDich: idGiaoDich } });
    }

    async addNhapXuatKho(giaoDichData: any) {
        return await this.apiRequest('NHAPXUATKHO', 'create', giaoDichData);
    }

    async updateNhapXuatKho(idGiaoDich: string, giaoDichData: any) {
        return await this.apiRequest('NHAPXUATKHO', 'update', { IDGiaoDich: idGiaoDich, ...giaoDichData });
    }

    async deleteNhapXuatKho(idGiaoDich: string) {
        return await this.apiRequest('NHAPXUATKHO', 'delete', { IDGiaoDich: idGiaoDich });
    }

    async getAllNhaCungCap() {
        return await this.apiRequest('NHACUNGCAP', 'getall', {});
    }

    async getNhaCungCapById(idNhaCungCap: string) {
        return await this.apiRequest('NHACUNGCAP', 'find', { filter: { IDNhaCungCap: idNhaCungCap } });
    }

    async addNhaCungCap(nhaCungCapData: any) {
        return await this.apiRequest('NHACUNGCAP', 'create', nhaCungCapData);
    }

    async updateNhaCungCap(idNhaCungCap: string, nhaCungCapData: any) {
        return await this.apiRequest('NHACUNGCAP', 'update', { IDNhaCungCap: idNhaCungCap, ...nhaCungCapData });
    }

    async deleteNhaCungCap(idNhaCungCap: string) {
        return await this.apiRequest('NHACUNGCAP', 'delete', { IDNhaCungCap: idNhaCungCap });
    }

    async uploadImage(file: File) {
        if (!file) {
            throw new Error('Không tìm thấy file');
        }

        if (file.size > config.UPLOAD.MAX_SIZE) {
            throw new Error(`Kích thước file không được vượt quá ${config.UPLOAD.MAX_SIZE / 1024 / 1024}MB`);
        }

        if (!config.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Định dạng file không được hỗ trợ');
        }

        try {
            const base64Image = await this.getImageAsBase64(file);

            const CLOUDINARY_CLOUD_NAME = config.CLOUD_NAME || 'dbwy4uh6d';
            const CLOUDINARY_UPLOAD_PRESET = config.UPLOAD_PRESET || 'demo123';

            const formData = new FormData();
            formData.append('file', base64Image);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Upload failed: ' + response.statusText);
            }

            const data = await response.json();

            if (!data.secure_url) {
                throw new Error('Invalid response from Cloudinary');
            }

            return {
                success: true,
                url: data.secure_url,
                public_id: data.public_id,
                metadata: {
                    name: data.original_filename,
                    size: data.bytes,
                    format: data.format,
                    width: data.width,
                    height: data.height
                }
            };
        } catch (error: any) {
            console.error('Image upload failed:', error);
            throw new Error('Không thể tải ảnh lên: ' + error.message);
        }
    }

    async getImageAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    validateImage(file: File) {
        const errors: string[] = [];

        if (!file) {
            errors.push('Không tìm thấy file');
        }

        if (file.size > config.UPLOAD.MAX_SIZE) {
            errors.push(`Kích thước file không được vượt quá ${config.UPLOAD.MAX_SIZE / 1024 / 1024}MB`);
        }

        if (!config.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
            errors.push('Định dạng file không được hỗ trợ');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    public clearCache() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể xóa cache trên client' };

        try {
            this.purgeLegacyLocalStorageData();
            // Dọn thêm các cache giao diện/thông báo tạm nhưng giữ phiên đăng nhập và h2_root_admin_fallback
            const transientKeys = [
                'h2_orders_viewed_ids_v1',
                'h2_orders_last_viewed_time_v1',
                'h2_pending_ai_pos_order',
                'h2_pending_bulk_add_tables',
            ];
            transientKeys.forEach((k) => localStorage.removeItem(k));
            this.ensureRootAdminFallback(this.getUserData());

            this.recordDataActivity(
                'Dọn sạch LocalStorage & Cache',
                'Đã xóa toàn bộ dữ liệu bảng lưu tạm ở LocalStorage (chỉ giữ tài khoản Admin gốc dự phòng)',
                'success'
            );

            return {
                success: true,
                message: 'Đã dọn sạch dữ liệu lưu tạm trong LocalStorage (chỉ giữ lại tài khoản Admin gốc dự phòng)!',
            };
        } catch (error) {
            console.error('Error clearing cache:', error);
            return { success: false, message: 'Lỗi khi xóa cache' };
        }
    }

    public forceReload() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể reload trên client' };

        try {
            this.purgeLegacyLocalStorageData();
            this.ensureRootAdminFallback(this.getUserData());
            this.lastSyncedAt = new Date().toISOString();
            this.recordDataActivity('Tải lại dữ liệu Cloud', 'Đã làm mới toàn bộ dữ liệu trực tiếp từ Supabase Cloud', 'success');

            return { success: true, message: 'Đã tải lại dữ liệu trực tiếp từ Supabase Cloud thành công!' };
        } catch (error) {
            console.error('Error force reloading:', error);
            return { success: false, message: 'Lỗi khi reload dữ liệu' };
        }
    }

    public exportData() {
        try {
            const exportPayload = {
                app: 'H2MilkTea',
                timestamp: new Date().toISOString(),
                version: '2.1.0',
                data: this.demoData
            };

            const dataStr = JSON.stringify(exportPayload, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `h2milktea-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.recordDataActivity('Export JSON Backup', 'Đã xuất toàn bộ dữ liệu hệ thống ra file JSON', 'success');
            return { success: true, message: 'Export dữ liệu JSON thành công!' };
        } catch (error) {
            console.error('Error exporting data:', error);
            return { success: false, message: 'Lỗi khi export dữ liệu' };
        }
    }

    public async importData(file: File) {
        try {
            const fileText = await file.text();
            const parsed = JSON.parse(fileText);
            const rawTables = parsed.data || parsed.tables || parsed.backup?.data || parsed;

            if (!rawTables || typeof rawTables !== 'object') {
                throw new Error('File JSON không đúng định dạng sao lưu của hệ thống');
            }

            const validTables: Record<string, any[]> = {};
            const knownTables = [
                'DSNV', 'DSBAN', 'HOADON', 'HOADONDETAIL', 'DMHH',
                'NGUYENLIEU', 'CAUHINH', 'KHACHHANG', 'KIEMKEKHO', 'NHAPXUATKHO', 'NHACUNGCAP'
            ];

            for (const t of knownTables) {
                if (Array.isArray(rawTables[t])) {
                    validTables[t] = rawTables[t];
                    this.demoData[t] = rawTables[t];
                }
            }

            if (Object.keys(validTables).length === 0) {
                throw new Error('Không tìm thấy bảng dữ liệu hợp lệ nào trong file JSON');
            }

            this.saveDemoData();
            const syncRes = await this.syncTablesToCloud(validTables, true);
            this.recordDataActivity(
                'Import JSON Backup',
                `Đã khôi phục ${Object.keys(validTables).length} bảng dữ liệu lên Supabase Cloud`,
                syncRes.success ? 'success' : 'warning'
            );

            return {
                success: true,
                message: syncRes.success
                    ? `Import và đồng bộ ${Object.keys(validTables).length} bảng dữ liệu lên Supabase Cloud thành công!`
                    : `Đã nạp dữ liệu JSON (${syncRes.message})`,
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return { success: false, message: 'Lỗi khi import dữ liệu: ' + (error as Error).message };
        }
    }

    async autoBackupToGoogleDrive(): Promise<{ success: boolean; message: string }> {
        try {
            if (!GoogleDriveUtils.isSignedIn()) {
                return { success: false, message: 'Chưa đăng nhập Google Drive' };
            }

            if (!GoogleDriveUtils.shouldAutoSync()) {
                return { success: false, message: 'Chưa đến thời gian tự động sync' };
            }

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: this.demoData,
                autoBackup: true
            };

            const result = await GoogleDriveUtils.uploadBackup(backupData);

            if (result.success) {
                await GoogleDriveUtils.deleteOldBackups(10);
                return { success: true, message: 'Tự động backup thành công!' };
            } else {
                return { success: false, message: result.error || 'Lỗi backup' };
            }
        } catch (error) {
            console.error('Auto backup error:', error);
            return { success: false, message: (error as Error).message };
        }
    }

    async manualBackupToGoogleDrive(): Promise<{ success: boolean; message: string }> {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: this.demoData,
                autoBackup: false
            };

            const result = await GoogleDriveUtils.uploadBackup(backupData);

            if (result.success) {
                return { success: true, message: 'Backup lên Google Drive thành công!' };
            } else {
                return { success: false, message: result.error || 'Lỗi backup' };
            }
        } catch (error) {
            console.error('Manual backup error:', error);
            return { success: false, message: (error as Error).message };
        }
    }

    async restoreFromGoogleDrive(fileId: string): Promise<{ success: boolean; message: string }> {
        try {
            const result = await GoogleDriveUtils.downloadBackup(fileId);

            if (result.success && result.data) {
                const tablesPayload = result.data.data || result.data.tables || result.data.backup?.data;
                if (tablesPayload && typeof tablesPayload === 'object') {
                    Object.keys(tablesPayload).forEach((t) => {
                        if (Array.isArray(tablesPayload[t])) {
                            this.demoData[t] = tablesPayload[t];
                        }
                    });
                    this.saveDemoData();
                    await this.syncTablesToCloud(tablesPayload, true);
                    this.recordDataActivity('Khôi phục từ Google Drive', 'Đã đồng bộ bản sao lưu từ Google Drive vào Supabase Cloud', 'success');
                    return { success: true, message: 'Khôi phục từ Google Drive vào Supabase Cloud thành công!' };
                } else {
                    throw new Error('Dữ liệu backup không hợp lệ');
                }
            } else {
                return { success: false, message: result.error || 'Lỗi tải backup' };
            }
        } catch (error) {
            console.error('Restore error:', error);
            return { success: false, message: (error as Error).message };
        }
    }

    public async autoFixHealthIssues(): Promise<{ success: boolean; message: string; fixes?: string[] }> {
        if (!this.isBrowser()) {
            return { success: true, message: 'Đã kiểm tra tính toàn vẹn dữ liệu.' };
        }
        try {
            const res = await fetch('/api/db/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'auto_fix_health' }),
            });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                return { success: false, message: json?.error || 'Không thể thực hiện sửa lỗi tự động' };
            }
            this.recordDataActivity('Tự động sửa lỗi dữ liệu (1-Click Fix)', json.message, 'success');
            return {
                success: true,
                message: json.message,
                fixes: json.fixes || [],
            };
        } catch (err: any) {
            return { success: false, message: 'Lỗi kết nối khi sửa dữ liệu: ' + (err?.message || '') };
        }
    }

    public getBusinessHealthDetails() {
        const products = Array.isArray(this.demoData['DMHH']) ? this.demoData['DMHH'] : [];
        const materials = Array.isArray(this.demoData['NGUYENLIEU']) ? this.demoData['NGUYENLIEU'] : [];
        const configs = Array.isArray(this.demoData['CAUHINH']) ? this.demoData['CAUHINH'] : [];
        const tables = Array.isArray(this.demoData['DSBAN']) ? this.demoData['DSBAN'] : [];
        const invoices = Array.isArray(this.demoData['HOADON']) ? this.demoData['HOADON'] : [];
        const details = Array.isArray(this.demoData['HOADONDETAIL']) ? this.demoData['HOADONDETAIL'] : [];
        const staff = Array.isArray(this.demoData['DSNV']) ? this.demoData['DSNV'] : [];

        const configuredProductIds = new Set(configs.map((c: any) => String(c.IDSP)));
        const validProductIds = new Set(products.map((p: any) => String(p.IDSP)));
        const validMaterialIds = new Set(materials.map((m: any) => String(m.IDNguyenLieu)));
        const validInvoiceIds = new Set(invoices.map((h: any) => String(h.IDHOADON || h.IDHD)));

        const productsWithoutBOM = products.filter((p: any) => !configuredProductIds.has(String(p.IDSP)));
        const orphanConfigs = configs.filter(
            (c: any) => !validProductIds.has(String(c.IDSP)) || !validMaterialIds.has(String(c.IDNguyenLieu))
        );
        const orphanDetails = details.filter((d: any) => !validInvoiceIds.has(String(d.IDHOADON || d.IDHD)));
        const busyTables = tables.filter(
            (t: any) => t.IDBAN !== 'Khách mua về' && t['Trạng thái'] === 'Đang sử dụng'
        );
        const hasTakeawayTable = tables.some((t: any) => t.IDBAN === 'Khách mua về');

        return {
            productsWithoutBOMCount: productsWithoutBOM.length,
            productsWithoutBOMNames: productsWithoutBOM.slice(0, 5).map((p: any) => p['Tên sản phẩm'] || p.IDSP),
            orphanConfigsCount: orphanConfigs.length,
            orphanDetailsCount: orphanDetails.length,
            busyTablesCount: busyTables.length,
            hasTakeawayTable,
            staffCount: staff.length,
            hasRootAdminFallback: Boolean(this.getRootAdminFallback()),
        };
    }

    startAutoBackupCheck() {
        console.log('⚠️ startAutoBackupCheck is deprecated, use GoogleDriveUtils.startAutoBackupTimer() instead');
    }

    public healthCheck() {
        const status = this.getDataStatus();
        const biz = this.getBusinessHealthDetails();
        const issues: string[] = [];
        const warnings: string[] = [];

        if (!status.isInitialized) {
            issues.push('Dữ liệu chưa được khởi tạo');
        }

        if (biz.staffCount === 0 && !biz.hasRootAdminFallback) {
            issues.push('Không tìm thấy tài khoản Nhân viên/Admin nào trên hệ thống');
        }

        if (!biz.hasTakeawayTable && (this.demoData['DSBAN']?.length || 0) > 0) {
            warnings.push('Thiếu bàn mặc định "Khách mua về" cho đơn bán mang đi');
        }

        if (biz.orphanConfigsCount > 0) {
            warnings.push(`Có ${biz.orphanConfigsCount} dòng định mức công thức (CAUHINH) mồ côi không khớp sản phẩm/nguyên liệu`);
        }

        if (biz.orphanDetailsCount > 0) {
            warnings.push(`Có ${biz.orphanDetailsCount} dòng chi tiết hóa đơn (HOADONDETAIL) mồ côi không có hóa đơn gốc`);
        }

        if (biz.productsWithoutBOMCount > 0) {
            warnings.push(
                `Có ${biz.productsWithoutBOMCount} sản phẩm trong Menu chưa được cài công thức định mức BOM (${biz.productsWithoutBOMNames.join(', ')}${biz.productsWithoutBOMCount > 5 ? '...' : ''})`
            );
        }

        return {
            healthy: issues.length === 0,
            status: issues.length === 0 ? 'healthy' : 'error',
            issues,
            warnings,
            details: status,
            businessDetails: biz,
            recommendations: this.getRecommendations(issues, warnings)
        };
    }

    private getRecommendations(issues: string[], warnings: string[]): string[] {
        const recommendations: string[] = [];

        if (warnings.some((w) => w.includes('mồ côi') || w.includes('Khách mua về'))) {
            recommendations.push('Nhấn nút "Tự động sửa lỗi & Dọn dữ liệu mồ côi (1-Click)" để hệ thống làm sạch ngay trên Cloud');
        }

        if (warnings.some((w) => w.includes('công thức định mức BOM'))) {
            recommendations.push('Vào mục Menu & Sản phẩm > Cấu hình nguyên liệu (hoặc Import Excel) để gán công thức trừ kho tự động khi bán');
        }

        recommendations.push('Dữ liệu bảng đã được chuyển hoàn toàn lên Supabase Cloud (LocalStorage chỉ giữ 1 tài khoản Admin gốc dự phòng)');

        return recommendations;
    }

    public getPerformanceMetrics() {
        return {
            memoryUsage: this.calculateMemoryUsage(),
            recordCounts: this.getRecordCounts(),
            cacheSize: this.getCacheSize(),
            lastOperationTime: this.getLastOperationTime()
        };
    }

    private calculateMemoryUsage() {
        try {
            const dataSize = JSON.stringify(this.demoData).length;
            return {
                bytes: dataSize,
                kb: Math.round(dataSize / 1024),
                mb: Math.round(dataSize / 1024 / 1024 * 100) / 100
            };
        } catch {
            return { bytes: 0, kb: 0, mb: 0 };
        }
    }

    private getRecordCounts() {
        const counts: { [key: string]: number } = {};
        const allTables = [
            'DSNV', 'DSBAN', 'DMHH', 'NGUYENLIEU', 'CAUHINH',
            'KHACHHANG', 'NHACUNGCAP', 'NHAPXUATKHO', 'KIEMKEKHO', 'HOADON', 'HOADONDETAIL'
        ];

        allTables.forEach(table => {
            counts[table] = Array.isArray(this.demoData[table]) ? this.demoData[table].length : 0;
        });

        return counts;
    }

    private getCacheSize() {
        if (!this.isClient() || !this.isLocalStorageAvailable()) {
            return { bytes: 0, kb: 0, mb: 0 };
        }

        try {
            const fallbackRaw = localStorage.getItem(ROOT_ADMIN_FALLBACK_KEY) || '';
            const totalSize = fallbackRaw.length;

            return {
                bytes: totalSize,
                kb: Math.round((totalSize / 1024) * 100) / 100,
                mb: Math.round((totalSize / 1024 / 1024) * 1000) / 1000
            };
        } catch {
            return { bytes: 0, kb: 0, mb: 0 };
        }
    }

    private getLastOperationTime() {
        return this.lastSyncedAt;
    }

    public cleanup() {
        this.stopAutoRecoveryCheck();
        this.purgeLegacyLocalStorageData();
    }

    public debug() {
        return {
            isClient: this.isClient(),
            isInitialized: this.isInitialized,
            hasLocalStorage: this.isLocalStorageAvailable(),
            dataKeys: Object.keys(this.demoData),
            healthCheck: this.healthCheck(),
            performance: this.getPerformanceMetrics()
        };
    }
}

const authUtilsInstance = new AuthUtils();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        authUtilsInstance.cleanup();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            authUtilsInstance.cleanup();
        }
    });
}

export default authUtilsInstance;
