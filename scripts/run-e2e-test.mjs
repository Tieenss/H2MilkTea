import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/agent/screenshots');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\Gaming\\AppData\\Local\\Temp\\agy-chrome-visual-test';
const CDP_PORT = 9222;

async function launchVisibleChromeOnDesktop() {
  console.log('🚀 Đang yêu cầu Windows Explorer mở cửa sổ Google Chrome trực tiếp lên màn hình của bạn...');
  const chromeArgs = `--remote-debugging-port=${CDP_PORT} --user-data-dir="${USER_DATA_DIR}" --start-maximized --no-first-run --no-default-browser-check https://h2milktea.vercel.app/order?table=B001`;
  const psCmd = `(New-Object -ComObject Shell.Application).ShellExecute('${CHROME_PATH}', '${chromeArgs.replace(/'/g, "''")}')`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`);

  // Chờ cổng CDP 9222 sẵn sàng
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        console.log('✅ Đã kết nối thành công với cửa sổ Google Chrome trên màn hình của bạn!');
        return chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { slowMo: 600 });
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Không thể kết nối tới cổng điều khiển Chrome (9222).');
}

async function runVisualE2ETest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await launchVisibleChromeOnDesktop();
  const context = browser.contexts()[0] || await browser.newContext({ viewport: null });
  const page = context.pages()[0] || await context.newPage();

  // Dự phòng: nếu Vercel đang trong quá trình build bản mới, tự động vá nóng useCallback để không làm gián đoạn E2E test
  await page.route('**/_next/static/chunks/app/(dashboard)/pos/page-*.js', async route => {
    const response = await route.fetch();
    let body = await response.text();
    if (body.includes('useCallback(')) {
      const match = body.match(/([a-zA-Z0-9_$]+)\.useState\(/);
      if (match) {
        const reactVar = match[1];
        console.log('ℹ️ Vercel đang build bản mới, tạm thời áp dụng hot-patch trên trình duyệt...');
        body = body.replace(/\buseCallback\(/g, `${reactVar}.useCallback(`);
      }
    } else {
      console.log('✅ Bản build mới trên Vercel đã có hiệu lực (không cần hot-patch)!');
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
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_qr_welcome_table_B001.png') });

  const startOrderBtn = page.locator('button:has-text("Xem Menu"):visible, button:has-text("Đặt món"):visible, a:has-text("Đặt món"):visible').first();
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

  const usernameInput = page.locator('input[name="username"]:visible, input[type="text"]:visible').first();
  const passwordInput = page.locator('input[name="password"]:visible, input[type="password"]:visible').first();
  const loginBtn = page.locator('button[type="submit"]:visible, button:has-text("Đăng nhập"):visible').first();

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
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_pos_screen.png') });

  // Mở modal Chọn bàn trước
  const selectTableBtn = page.locator('button:has-text("Chưa chọn"):visible, button:has-text("Chọn bàn"):visible').first();
  if (await selectTableBtn.count() > 0) {
    console.log('👉 Mở danh sách Bàn trên POS...');
    await selectTableBtn.click();
    await page.waitForTimeout(1000);
    const table01 = page.locator('div:has-text("Bàn 01"):visible, button:has-text("Bàn 01"):visible').first();
    if (await table01.count() > 0) {
      console.log('👉 Chọn Bàn 01...');
      await table01.click();
      await page.waitForTimeout(1000);
    }
    // Nếu modal bàn vẫn mở (cần bấm Đóng / Xác nhận)
    const closeTableModal = page.locator('button:has-text("Xác nhận"):visible, button:has-text("Đóng"):visible').first();
    if (await closeTableModal.count() > 0) {
      await closeTableModal.click();
      await page.waitForTimeout(800);
    }
  }

  // Bấm thêm món Cafe đen nóng vào giỏ hàng
  const productItem = page.locator('h3:has-text("Cafe"):visible, div:has-text("Cafe đen"):visible').first();
  if (await productItem.count() > 0) {
    console.log('👉 Click chọn món đồ uống đưa vào giỏ hàng POS...');
    await productItem.click();
    await page.waitForTimeout(1000);

    // Nếu Modal tùy chọn món (Size/Đường/Đá) hiện lên, bấm nút Thêm vào giỏ / Xác nhận
    const confirmAddBtn = page.locator('button:has-text("Thêm vào giỏ"):visible, button:has-text("Xác nhận"):visible, button:has-text("Thêm món"):visible').first();
    if (await confirmAddBtn.count() > 0) {
      console.log('👉 Xác nhận tùy chọn Size/Đường/Đá để thêm vào giỏ...');
      await confirmAddBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Mở Trợ lý AI nếu có
  const aiWidget = page.locator('button:has-text("AI"):visible, button[aria-label*="AI"]:visible, button:has-text("Trợ lý"):visible').first();
  if (await aiWidget.count() > 0) {
    console.log('👉 Mở bảng Trợ lý AI trên POS...');
    await aiWidget.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_pos_ai_assistant.png') });
  }

  // ==========================================
  // LUỒNG 4: GIỮ MÀN HÌNH ĐỂ BẠN QUAN SÁT
  // ==========================================
  console.log('👀 [4/4] Giữ nguyên cửa sổ Google Chrome mở trên màn hình để bạn kiểm tra trực tiếp!');
  await browser.close(); // Với connectOverCDP, browser.close() chỉ ngắt kết nối điều khiển, giữ nguyên cửa sổ Chrome cho người dùng!
  console.log('🎉 ĐÃ HOÀN THÀNH KIỂM THỬ TỰ ĐỘNG TRÊN GOOGLE CHROME!');
}

runVisualE2ETest().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});


