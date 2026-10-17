# Hướng dẫn Quay lui Hệ thống (ROLLBACK.md)

- **Mục đích**: Cung cấp sổ tay hành động khẩn cấp (Emergency Playbook) để đưa hệ thống về trạng thái an toàn trước đó khi phát sinh sự cố trong quá trình phát triển hoặc triển khai.
- **Nguyên tắc**: *Ưu tiên an toàn dữ liệu, luôn diễn tập trước khi đưa vào thực tế.*

---

## 1. Bảng Thứ tự và Mức độ Quay lui

| Kịch bản | Phạm vi ảnh hưởng | Khi nào áp dụng? | Thứ tự thực hiện |
| :--- | :--- | :--- | :--- |
| **Kịch bản A** | Chỉ Code (Git) | Tính năng mới có lỗi logic, crash UI, lỗi type, không ảnh hưởng schema DB. | 1. Chuyển nhánh / Revert commit code.<br>2. Re-build ứng dụng. |
| **Kịch bản B** | Chỉ Database | Migration mới trên STAGING bị lỗi hoặc sinh dữ liệu sai. | 1. Chạy file `.down.sql` tương ứng.<br>2. Hoặc chạy `npm run db:restore`. |
| **Kịch bản C** | Cả Code và DB | Bản phát hành mới bị lỗi nghiêm trọng cả về schema và logic. | 1. Rollback code trước (về tag phase trước).<br>2. Chạy migration down hoặc restore DB STAGING.<br>3. Kiểm định lại bằng `npm run db:verify`. |
| **Kịch bản D** | Khẩn cấp Production | Production gặp sự cố đe dọa dữ liệu bán lẻ. | 1. Dùng bản dump thủ công của chủ dự án nạp lại database.<br>2. Deploy lại commit ổn định trên nhánh `master`. |
| **Kịch bản E** | Tắt bằng Feature Flag | Tính năng mới chập chờn nhưng không cần deploy lại toàn bộ code. | 1. Đặt biến cờ môi trường sang `false` trên Vercel/local.<br>2. Restart/Re-deploy service. |

---

## 2. Chi tiết các lệnh thực thi cụ thể

### Kịch bản A: Chỉ quay lại Code (Git)
Nếu muốn quay về điểm baseline ban đầu:
```powershell
# Chuyển về nhánh chính an toàn
git checkout master

# Hoặc nếu muốn reset nhánh thí nghiệm về đúng tag baseline
git checkout exp/thesis-perfect
git reset --hard backup/baseline-20261018
```

### Kịch bản B: Chỉ quay lại Database STAGING
1. **Áp dụng file rollback `.down.sql` tương ứng**:
Ví dụ muốn rollback migration `ai_settings`:
```powershell
# Chạy file down tương ứng trên Supabase Dashboard SQL Editor hoặc qua psql
# supabase/rollbacks/202610150003_ai_settings.down.sql
```
2. **Khôi phục từ bản backup đã lưu**:
```powershell
npm run db:restore backups/db/<ten-ban-backup> -- --confirm-ref=<ref-staging>
```

### Kịch bản C: Quay lại cả Code và DB
```powershell
# 1. Reset code về tag gần nhất
git reset --hard exp/phase-0-done

# 2. Khôi phục DB STAGING
npm run db:restore backups/db/<ten-ban-backup> -- --confirm-ref=<ref-staging>

# 3. Kiểm định lại tính toàn vẹn
npm run db:verify backups/db/<ten-ban-backup>
```

### Kịch bản D: Khôi phục khẩn cấp Production
> [!CAUTION]
> Thao tác này **chỉ do Chủ dự án thực hiện thủ công**, agent không tự ý can thiệp.
1. Mở Supabase Dashboard của Production -> Database -> Backups.
2. Hoặc dùng `psql` / `pg_restore` để nạp bản dump thủ công đã lưu ở `D:\Documents\h2milktea-baseline.bundle` / ngoài repo.
3. Chuyển Git về commit production ổn định: `760d2b23`.

### Kịch bản E: Tắt tức thì bằng Cờ tính năng (Feature Flags)
Trong file `.env.local` hoặc trên Dashboard Vercel, chuyển các giá trị cờ:
```env
FEATURE_AI_V2=false
FEATURE_QR_TOKEN=false
FEATURE_SMART_SYNC=false
```
Khởi động lại ứng dụng. Mọi tính năng đang thử nghiệm sẽ tự động ẩn và fallback về chế độ truyền thống mà không làm gián đoạn POS.

---

## 3. Biên bản Diễn tập Sao lưu & Khôi phục STAGING (Phase 0.4 Rehearsal)

- **Thời điểm diễn tập**: 2026-10-18 02:40 (GMT+7)
- **Project STAGING**: `uhnrkyzicqhozwlimvew`
- **Mã bản backup**: `20261017-194019-rehearsal`
- **Thư mục lưu**: `backups/db/20261017-194019-rehearsal/`

### Tiến trình thực nghiệm:
1. **Sao lưu STAGING**: Chạy `npm run db:backup rehearsal`. Kết xuất thành công dữ liệu 8 bảng nghiệp vụ, xuất `record_counts.json`, `manifest.json` và mã băm SHA-256 cho toàn bộ file vào `checksums.json`.
2. **Kiểm định ban đầu**: Chạy `npm run db:verify`, kết quả **KHỚP 100%** (11/11 file hash, 8/8 bảng dữ liệu).
3. **Mô phỏng sai lệch dữ liệu**: Thêm bản ghi `TEST_REHEARSAL` vào bảng `DMHH` (tăng từ 53 lên 54 bản ghi). Chạy lại `npm run db:verify` -> Script phát hiện chính xác lỗi lệch số bản ghi trên `DMHH` và ngắt tiến trình với exit code 1.
4. **Khôi phục từ backup**: Xóa bản ghi test và chạy `npm run db:restore backups/db/20261017-194019-rehearsal -- --confirm-ref=uhnrkyzicqhozwlimvew`. Script xác minh checksums hợp lệ, kiểm tra ref trùng khớp và nạp lại toàn bộ dữ liệu sạch.
5. **Kiểm định sau khôi phục**: Chạy `npm run db:verify`. Kết quả:
   - Toàn bộ 11 file checksum SHA-256: **KHỚP 100%**.
   - Toàn bộ số lượng bản ghi 8 bảng: **KHỚP 100%** (`DMHH: 53`, `DSBAN: 24`, `DSNV: 4`, `HOADON: 9`, `HOADONDETAIL: 25`, `pos_orders: 0`, `pos_cart_drafts: 0`, `app_settings: 2`).

> [!NOTE]
> **Kết luận diễn tập**: Quy trình sao lưu, phát hiện sai lệch và khôi phục dữ liệu trên STAGING hoạt động ổn định, chính xác và an toàn tuyệt đối. Đạt điều kiện thông qua mục 0.4 của hiến pháp.
