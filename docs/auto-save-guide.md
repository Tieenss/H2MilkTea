# Hướng Dẫn Auto-Save JSON System

## Tổng Quan

Hệ thống Auto-Save JSON cho phép lưu trữ dữ liệu trực tiếp vào file JSON trên server với các tính năng:

- ✅ **Auto-save với debounce** (2 giây mặc định)
- ✅ **Manual save** khi cần
- ✅ **Backup tự động** với timestamp
- ✅ **Error handling** đầy đủ
- ✅ **TypeScript support** hoàn chỉnh
- ✅ **Progress indicator** và status tracking
- ✅ **File management** với cleanup tự động

## Cấu Trúc Files

```
src/
├── app/
│   └── api/
│       └── save-json/
│           └── route.ts          # API endpoint
├── hooks/
│   └── useAutoSave.ts            # Custom hook
├── utils/
│   └── jsonFileManager.ts        # File management utility
├── components/
│   └── AutoSaveStatus.tsx        # Status component
└── data/
    ├── *.json                    # Data files
    └── backups/                  # Backup directory
```

## Cách Sử Dụng

### 1. Basic Usage với useAutoSave Hook

```typescript
import { useAutoSave } from '@/hooks/useAutoSave';

function MyComponent() {
  const [data, setData] = useState([]);
  
  const autoSave = useAutoSave('TABLE_NAME', data, {
    delay: 2000, // 2 seconds
    enabled: true,
    onSave: (data, tableName) => {
      console.log(`Saved ${data.length} records to ${tableName}`);
    },
    onError: (error) => {
      console.error('Save error:', error);
    }
  });

  // Auto-save sẽ tự động trigger khi data thay đổi
  const updateData = (newData) => {
    setData(newData); // Auto-save sẽ trigger sau 2 giây
  };

  // Manual save
  const handleManualSave = async () => {
    await autoSave.manualSave();
  };

  return (
    <div>
      {/* Your UI */}
      <button onClick={handleManualSave}>Lưu ngay</button>
    </div>
  );
}
```

### 2. Sử Dụng AutoSaveStatus Component

```typescript
import { AutoSaveStatus } from '@/components/AutoSaveStatus';

function MyComponent() {
  const autoSave = useAutoSave('TABLE_NAME', data);

  return (
    <div>
      <AutoSaveStatus
        isSaving={autoSave.isSaving}
        lastSaved={autoSave.lastSaved}
        error={autoSave.error}
        pendingChanges={autoSave.pendingChanges}
        onManualSave={autoSave.manualSave}
        onLoadData={autoSave.loadData}
        onReset={autoSave.reset}
        tableName="TABLE_NAME"
        recordCount={data.length}
      />
    </div>
  );
}
```

### 3. Compact Version

```typescript
import { AutoSaveStatusCompact } from '@/components/AutoSaveStatus';

function MyComponent() {
  const autoSave = useAutoSave('TABLE_NAME', data);

  return (
    <AutoSaveStatusCompact
      isSaving={autoSave.isSaving}
      lastSaved={autoSave.lastSaved}
      error={autoSave.error}
      pendingChanges={autoSave.pendingChanges}
      onManualSave={autoSave.manualSave}
      tableName="TABLE_NAME"
    />
  );
}
```

## API Endpoints

### POST /api/save-json
Lưu dữ liệu vào file JSON

```typescript
const response = await fetch('/api/save-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableName: 'TABLE_NAME',
    data: yourData,
    backup: false // true để tạo backup
  })
});
```

### GET /api/save-json?table=TABLE_NAME
Đọc dữ liệu từ file JSON

```typescript
const response = await fetch('/api/save-json?table=TABLE_NAME');
const result = await response.json();
```

### GET /api/save-json?action=list
Liệt kê tất cả tables

```typescript
const response = await fetch('/api/save-json?action=list');
const result = await response.json();
```

### GET /api/save-json?action=backups&table=TABLE_NAME
Liệt kê backups của table

```typescript
const response = await fetch('/api/save-json?action=backups&table=TABLE_NAME');
const result = await response.json();
```

## JsonFileManager Utility

### Khởi tạo

```typescript
import { jsonFileManager } from '@/utils/jsonFileManager';

// Tự động khởi tạo khi cần
await jsonFileManager.initialize();
```

### Lưu dữ liệu

```typescript
const result = await jsonFileManager.saveData('TABLE_NAME', data, {
  backup: false,
  compress: false,
  validate: true,
  metadata: {
    type: 'manual'
  }
});
```

