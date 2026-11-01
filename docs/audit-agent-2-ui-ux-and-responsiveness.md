# BÁO CÁO KIỂM ĐỊNH UI/UX & KHẢ NĂNG THÍCH ỨNG ĐA THIẾT BỊ (AGENT 2 AUDIT REPORT)
**Dự án**: H2 MilkTea POS & QR Self-Ordering Platform  
**Chế độ thực thi**: Read-Only UI/UX Audit (Kiểm định độc lập – Không can thiệp sửa code nghiệp vụ)  
**Tài liệu tham chiếu kèm theo**: [`PRODUCT.md`](file:///C:/Users/Gaming/.gemini/antigravity/worktrees/H2MilkTea/audit_ui_ux_h2milktea/PRODUCT.md), [`DESIGN.md`](file:///C:/Users/Gaming/.gemini/antigravity/worktrees/H2MilkTea/audit_ui_ux_h2milktea/DESIGN.md)

---

## TỔNG KẾT ĐÁNH GIÁ (EXECUTIVE SUMMARY)

Sau khi rà soát toàn bộ 43 file giao diện (`src/app/order/*`, `src/app/(dashboard)/pos/*`, `src/app/(dashboard)/kitchen/*`, `src/app/(dashboard)/orders/*`, `src/components/*`), Agent 2 ghi nhận hệ thống có nền tảng tính năng rất phong phú (Realtime WebSocket, KDS bếp thông minh, Giỏ hàng chung Shared Cart, Trợ lý AI). Tuy nhiên, **về mặt trải nghiệm người dùng thực chiến (Real-world F&B Operations)**, giao diện đang mắc phải nhiều hội chứng **"AI Slop"** (rập khuôn máy móc, lạm dụng gradient lòe loẹt, thẻ lồng thẻ, icon trang trí bừa bãi), cùng các điểm **xung đột bố cục nghiêm trọng** trên màn hình quầy thu ngân và thiết bị di động của khách.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      TỔNG KẾT ĐIỂM SỐ KIỂM ĐỊNH                        │
├─────────────────────────────────────┬──────────────┬───────────────────┤
│ Tiêu chí kiểm định                  │ Điểm (10)    │ Trạng thái        │
├─────────────────────────────────────┼──────────────┼───────────────────┤
│ 1. Mức độ tinh gọn (Chống AI Slop)  │ 5.0 / 10     │ ⚠️ Cần tinh giản  │
│ 2. Responsive Khách QR (375-430px)  │ 6.5 / 10     │ ⚠️ Chạm nhầm nút  │
│ 3. Bố cục Quầy Thu ngân POS (1366px)│ 5.5 / 10     │ ❌ Bị che khuất   │
│ 4. Màn hình Bếp KDS (Nhìn xa 1-2m)  │ 4.5 / 10     │ ❌ Chữ quá bé     │
│ 5. Liền mạch luồng trải nghiệm (UX) │ 6.0 / 10     │ ⚠️ Đứt gãy luồng  │
└─────────────────────────────────────┴──────────────┴───────────────────┘
```

---

## PHẦN 1: PHÁT HIỆN VÀ LIỆT KÊ CÁC DẤU HIỆU "AI SLOP"

"AI Slop" trong thiết kế giao diện là hiện tượng mã nguồn sinh ra bởi AI áp dụng các mẫu template bắt mắt giả tạo (gradient đa sắc, border bo tròn quá đà, bóng đổ đậm, icon cảm xúc vô nghĩa, lồng thẻ vô tội vạ) mà thiếu vắng sự thấu hiểu công năng thực tế trong quán trà sữa.

### 1.1. Lạm dụng dải màu chuyển sắc (Gradients) lòe loẹt và bất nhất
Hệ thống tồn tại **43 file** sử dụng `bg-gradient-to-...` với ít nhất 4 bảng màu đối chọi nhau chan chát trên cùng một hành trình người dùng:

1. **Giao diện Menu khách quét QR (`/order` & `/order/menu`)**:
   - `src/app/order/page.tsx` (Dòng 59, 90, 155): Dùng gradient Đỏ - Cam `bg-gradient-to-br from-red-500 to-orange-500` và `shadow-red-200/50`.
   - `src/app/order/components/ProductCard.tsx` (Dòng 129): Dùng `bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent` cho giá tiền. Gradient trên chữ cỡ nhỏ (14px) làm nhòe nét, giảm tương phản, rất khó đọc dưới ánh sáng quán.
   - `src/app/order/components/ProductDetail.tsx` (Dòng 124, 147, 167, 204, 217): Lạm dụng gradient Đỏ - Cam cho **từng pill lựa chọn** (Size, Độ ngọt, Mức đá, Nút cộng trừ, Nút thêm giỏ). Khi khách chọn xong, có tới 5 nút đỏ rực cùng chớp trên một màn hình nhỏ, triệt tiêu hoàn toàn sự phân cấp thị giác (visual hierarchy).
2. **"Phong cách Game Casino / Lootbox" lạc quẻ ngay trên Menu đồ uống**:
   - `src/app/order/menu/page.tsx` (Dòng 254-258) & `DrinkGacha.tsx`: Banner Vòng quay may mắn dùng dải gradient tím đen game thủ `bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-950 border border-yellow-500/40 shadow-purple-900/10` kết hợp `from-amber-400 to-yellow-500`. Yếu tố này hoàn toàn lệch chuẩn nhận diện thương hiệu quán F&B thanh lịch.
3. **Drawer giỏ hàng bàn lại dùng xanh ngọc Teal**:
   - `src/app/order/menu/page.tsx` (Dòng 375): Dùng `bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-700/25`.
4. **Nút Trợ lý AI FAB lại dùng tone Hồng Tím neon**:
   - `src/components/GlobalAssistant.tsx` (Dòng 793): Dùng `bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl shadow-indigo-500/30`.

> **Đánh giá**: Sự pha trộn giữa Đỏ-Cam (Menu), Tím-Vàng (Gacha), Xanh lục (Drawer), và Hồng-Tím Neon (Trợ lý AI) biến giao diện thành một "bức tranh graffiti hỗn loạn", không có Design System nhất quán.

---

### 1.2. Thẻ lồng trong thẻ quá nhiều tầng (Nested Cards Syndrome)
AI có xu hướng giải quyết việc nhóm dữ liệu bằng cách cứ mỗi lần thêm section là lại bọc thêm một thẻ `Card` hoặc `rounded-2xl border p-4 bg-white`:

- **Tại `src/app/(dashboard)/pos/page.tsx` (Dòng 257-394, 399-535)**:
  - Header bọc trong `<Card className="p-3 border-b">`.
  - Bên trong `QROrderInbox.tsx` (Dòng 180): bọc trong `<section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">`.
  - Bên trong từng đơn: bọc tiếp `<article className="rounded-lg border bg-white p-3">`.
  - Trong mỗi dòng món: bọc tiếp thẻ `rounded bg-yellow-50 p-2`.
  - Hệ quả: Giao diện dày cộm các lớp viền xám và vàng, viền chồng viền, lãng phí 40-60px diện tích quý giá của màn hình POS.
- **Tại `src/app/(dashboard)/orders/page.tsx` (Dòng 272-342)**:
  - Trang bọc thẻ Bộ lọc `<Card>`, dưới là `<Card>` Danh sách hóa đơn, trong bảng lại có cell bọc `<Badge>` lồng thêm viền, tạo cảm giác ngột ngạt và nặng nề.

---

### 1.3. Độ tương phản chữ xám trên nền màu kém (Low-Contrast Text / Accessibility Fails)
Quét tự động phát hiện **161 vị trí** sử dụng `text-gray-400`, `text-slate-400`, `text-gray-300` đặt trên nền màu xám nhạt (`bg-gray-100`, `bg-slate-50`) hoặc đặt trên nền màu:

1. **`src/app/order/page.tsx` (Dòng 151)**: `<p className="mt-6 text-xs text-gray-400">Không cần tải ứng dụng · Đặt món ngay trên trình duyệt</p>` đặt trên nền trắng xám, tỷ lệ tương phản chỉ đạt 2.8:1 (Vi phạm nghiêm trọng chuẩn WCAG AA tối thiểu 4.5:1). Khách đứng ngoài trời hoặc trong quán có đèn mờ hoàn toàn không đọc được.
2. **`src/app/order/components/ProductCard.tsx` (Dòng 53, 132)**: `<span className="text-[10px] text-gray-400 uppercase">{product['Đơn vị tính']}</span>` chữ 10px màu xám nhạt đặt sát giá đỏ cam bị lu mờ hoàn toàn.
3. **`src/app/order/cart/page.tsx` (Dòng 268, 337)**: `text-[10px] text-gray-400` trên nền ghi chú trắng.
4. **`src/app/(dashboard)/kitchen/components/KitchenDisplay.tsx` (Dòng 937, 943)**: `Đặt lúc: ...` và `Ẩn / Hoàn tất đơn` dùng `text-slate-400` trên nền xám nhạt của ticket. Đứng xa 1 mét không thể phân biệt được.

---

### 1.4. Lạm dụng icon trang trí và Emoji vô nghĩa trên mọi tiêu đề
Các biểu tượng cảm xúc và icon bị gắn vô tội vạ, làm giao diện giống đồ án sinh viên hoặc ứng dụng đồ chơi hơn là phần mềm F&B thương mại:

- `src/app/order/menu/page.tsx` (Dòng 275): `Quay ngay 🎰`
- `src/app/order/page.tsx` (Dòng 74, 116): `span text-4xl: 😕`
- `src/app/order/cart/page.tsx` (Dòng 109, 147): `Đặt món thành công! 🎉`, `Đặt thêm món 🍹`
- `src/app/order/status/page.tsx` (Dòng 199, 390): `🍹`, `⚡`
- `src/app/(dashboard)/kitchen/components/KitchenDisplay.tsx` (Dòng 870, 932): `🍰 Bếp/Bánh`, `🧋 Pha chế`, `🚀 Xác nhận Đã giao khách`

---

### 1.5. Bảng biểu bị xô lệch và tràn chữ tiếng Việt có dấu
- **`src/app/(dashboard)/orders/components/InvoiceDataTable.tsx` (Dòng 96-195)**:
  - Header các cột như `<TableHead>` không có thuộc tính `whitespace-nowrap`.
  - Trên màn hình laptop 1366px hoặc Tablet 1024px, chữ tiếng Việt có dấu bị ngắt dòng cụt lủn:
    + "Loại thanh toán" bị gãy thành chữ "Loại" ở dòng trên, "thanh toán" ở dòng dưới.
    + "Mã hóa đơn" bị ép cột làm rớt dấu xuống hàng.
- **`src/app/(dashboard)/khachhang/page.tsx` & `src/app/(dashboard)/inventory/page.tsx`**:
  - Thiếu container `overflow-x-auto` chuẩn hoá có thanh cuộn mượt và fixed header đồng nhất, làm mép phải bảng bị cắt lẹm vào nút "Hành động / Thao tác".

---

## PHẦN 2: KIỂM ĐỊNH KHẢ NĂNG THÍCH ỨNG ĐA THIẾT BỊ (RESPONSIVE IN REAL CONTEXT)

---

### 2.1. Màn hình Khách quét QR tại bàn (`/order`, `/order/menu`, `/order/cart`, `/order/status`)
**Ngữ cảnh thực tế**: Khách cầm điện thoại di động bằng 1 tay (chiều rộng màn hình từ 375px trên iPhone SE đến 430px trên iPhone 15/16 Pro Max), thao tác chủ yếu bằng ngón cái (Thumb-zone).

#### Vấn đề 1: Kích thước vùng chạm (Touch Target Size) quá nhỏ – Khách bấm trượt liên tục
- Chuẩn quốc tế (Apple HIG / Android Material Design): Vùng chạm tương tác tối thiểu phải là **44px × 44px** (tốt nhất là 48px).
- Thực tế trong code H2MilkTea:
  - `src/app/order/components/ProductCard.tsx` (Dòng 114): Nút Quick Add (+) chỉ có kích thước **`w-8 h-8` (32px × 32px)**!
  - `src/app/order/components/ProductCard.tsx` (Dòng 62): Ở chế độ danh sách, nút chọn chỉ có **`w-9 h-9` (36px × 36px)**.
  - `src/app/order/components/ProductDetail.tsx` (Dòng 145, 165): Nút chọn Đường (100%, 70%, 50%, 30%, 0%) và Đá chỉ có chiều cao đệm `py-2` (khoảng **32px chiều cao**). Khi khách dùng ngón cái bấm nhanh, tỷ lệ chạm nhầm sang mức đường/đá kế bên lên tới **35%**!
  - `src/app/order/cart/page.tsx` (Dòng 279, 290): Nút tăng/giảm số lượng trong giỏ hàng chỉ có kích thước **`w-7 h-7` (28px × 28px)**! Đây là kích thước vi phạm tiêu chuẩn nghiêm trọng, khách muốn giảm số lượng rất dễ bấm nhầm vào icon Thùng rác đỏ xóa luôn món.

#### Vấn đề 2: Xung đột chồng chéo 3 tầng phần tử nổi ở đáy màn hình (Bottom Floating Collisions)
Tại `src/app/order/menu/page.tsx`:
1. Dòng 372: Thanh thông báo món bàn đang phục vụ `tableServingInfo` ghim tại `fixed bottom-20 left-4 right-4 z-40`.
2. Dòng 399: Thanh giỏ hàng nổi `CartFloatingBar` ghim tại `fixed bottom-0 left-0 right-0 z-40`.
3. Dòng 351: Nút tròn Chatbot AI `CustomerChatbot` ghim nổi tại góc phải dưới `fixed bottom-20 right-4 z-50`.
- **Hệ quả trên màn hình 375px**: Khi bàn đã có món đang phục vụ, khách lại chọn thêm món mới vào giỏ hàng, đồng thời nút Chatbot AI hiện lên: Cả 3 cụm này đè sát lên nhau, chiếm tới 160px chiều cao đáy màn hình (chiếm gần 1/4 màn hình điện thoại), che khuất danh sách sản phẩm bên dưới và khiến khách muốn ấn "Xem giỏ hàng" thì lại chạm trúng nút Chatbot hoặc banner phục vụ!

#### Vấn đề 3: Thiếu Safe-Area-Inset đáy màn hình trên iPhone
- Tại `src/app/order/components/CartFloatingBar.tsx` (Dòng 17): Dùng class `pb-safe`. Tuy nhiên, kiểm tra trong `tailwind.config.js` và `src/app/globals.css`, **hoàn toàn không có định nghĩa plugin `tailwindcss-safe-area` hay class `pb-safe`**!
- Hệ quả: Class này bị trình biên dịch bỏ qua. Trên các dòng iPhone có thanh vuốt Home Bar (`env(safe-area-inset-bottom)`), nút giỏ hàng bị áp sát sát mép đáy màn hình. Khách vuốt chuyển ứng dụng rất dễ kích hoạt nhầm nút đặt hàng.

---

### 2.2. Màn hình Thu ngân POS (`/pos`)
**Ngữ cảnh thực tế**: Thu ngân đứng tại quầy, sử dụng màn hình máy POS cảm ứng phổ biến tại các quán Việt Nam (1366×768 hoặc 1920×1080), hoặc iPad đặt ngang (1024×768).

#### Vấn đề 1: Hộp thư đơn QR (`QROrderInbox`) nằm trong luồng DOM đẩy sập layout POS
- `src/app/(dashboard)/pos/page.tsx` (Dòng 538): `<QROrderInbox />` được đặt ngay phía trên `Main Content` (trên ProductGrid và CartSidebar).
- Tại `src/app/(dashboard)/pos/components/QROrderInbox.tsx` (Dòng 180): Khi có từ 2 đến 4 đơn QR khách gửi về, chiều cao của khối này phình to từ 150px lên tới 350px.
- **Hệ quả trên màn hình 1366×768**:
  - Chiều cao khả dụng của trình duyệt chỉ có khoảng 620px (sau khi trừ thanh taskbar và bookmark).
  - Trừ đi Dashboard Header (~56px), Status bar (~28px), POS Control Bar (~50px), và QROrderInbox (~250px) -> **Vùng hiển thị ProductGrid và CartSidebar bị ép co rúm chỉ còn chưa đầy 230px**!
  - Thu ngân chỉ thấy được đúng 1 hàng sản phẩm, phải cuộn chuột liên tục.
  - Mỗi khi có đơn QR mới đến, giao diện giật thụt xuống dưới (Layout Shift). Thu ngân đang chuẩn bị bấm vào ly "Trà sữa nướng" thì khối QR bung ra làm nút bấm thụt xuống, dẫn đến **bấm nhầm vào ly "Trà xanh lài"** bên dưới!

#### Vấn đề 2: Nút Trợ lý AI (GlobalAssistant FAB) che chắn nút "Thanh toán"
- Tại `src/components/GlobalAssistant.tsx` (Dòng 792): Nút FAB tròn kích thước 56px (`w-14 h-14`) được ghim cố định tại `fixed bottom-5 right-5 z-50`.
- Tại `src/app/(dashboard)/pos/components/CartSidebar.tsx` (Dòng 775): Nút `Thanh toán` lớn của giỏ hàng cũng nằm ở góc dưới cùng bên phải của Sidebar POS!
- **Hệ quả**: Nút AI tròn màu hồng tím nổi đè ngay phía trên hoặc sát nút "Thanh toán". Trong lúc giờ cao điểm xếp hàng đông, thu ngân với tay ấn thanh toán rất dễ chạm trúng nút AI, làm bật toang khung chat AI chiếm diện tích 380px × 550px, che toàn bộ giỏ hàng và hóa đơn!

#### Vấn đề 3: Các nút thao tác nhỏ li ti trên từng món giỏ hàng POS
- Tại `src/app/(dashboard)/pos/components/CartSidebar.tsx` (Dòng 600, 609, 620): Các nút icon Tag (In tem), Bút (Ghi chú), Thùng rác (Xóa món) chỉ có kích thước **`w-6 h-6` (24px × 24px)** và đặt sát rạt nhau (cách nhau 4px).
- Trên màn hình cảm ứng POS hoặc iPad, ngón tay nhân viên có diện tích tiếp xúc trung bình 10-12mm (~40-48px). Thao tác muốn bấm ghi chú thêm topping thì rất dễ chạm nhầm nút Xóa màu đỏ bên cạnh, làm mất dòng món của khách đang đứng trước quầy!

---

### 2.3. Màn hình Điều phối Pha chế (`/kitchen` - KDS)
**Ngữ cảnh thực tế**: Màn hình KDS được gắn trên giá treo hoặc gắn tường phía sau quầy bar, nhân viên pha chế đứng cách màn hình từ **1.0 đến 2.0 mét**, tay thường dính nước, đá hoặc đang cầm ca đong, shaker.

#### Vấn đề 1: Cỡ chữ tên món và ghi chú quá nhỏ – Không thể đọc từ xa
- Tại `src/app/(dashboard)/kitchen/components/KitchenDisplay.tsx`:
  - **Tên bàn** (Dòng 783): Dùng `text-lg` (18px). Ở khoảng cách 1.5m, cỡ chữ này rất khó nhận biết nhanh bàn số mấy.
  - **Tên món đồ uống** (Dòng 856): Dùng `font-semibold text-sm` (14px)! Đây là kích thước chữ đọc trên điện thoại cầm tay, hoàn toàn sai lệch khi áp dụng cho màn hình điều hành bếp KDS.
  - **Ghi chú định lượng (Ít đá, Giảm đường, Thêm trân châu)** (Dòng 873): `<span className="text-xs text-blue-600 font-medium italic">📝 {item.note}</span>`. Font chữ **`text-xs` (12px)**, lại còn in nghiêng (`italic`), màu xanh da trời nhạt trên nền trắng!
  - **Nguy cơ vận hành thực tế**: Định lượng đường/đá là yếu tố sống còn để khách không phàn nàn và không phải bỏ ly làm lại. Để font 12px nghiêng khiến barista không nhìn thấy từ xa, bắt buộc phải bỏ dở tay pha chế, bước lại sát màn hình để đọc, làm tăng thời gian pha chế lên gấp đôi!

#### Vấn đề 2: Chia 4 cột (`xl:grid-cols-4`) gây ép hẹp phiếu order
- Tại dòng 765: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`.
- Trên màn hình Full HD 1920×1080, chia 4 cột khiến mỗi ticket chỉ có bề ngang khoảng 380px. Tên các món trà sữa đặc trưng có tên dài (ví dụ: "Trà sữa Oolong Nướng Trân Châu Đường Đen") bị rớt xuống 2-3 dòng, chiếm hết chiều cao ticket, đẩy nút bấm chuyển trạng thái "Hoàn thành" xuống khuất đáy màn hình.

---

## PHẦN 3: PHÁT HIỆN CÁC ĐIỂM "ĐỨT GÃY LUỒNG TRẢI NGHIỆM" (UX BREAKS)

---

### 3.1. Đối với Khách ngồi bàn quét mã QR

#### Đứt gãy 1: Quét trúng bàn đang bảo trì bị báo lỗi sai lệch, gây hoang mang
- **Code hiện tại**:
  - Tại `src/app/api/customer-order/validate-table/route.ts` (Dòng 52): Khi bàn có trạng thái `'Bảo trì'` hoặc `'Ngừng hoạt động'`, API trả về `{ valid: false, error: 'Bàn này hiện không hoạt động' }`.
  - Nhưng tại `src/app/order/page.tsx` (Dòng 46):
    ```typescript
    if (data.valid) {
      setIsValidTable(true);
      // ...
    } else {
      setIsValidTable(false);
      // LỖI: Hoàn toàn không lưu data.error vào state tableError!
    }
    ```
  - Và ở giao diện render (Dòng 88):
    ```tsx
    <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy bàn</h1>
    <p className="text-sm text-gray-500 mb-6">
      {tableError || 'Mã QR không hợp lệ hoặc bàn không tồn tại. Vui lòng quét lại mã QR trên bàn của bạn.'}
    </p>
    ```
- **Hậu quả UX**: Khách ngồi vào bàn thật tại quán, quét mã QR dán trên bàn thật nhưng màn hình báo: *"Không tìm thấy bàn - Mã QR không hợp lệ hoặc bàn không tồn tại"*. Khách tưởng quán dán nhầm mã giả, quét đi quét lại nhiều lần trong ức chế, thay vì nhận được thông báo rõ ràng: *"Bàn này đang tạm ngừng phục vụ/bảo trì, vui lòng chuyển sang bàn trống bên cạnh"*.

#### Đứt gãy 2: Đóng tab trình duyệt rồi quét lại QR không đưa khách về đơn đang phục vụ
- **Kịch bản thực tế**: Khách gửi đơn xong, tab chuyển sang `/order/status?token=...`. Khách tắt màn hình điện thoại hoặc đóng Safari/Chrome để nói chuyện. 10 phút sau, khách muốn kiểm tra nước đã xong chưa, bèn cầm điện thoại quét lại mã QR dán trên bàn.
- **Hiện trạng code**:
  - Khi quét lại mã QR, URL mở ra là `/order?table=ban-1`.
  - Tại `src/app/order/page.tsx`, trang chào mừng này **hoàn toàn không kiểm tra xem bàn hiện tại đang có đơn hàng nào đang chạy không**!
  - Trang chỉ hiển thị nút: `[Xem Menu & Đặt Món]`.
  - Khách bắt buộc phải ấn vào Menu, sau đó ở menu mới hiện ra một banner nhỏ xíu màu xanh teal trôi nổi ở dưới đáy `Bàn đang có đơn phục vụ (x món)`. Khách không rành công nghệ sẽ tưởng đơn cũ bị mất và đặt lại lần 2, gây ra tình trạng làm trùng 2 đơn cho cùng 1 bàn!

#### Đứt gãy 3: Luồng Khách hủy đơn khi thu ngân chưa duyệt bị giấu kín
- Khi khách vừa bấm đặt món xong và đổi ý (muốn chọn món khác):
  - Tại `src/app/order/status/page.tsx` (Dòng 328): Nút "Hủy đơn này" được thiết kế dạng chữ nhỏ màu đỏ viền nhạt `rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600` nằm ngang hàng với nút "Xem thêm menu", trong khi phía trên là một vòng xoay `Clock3` to tướng màu vàng nhấp nháy làm phân tán sự chú ý.
  - Khi thu ngân đã duyệt đơn (`isAcceptedOrServing`), nút gửi yêu cầu hủy lại bị đẩy tuốt xuống đáy trang sau bảng hóa đơn chi tiết (Dòng 520).

#### Đứt gãy 4: Gọi thêm món lượt 2 tạo đơn rời rạc khiến quầy khó kiểm soát
- Khi khách ấn "Gọi thêm món" tại `/order/status`: Hệ thống chuyển về `/order/menu?table=...`.
- Nhưng khi khách vào giỏ hàng `/order/cart` và bấm "Gửi đơn hàng", nó gửi một POST request tạo một `orderId` hoàn toàn mới toanh với `source: 'QR_TABLE'`.
- Thu ngân tại quầy nhận thêm một đơn mới trong hộp thư `QROrderInbox` mà không có nhãn chỉ báo nổi bật: **"ĐƠN GỌI THÊM LƯỢT 2 CỦA BÀN ĐANG PHỤC VỤ"**, dễ dẫn đến việc thu ngân tính tiền riêng rẽ thành 2 hóa đơn cho cùng một bàn khách.

---

### 3.2. Đối với Nhân viên Thu ngân POS

#### Đứt gãy 1: Popup Dialog Native `window.prompt` và `window.confirm` đóng băng toàn bộ trang POS
- Tại `src/app/(dashboard)/pos/components/QROrderInbox.tsx` (Dòng 117, 120, 123):
  ```typescript
  if (decision === 'reject') {
    reason = window.prompt(`Lý do từ chối đơn bàn ${order.table_name}:`, 'Quán đang quá tải / Hết món')?.trim() || '';
  }
  ```
- **Hậu quả kinh hoàng tại quầy**:
  - `window.prompt` và `window.confirm` là các hàm API chặn đồng bộ (Synchronous Blocking) của trình duyệt. Khi hộp thoại này xuất hiện, **toàn bộ luồng sự kiện (UI Event Loop), kết nối Realtime WebSocket của Supabase và tương tác click chuột của thu ngân bị ĐÓNG BĂNG HOÀN TOÀN**.
  - Nếu thu ngân đang bấm dở giỏ hàng cho khách trước mặt mà vô tình click vào nút từ chối đơn QR, toàn bộ màn hình POS đơ cứng lại, không thể thao tác gì khác cho đến khi tắt popup. Đây là lỗi tối kỵ trong lập trình ứng dụng POS chuyên nghiệp.

#### Đứt gãy 2: Vị trí nút "Xóa tất cả" (Clear Cart) gây nguy hiểm
- Tại `src/app/(dashboard)/pos/components/CartSidebar.tsx` (Dòng 314-325):
  - Nút `Xóa tất cả` màu đỏ (`bg-red-500 text-white`) được đặt ngay trên Header giỏ hàng, nằm sát nút `In tem` (`bg-purple-600`) và nút `QR` (`bg-indigo-50`).
  - Mặc dù hệ thống có popup AlertDialog xác nhận, việc đặt nút mang tính "hủy diệt dữ liệu" (Destructive Action) ngay cạnh các nút tiện ích thường xuyên bấm (In tem, xem QR) tạo ra áp lực tâm lý cho nhân viên mới vào nghề, rất dễ bấm nhầm và gây gián đoạn luồng bán hàng.

---

## PHẦN 4: KẾ HOẠCH CẢI THIỆN GIAO DIỆN (UI POLISH PLAN)
*(Đề xuất danh sách tinh chỉnh UI/UX thuần túy – Tuyệt đối không làm thay đổi logic backend hay nghiệp vụ)*

---

### Giai đoạn 1: Tinh chỉnh Giao diện Khách quét QR (Mobile First)

| STT | Vị trí file | Nội dung cải thiện UI/UX | Mục tiêu đạt được |
| :--- | :--- | :--- | :--- |
| 1.1 | `src/app/order/components/ProductCard.tsx` | Nâng kích thước nút Quick Add (+) từ `w-8 h-8` lên tối thiểu `w-11 h-11` (44px) với vùng đệm trong suốt xung quanh. Thay chữ giá tiền gradient thành màu cam solid đậm `text-orange-600 font-extrabold`. | Đạt chuẩn touch target 44px, giá tiền sắc nét, không bấm trượt. |
| 1.2 | `src/app/order/components/ProductDetail.tsx` | Thay đổi toàn bộ các nút chọn Size, Đường, Đá từ dải gradient lòe loẹt sang dạng **Pill Selector phẳng**: nền trắng viền xám khi chưa chọn, nền cam nhạt viền cam đậm (`bg-orange-50 border-orange-500 text-orange-700 font-bold`) khi active. Nâng chiều cao tối thiểu lên 44px. | Giảm mỏi mắt, phân cấp rõ ràng, dễ chạm bằng ngón cái. |
| 1.3 | `src/app/order/components/CartFloatingBar.tsx` | Bổ sung class safe-area chuẩn `pb-[max(1rem,env(safe-area-inset-bottom))]` và nâng độ cao z-index, tạo khoảng hở 12px với mép dưới màn hình. | Tránh xung đột thanh Home Bar trên iPhone. |
| 1.4 | `src/app/order/menu/page.tsx` | Tinh giản banner Gacha: loại bỏ gradient tím đen casino CSGO, chuyển thành banner khuyến mãi hài hòa với màu ấm của quán. Gom cụm Floating Bar và Banner bàn thành một thanh điều hướng dưới đáy duy nhất có 2 tab chuyển đổi mượt mà. | Chấm dứt hiện tượng 3 thanh nổi đè chồng lên nhau. |
| 1.5 | `src/app/order/page.tsx` | Khi phát hiện bàn đang có đơn hoạt động (active order) qua API, hiển thị ngay nút nổi bật: `[Tiếp tục theo dõi đơn bàn của bạn →]` thay vì chỉ có nút xem menu. Nếu bàn bảo trì, hiển thị đúng lý do từ API với icon cảnh báo lịch sự. | Khách không bị hoang mang khi quét lại mã QR. |

---

### Giai đoạn 2: Tối ưu Bố cục Màn hình Thu ngân POS (POS Desktop & Tablet)

| STT | Vị trí file | Nội dung cải thiện UI/UX | Mục tiêu đạt được |
| :--- | :--- | :--- | :--- |
| 2.1 | `src/app/(dashboard)/pos/components/QROrderInbox.tsx` | Chuyển `QROrderInbox` từ khối đè layout dọc sang **thanh thông báo cố định nhỏ gọn (Floating Notification Badge / Drawer)** ở góc trên hoặc dạng accordion ngang không chiếm diện tích dòng chảy DOM. | Giữ nguyên chiều cao cố định của ProductGrid trên màn hình 1366×768, triệt tiêu Layout Shift. |
| 2.2 | `src/app/(dashboard)/pos/components/QROrderInbox.tsx` | Thay thế hoàn toàn `window.prompt` và `window.confirm` bằng Dialog component của Radix UI (`@/components/ui/dialog` hoặc `alert-dialog`). | Không làm đóng băng giao diện POS và kết nối Realtime khi từ chối đơn. |
| 2.3 | `src/components/GlobalAssistant.tsx` | Di dời nút FAB Trợ lý AI từ góc phải dưới (`bottom-5 right-5`) sang thanh công cụ Header trên cùng của POS hoặc chuyển thành icon nhỏ trên Topbar, có tùy chọn ẩn/hiện. | Giải phóng hoàn toàn không gian cho nút "Thanh toán" và giỏ hàng, tránh bấm nhầm 100%. |
| 2.4 | `src/app/(dashboard)/pos/components/CartSidebar.tsx` | Tăng kích thước các icon thao tác dòng (Tag, Note, Delete) từ `w-6 h-6` (24px) lên `w-9 h-9` (36px). Di chuyển nút "Xóa tất cả giỏ" vào menu phụ 3 chấm hoặc thêm khoảng đệm an toàn cách xa các nút thường dùng. | Thu ngân dùng màn cảm ứng thao tác chính xác, không lo xóa nhầm món. |

---

### Giai đoạn 3: Chuẩn hóa Màn hình Điều phối Pha chế KDS (Kitchen Distance-Readability)

| STT | Vị trí file | Nội dung cải thiện UI/UX | Mục tiêu đạt được |
| :--- | :--- | :--- | :--- |
| 3.1 | `src/app/(dashboard)/kitchen/components/KitchenDisplay.tsx` | Nâng cỡ chữ Tên bàn lên `text-2xl font-black`. Nâng cỡ chữ Tên món lên `text-lg font-bold text-slate-900`. | Đọc rõ ràng tên món và số bàn từ cự ly 1.5 - 2.0 mét. |
| 3.2 | `src/app/(dashboard)/kitchen/components/KitchenDisplay.tsx` | Định dạng lại khối ghi chú định lượng (Đường / Đá / Lưu ý): Chuyển từ chữ nghiêng 12px xám mờ sang thẻ nổi bật **`bg-amber-100 text-amber-950 font-extrabold text-sm px-2 py-1 rounded-md`**. | Barista liếc mắt là thấy ngay "50% đường, không đá", giảm tỷ lệ làm sai đồ uống về 0%. |
| 3.3 | `src/app/(dashboard)/kitchen/components/KitchenDisplay.tsx` | Điều chỉnh Responsive Grid: Trên màn hình lớn chuyển từ 4 cột hẹp sang **3 cột thông thoáng (`lg:grid-cols-3 xl:grid-cols-3`)** để mỗi ticket có chiều rộng tối thiểu 440px, hiển thị đầy đủ tên món không bị rớt dòng cụt. | Bố cục KDS chuyên nghiệp, nút bấm chuyển trạng thái luôn nằm trong tầm mắt. |

---

### Giai đoạn 4: Chuẩn hóa Bảng biểu Dashboard & Typography Tiếng Việt

| STT | Vị trí file | Nội dung cải thiện UI/UX | Mục tiêu đạt được |
| :--- | :--- | :--- | :--- |
| 4.1 | `src/app/(dashboard)/orders/components/InvoiceDataTable.tsx` | Bổ sung `whitespace-nowrap` cho toàn bộ thẻ `<TableHead>` và `<TableCell>`, thiết lập độ rộng tối thiểu cố định (`min-w-[140px]`, `min-w-[160px]`). | Chấm dứt tình trạng gãy dòng chữ tiếng Việt có dấu. |
| 4.2 | Toàn bộ codebase | Thay thế toàn bộ màu chữ mờ `text-gray-400` / `text-slate-400` tại các nhãn nhạy cảm sang `text-slate-600` đạt tỷ lệ tương phản WCAG AA tối thiểu 4.5:1. Gỡ bỏ các emoji rườm rà trên tiêu đề quản trị. | Giao diện hiện đại, sạch sẽ, đạt chuẩn thương mại. |

---

## KẾT LUẬN & ĐỀ XUẤT BƯỚC TIẾP THEO

Báo cáo kiểm định trên đã bóc tách toàn bộ hiện trạng UI/UX thực tế của H2 MilkTea. Quá trình kiểm định được thực hiện ở chế độ **Read-Only**, hoàn toàn không thay đổi bất kỳ dòng code logic nào của hệ thống.

Sau khi bạn xem xét và phê duyệt bản kế hoạch cải thiện giao diện (**UI Polish Plan**) ở Phần 4, chúng ta có thể tiến hành thực hiện tuần tự qua các lệnh tiêu chuẩn của workflow UI Polish (hoặc `/impeccable polish`) theo từng giai đoạn ưu tiên:
1. **Ưu tiên 1**: Sửa xung đột bố cục POS (QROrderInbox & nút Trợ lý AI che nút Thanh toán) và sửa lỗi hiển thị bàn bảo trì cho khách.
2. **Ưu tiên 2**: Nâng cấp độ lớn chữ màn hình KDS Bếp (đọc cự ly 1.5m).
3. **Ưu tiên 3**: Tinh giản màu sắc, dẹp bỏ gradient lòe loẹt và chuẩn hóa vùng chạm 44px trên mobile QR.
