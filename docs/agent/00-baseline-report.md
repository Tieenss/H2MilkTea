# Báo cáo Kiểm định Baseline (00-baseline-report.md)

- **Ngày thực hiện**: 2026-10-18
- **Nhánh làm việc**: `exp/thesis-perfect`
- **Mã commit**: `0572f91`
- **Môi trường thực thi**: Windows 11, Node.js `v24.19.0`, npm `11.x`, Git `2.55.0`
- **Nguyên tắc**: *Không sửa code để cho xanh — phản ánh trung thực hiện trạng codebase.*

---

## 1. Tóm tắt kết quả kiểm tra

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả | Chi tiết / Đánh giá |
| :--- | :--- | :---: | :--- |
| **Đồng bộ Dependencies** | `npm ci` | **PASS** (0) | 705 packages cài đặt thành công, phát hiện 45 vulnerabilities (28 high, 5 critical) từ dependencies cũ. |
| **Linting (ESLint)** | `npm run lint` | **FAIL** (1) | 54 errors, 1 warning. Chủ yếu là lỗi `@typescript-eslint/no-explicit-any` và `@typescript-eslint/no-unused-vars` trong các module utils cũ. |
| **Type Check (TypeScript)** | `npx tsc --noEmit` | **FAIL** (1) | 22 lỗi kiểu dữ liệu ở 9 files (như `useSuppliers.ts`, `ProductMaterialInventoryStats.tsx`, `employeeRepository.ts`, `route.ts`, `login.tsx`, `order/`). |
| **Unit Test Tự động** | `npm test` (vitest) | **PASS** (0) | **100% PASS** (5/5 files, 33/33 tests). Chạy qua bộ kiểm thử `catalog`, `cart-draft-api`, `ai-features`, `ai-settings`, `faq`. |
| **Next.js Production Build** | `npm run build` | **PASS** (0) | Build thành công 46 route tĩnh và toàn bộ dynamic routes trong 8.0s. |

---

## 2. Phát hiện kỹ thuật quan trọng (Technical Findings)

> [!WARNING]
> **Next.js đang bỏ qua lỗi Lint & Type khi Build:**
> Trong [next.config.ts](file:///d:/Documents/H2MilkTea/next.config.ts), hai cờ sau đang được bật:
> ```ts
> eslint: { ignoreDuringBuilds: true },
> typescript: { ignoreBuildErrors: true },
> ```
> Điều này giải thích tại sao `npm run build` thành công xuất sắc, nhưng kiểm tra độc lập bằng `tsc --noEmit` và `eslint` lại trả về exit code 1. Trong các phase tiếp theo, các lỗi này cần được khoanh vùng và dọn dẹp dần để tiến tới gỡ bỏ cờ bỏ qua lỗi.

---

## 3. Chi tiết từng hạng mục

### 3.1. Chi tiết Unit Test (`npm test`)
- `tests/unit/catalog.test.ts` (3 tests) - PASS
- `tests/unit/ai-features.test.ts` (9 tests) - PASS
- `tests/unit/cart-draft-api.test.ts` (4 tests) - PASS
- `tests/unit/faq.test.ts` (9 tests) - PASS
- `tests/unit/ai-settings.test.ts` (8 tests) - PASS
- **Thời gian thực thi**: ~650ms.

### 3.2. Chi tiết lỗi Type (`tsc --noEmit`)
1. `src/app/(dashboard)/inventory/suppliers/hooks/useSuppliers.ts`: Lỗi kiểu dữ liệu enum `TrangThai` không tương thích (`string` vs `"Đang hợp tác" | "Tạm ngưng" | "Ngừng hợp tác"`).
2. `src/app/(dashboard)/menu/cauhinhnguyenlieu/components/ProductMaterialInventoryStats.tsx`: Lỗi trùng tên khai báo component với import interface.
3. `src/app/(dashboard)/menu/nguyenlieu/components/MaterialInventoryStats.tsx`: Lỗi merged declaration trùng tên.
4. `src/app/(dashboard)/nhanvien/repositories/employeeRepository.ts`: Thiếu module `@/utils/apiService`.
5. `src/app/api/ai/chat/route.ts`: Xung đột kiểu dữ liệu Supabase `RawProduct` và lọc null predicate.
6. `src/app/login.tsx`: Truy cập thuộc tính tiếng Việt `"Họ và Tên"` trên type không khai báo.
7. `src/app/order/cart/page.tsx`, `menu/page.tsx`, `order/page.tsx`: Cảnh báo `searchParams` có thể `null` trong Next.js 15.
8. `src/components/ReportFilters.tsx`: Tham số callback thiếu định kiểu (`implicitly any`).

### 3.3. Chi tiết lỗi Lint (`npm run lint`)
- 40+ lỗi `Unexpected any. Specify a different type` tập trung tại:
  - `src/utils/authUtils.ts` (22 vị trí)
  - `src/utils/googleDriveUtils.ts` (14 vị trí)
  - `src/utils/jsonFileManager.ts` (4 vị trí)
  - `src/lib/supabase/server.ts` (2 vị trí)
- Các lỗi khai báo `require()` style import thay vì ES module trong `jsonFileManager.ts`.

---

## 4. Trạng thái Git & Bản lưu dự phòng
- Tag baseline: `backup/baseline-20261018`
- Tag baseline master: `backup/baseline-master-20261018`
- Git bundle: `D:\Documents\h2milktea-baseline.bundle` (1.35 MB)
- Zip baseline: `D:\Documents\h2milktea-baseline-20261018.zip` và `h2milktea-master-baseline-20261018.zip`
- Nhánh thí nghiệm cô lập: `exp/thesis-perfect` (đã hợp nhất commit `master` và `feature/ai-chatbot-mvp`, giải quyết sạch sẽ các xung đột logic).