### Đọc dữ liệu

```typescript
const data = await jsonFileManager.loadData('TABLE_NAME');
```

### Quản lý backups

```typescript
// Liệt kê backups
const backups = await jsonFileManager.listBackups('TABLE_NAME');

// Restore từ backup
const result = await jsonFileManager.restoreFromBackup('backup-file.json');

// Cleanup old backups
const deletedCount = await jsonFileManager.cleanupOldBackups();
```

## Cấu Hình

### Environment Variables

```env
# Tùy chọn: Cấu hình thư mục data
DATA_DIR=data
BACKUP_DIR=data/backups

# Tùy chọn: Cấu hình cleanup
MAX_BACKUP_AGE=2592000000  # 30 days in milliseconds
```

### Auto-Save Options

```typescript
interface AutoSaveOptions {
  delay?: number;           // Delay trước khi save (ms)
  enabled?: boolean;        // Bật/tắt auto-save
  onSave?: (data, tableName) => void;    // Callback khi save
  onError?: (error) => void;             // Callback khi lỗi
  onSuccess?: (response) => void;        // Callback khi thành công
}
```

## Best Practices

### 1. Error Handling

```typescript
const autoSave = useAutoSave('TABLE_NAME', data, {
  onError: (error) => {
    // Log error
    console.error('Auto-save error:', error);
    
    // Show user notification
    toast.error('Lỗi lưu dữ liệu: ' + error.message);
    
    // Retry logic
    setTimeout(() => {
      autoSave.manualSave();
    }, 5000);
  }
});
```

### 2. Performance Optimization

```typescript
// Sử dụng debounce cho large datasets
const autoSave = useAutoSave('TABLE_NAME', data, {
  delay: 5000, // Tăng delay cho data lớn
});

// Batch updates
const batchUpdate = (updates) => {
  setData(prev => {
    const newData = [...prev];
    updates.forEach(update => {
      const index = newData.findIndex(item => item.id === update.id);
      if (index !== -1) {
        newData[index] = { ...newData[index], ...update };
      }
    });
    return newData;
  });
};
```

### 3. Data Validation

```typescript
// Custom validation
const validateData = (data) => {
  if (!Array.isArray(data)) {
    throw new Error('Data phải là array');
  }
  
  // Check required fields
  data.forEach((item, index) => {
    if (!item.id) {
      throw new Error(`Item ${index} thiếu ID`);
    }
  });
};

const autoSave = useAutoSave('TABLE_NAME', data, {
  onSave: (data, tableName) => {
    validateData(data);
  }
});
```

## Troubleshooting

### Lỗi thường gặp

1. **"File không tồn tại"**
   - Kiểm tra đường dẫn thư mục data
   - Đảm bảo quyền write cho thư mục

2. **"Data quá lớn"**
   - Tăng delay để giảm frequency save
   - Sử dụng compression
   - Chia nhỏ data

3. **"Auto-save không hoạt động"**
   - Kiểm tra enabled flag
   - Kiểm tra data có thay đổi không
   - Kiểm tra console errors

### Debug Mode

```typescript
const autoSave = useAutoSave('TABLE_NAME', data, {
  onSave: (data, tableName) => {
    console.log('🔄 Auto-save triggered:', {
      tableName,
      recordCount: data.length,
      timestamp: new Date().toISOString()
    });
  },
  onError: (error) => {
    console.error('❌ Auto-save error:', error);
  },
  onSuccess: (response) => {
    console.log('✅ Auto-save success:', response);
  }
});
```

## Migration từ localStorage

Nếu bạn đang sử dụng localStorage, có thể migrate dễ dàng:

```typescript
// Load từ localStorage
const localData = localStorage.getItem('myData');
if (localData) {
  const data = JSON.parse(localData);
  
  // Save to JSON file
  const autoSave = useAutoSave('TABLE_NAME', data);
  await autoSave.manualSave();
  
  // Clear localStorage
  localStorage.removeItem('myData');
}
```

## Production Considerations

1. **Backup Strategy**: Tự động backup hàng ngày
2. **Monitoring**: Log tất cả save operations
3. **Error Recovery**: Auto-retry khi lỗi network
4. **Performance**: Monitor file size và optimize
5. **Security**: Validate input data và sanitize

## Demo

Truy cập `/settingdata/auto-save-demo` để test hệ thống với giao diện đầy đủ. 