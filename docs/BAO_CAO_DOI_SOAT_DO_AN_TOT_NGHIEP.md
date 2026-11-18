# 🎓 BÁO CÁO ĐỐI SOÁT KỸ THUẬT, DỮ LIỆU & NGHIỆP VỤ PHỤC VỤ ĐỒ ÁN TỐT NGHIỆP (H2MilkTea ERP & POS)

- **Tên đề tài / Hệ thống:** Hệ thống Quản lý Vận hành, Bán hàng POS, Đặt món QR và Trợ lý AI Đa tác tử kết hợp Hybrid RAG cho Chuỗi Trà sữa & Cà phê **H2MilkTea**
- **Sinh viên thực hiện:** Trần Văn Tiến (`74DCHT22275`)
- **Ngày đối soát & chuẩn hóa mã nguồn:** `18/11/2026`
- **Mục đích tài liệu:** Tài liệu này là **Nguồn Sự Thật Duy Nhất (Single Source of Truth)** đối chiếu giữa mã nguồn thực tế sau khi chuẩn hóa 4 giai đoạn và nội dung lý thuyết/thực nghiệm cần ghi trong cuốn **Báo cáo Đồ án Tốt nghiệp** (`DoAnTotNghiep_Ban_Dap_An_Hoan_Chinh_TranVanTien.docx`). Khi dùng AI Agent viết hoặc chỉnh sửa báo cáo `.docx`, hãy đính kèm tài liệu này để đảm bảo không sai lệch bất kỳ tên bảng, công thức, luồng dữ liệu hay con số kiểm thử nào.

---

## 1. Kiến trúc Lưu trữ Dữ liệu Thực tế & Quy hoạch Bộ File JSON Dự phòng

### 1.1. Tách biệt 100% Luồng Vận hành Thực tế (Supabase Cloud DB) và Kho Backup Mẫu (`src/data/*.json`)
Trong kiến trúc đã chuẩn hóa của **H2MilkTea**:
1. **Tầng Cơ sở dữ liệu Vận hành (Primary Database - Supabase PostgreSQL):**
   - Toàn bộ các phân hệ nghiệp vụ (`/pos`, `/order`, `/kitchen`, `/orders`, `/menu/*`, `/inventory/*`, `/khachhang`, `/nhanvien`, `/reports/*`, và Trợ lý AI `GlobalAssistant`) đều truy xuất và ghi dữ liệu trực tiếp qua tầng API thống nhất `/api/db`, `/api/pos/checkout`, `/api/orders` kết nối tới **Supabase PostgreSQL**.
   - Đã **loại bỏ hoàn toàn** các lệnh `fetch('/data/*.json')` hoặc đọc mảng JSON tĩnh trực tiếp trong luồng tính toán tồn kho BOM (`useProductMaterialInventory.ts`) và Trợ lý AI (`GlobalAssistant.tsx`).
2. **Tầng Kho Dữ liệu Mẫu & Dự phòng Nội bộ (`src/data/*.json` - Golden Seed & Offline Backup):**
   - Lý do tồn tại của 11 file JSON trong thư mục `src/data/` (`DSNV.json`, `DSBAN.json`, `DMHH.json`, `NGUYENLIEU.json`, `CAUHINH.json`, `HOADON.json`, `HOADONDETAIL.json`, `KHACHHANG.json`, `NHAPXUATKHO.json`, `KIEMKEKHO.json`, `NHACUNGCAP.json`) là đóng vai trò **Kho Sao lưu Dữ liệu Mẫu Gốc (Seed & Disaster Recovery Bundle)**.
   - Chỉ được kích hoạt khi Quản trị viên (Admin) chủ động bấm nút **"🔄 Đồng bộ dữ liệu mẫu 60 ngày"** hoặc **"📦 Khôi phục Dữ liệu Mẫu Gốc lên Cloud DB"** tại phân hệ Quản trị dữ liệu (`/settingdata`).
3. **Tầng Sao lưu Đám mây Cá nhân (Google Drive OAuth2 Cloud Sync):**
   - Sử dụng **Google Identity Services (GIS)** kết hợp Google Drive REST API v3 để lưu trữ các bản chụp (snapshot) JSON định kỳ vào thư mục `H2MilkTea_Backups` trên Google Drive của chủ quán.
   - Cơ chế tự động khởi tạo lại (`re-initialize`) `tokenClient` khi thay đổi `Google Client ID`, đi kèm hộp công cụ hỗ trợ sao chép nhanh `Authorized JavaScript origin` (`window.location.origin`) và bắt lỗi OAuth2 chi tiết bằng tiếng Việt.

