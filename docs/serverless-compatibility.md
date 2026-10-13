# Tính Tương Thích Serverless

## Vấn đề

Lỗi `ENOENT: no such file or directory, mkdir '/var/task/data'` xảy ra khi ứng dụng chạy trong môi trường serverless (như Vercel, AWS Lambda, Netlify Functions).

## Nguyên nhân

- Môi trường serverless có hệ thống file hệ thống chỉ đọc
- Không thể tạo thư mục trong `/var/task/` (thư mục gốc của serverless function)
- Thư mục `/tmp` là thư mục duy nhất có thể ghi trong môi trường serverless

## Giải pháp

### 1. Tự động phát hiện môi trường

Hệ thống tự động phát hiện môi trường serverless thông qua:
- `process.env.VERCEL` (Vercel)
- `process.env.AWS_LAMBDA_FUNCTION_NAME` (AWS Lambda)

### 2. Sử dụng thư mục `/tmp`

Trong môi trường serverless:
- Data directory: `/tmp/data`
- Backup directory: `/tmp/data/backups`

### 3. Xử lý lỗi gracefully

- Kiểm tra thư mục trước khi sử dụng
- Bỏ qua các thao tác không khả thi
- Log cảnh báo thay vì crash

## Cấu hình

### Môi trường Development
```bash
# Sử dụng thư mục project
DATA_DIR = ./data
BACKUP_DIR = ./data/backups
```

### Môi trường Production (Serverless)
```bash
# Sử dụng thư mục /tmp
DATA_DIR = /tmp/data
BACKUP_DIR = /tmp/data/backups
```

## Lưu ý

### Hạn chế của Serverless
1. **Dữ liệu tạm thời**: Dữ liệu trong `/tmp` sẽ bị xóa khi function kết thúc
2. **Không có persistence**: Không thể lưu trữ dữ liệu lâu dài
3. **Giới hạn dung lượng**: Thường giới hạn 512MB cho `/tmp`

### Giải pháp thay thế
1. **Database**: Sử dụng database thực (PostgreSQL, MongoDB, etc.)
2. **Cloud Storage**: Sử dụng S3, Google Cloud Storage
3. **Hybrid**: Kết hợp localStorage (client) + API (server)

## Monitoring

Kiểm tra logs để theo dõi:
- Thư mục được sử dụng
- Lỗi tạo thư mục
- Cảnh báo về tính khả dụng

## Troubleshooting

### Lỗi thường gặp
1. **ENOENT**: Thư mục không tồn tại
2. **EACCES**: Không có quyền ghi
3. **ENOSPC**: Hết dung lượng

### Debug
```javascript
console.log('Environment:', {
  isServerless: process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
  dataDir: DATA_DIR,
  backupDir: BACKUP_DIR,
  cwd: process.cwd()
});
``` 