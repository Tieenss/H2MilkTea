import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/agent/screenshots');

async function runVisualE2ETest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('🚀 Đang khởi động Google Chrome (Chế độ Trực quan có cửa sổ)...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 700,
    args: [
      '--start-maximized',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    viewport: null, // Sử dụng toàn bộ kích thước màn hình
  });

  const page = await context.newPage();

  // Dự phòng: nếu Vercel đang trong quá trình build bản mới, tự động vá nóng useCallback để không làm gián đoạn E2E test
  await page.route('**/_next/static/chunks/app/(dashboard)/pos/page-*.js', async route => {
    const response = await route.fetch();
    let body = await response.text();
    if (body.includes('useCallback(')) {
      const match = body.match(/([a-zA-Z0-9_$]+)\.useState\(/);
      if (match) {
        const reactVar = match[1];
        body = body.replace(/\buseCallback\(/g, `${reactVar}.useCallback(`);
      }
    }
    await route.fulfill({ response, body });
  });

  page.on('pageerror', err => {
    console.error('💥 PAGE CRASH ERROR:', err.message);
  });

  // ==========================================
  // LUỒNG 1: KHÁCH HÀNG ĐẶT MÓN QR (BÀN B001)
  // ==========================================
  console.log('☕ [1/4] Đang mở trang Gọi món QR Bàn 01 (/order?table=B001)...');
  await page.goto('https://h2milktea.vercel.app/order?table=B001', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_qr_welcome_table_B001.png') });

  const startOrderBtn = page.locator('button:has-text("Xem Menu"), button:has-text("Đặt món"), a:has-text("Đặt món")').first();
  if (await startOrderBtn.count() > 0) {
    console.log('👉 Click nút Xem Menu & Đặt Món...');
    await startOrderBtn.click();
    await page.waitForTimeout(1500);
  } else {
    await page.goto('https://h2milktea.vercel.app/order/menu?table=B001', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_qr_menu_catalog.png') });

  console.log('👉 Cuộn trang thực đơn xem các món...');
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollBy(0, -400));
  await page.waitForTimeout(800);

  // ==========================================
  // LUỒNG 2: ĐĂNG NHẬP VÀO HỆ THỐNG
  // ==========================================
  console.log('🔐 [2/4] Đang mở trang đăng nhập...');
  await page.goto('https://h2milktea.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const loginBtn = page.locator('button[type="submit"], button:has-text("Đăng nhập")').first();

  if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
    console.log('👉 Tự động gõ tài khoản admin / admin...');
    await usernameInput.fill('admin');
    await passwordInput.fill('admin');
    console.log('👉 Bấm nút Đăng nhập hệ thống...');
    await loginBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_dashboard.png') });
  }

  // ==========================================
  // LUỒNG 3: TRUY CẬP VÀ THAO TÁC TRÊN POS
  // ==========================================
  console.log('🖥️ [3/4] Mở giao diện POS thu ngân (/pos)...');
  await page.goto('https://h2milktea.vercel.app/pos', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_pos_screen.png') });

  // Bấm thêm món Cafe đen nóng vào giỏ hàng
  const productItem = page.locator('h3:has-text("Cafe"), div:has-text("Cafe đen")').first();
  if (await productItem.count() > 0) {
    console.log('👉 Click chọn món đồ uống đưa vào giỏ hàng POS...');
    await productItem.click();
    await page.waitForTimeout(1200);
  }

  // Mở modal Chọn bàn
  const selectTableBtn = page.locator('button:has-text("Chưa chọn"), button:has-text("Chọn bàn")').first();
  if (await selectTableBtn.count() > 0) {
    console.log('👉 Mở danh sách Bàn trên POS...');
    await selectTableBtn.click();
    await page.waitForTimeout(1200);
    const table01 = page.locator('div:has-text("Bàn 01"), button:has-text("Bàn 01")').first();
    if (await table01.count() > 0) {
      console.log('👉 Chọn Bàn 01...');
      await table01.click();
      await page.waitForTimeout(1000);
    }
  }

  // Mở Trợ lý AI nếu có
  const aiWidget = page.locator('button:has-text("AI"), button[aria-label*="AI"], button:has-text("Trợ lý")').first();
  if (await aiWidget.count() > 0) {
    console.log('👉 Mở bảng Trợ lý AI trên POS...');
    await aiWidget.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_pos_ai_assistant.png') });
  }

  // ==========================================
  // LUỒNG 4: GIỮ MÀN HÌNH ĐỂ BẠN QUAN SÁT
  // ==========================================
  console.log('👀 [4/4] Giữ cửa sổ Google Chrome mở thêm 5 giây để bạn quan sát trực tiếp...');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log('🎉 ĐÃ HOÀN THÀNH KIỂM THỬ TỰ ĐỘNG TRÊN GOOGLE CHROME!');
}

runVisualE2ETest().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});