### 1.2. Danh mục 11 Bảng Nghiệp vụ Cốt lõi & Khóa chính (Primary Keys)

| STT | Tên bảng vật lý | Tên nghiệp vụ trong Báo cáo | Khóa chính (PK) | Vai trò & Đặc điểm kỹ thuật cần ghi trong Đồ án |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `DSNV` | Danh sách Nhân viên & Phân quyền | `username` | Lưu thông tin nhân sự, vai trò RBAC (`Admin`, `Quản lý`, `Thu ngân`, `Pha chế`, `Nhân viên`) và danh sách `Quyền View` theo từng phân hệ. API `/api/db` tự động ẩn cột `password` khi trả dữ liệu. |
| 2 | `DSBAN` | Danh sách Bàn & Khu vực QR | `IDBAN` | Chia theo 4 khu vực chuẩn (`Khu vực Quầy`, `Khu vực Phòng hát`, `Khu vực Vườn`, `Khu vực Mang về`), sắp xếp tự nhiên A $\rightarrow$ Z (`Bàn 01`..`Bàn 15`). |
| 3 | `DMHH` | Danh mục Hàng hóa (Thực đơn) | `IDSP` | Quản lý đồ uống, bánh ngọt, ăn vặt và topping (`Đơn giá`, `Giá vốn`, `Đơn vị tính`, `Loại sản phẩm`, `Trạng thái`). |
| 4 | `NGUYENLIEU` | Danh mục Nguyên vật liệu | `IDNguyenLieu` | Quản lý 52+ nguyên vật liệu pha chế, `Đơn vị tính`, `Đơn vị cơ sở`, `Hệ số quy đổi`, `Số lượng cảnh báo`. |
| 5 | `CAUHINH` | Định mức Công thức Pha chế (BOM) | `IDCauHinh` | Liên kết `IDSP` và `IDNguyenLieu`, lưu `Số lượng cần`, `Đơn vị sử dụng`, `Hệ số quy đổi` và `Số lượng quy đổi` để tính giá vốn (COGS) và khấu trừ kho tự động. |
| 6 | `HOADON` | Hóa đơn Bán hàng | `IDHOADON` | Lưu thông tin tổng hợp hóa đơn (`IDBAN`, `Nhân viên`, `Khách hàng`, `Ngày`, `Tổng tiền`, `VAT`, `Giảm giá`, `Khách trả`, `Tiền thừa`, `Loại thanh toán`, `Trạng thái`). Hỗ trợ **Soft Delete** (`Trạng thái = "Đã hủy"` kèm vết kiểm toán). |
| 7 | `HOADONDETAIL` | Chi tiết Hóa đơn | `IDHOADONDETAIL` | Khóa chính định danh duy nhất theo mẫu `${IDHOADON}_${IDSP}_${STT}` (ví dụ `INV123_SP002_1`), đảm bảo **mỗi dòng món chỉ lưu đúng 01 bản ghi duy nhất**. |
| 8 | `KHACHHANG` | Hồ sơ Khách hàng CRM | `IDKHACHHANG` | Quản lý thông tin khách hàng, `Điểm tích lũy`, `Tổng chi tiêu`, `Công nợ` và tự động nâng hạng (`Khách thường` $\rightarrow$ `Khách VIP` $\ge 20$ triệu $\rightarrow$ `Khách kim cương` $\ge 50$ triệu). |
| 9 | `NHAPXUATKHO` | Giao dịch Nhập / Xuất kho | `IDGiaoDich` | Lưu phiếu `Nhập kho` từ nhà cung cấp và phiếu `Xuất kho` / `Xuất hủy`, chứa mảng JSON `ChiTiet` các nguyên vật liệu. |
| 10 | `KIEMKEKHO` | Biên bản Kiểm kê kho | `IDKiemKe` | Đối chiếu `Số lượng hệ thống (Lý thuyết)` và `Số lượng thực tế`, tự động tính độ lệch `Chênh lệch = Thực tế - Lý thuyết` và giá trị hao hụt. |
| 11 | `NHACUNGCAP` | Danh mục Nhà cung cấp | `IDNhaCungCap` | Lưu thông tin đối tác cung ứng nguyên vật liệu, mã số thuế, thông tin liên hệ và đánh giá tín nhiệm. |

