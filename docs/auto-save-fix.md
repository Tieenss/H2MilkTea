# Sửa Lỗi Auto-Save JSON System

## Vấn Đề Đã Gặp

### ❌ Lỗi `fs/promises` Module Not Found

```
Module not found: Can't resolve 'fs/promises'
```

**Nguyên nhân:** Node.js modules không thể sử dụng trực tiếp ở client-side trong Next.js.

## Giải Pháp Đã Áp Dụng

### 1. **Server-Side Only Imports**

```typescript
// Server-side only imports
let fs: any = null;
let path: any = null;

// Only import Node.js modules on server-side
if (typeof window === 'undefined') {
  try {
    const fsModule = require('fs/promises');
    const pathModule = require('path');
    fs = fsModule;
    path = pathModule;
  } catch (error) {
    console.warn('Node.js modules not available:', error);
  }
}
```

### 2. **Client-Safe API Calls**

Thay vì gọi trực tiếp `jsonFileManager`, sử dụng API endpoints:

```typescript
// ❌ Cũ (gây lỗi)
import { jsonFileManager } from '@/utils/jsonFileManager';
await jsonFileManager.saveData('TABLE_NAME', data);

// ✅ Mới (client-safe)
const response = await fetch('/api/save-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableName: 'TABLE_NAME',
    data: data,
    backup: false
  })
});
```

### 3. **Environment Detection**

```typescript
private isServer(): boolean {
  return typeof window === 'undefined' && fs !== null;
}
```

## Cấu Trúc Files Đã Sửa

### 📁 **Server-Side Files:**
- `src/utils/jsonFileManager.ts` - Chỉ hoạt động trên server
- `src/app/api/save-json/route.ts` - API endpoint chính
- `src/app/api/save-json/restore/route.ts` - API restore backup

### 📁 **Client-Side Files:**
- `src/hooks/useAutoSave.ts` - Hook cho client
- `src/utils/autoSaveIntegration.ts` - Client-safe utilities
- `src/components/AutoSaveStatus.tsx` - UI components

## Cách Sử Dụng Sau Khi Sửa

### 1. **Trong Component (Client-Side)**

```typescript
import { useCustomerAutoSave } from '@/utils/autoSaveIntegration';

function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  
  // Auto-save hook (client-safe)
  const autoSave = useCustomerAutoSave(customers);
  
  return (
    <div>
      {/* Your UI */}
      <AutoSaveStatus
        isSaving={autoSave.isSaving}
        lastSaved={autoSave.lastSaved}
        error={autoSave.error}
        pendingChanges={autoSave.pendingChanges}
        onManualSave={autoSave.manualSave}
        tableName="KHACHHANG"
        recordCount={customers.length}
      />
    </div>
  );
}
```

### 2. **Utility Functions (Client-Safe)**

```typescript
import { 
  migrateFromLocalStorage, 
  backupAllData, 
  getDataStatistics 
} from '@/utils/autoSaveIntegration';

// Migrate từ localStorage
const result = await migrateFromLocalStorage();

// Backup tất cả dữ liệu
const backupResult = await backupAllData();

// Lấy thống kê
const stats = await getDataStatistics();
```

### 3. **API Endpoints (Server-Side)**

```typescript
// POST /api/save-json - Lưu dữ liệu
const response = await fetch('/api/save-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableName: 'TABLE_NAME',
    data: yourData,
    backup: false
  })
});

// GET /api/save-json?table=TABLE_NAME - Đọc dữ liệu
const dataResponse = await fetch('/api/save-json?table=TABLE_NAME');

// GET /api/save-json?action=list - Liệt kê tables
const tablesResponse = await fetch('/api/save-json?action=list');
```

## Kiểm Tra Hoạt Động

### 1. **Test Server-Side**

```bash
# Chạy development server
npm run dev

# Kiểm tra API endpoint
curl -X POST http://localhost:3000/api/save-json \
  -H "Content-Type: application/json" \
  -d '{"tableName":"TEST","data":[]}'
```

