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

class AuthUtils {
    private demoData: { [key: string]: any[] } = {};
    private isInitialized = false;
    private recoveryInterval: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeDemoData();
                    this.startAutoRecoveryCheck();
                });
            } else {
                this.initializeDemoData();
                this.startAutoRecoveryCheck();
            }
        }
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

        return {
            success: true,
            invoices: this.demoData['HOADON'].length,
            details: this.demoData['HOADONDETAIL'].length,
            message: `Đã đồng bộ cơ sở dữ liệu mẫu thành công (${this.demoData['HOADON'].length} hóa đơn, ${this.demoData['HOADONDETAIL'].length} chi tiết món, ${this.demoData['DMHH'].length} sản phẩm, ${this.demoData['NGUYENLIEU'].length} nguyên liệu)!`,
            counts: this.getRecordCounts()
        };
    }

    clearDataExceptDSNV() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể clear data trên client' };

        try {
            const dsnvData = this.demoData['DSNV'] || [...DSNV_DATA];

            this.demoData = {
                'DSNV': dsnvData,
                'DSBAN': [{
                    "_RowNumber": "2",
                    "IDBAN": "Khách mua về",
                    "Tên bàn": "Khách mua về",
                    "Sức chứa tối đa": "1",
                    "Trạng thái": "Đang hoạt động",
                    "Lịch sử  bàn": "INV1750688036060140"
                }],
                'HOADON': [],
                'HOADONDETAIL': [],
                'DMHH': [],
                'NGUYENLIEU': [],
                'CAUHINH': [],
                'KHACHHANG': [],
                'KIEMKEKHO': [],
                'NHAPXUATKHO': [],
                'NHACUNGCAP': []
            };

            this.saveDemoData();
            return { success: true, message: 'Đã xóa dữ liệu hệ thống (giữ nguyên danh sách nhân viên)!' };
        } catch (error) {
            console.error('Error clearing data except DSNV:', error);
            return { success: false, message: 'Lỗi khi xóa dữ liệu' };
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

            const currentBackup = JSON.stringify(this.demoData);
            localStorage.setItem('demoData_excel_import_backup', currentBackup);

            Object.keys(importedData).forEach(tableName => {
                if (tableName !== 'DSNV' || importedData[tableName].length > 0) {
                    this.demoData[tableName] = importedData[tableName];
                }
            });

            this.normalizeAndSyncDemoData();
            this.saveDemoData();
            return { success: true, message: 'Import Excel thành công!' };
        } catch (error) {
            console.error('Error importing Excel:', error);
            try {
                const backup = localStorage.getItem('demoData_excel_import_backup');
                if (backup) {
                    this.demoData = JSON.parse(backup);
                    this.saveDemoData();
                }
            } catch (restoreError) {
                console.error('Error restoring backup:', restoreError);
            }

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
            this.normalizeAndSyncDemoData();
            this.saveDemoData();

            return {
                success: true,
                message: `Import CSV thành công! Đã import ${data.length} bản ghi vào bảng ${this.getTableDisplayName(tableName)}`,
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
        try {
            const backupData = localStorage.getItem('demoData_backup');
            if (backupData) {
                const parsedBackup = JSON.parse(backupData);
                if (this.validateDataIntegrity(parsedBackup)) {
                    this.demoData = parsedBackup;
                    this.normalizeAndSyncDemoData();
                    localStorage.setItem('demoData', JSON.stringify(this.demoData));
                    return true;
                }
            }
        } catch (error) {
            console.error('Không thể khôi phục từ backup:', error);
        }

        this.initializeInMemoryData();
        this.saveDemoData();
        return false;
    }

    public autoRecovery() {
        if (!this.isClient()) return;

        try {
            if (!this.validateDataIntegrity(this.demoData)) {
                const existingData = localStorage.getItem('demoData');
                if (existingData) {
                    const parsedData = JSON.parse(existingData);
                    if (this.validateDataIntegrity(parsedData)) {
                        this.demoData = parsedData;
                        this.normalizeAndSyncDemoData();
                        return;
                    }
                }

                if (this.recoverFromBackup()) {
                    return;
                }

                this.resetDemoData();
            }
        } catch (error) {
            console.error('Lỗi trong quá trình tự động khôi phục:', error);
            this.resetDemoData();
        }
    }

    public startAutoRecoveryCheck() {
        if (!this.isClient()) return;

        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
        }

        this.recoveryInterval = setInterval(() => {
            this.autoRecovery();
        }, 30000);
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
            lastSaved: this.isClient() && this.isLocalStorageAvailable() ? localStorage.getItem('demoData_timestamp') : null,
            totalRecords: Object.values(this.demoData).reduce((sum, table) => sum + (Array.isArray(table) ? table.length : 0), 0)
        };
    }

    private initializeDemoData() {
        if (this.isInitialized) return;

        if (!this.isClient()) {
            this.initializeInMemoryData();
            this.isInitialized = true;
            return;
        }

        try {
            if (!this.isLocalStorageAvailable()) {
                this.initializeInMemoryData();
                this.isInitialized = true;
                return;
            }

            const existingData = localStorage.getItem('demoData');

            if (existingData) {
                const parsedData = JSON.parse(existingData);

                if (this.validateDataIntegrity(parsedData)) {
                    this.demoData = parsedData;
                    this.normalizeAndSyncDemoData();
                    this.saveDemoData();
                } else {
                    this.initializeInMemoryData();
                    this.saveDemoData();
                }
            } else {
                this.initializeInMemoryData();
                this.saveDemoData();
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Lỗi khởi tạo dữ liệu:', error);
            this.initializeInMemoryData();
            this.isInitialized = true;
        }
    }

    private saveDemoData() {
        if (!this.isClient() || !this.isLocalStorageAvailable()) return;

        try {
            const dataToSave = JSON.stringify(this.demoData);

            if (dataToSave.length > 5 * 1024 * 1024) {
                console.warn('Dữ liệu quá lớn, có thể gây lỗi localStorage');
            }

            localStorage.setItem('demoData', dataToSave);
            localStorage.setItem('demoData_backup', dataToSave);
            localStorage.setItem('demoData_timestamp', new Date().toISOString());
        } catch (error) {
            console.error('Lỗi lưu dữ liệu:', error);
            this.recoverFromBackup();
        }
    }

    // Gộp dữ liệu từ Supabase với dữ liệu local mà không làm mất dữ liệu mẫu khi bảng Supabase rỗng
    private mergeSupabaseData(tableName: string, supaData: any[]) {
        if (!Array.isArray(supaData) || supaData.length === 0) return;
        const pk = this.getPrimaryKey(tableName);
        const currentList = Array.isArray(this.demoData[tableName]) ? this.demoData[tableName] : [];

        // Đối với các bảng giao dịch cần dữ liệu mẫu phong phú (HOADON, HOADONDETAIL, KIEMKEKHO, NHAPXUATKHO),
        // gộp theo khóa chính để vừa giữ bản ghi mới trên Supabase vừa giữ bản ghi local/seed
        if (['HOADON', 'HOADONDETAIL', 'KIEMKEKHO', 'NHAPXUATKHO'].includes(tableName)) {
            const map = new Map<string, any>();
            currentList.forEach(item => {
                const id = String(item[pk] || item.IDHD || '');
                if (id) map.set(id, item);
            });
            supaData.forEach(item => {
                const id = String(item[pk] || item.IDHD || '');
                if (id) map.set(id, { ...(map.get(id) || {}), ...item });
            });
            this.demoData[tableName] = Array.from(map.values());
            this.normalizeAndSyncDemoData();
        } else {
            this.demoData[tableName] = supaData.map(item => ({ ...item }));
        }
    }

    async apiRequest(tableName: string, action: string, data: any, select: any = {}) {
        try {
            this.initializeDemoData();
            this.autoRecovery();

            let supabase: any = null;
            try {
                supabase = createClient();
            } catch {
                supabase = null;
            }

            if (supabase && ['getall', 'find', 'get', 'read'].includes(action.toLowerCase())) {
                try {
                    const { data: supaData, error } = await supabase.from(tableName).select('*');
                    if (!error && Array.isArray(supaData) && supaData.length > 0) {
                        this.mergeSupabaseData(tableName, supaData);
                    }
                } catch {
                    // Fallback về in-memory demoData khi offline hoặc bảng chưa có trên Supabase
                }
            }

            const tableData = this.demoData[tableName] || [];

            let result;
            switch (action.toLowerCase()) {
                case 'find':
                case 'get':
                case 'read':
                    result = this.handleFind(tableData, data).map((item: any) => ({ ...item }));
                    break;

                case 'create':
                case 'add':
                case 'insert':
                    result = this.handleCreate(tableName, data);
                    if (supabase && result && result.data) {
                        try {
                            const { error } = await supabase.from(tableName).insert(result.data);
                            if (error) console.warn("Supabase insert warning:", error.message);
                        } catch {
                            // Bỏ qua lỗi Supabase nếu bảng chỉ lưu local
                        }
                    }
                    break;

                case 'update':
                case 'edit':
                case 'modify':
                    result = this.handleUpdate(tableName, data);
                    if (supabase && result && result.data) {
                        const pk = this.getPrimaryKey(tableName);
                        if (pk && result.data[pk]) {
                            try {
                                const { error } = await supabase.from(tableName).update(result.data).eq(pk, result.data[pk]);
                                if (error) console.warn("Supabase update warning:", error.message);
                            } catch {
                                // Ignore
                            }
                        }
                    }
                    break;

                case 'delete':
                case 'remove':
                    result = this.handleDelete(tableName, data);
                    if (supabase && result) {
                        const pk = this.getPrimaryKey(tableName);
                        const targetId = (data && pk && data[pk]) ? data[pk] : data?.id;
                        if (pk && targetId) {
                            try {
                                const { error } = await supabase.from(tableName).delete().eq(pk, targetId);
                                if (error) console.warn("Supabase delete warning:", error.message);
                            } catch {
                                // Ignore
                            }
                        }
                    }
                    break;

                case 'getall':
                default:
                    // Luôn trả về bản sao (clone) của mảng để không bao giờ bị mutate state React trực tiếp
                    result = tableData.map((item: any) => ({ ...item }));
            }

            if (['create', 'add', 'insert', 'update', 'edit', 'modify', 'delete', 'remove'].includes(action.toLowerCase())) {
                this.saveDemoData();
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

        let primaryId = '';
        if (providedId && !isProvidedIdDuplicate) {
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
        const recordId = data[primaryKey] || data.id || (tableName === 'HOADON' ? data.IDHD : undefined);

        if (!recordId) {
            throw new Error('Không tìm thấy ID để cập nhật');
        }

        const recordIndex = tableData.findIndex(item => item[primaryKey] === recordId || (tableName === 'HOADON' && item.IDHD === recordId));

        if (recordIndex === -1) {
            throw new Error('Không tìm thấy bản ghi để cập nhật');
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
        const recordId = data[primaryKey] || data.id || (tableName === 'HOADON' ? data.IDHD : undefined);

        if (!recordId) {
            throw new Error('Không tìm thấy ID để xóa');
        }

        const recordIndex = tableData.findIndex(item => item[primaryKey] === recordId || (tableName === 'HOADON' && item.IDHD === recordId));

        if (recordIndex === -1) {
            throw new Error('Không tìm thấy bản ghi để xóa');
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

            localStorage.setItem(config.AUTH.TOKEN_KEY, token);
            localStorage.setItem(config.AUTH.USER_DATA_KEY, JSON.stringify(userData));
            localStorage.setItem(config.AUTH.TOKEN_EXPIRY_KEY, expiryTime.toISOString());

            const cookieValue = `authToken=${token}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Strict`;
            document.cookie = cookieValue;

            const staffUserCookie = `staffUser=${encodeURIComponent(JSON.stringify({
                username: userData.username || 'staff',
                name: userData['Họ và Tên'] || userData.username || 'Thu ngân',
                role: userData['Vai trò'] || userData['Phân quyền'] || 'Thu ngân',
                email: userData.Email || userData.email || '',
            }))}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Lax`;
            document.cookie = staffUserCookie;
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

            document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'staffUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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
        if (!username || !password) {
            throw new Error('Vui lòng nhập đầy đủ thông tin đăng nhập!');
        }

        const email = username.includes('@') ? username : `${username}@h2.com`;

        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error || !data.user) {
            throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
        }

        let userData = { email: data.user.email, username: username };
        try {
            const { data: dsnvData } = await supabase
                .from('DSNV')
                .select('*')
                .or(`username.eq.${username},Email.eq.${email}`)
                .single();

            if (dsnvData) userData = dsnvData;
        } catch (e) {
            console.error("Could not fetch DSNV data", e);
        }

        const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        (userData as any).auth_session_id = sessionId;
        if (data.user?.id) (userData as any).id = data.user.id;
        if (this.isClient()) {
            localStorage.setItem('h2_session_id', sessionId);
        }

        try {
            if (data.user?.id) {
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: data.user.id,
                        sessionId,
                        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                    }),
                });
            }
        } catch (sessionErr) {
            console.warn('Lỗi đăng ký session duy nhất:', sessionErr);
        }

        this.saveAuthData(userData);
        return userData;
    }

    async logout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        this.clearAuthData();
        return config.ROUTES.LOGIN;
    }

    resetDemoData() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể reset trên client' };

        try {
            this.initializeInMemoryData();
            this.saveDemoData();
            return { success: true, message: 'Đã reset và đồng bộ dữ liệu demo!' };
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
        try {
            const response = await fetch('/api/auth/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: userData.username,
                    password: userData.password
                })
            });

            const result = await response.json();
            if (!response.ok) {
                return { success: false, message: result.error || 'Lỗi khi tạo tài khoản hệ thống' };
            }
        } catch (error) {
            console.error('Lỗi khi gọi API tạo user:', error);
            return { success: false, message: 'Lỗi mạng hoặc server khi tạo tài khoản' };
        }

        return await this.apiRequest('DSNV', 'create', userData);
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
            localStorage.removeItem('demoData');
            localStorage.removeItem('demoData_backup');
            localStorage.removeItem('demoData_timestamp');

            this.demoData = {};
            this.isInitialized = false;

            this.initializeDemoData();

            return { success: true, message: 'Đã xóa cache và khởi tạo lại dữ liệu!' };
        } catch (error) {
            console.error('Error clearing cache:', error);
            return { success: false, message: 'Lỗi khi xóa cache' };
        }
    }

    public forceReload() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể reload trên client' };

        try {
            this.stopAutoRecoveryCheck();
            this.isInitialized = false;
            this.demoData = {};

            this.initializeDemoData();
            this.startAutoRecoveryCheck();

            return { success: true, message: 'Đã reload dữ liệu thành công!' };
        } catch (error) {
            console.error('Error force reloading:', error);
            return { success: false, message: 'Lỗi khi reload dữ liệu' };
        }
    }

    public exportData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: this.demoData
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `demo-data-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return { success: true, message: 'Export dữ liệu thành công!' };
        } catch (error) {
            console.error('Error exporting data:', error);
            return { success: false, message: 'Lỗi khi export dữ liệu' };
        }
    }

    public async importData(file: File) {
        try {
            const fileText = await file.text();
            const importData = JSON.parse(fileText);

            if (!importData.data || !this.validateDataIntegrity(importData.data)) {
                throw new Error('File không đúng định dạng hoặc dữ liệu bị lỗi');
            }

            const currentBackup = JSON.stringify(this.demoData);
            localStorage.setItem('demoData_import_backup', currentBackup);

            this.demoData = importData.data;
            this.normalizeAndSyncDemoData();
            this.saveDemoData();

            return { success: true, message: 'Import dữ liệu thành công!' };
        } catch (error) {
            console.error('Error importing data:', error);

            try {
                const backup = localStorage.getItem('demoData_import_backup');
                if (backup) {
                    this.demoData = JSON.parse(backup);
                    this.saveDemoData();
                }
            } catch (restoreError) {
                console.error('Error restoring backup:', restoreError);
            }

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
                const currentBackup = JSON.stringify(this.demoData);
                localStorage.setItem('demoData_restore_backup', currentBackup);

                if (result.data.data && this.validateDataIntegrity(result.data.data)) {
                    this.demoData = result.data.data;
                    this.normalizeAndSyncDemoData();
                    this.saveDemoData();
                    return { success: true, message: 'Khôi phục từ Google Drive thành công!' };
                } else {
                    throw new Error('Dữ liệu backup không hợp lệ');
                }
            } else {
                return { success: false, message: result.error || 'Lỗi tải backup' };
            }
        } catch (error) {
            console.error('Restore error:', error);

            try {
                const backup = localStorage.getItem('demoData_restore_backup');
                if (backup) {
                    this.demoData = JSON.parse(backup);
                    this.saveDemoData();
                }
            } catch (restoreError) {
                console.error('Error restoring backup:', restoreError);
            }

            return { success: false, message: (error as Error).message };
        }
    }

    startAutoBackupCheck() {
        console.log('⚠️ startAutoBackupCheck is deprecated, use GoogleDriveUtils.startAutoBackupTimer() instead');
    }

    public healthCheck() {
        const status = this.getDataStatus();
        const issues: string[] = [];
        const warnings: string[] = [];

        if (!status.isInitialized) {
            issues.push('Dữ liệu chưa được khởi tạo');
        }

        if (!status.hasLocalStorage) {
            issues.push('LocalStorage không khả dụng');
        }

        if (!status.dataIntegrity) {
            issues.push('Dữ liệu bị hỏng hoặc thiếu');
        }

        if (status.totalRecords === 0) {
            warnings.push('Không có dữ liệu');
        }

        if (status.lastSaved) {
            const lastSaved = new Date(status.lastSaved);
            const now = new Date();
            const diffMinutes = (now.getTime() - lastSaved.getTime()) / (1000 * 60);

            if (diffMinutes > 60) {
                warnings.push(`Dữ liệu chưa được lưu trong ${Math.round(diffMinutes)} phút`);
            }
        }

        return {
            healthy: issues.length === 0,
            status: issues.length === 0 ? 'healthy' : 'error',
            issues,
            warnings,
            details: status,
            recommendations: this.getRecommendations(issues, warnings)
        };
    }

    private getRecommendations(issues: string[], warnings: string[]): string[] {
        const recommendations: string[] = [];

        if (issues.includes('Dữ liệu chưa được khởi tạo')) {
            recommendations.push('Gọi phương thức initializeDemoData() hoặc forceReload()');
        }

        if (issues.includes('LocalStorage không khả dụng')) {
            recommendations.push('Kiểm tra cài đặt trình duyệt hoặc chế độ riêng tư');
        }

        if (issues.includes('Dữ liệu bị hỏng hoặc thiếu')) {
            recommendations.push('Gọi phương thức resetDemoData() hoặc autoRecovery()');
        }

        if (warnings.includes('Không có dữ liệu')) {
            recommendations.push('Import dữ liệu hoặc reset về dữ liệu mặc định');
        }

        if (warnings.some(w => w.includes('chưa được lưu'))) {
            recommendations.push('Kiểm tra kết nối và thực hiện thao tác lưu dữ liệu');
        }

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

        Object.keys(this.demoData).forEach(table => {
            counts[table] = Array.isArray(this.demoData[table]) ? this.demoData[table].length : 0;
        });

        return counts;
    }

    private getCacheSize() {
        if (!this.isClient() || !this.isLocalStorageAvailable()) {
            return { bytes: 0, kb: 0, mb: 0 };
        }

        try {
            const data = localStorage.getItem('demoData') || '';
            const backup = localStorage.getItem('demoData_backup') || '';
            const totalSize = data.length + backup.length;

            return {
                bytes: totalSize,
                kb: Math.round(totalSize / 1024),
                mb: Math.round(totalSize / 1024 / 1024 * 100) / 100
            };
        } catch {
            return { bytes: 0, kb: 0, mb: 0 };
        }
    }

    private getLastOperationTime() {
        if (!this.isClient()) return null;

        try {
            return localStorage.getItem('demoData_timestamp');
        } catch {
            return null;
        }
    }

    public cleanup() {
        this.stopAutoRecoveryCheck();
        if (this.isClient()) {
            this.saveDemoData();
        }
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
