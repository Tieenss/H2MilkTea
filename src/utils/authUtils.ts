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
    // Mock data storage - chỉ khởi tạo khi cần
    private demoData: { [key: string]: any[] } = {};
    private isInitialized = false;
    private recoveryInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Khởi tạo tự động khi tạo instance
        if (typeof window !== 'undefined') {
            // Đợi DOM load xong
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

    // Kiểm tra môi trường client-side
    private isClient() {
        return typeof window !== 'undefined';
    }

    // Kiểm tra localStorage có khả dụng không
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

    // Khởi tạo dữ liệu trong bộ nhớ
    private initializeInMemoryData() {
        this.demoData = {
            'DSNV': [...DSNV_DATA],
            'DSBAN': [...DSBAN_DATA],
            'HOADON': [...HOADON_DATA],
            'HOADONDETAIL': [...HOADONDETAIL_DATA],
            'DMHH': [...DMHH_DATA],
            'NGUYENLIEU': [...NGUYENLIEU_DATA],
            'CAUHINH': [...CAUHINH_DATA],
            'KHACHHANG': [...KHACHHANG_DATA],
            'KIEMKEKHO': [...KIEMKEKHO_DATA],
            'NHAPXUATKHO': [...NHAPXUATKHO_DATA],
            'NHACUNGCAP': [...NHACUNGCAP_DATA]
        };
    }
   clearDataExceptDSNV() {
    if (!this.isClient()) return { success: false, message: 'Chỉ có thể clear data trên client' };

    try {
        // Backup DSNV data
        const dsnvData = this.demoData['DSNV'] || [...DSNV_DATA];

        // Clear all data except DSNV
        this.demoData = {
            'DSNV': dsnvData, // Giữ nguyên DSNV
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

            // Add each table as a worksheet
            Object.keys(this.demoData).forEach(tableName => {
                const tableData = this.demoData[tableName];
                if (Array.isArray(tableData) && tableData.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(tableData);
                    XLSX.utils.book_append_sheet(workbook, worksheet, this.getTableDisplayName(tableName));
                }
            });

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Download file
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
// Thêm các utility methods cho KHACHHANG
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
    // Export CSV
    exportToCSV(tableName?: string) {
        try {
            if (tableName) {
                // Export single table
                const tableData = this.demoData[tableName];
                if (!Array.isArray(tableData) || tableData.length === 0) {
                    throw new Error('Bảng không có dữ liệu');
                }

                const csv = this.convertToCSV(tableData);
                this.downloadCSV(csv, `${this.getTableDisplayName(tableName)}-${new Date().toISOString().split('T')[0]}.csv`);
            } else {
                // Export all tables
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

    // Import Excel
    async importFromExcel(file: File) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            const importedData: { [key: string]: any[] } = {};
            const tableNameMap = this.getTableNameMap();

            // Process each worksheet
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Find corresponding table name
                const tableName = Object.keys(tableNameMap).find(key =>
                    tableNameMap[key] === sheetName
                ) || sheetName;

                if (this.demoData.hasOwnProperty(tableName)) {
                    importedData[tableName] = jsonData;
                }
            });

            // Validate and import data
            if (Object.keys(importedData).length === 0) {
                throw new Error('Không tìm thấy dữ liệu hợp lệ trong file Excel');
            }

            // Backup current data
            const currentBackup = JSON.stringify(this.demoData);
            localStorage.setItem('demoData_excel_import_backup', currentBackup);

            // Import data (keep DSNV if not provided)
            Object.keys(importedData).forEach(tableName => {
                if (tableName !== 'DSNV' || importedData[tableName].length > 0) {
                    this.demoData[tableName] = importedData[tableName];
                }
            });

            this.saveDemoData();
            return { success: true, message: 'Import Excel thành công!' };

        } catch (error) {
            console.error('Error importing Excel:', error);

            // Restore backup if error
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

    // Import CSV
    async importFromCSV(file: File, tableName: string) {
        try {
            const text = await file.text();
            const rows = text.split('\n').filter(row => row.trim());

            if (rows.length < 2) {
                throw new Error('File CSV phải có ít nhất 2 dòng (header + data)');
            }

            // Parse CSV
            const headers = this.parseCSVRow(rows[0]);
            const data = rows.slice(1).map((row, index) => {
                const values = this.parseCSVRow(row);
                const rowData: any = {};

                headers.forEach((header, i) => {
                    rowData[header] = values[i] || '';
                });

                // Add row number if not exists
                if (!rowData._RowNumber) {
                    rowData._RowNumber = (index + 1).toString();
                }

                return rowData;
            }).filter(row => Object.values(row).some(value => value !== ''));

            if (data.length === 0) {
                throw new Error('Không có dữ liệu hợp lệ trong file CSV');
            }

            // Backup current table data
            const currentTableData = [...(this.demoData[tableName] || [])];

            // Import data
            this.demoData[tableName] = data;
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

    // Helper methods
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
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
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
                    i++; // Skip next quote
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
    // Kiểm tra tính toàn vẹn của dữ liệu
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

    // Khôi phục từ backup
    private recoverFromBackup(): boolean {
        try {
            const backupData = localStorage.getItem('demoData_backup');
            if (backupData) {
                const parsedBackup = JSON.parse(backupData);
                if (this.validateDataIntegrity(parsedBackup)) {
                    this.demoData = parsedBackup;
                    localStorage.setItem('demoData', backupData);
                    console.log('Đã khôi phục từ backup');
                    return true;
                }
            }
        } catch (error) {
            console.error('Không thể khôi phục từ backup:', error);
        }

        // Nếu backup cũng lỗi, khôi phục từ dữ liệu gốc
        this.initializeInMemoryData();
        this.saveDemoData();
        return false;
    }

    // Tự động khôi phục
    public autoRecovery() {
        if (!this.isClient()) return;

        try {
            // Kiểm tra dữ liệu hiện tại
            if (!this.validateDataIntegrity(this.demoData)) {
                console.warn('Phát hiện dữ liệu bị lỗi, bắt đầu khôi phục...');

                // Thử khôi phục từ localStorage
                const existingData = localStorage.getItem('demoData');
                if (existingData) {
                    const parsedData = JSON.parse(existingData);
                    if (this.validateDataIntegrity(parsedData)) {
                        this.demoData = parsedData;
                        console.log('Đã khôi phục từ localStorage');
                        return;
                    }
                }

                // Thử khôi phục từ backup
                if (this.recoverFromBackup()) {
                    return;
                }

                // Cuối cùng reset về dữ liệu gốc
                console.log('Khôi phục về dữ liệu gốc');
                this.resetDemoData();
            }
        } catch (error) {
            console.error('Lỗi trong quá trình tự động khôi phục:', error);
            this.resetDemoData();
        }
    }

    // Kiểm tra và khôi phục định kỳ
    public startAutoRecoveryCheck() {
        if (!this.isClient()) return;

        // Dọn dẹp interval cũ nếu có
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
        }

        // Chạy kiểm tra mỗi 30 giây
        this.recoveryInterval = setInterval(() => {
            this.autoRecovery();
        }, 30000);
    }

    // Dừng kiểm tra tự động
    public stopAutoRecoveryCheck() {
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
        }
    }

    // Kiểm tra trạng thái dữ liệu
    public getDataStatus() {
        return {
            isInitialized: this.isInitialized,
            hasLocalStorage: this.isLocalStorageAvailable(),
            dataIntegrity: this.validateDataIntegrity(this.demoData),
            lastSaved: localStorage.getItem('demoData_timestamp'),
            totalRecords: Object.values(this.demoData).reduce((sum, table) => sum + (Array.isArray(table) ? table.length : 0), 0)
        };
    }

    private initializeDemoData() {
        if (!this.isClient() || this.isInitialized) return;

        try {
            // Kiểm tra localStorage có khả dụng không
            if (!this.isLocalStorageAvailable()) {
                this.initializeInMemoryData();
                this.isInitialized = true;
                return;
            }

            const existingData = localStorage.getItem('demoData');

            if (existingData) {
                const parsedData = JSON.parse(existingData);

                // Kiểm tra tính toàn vẹn của dữ liệu
                if (this.validateDataIntegrity(parsedData)) {
                    this.demoData = parsedData;
                } else {
                    console.warn('Dữ liệu bị hỏng, khôi phục từ dữ liệu gốc');
                    this.initializeInMemoryData();
                    this.saveDemoData(); // Lưu lại dữ liệu gốc
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

            // Kiểm tra kích thước dữ liệu
            if (dataToSave.length > 5 * 1024 * 1024) { // 5MB limit
                console.warn('Dữ liệu quá lớn, có thể gây lỗi localStorage');
            }

            localStorage.setItem('demoData', dataToSave);

            // Tạo backup
            localStorage.setItem('demoData_backup', dataToSave);
            localStorage.setItem('demoData_timestamp', new Date().toISOString());

        } catch (error) {
            console.error('Lỗi lưu dữ liệu:', error);

            // Thử khôi phục từ backup
            this.recoverFromBackup();
        }
    }

    async apiRequest(tableName: string, action: string, data: any, select: any = {}) {
        try {
            // Đảm bảo demo data được khởi tạo và kiểm tra tính toàn vẹn
            this.initializeDemoData();
            this.autoRecovery();

            const supabase = createClient();

            // Lấy dữ liệu mới nhất từ Supabase nếu là hành động đọc
            if (['getall', 'find', 'get', 'read'].includes(action.toLowerCase())) {
                const { data: supaData, error } = await supabase.from(tableName).select('*');
                if (!error && supaData) {
                    this.demoData[tableName] = supaData;
                }
            }

            const tableData = this.demoData[tableName] || [];

            let result;
            switch (action.toLowerCase()) {
                case 'find':
                case 'get':
                case 'read':
                    result = this.handleFind(tableData, data);
                    break;

                case 'create':
                case 'add':
                case 'insert':
                    result = this.handleCreate(tableName, data);
                    if (result && result.data) {
                        const { error } = await supabase.from(tableName).insert(result.data);
                        if (error) console.error("Supabase insert error:", error);
                    }
                    break;

                case 'update':
                case 'edit':
                case 'modify':
                    result = this.handleUpdate(tableName, data);
                    if (result && result.data) {
                        const pk = this.getPrimaryKey(tableName);
                        if (pk && result.data[pk]) {
                            const { error } = await supabase.from(tableName).update(result.data).eq(pk, result.data[pk]);
                            if (error) console.error("Supabase update error:", error);
                        }
                    }
                    break;

                case 'delete':
                case 'remove':
                    result = this.handleDelete(tableName, data);
                    if (result) {
                        const pk = this.getPrimaryKey(tableName);
                        if (pk && data && data[pk]) {
                            const { error } = await supabase.from(tableName).delete().eq(pk, data[pk]);
                            if (error) console.error("Supabase delete error:", error);
                        } else if (pk && data && data.id) {
                             const { error } = await supabase.from(tableName).delete().eq(pk, data.id);
                             if (error) console.error("Supabase delete error:", error);
                        }
                    }
                    break;

                case 'getall':
                default:
                    result = tableData;
            }

            // Lưu dữ liệu sau mỗi thao tác thay đổi
            if (['create', 'add', 'insert', 'update', 'edit', 'modify', 'delete', 'remove'].includes(action.toLowerCase())) {
                this.saveDemoData();
            }

            return result;
        } catch (error) {
            console.error('Demo API request failed:', error);

            // Thử khôi phục và thực hiện lại
            this.autoRecovery();
            throw error;
        }
    }

    // FIND/READ - Tìm kiếm và lọc dữ liệu
    private handleFind(tableData: any[], data: any) {
        let result = [...tableData];

        if (data.Properties && data.Properties.Selector) {
            const selector = data.Properties.Selector;
            result = this.parseSelector(result, selector);
        }

        // Filter by specific fields
        if (data.filter) {
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

        // Filter by ID
        if (data.id) {
            result = result.filter(item =>
                Object.values(item).some(val =>
                    val?.toString().toLowerCase().includes(data.id.toLowerCase())
                )
            );
        }

        return result;
    }

    // CREATE/ADD - Thêm mới
    private handleCreate(tableName: string, data: any) {
        const tableData = this.demoData[tableName] || [];

        // Tạo ID mới
        const newRowNumber = Math.max(...tableData.map(item => parseInt(item._RowNumber) || 0)) + 1;

        // Tạo ID chính dựa trên table
        let primaryId = '';
        switch (tableName) {
            case 'DSNV':
                primaryId = `NV${Date.now()}`;
                break;
            case 'DSBAN':
                primaryId = `BAN${String(newRowNumber).padStart(3, '0')}`;
                break;
            case 'HOADON':
                primaryId = `INV${Date.now()}`;
                break;
            case 'HOADONDETAIL':
                primaryId = `${data.IDHOADON}_${data.IDSP}`;
                break;
            case 'DMHH':
                primaryId = `SP${String(newRowNumber).padStart(3, '0')}`;
                break;
            case 'NGUYENLIEU':
                primaryId = `NVL${String(newRowNumber).padStart(3, '0')}`;
                break;
            case 'CAUHINH':
                primaryId = `CFG${String(newRowNumber).padStart(3, '0')}`;
                break;
            default:
                primaryId = `ID${Date.now()}`;
        }

        const newRecord = {
            _RowNumber: newRowNumber.toString(),
            ...this.getPrimaryIdField(tableName, primaryId),
            ...data,
            ...(tableName === 'HOADON' || tableName === 'CAUHINH' ? {
                'Ngày tạo': new Date().toLocaleString('vi-VN'),
                'Ngày cập nhật': new Date().toLocaleString('vi-VN')
            } : {})
        };

        tableData.push(newRecord);
        this.demoData[tableName] = tableData;

        return { success: true, data: newRecord, message: 'Thêm mới thành công!' };
    }

    // UPDATE/EDIT - Cập nhật
    private handleUpdate(tableName: string, data: any) {
        const tableData = this.demoData[tableName] || [];
        const primaryKey = this.getPrimaryKey(tableName);
        const recordId = data[primaryKey] || data.id;

        if (!recordId) {
            throw new Error('Không tìm thấy ID để cập nhật');
        }

        const recordIndex = tableData.findIndex(item => item[primaryKey] === recordId);

        if (recordIndex === -1) {
            throw new Error('Không tìm thấy bản ghi để cập nhật');
        }

        // Cập nhật dữ liệu
        const updatedRecord = {
            ...tableData[recordIndex],
            ...data,
            ...(tableName === 'HOADON' || tableName === 'CAUHINH' ? {
                'Ngày cập nhật': new Date().toLocaleString('vi-VN')
            } : {})
        };

        tableData[recordIndex] = updatedRecord;
        this.demoData[tableName] = tableData;

        return { success: true, data: updatedRecord, message: 'Cập nhật thành công!' };
    }

    // DELETE - Xóa
    private handleDelete(tableName: string, data: any) {
        const tableData = this.demoData[tableName] || [];
        const primaryKey = this.getPrimaryKey(tableName);
        const recordId = data[primaryKey] || data.id;

        if (!recordId) {
            throw new Error('Không tìm thấy ID để xóa');
        }

        const recordIndex = tableData.findIndex(item => item[primaryKey] === recordId);

        if (recordIndex === -1) {
            throw new Error('Không tìm thấy bản ghi để xóa');
        }

        const deletedRecord = tableData.splice(recordIndex, 1)[0];
        this.demoData[tableName] = tableData;

        return { success: true, data: deletedRecord, message: 'Xóa thành công!' };
    }

    // Utilities
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
    
    // Tạo ID cho bảng KHACHHANG
    if (tableName === 'KHACHHANG') {
        const newRowNumber = Math.max(...(this.demoData[tableName] || []).map(item => parseInt(item._RowNumber) || 0)) + 1;
        return { [primaryKey]: `KH${String(newRowNumber).padStart(3, '0')}` };
    }
    
    return { [primaryKey]: id };
}

    private parseSelector(data: any[], selector: string): any[] {
        try {
            // Parse Filter conditions
            if (selector.includes('Filter(')) {
                // Multiple conditions with 'and'
                const andMatch = selector.match(/Filter\([^,]+,\s*and\(\s*\[([^\]]+)\]\s*=\s*"([^"]+)"\s*,\s*\[([^\]]+)\]\s*=\s*"([^"]+)"\s*\)\)/);
                if (andMatch) {
                    const [, field1, value1, field2, value2] = andMatch;
                    return data.filter(item =>
                        item[field1] === value1 && item[field2] === value2
                    );
                }

                // Single condition
                const singleMatch = selector.match(/Filter\([^,]+,\s*\[([^\]]+)\]\s*=\s*"([^"]+)"\)/);
                if (singleMatch) {
                    const [, field, value] = singleMatch;
                    return data.filter(item => item[field] === value);
                }

                // Contains condition
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

    // Auth methods với client-side check
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

            // Lưu vào localStorage
            localStorage.setItem(config.AUTH.TOKEN_KEY, token);
            localStorage.setItem(config.AUTH.USER_DATA_KEY, JSON.stringify(userData));
            localStorage.setItem(config.AUTH.TOKEN_EXPIRY_KEY, expiryTime.toISOString());

            // Lưu vào cookie với các options đầy đủ
            const cookieValue = `authToken=${token}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Strict`;
            document.cookie = cookieValue;

            // Lưu thêm cookie thông tin nhân viên cho các API route phía server
            const staffUserCookie = `staffUser=${encodeURIComponent(JSON.stringify({
                username: userData.username || 'staff',
                name: userData['Họ và Tên'] || userData.username || 'Thu ngân',
                role: userData['Vai trò'] || userData['Phân quyền'] || 'Thu ngân',
                email: userData.Email || userData.email || '',
            }))}; expires=${expiryTime.toUTCString()}; path=/; SameSite=Lax`;
            document.cookie = staffUserCookie;

            console.log('Auth data saved successfully');
        } catch (error) {
            console.error('Error saving auth data:', error);
        }
    }

    clearAuthData() {
        if (!this.isClient()) return;

        try {
            // Xóa localStorage
            localStorage.removeItem(config.AUTH.TOKEN_KEY);
            localStorage.removeItem(config.AUTH.USER_DATA_KEY);
            localStorage.removeItem(config.AUTH.TOKEN_EXPIRY_KEY);
            localStorage.removeItem('returnUrl');
            localStorage.removeItem('h2_session_id');

            // Xóa cookie
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

        // Tự động thêm đuôi email nếu người dùng nhập username
        const email = username.includes('@') ? username : `${username}@h2.com`;

        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error || !data.user) {
            throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
        }

        // Lấy thông tin nhân viên từ bảng DSNV bằng cách tìm username hoặc Email
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

                // Tạo sessionId duy nhất cho phiên đăng nhập này
        const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        (userData as any).auth_session_id = sessionId;
        if (data.user?.id) (userData as any).id = data.user.id;
        if (this.isClient()) {
            localStorage.setItem('h2_session_id', sessionId);
        }

        // Đăng ký phiên duy nhất với máy chủ để đá các thiết bị trước đó
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

    // Reset demo data về trạng thái ban đầu
    resetDemoData() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể reset trên client' };

        try {
            this.demoData = {
                'DSNV': [...DSNV_DATA],
                'DSBAN': [...DSBAN_DATA],
                'HOADON': [...HOADON_DATA],
                'HOADONDETAIL': [...HOADONDETAIL_DATA],
                'DMHH': [...DMHH_DATA],
                'NGUYENLIEU': [...NGUYENLIEU_DATA],
                'CAUHINH': [...CAUHINH_DATA]
            };
            this.saveDemoData();
            return { success: true, message: 'Đã reset dữ liệu demo!' };
        } catch (error) {
            console.error('Error resetting demo data:', error);
            return { success: false, message: 'Lỗi khi reset dữ liệu' };
        }
    }

    // Utility methods cho nguyên liệu
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

    // Utility methods cho cấu hình
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

    // Utility methods cho chi tiết hóa đơn
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

    // Các phương thức tiện ích cho từng bảng
    async getAllNhanVien() {
        return await this.apiRequest('DSNV', 'getall', {});
    }

    async getNhanVienById(username: string) {
        return await this.apiRequest('DSNV', 'find', { filter: { username } });
    }

    async addNhanVien(userData: any) {
        try {
            // Gọi API tạo Auth User trước
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

        // Sau khi tạo Auth User thành công thì mới insert vào DSNV
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

    // Utility methods cho inventory data
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

    // Upload image methods
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

    // Thêm các phương thức quản lý bộ nhớ đệm nâng cao
    public clearCache() {
        if (!this.isClient()) return { success: false, message: 'Chỉ có thể xóa cache trên client' };

        try {
            // Xóa tất cả dữ liệu liên quan
            localStorage.removeItem('demoData');
            localStorage.removeItem('demoData_backup');
            localStorage.removeItem('demoData_timestamp');

            // Reset dữ liệu trong bộ nhớ
            this.demoData = {};
            this.isInitialized = false;

            // Khởi tạo lại
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
            // Dừng auto recovery
            this.stopAutoRecoveryCheck();

            // Reset trạng thái
            this.isInitialized = false;
            this.demoData = {};

            // Khởi tạo lại từ đầu
            this.initializeDemoData();
            this.startAutoRecoveryCheck();

            return { success: true, message: 'Đã reload dữ liệu thành công!' };
        } catch (error) {
            console.error('Error force reloading:', error);
            return { success: false, message: 'Lỗi khi reload dữ liệu' };
        }
    }

    // Phương thức export/import dữ liệu
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

            // Tạo link download
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

            // Kiểm tra format
            if (!importData.data || !this.validateDataIntegrity(importData.data)) {
                throw new Error('File không đúng định dạng hoặc dữ liệu bị lỗi');
            }

            // Backup dữ liệu hiện tại trước khi import
            const currentBackup = JSON.stringify(this.demoData);
            localStorage.setItem('demoData_import_backup', currentBackup);

            // Import dữ liệu mới
            this.demoData = importData.data;
            this.saveDemoData();

            return { success: true, message: 'Import dữ liệu thành công!' };
        } catch (error) {
            console.error('Error importing data:', error);

            // Khôi phục dữ liệu cũ nếu có lỗi
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
        // Xóa backup cũ (giữ lại 10 file gần nhất)
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

  // Method backup thủ công
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

  // Khôi phục từ Google Drive
  async restoreFromGoogleDrive(fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await GoogleDriveUtils.downloadBackup(fileId);
      
      if (result.success && result.data) {
        // Backup dữ liệu hiện tại
        const currentBackup = JSON.stringify(this.demoData);
        localStorage.setItem('demoData_restore_backup', currentBackup);

        // Khôi phục dữ liệu
        if (result.data.data && this.validateDataIntegrity(result.data.data)) {
          this.demoData = result.data.data;
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
      
      // Khôi phục dữ liệu cũ nếu có lỗi
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

  // Legacy method - đã được thay thế bởi GoogleDriveUtils.startAutoBackupTimer()
  startAutoBackupCheck() {
    console.log('⚠️ startAutoBackupCheck is deprecated, use GoogleDriveUtils.startAutoBackupTimer() instead');
    // Method này đã không được sử dụng nữa
    // Auto backup được quản lý bởi GoogleDriveUtils
  }
    // Phương thức kiểm tra sức khỏe hệ thống
    public healthCheck() {
        const status = this.getDataStatus();
        const issues: string[] = [];
        const warnings: string[] = [];

        // Kiểm tra các vấn đề nghiêm trọng
        if (!status.isInitialized) {
            issues.push('Dữ liệu chưa được khởi tạo');
        }

        if (!status.hasLocalStorage) {
            issues.push('LocalStorage không khả dụng');
        }

        if (!status.dataIntegrity) {
            issues.push('Dữ liệu bị hỏng hoặc thiếu');
        }

        // Kiểm tra các cảnh báo
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

    // Phương thức theo dõi hiệu suất
    public getPerformanceMetrics() {
        const metrics = {
            memoryUsage: this.calculateMemoryUsage(),
            recordCounts: this.getRecordCounts(),
            cacheSize: this.getCacheSize(),
            lastOperationTime: this.getLastOperationTime()
        };

        return metrics;
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

    // Cleanup khi component unmount
    public cleanup() {
        this.stopAutoRecoveryCheck();

        // Có thể thêm các cleanup khác nếu cần
        if (this.isClient()) {
            // Lưu dữ liệu cuối cùng
            this.saveDemoData();
        }
    }

    // Phương thức debug
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

// Tạo và export instance duy nhất
const authUtilsInstance = new AuthUtils();

// Cleanup khi trang đóng (nếu có thể)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        authUtilsInstance.cleanup();
    });

    // Cleanup khi trang ẩn
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            authUtilsInstance.cleanup();
        }
    });
}

export default authUtilsInstance;