### 2. **Test Client-Side**

```typescript
// Trong browser console
const testData = [{ id: 1, name: 'Test' }];
const response = await fetch('/api/save-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableName: 'TEST',
    data: testData
  })
});
console.log(await response.json());
```

### 3. **Test Auto-Save Hook**

```typescript
// Trong component
const autoSave = useAutoSave('TEST', data, {
  onSave: (data, tableName) => {
    console.log('✅ Auto-saved:', tableName, data.length);
  },
  onError: (error) => {
    console.error('❌ Auto-save error:', error);
  }
});
```

## Troubleshooting

### 1. **Lỗi "JsonFileManager chỉ hoạt động trên server-side"**

**Nguyên nhân:** Đang gọi server function từ client.

**Giải pháp:** Sử dụng API endpoints thay vì gọi trực tiếp.

```typescript
// ❌ Sai
import { jsonFileManager } from '@/utils/jsonFileManager';
await jsonFileManager.saveData('TABLE', data);

// ✅ Đúng
const response = await fetch('/api/save-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tableName: 'TABLE', data })
});
```

### 2. **Lỗi "Module not found: fs/promises"**

**Nguyên nhân:** Import Node.js modules ở client-side.

**Giải pháp:** Đã sửa bằng conditional imports.

### 3. **Lỗi "Cannot read property 'writeFile' of null"**

**Nguyên nhân:** `fs` module chưa được load.

**Giải pháp:** Kiểm tra `isServer()` trước khi sử dụng.

## Performance Considerations

### 1. **Debounce Optimization**

```typescript
const autoSave = useAutoSave('TABLE', data, {
  delay: 2000, // 2 seconds debounce
  enabled: true
});
```

### 2. **Error Handling**

```typescript
const autoSave = useAutoSave('TABLE', data, {
  onError: (error) => {
    // Retry logic
    setTimeout(() => {
      autoSave.manualSave();
    }, 5000);
  }
});
```

### 3. **Batch Operations**

```typescript
// Sử dụng useMultiTableAutoSave cho nhiều bảng
const multiAutoSave = useMultiTableAutoSave({
  customers: customersData,
  products: productsData
});
```

## Migration Guide

### Từ localStorage sang JSON Files

```typescript
// 1. Sử dụng utility function
const result = await migrateFromLocalStorage();

// 2. Hoặc manual migration
const localData = localStorage.getItem('myData');
if (localData) {
  const data = JSON.parse(localData);
  await fetch('/api/save-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableName: 'MY_TABLE',
      data: data,
      backup: true
    })
  });
  localStorage.removeItem('myData');
}
```

## Production Deployment

### 1. **Environment Variables**

```env
# Tùy chọn: Cấu hình thư mục data
DATA_DIR=data
BACKUP_DIR=data/backups
```

### 2. **File Permissions**

```bash
# Đảm bảo quyền write cho thư mục data
chmod 755 data
chmod 755 data/backups
```

### 3. **Monitoring**

```typescript
// Log tất cả auto-save operations
const autoSave = useAutoSave('TABLE', data, {
  onSave: (data, tableName) => {
    console.log(`[AUTO-SAVE] ${tableName}: ${data.length} records`);
  },
  onError: (error) => {
    console.error(`[AUTO-SAVE ERROR] ${error.message}`);
  }
});
```

## Kết Luận

Hệ thống auto-save JSON đã được sửa để hoạt động đúng cách trong Next.js:

- ✅ **Server-side:** Sử dụng Node.js modules an toàn
- ✅ **Client-side:** Sử dụng API endpoints
- ✅ **Type Safety:** TypeScript support đầy đủ
- ✅ **Error Handling:** Xử lý lỗi tốt
- ✅ **Performance:** Debounce và optimization
- ✅ **Migration:** Dễ dàng chuyển từ localStorage

Bây giờ bạn có thể sử dụng hệ thống auto-save mà không gặp lỗi `fs/promises` nữa! 