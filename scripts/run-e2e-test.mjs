import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/agent/screenshots');

async function runVisualE2ETest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('🚀 Đang khởi động Microsoft Edge (Chế độ Trực quan có cửa sổ)...');
  // Chạy headless: false để hiện cửa sổ thật lên màn hình
  // slowMo: 800ms để người dùng nhìn thấy rõ từng thao tác click và nhập liệu
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 800,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: null, // Sử dụng toàn bộ kích thước màn hình
  });

  const page = await context.newPage();

  // ==========================================
  // LUỒNG 1: KHÁCH HÀNG ĐẶT MÓN QR (BÀN B001)
  // ==========================================
  console.log('☕ [1/4] Đang mở trang Gọi món QR Bàn 01 (/order?table=B001)...');
  await page.goto('https://h2milktea.vercel.app/order?table=B001', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_qr_welcome_table_B001.png') });

  // Tìm nút "Xem Menu & Đặt Món"
  const startOrderBtn = page.locator('button:has-text("Xem Menu"), button:has-text("Đặt món"), a:has-text("Đặt món")').first();
  if (await startOrderBtn.count() > 0) {
    console.log('👉 Click nút Xem Menu & Đặt Món...');
    await startOrderBtn.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto('https://h2milktea.vercel.app/order/menu?table=B001', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_qr_menu_catalog.png') });

  // Cuộn nhẹ trang thực đơn để quan sát
  console.log('👉 Cuộn trang thực đơn xem các món...');
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollBy(0, -400));
  await page.waitForTimeout(1000);

  // Click vào món đầu tiên để tùy biến
  const productCard = page.locator('div[role="button"], button, div.cursor-pointer').first();
  if (await productCard.count() > 0) {
    console.log('👉 Bấm chọn món đồ uống...');
    await productCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_qr_customize_modal.png') });

    // Đóng hoặc thêm vào giỏ nếu có modal
    const closeOrAdd = page.locator('button:has-text("Đã hiểu"), button:has-text("Thêm vào giỏ"), button:has-text("Xác nhận")').first();
    if (await closeOrAdd.count() > 0) {
      await closeOrAdd.click();
      await page.waitForTimeout(1000);
    }
  }

  // ==========================================
  // LUỒNG 2: ĐĂNG NHẬP VÀO HỆ THỐNG
  // ==========================================
  console.log('🔐 [2/4] Đang mở trang đăng nhập...');
  await page.goto('https://h2milktea.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const loginBtn = page.locator('button[type="submit"], button:has-text("Đăng nhập")').first();

  if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
    console.log('👉 Tự động gõ username: admin...');
    await usernameInput.fill('admin');
    await page.waitForTimeout(500);

    console.log('👉 Tự động gõ password: admin...');
    await passwordInput.fill('admin');
    await page.waitForTimeout(500);

    console.log('👉 Bấm nút Đăng nhập hệ thống...');
    await loginBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_dashboard.png') });
  }

  // ==========================================
  // LUỒNG 3: TRUY CẬP VÀ THAO TÁC TRÊN POS
  // ==========================================
  console.log('🖥️ [3/4] Mở giao diện POS thu ngân (/pos)...');
  await page.goto('https://h2milktea.vercel.app/pos', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_pos_screen.png') });

  // Chọn Bàn
  const tableBtn = page.locator('button:has-text("Bàn"), div:has-text("Bàn 01"), div:has-text("B001")').first();
  if (await tableBtn.count() > 0) {
    console.log('👉 Chọn bàn trên giao diện POS...');
    await tableBtn.click();
    await page.waitForTimeout(1000);
  }

  // Bấm chọn một sản phẩm vào giỏ
  const itemInPos = page.locator('div.cursor-pointer, button:has-text("Cafe"), div:has-text("Cafe")').first();
  if (await itemInPos.count() > 0) {
    console.log('👉 Click thêm một món vào đơn hàng POS...');
    await itemInPos.click();
    await page.waitForTimeout(1500);
  }

  // Thử mở Trợ lý AI nếu có
  const aiWidget = page.locator('button:has-text("AI"), button[aria-label*="AI"], button:has-text("Trợ lý")').first();
  if (await aiWidget.count() > 0) {
    console.log('👉 Mở bảng Trợ lý AI...');
    await aiWidget.click();
    await page.waitForTimeout(2000);
  }

  // ==========================================
  // LUỒNG 4: GIỮ MÀN HÌNH ĐỂ BẠN QUAN SÁT
  // ==========================================
  console.log('👀 [4/4] Giữ cửa sổ trình duyệt mở thêm 8 giây để bạn quan sát trực tiếp...');
  await page.waitForTimeout(8000);

  await browser.close();
  console.log('🎉 ĐÃ HOÀN THÀNH KIỂM THỬ TRỰC QUAN TRÊN MÀN HÌNH CỦA BẠN!');
}

runVisualE2ETest().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