*(Ngoài 11 bảng trên, hệ thống có 3 bảng vận hành thời gian thực trên Supabase: `pos_orders` lưu đơn QR/KDS, `pos_cart_drafts` đồng bộ giỏ hàng nháp đa thiết bị theo cơ chế OCC `version`, và `app_settings` / `ai_audit_logs` lưu cấu hình hệ thống & nhật ký kiểm toán AI).*

---

## 2. Chuẩn hóa Các Công thức Tính toán & Quy tắc Nghiệp vụ (Dùng để viết Chương Phân tích & Thiết kế)

### 2.1. Công thức Định giá Món, Topping & Hóa đơn (Chính sách Thuế VAT mặc định = Tắt `0%`)
1. **Đơn giá 1 ly trên trang Khách quét QR (`/order`) và Quầy POS (`/pos`):**
   $$\text{Đơn giá ly} = \text{Giá gốc sản phẩm (Size M)} + \text{Phụ phí Size L } (5.000\text{đ nếu chọn Size L}) + \sum \text{Giá các Topping đã chọn}$$
   - Danh mục Topping chuẩn: `Trân châu đen` (+5.000đ), `Trân châu trắng` (+5.000đ), `Thạch củ năng` (+5.000đ), `Pudding trứng` (+5.000đ), `Kem cheese` (+10.000đ).
   - Toàn bộ thông tin Topping được bảo toàn xuyên suốt từ Modal chọn món $\rightarrow$ Giỏ hàng QR (`/order/cart`) $\rightarrow$ API `/api/orders` $\rightarrow$ Hộp thư POS (`/pos`).
2. **Chính sách Thuế VAT (Mặc định vô hiệu hóa `enableVat = false`):**
   - Theo cấu hình vận hành mặc định của quán tại `/settings/features` và `/receipt-settings`: Công tắc **Thuế VAT mặc định** được đặt ở trạng thái **Tắt (`0%`)**.
   - Khi VAT tắt (`vatRate = 0`):
     $$\text{Tổng thanh toán} = \max\left(0,\ \text{Tổng tiền hàng (Subtotal)} - \text{Ưu đãi thành viên} - \text{Giảm giá thêm}\right)$$
   - Chỉ khi Admin chủ động bật công tắc `Thuế VAT mặc định (10%)` trong `/settings/features`, hệ thống mới cộng thêm $\text{VAT} = 10\% \times \text{Subtotal}$.
3. **Quy tắc Kiểm tra Dữ liệu Đầu vào & Chuẩn hóa Số thực Tiếng Việt (`src/utils/numberValidation.ts`):**
   - **Hỗ trợ đồng thời dấu chấm `.` và dấu phẩy `,` thập phân (`parseFlexibleDecimal`):** Người dùng tại Việt Nam nhập `0,015` hay `0.015` (Kg/Lít) đều được chuẩn hóa chính xác về số thực `0.015`.
   - **Chặn tuyệt đối số âm và giá trị phi lý:**
     - Ô `Giảm giá thêm (VNĐ)` trên POS: Chặn số âm (`< 0` báo lỗi *"Số tiền giảm giá không được là số âm!"*) và chặn giảm giá vượt quá tổng tiền hàng (`> Subtotal` báo lỗi *"Mức giảm giá không được vượt quá tổng tiền đơn hàng!"*).
     - Ô `Số lượng` trong Cấu hình BOM và Máy tính định mức (`/menu/cauhinhnguyenlieu`): Chặn mọi giá trị $\le 0$ và báo lỗi tiếng Việt tức thì (`"Số lượng phải lớn hơn 0!"`).

### 2.2. Công thức Tính Tồn kho Nguyên vật liệu & Giá vốn Định mức BOM (COGS)
1. **Nguyên tắc Đơn nguồn khi Thanh toán POS (Chống nhân đôi dòng & chống trừ kho kép):**
   - Khi thu ngân bấm hoàn tất thanh toán trên `/pos`, hệ thống chỉ thực hiện ghi hóa đơn nguyên tử qua duy nhất một luồng `/api/pos/checkout` (lưu 1 bản ghi `HOADON` và `upsert` đúng 1 bản ghi `HOADONDETAIL` cho mỗi dòng món theo khóa `${IDHOADON}_${IDSP}_${STT}`).
2. **Công thức Tồn kho Thực tế của từng Nguyên vật liệu (`/menu/nguyenlieu`):**
   $$\text{Tồn kho hiện tại} = \sum \text{Lượng Nhập kho} - \sum \text{Lượng Xuất hủy thủ công} - \sum \left(\text{Số lượng ly đã bán trong HOADONDETAIL} \times \text{Định mức quy đổi trong CAUHINH}\right)$$
3. **Công thức Tính Giá vốn BOM (`COGS`) & Biên lợi nhuận gộp (`/reports/products` & `/menu/cauhinhnguyenlieu`):**
   $$\text{Giá vốn 1 ly (BOM COGS)} = \sum_{i \in \text{BOM}} \left(\text{Số lượng quy đổi}_i \times \text{Đơn giá nhập nguyên liệu}_i\right)$$
   $$\text{Biên lợi nhuận gộp (\%)} = \begin{cases} \dfrac{\text{Doanh thu} - \text{Tổng giá vốn}}{\text{Doanh thu}} \times 100\% & \text{nếu Doanh thu} > 0 \\ 0\% & \text{nếu Doanh thu} = 0 \end{cases}$$

---

## 3. Kiến trúc Trợ lý AI Đa tác tử & Cơ chế Cô lập Tri thức Hybrid RAG (`src/lib/ai/ragEngine.ts`)

Khi trình bày chương **Ứng dụng Trí tuệ Nhân tạo & Hybrid RAG** trong Đồ án tốt nghiệp, cần nêu bật 3 cơ chế bảo mật và nghiệp vụ đã được hoàn thiện:
1. **4 Nguồn Tri thức Hợp nhất (In-App Hybrid RAG):**
   - Nguồn 1: Tài liệu hướng dẫn & kiến trúc hệ thống (`Project Docs`).
   - Nguồn 2: Quy trình vận hành chuẩn & Câu hỏi thường gặp (`FAQ & SOP`).
   - Nguồn 3: Thực đơn & Giá bán công khai (`Public Menu Catalog - DMHH`).
   - Nguồn 4: Tư vấn thành phần, dị ứng, lượng calo/caffeine & định mức pha chế (`Store Recipes & Allergy Guide`).
2. **Cơ chế Cô lập Quyền Truy xuất Tri thức theo Vai trò (`Role-Scoped RAG Isolation`):**
   - **Phạm vi `customer` (Khách hàng quét QR tại bàn):** Hàm `isCustomerAllowedChunk()` chặn 100% các đoạn văn bản (chunks) thuộc hướng dẫn vận hành nội bộ (`/user-guide#pos`, `/user-guide#shortcuts`, `/tables`, `/orders`, `/reports`, `/settingdata`), chặn toàn bộ định lượng công thức pha chế nội bộ (`formulaNote` / `CAUHINH`) và doanh thu cửa hàng. Khách hàng chỉ nhận được tư vấn chọn món, giá bán, topping và cảnh báo dị ứng.
   - **Phạm vi `staff` (Nhân viên, Quản lý, Admin):** Được phép tra cứu toàn bộ SOP xử lý tình huống tại quầy, phím tắt POS, công thức pha chế KDS và truy vấn BI bằng ngôn ngữ tự nhiên (doanh thu thực tế trong ngày, danh sách nguyên liệu chạm ngưỡng cảnh báo tồn tối thiểu).
3. **Chống Prompt Injection & Công tắc Ngắt khẩn cấp (`Kill-Switch`):**
   - Mọi truy vấn chứa mẫu tấn công vượt quyền (*"bỏ qua hướng dẫn trước đó"*, *"tiết lộ mật khẩu nhân viên"*, *"doanh thu hôm nay"* từ phía khách QR) đều bị bộ lọc an toàn chặn ngay lập tức và ghi vết vào bảng `ai_audit_logs`.

---

## 4. Tổng hợp Kết quả Kiểm thử Thực nghiệm (Đưa vào Chương Kiểm thử trong Đồ án)

Hệ thống sử dụng mô hình **Kiểm thử Hợp nhất (Hybrid QA Matrix)** kết hợp giữa Kiểm thử Tự động bằng AI Browser Agent (sử dụng Accessibility Tree `@eN` refs không phụ thuộc tọa độ ảnh chụp màn hình) và Kiểm thử Đơn vị / Tích hợp tự động:

| Hạng mục Kiểm thử | Số lượng Kịch bản / Suite | Kết quả Thực nghiệm | Công cụ & Phương pháp Kiểm chứng |
| :--- | :---: | :---: | :--- |
| **Phần A: Kiểm thử Đại luồng Nghiệp vụ Đầu-Cuối (E2E Manual Flows)** | **18 kịch bản** (6 luồng × 3 tầng) | **18 / 18 PASS (100%)** | Kiểm thử trực tiếp trên trình duyệt qua 3 AI Browser Subagents (Khách đặt QR $\rightarrow$ POS $\rightarrow$ Thanh toán $\rightarrow$ Bếp KDS $\rightarrow$ Trừ kho BOM $\rightarrow$ Đối soát BI). |
| **Phần B: Kiểm thử Chuyên sâu 31 Phân hệ Chức năng (Module Manual Matrix)** | **96 kịch bản** (3 tầng: Happy Path, Edge/Validation, Security/RBAC) | **96 / 96 PASS (100%)** | Kiểm thử đa tài khoản đồng thời (`admin`, `test1`, `test2`) xác minh Single-Session, RBAC, Validation số âm/dấu thập phân và hiệu năng phân trang. |
| **Phần C: Kiểm thử Tự động Unit, Concurrency, RBAC & E2E** | **36 Test Suites** (34 Vitest + 2 Playwright = 256+ bài test) | **36 / 36 Suites PASS (100%)** | Chạy tự động qua `vitest run` và `playwright-core` (kiểm thử xung đột OCC HTTP 409, Idempotency-Key, SePay Webhook, Soft Delete, RAG Isolation). |
| **TỔNG HỢP TOÀN HỆ THỐNG** | **114 Manual TC + 36 Auto Suites** | **ĐẠT 100% (0 lỗi tồn đọng)** | Lưu trữ minh chứng tại [`docs/QA_MANUAL_TEST_RUNNER.html`](file:///d:/Documents/H2MilkTea/docs/QA_MANUAL_TEST_RUNNER.html) và [`docs/h2-qa-runner-ai-results.json`](file:///d:/Documents/H2MilkTea/docs/h2-qa-runner-ai-results.json). |

---

## 5. Danh mục 24 Hạng mục Đã Khắc phục & Tối ưu Hóa (Nhật ký Đối chiếu Kỹ thuật)

1. **`MOD-ORD-SEC`, `E2E-05-HP`, `E2E-05-SEC`, `E2E-03-SEC`**: Loại bỏ lệnh gọi kép `saveInvoice()` trong `usePOS.ts` sau khi `/api/pos/checkout` đã thành công; dùng `upsert` cho `HOADONDETAIL` và khử trùng lặp lịch sử hóa đơn cũ, chấm dứt hoàn toàn lỗi nhân đôi dòng món và trừ kho BOM gấp đôi.
2. **`MOD-SET-FEAT-HP`**: Đặt mặc định **Thuế VAT = Tắt (`0%`)** toàn hệ thống (`featureFlags.ts`, `vatSettings.ts`, `usePOS.ts`, `/api/orders`) và bổ sung công tắc bật/tắt trực tiếp tại `/settings/features`.
3. **`E2E-01-SEC`**: Đồng bộ tính cộng tiền Topping (`+5.000đ` / `+10.000đ`) trong `ProductDetail.tsx`, `CartContext.tsx`, `/order/cart` và `/api/orders`.
4. **`E2E-03-EDGE`, `E2E-05-EDGE`**: Xây dựng `src/utils/numberValidation.ts` hỗ trợ dấu thập phân `.` và `,`, chặn nhập giảm giá âm hoặc vượt tổng tiền đơn hàng trên `/pos`, chặn nhập số lượng $\le 0$ trên Máy tính định mức & cấu hình BOM (`/menu/cauhinhnguyenlieu`).
5. **`MOD-BOM-HP` (Ngắt JSON tĩnh)**: Chuyển `useProductMaterialInventory.ts` và `GlobalAssistant.tsx` sang đọc 100% từ Database thực qua API `/api/db`, hiển thị đầy đủ Giá vốn ước tính (COGS) và lượng nguyên vật liệu tiêu thụ thực tế.
6. **`MOD-DATA-EDGE` (Google Drive & Seed 60 ngày)**: Sửa lỗi không re-init `tokenClient` khi đổi Google Client ID trong `googleDriveUtils.ts`, thêm hộp sao chép nhanh `Authorized JavaScript origin` và nút **"🔄 Đồng bộ dữ liệu mẫu 60 ngày"** tại `/settingdata`.
7. **`E2E-01-HP`, `E2E-01-EDGE`**: Bổ sung nút 1-chạm **"🔔 Gọi nhân viên / Xin thêm đá"** kèm bộ đếm ngược Cooldown 30 giây chống spam trên cả 4 màn hình QR (`/order`, `/order/menu`, `/order/cart`, `/order/status`).
8. **`E2E-04-HP`, `E2E-04-SEC`, `MOD-KDS-SEC`**: Bổ sung nút **"📖 Xem công thức"** ngay trên thẻ món màn hình Bếp KDS (`/kitchen`) và xử lý mượt các đơn mẫu (`#MO-101`) không gây lỗi `PATCH /api/orders 404`.
9. **`E2E-06-HP`**: Tự động khởi tạo mẫu in K80 mặc định trong `receiptPrint.ts` và cấu hình VietQR mẫu trong `QRBankSelector.tsx` khi trình duyệt chưa lưu cấu hình.
10. **`MOD-AUTH-SEC`, `MOD-POS-SEC`**: Đồng bộ chính xác tên nhân viên đang đăng nhập trên Header POS/KDS và hóa đơn; chặn gọi poll `/api/pos/cart-draft` khi chưa đăng nhập.
11. **`MOD-AI-RAG-SEC`**: Cô lập tuyệt đối các chunk hướng dẫn vận hành POS nội bộ (`/user-guide#pos`, `/user-guide#shortcuts`) khỏi phạm vi `Khách hàng QR` trong `ragEngine.ts`.
12. **`MOD-REP-PROD-EDGE`, `MOD-REP-COMP-EDGE`**: Bổ sung cột **Giá vốn BOM (COGS)** & **Biên lợi nhuận gộp (%)** tại `/reports/products`; bổ sung 3 khối/tab **Kho & NVL**, **Nhân Sự**, **Khách Hàng** tại `/reports/comprehensive`.
13. **`MOD-FOR-EDGE`, `MOD-APP-EDGE`, `MOD-STAFF-EDGE`, `MOD-GUIDE-EDGE`, `MOD-NOTI-EDGE` & UI Kho**: Phân trang `30 dòng/trang` cho bảng dự báo 1.560 dòng tại `/inventory/forecast`; xóa nút đóng `X` trùng lặp trên modal Kho; đồng bộ nền sáng modal Nhà cung cấp; thay chuỗi `$\ge$` bằng `≥ 48px` tại `/settings/appearance`; thêm nút mở nhanh `Quyền View` tại `/nhanvien`; sửa tìm kiếm `/user-guide` và thêm tab `Gọi phục vụ` tại `/notifications`.

---

## 6. Nhật ký Đồng bộ Mã nguồn & Triển khai (Deployment Sync Log)
- **Nhánh triển khai:** `exp/thesis-perfect` (đồng bộ trực tiếp với remote `origin/exp/thesis-perfect`).
- **Phương thức xác thực:** Windows Credential Manager (`git:https://github.com`) kết hợp Personal Access Token (PAT).
- **Trạng thái:** Toàn bộ mã nguồn đã chuẩn hóa, tài liệu kỹ thuật và kết quả 114 kịch bản kiểm thử đã được đồng bộ lên GitHub thành công.

---

## 7. Nhật ký Dọn dẹp & Chuẩn hóa Cloud Database (18/11/2026)

### 7.1. Kho Lưu trữ Backup Riêng Biệt (Không ghi đè `src/data/*.json`)
- **Bản chụp nguyên trạng trước khi dọn:** `src/data/backup_before_clean_20261118/` (lưu đầy đủ 11 bảng chính + 3 bảng thời gian thực cũ ở chuẩn UTF-8).
- **Bộ dữ liệu sạch sau chuẩn hóa:** `src/data/clean_seed_20261118/` (xuất trực tiếp từ Cloud DB sau khi kiểm định toán học 100%).
- **Dữ liệu gốc `src/data/*.json`:** Được giữ nguyên trạng 100%, không ghi đè.

### 7.2. Trạng thái Toàn bộ Hệ thống Bảng Cloud DB sau Dọn dẹp
| Bảng | Trạng thái sau dọn | Kết quả kiểm định |
| :--- | :---: | :--- |
| **`pos_cart_drafts`** | **0 dòng** | Đã xóa sạch giỏ hàng nháp kẹt trên `BAN04`, `BAN05`; toàn bộ sơ đồ bàn về trạng thái trống. |
| **`pos_orders` (Đơn mở POS QR / Bếp KDS)** | **0 đơn mở** | Đã dọn 7 đơn bếp tồn đọng, đóng toàn bộ đơn `awaiting_confirmation` & `accepted` chưa thanh toán (bảng vẫn giữ lịch sử 65 bản ghi đã kết thúc `completed`/`served`/`paid`). |
| **`DSNV`** | **3 tài khoản** | Giữ nguyên `admin`, `test1`, `test2` (bảo toàn mật khẩu gốc, chuẩn hóa hồ sơ & `Quyền View`); đã xóa `trantien2k5`, `trandat`. |
| **`DSBAN`** | **16 bàn** | 100% trạng thái `"Đang hoạt động"`, xóa sạch `"Lịch sử  bàn"` cũ, phân chuẩn 4 khu vực. |
| **`CAUHINH` (BOM)** | **18 định mức** | Xóa 4 dòng cũ bị `null` tên; nạp mới 18 định mức chuẩn (`CFG001`–`CFG018`) với 0 dòng `null`, đủ đơn vị gốc và hệ số quy đổi. |
| **`HOADON` & `HOADONDETAIL`** | **22 HĐ / 50 chi tiết** | 20 hóa đơn `"Đã thanh toán"` (`10-11/2026`) có tổng `Tổng tiền = 2.281.000đ` **khớp tuyệt đối 100%** tổng `Thành tiền` của 50 dòng `HOADONDETAIL`; 100% hóa đơn có `VAT = 0`, 0 giá trị `null`. 2 mã test cũ (`INV_TEST_416366`, `INV-TEST-447373`) được chuẩn hóa sang trạng thái `"Đã hủy"` (Soft-Cancel audit trail). |
| **`KHACHHANG`** | **10 khách hàng** | Đồng bộ lại `Tổng chi tiêu`, `Điểm tích lũy`, `Lần mua cuối`, `Hóa đơn liên quan` khớp với 20 hóa đơn sạch; tất cả ở trạng thái `"Hoạt động"`. |
| **`NHAPXUATKHO` & `KIEMKEKHO` & `NHACUNGCAP`** | **3 + 3 + 3 dòng** | Đưa ngày giao dịch/kiểm kê về `10-11/2026`, gán `NhanVienThucHien` khớp `DSNV` mới, hoàn thiện phiếu `KK003` và giữ mảng JSON `ChiTiet` chuẩn. |

### 7.3. Thông tin 2 Tài khoản Đã Xóa Phục vụ Test Thủ công Chức năng Thêm Nhân viên
Khi kiểm thử luồng tạo nhân viên mới tại phân hệ `/nhanvien` (hoặc `/api/auth/create-user`), có thể sử dụng lại bộ thông tin sạch sau:

| Tên đăng nhập (`username`) | Họ và Tên | Email | SĐT | Địa chỉ | Chức vụ / Phòng | Phân quyền | Quyền View |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `trantien2k5` | Trần Văn Tiến | `tiengame2k5@gmail.com` | `0838400274` | `Bắc Sơn-Sóc Sơn` | `RND` / `RND` | `Nhân viên` | `POS Bán hàng, Đơn hàng, Khách hàng` |
| `trandat` | Trần Văn Đạt | `tiengame2k5@gmail.com` | `0838400274` | *(Trống hoặc tự điền)* | `RND` / `RND` | `Nhân viên` | `POS Bán hàng, Đơn hàng, Khách hàng` |
