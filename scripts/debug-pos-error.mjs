import { chromium } from 'playwright-core';

async function debug() {
  console.log('🚀 Đang mở trình duyệt Google Chrome trên màn hình của bạn...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 400,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // Nếu Vercel chưa kịp build xong bản mới, tự động vá nóng (hot-patch) useCallback trong bundle /pos để kiểm tra toàn bộ luồng POS
  await page.route('**/_next/static/chunks/app/(dashboard)/pos/page-*.js', async route => {
    const response = await route.fetch();
    let body = await response.text();
    if (body.includes('useCallback(')) {
      const match = body.match(/([a-zA-Z0-9_$]+)\.useState\(/);
      if (match) {
        const reactVar = match[1];
        console.log(`🔧 Phát hiện bundle cũ trên Vercel, đang áp dụng bản vá CartSidebar (${reactVar}.useCallback) trực tiếp trên trình duyệt...`);
        body = body.replace(/\buseCallback\(/g, `${reactVar}.useCallback(`);
      }
    }
    await route.fulfill({ response, body });
  });

  let errorCount = 0;
  page.on('console', async msg => {
    if (msg.type() === 'error') {
      errorCount++;
      console.log(`🔴 CONSOLE [ERROR]:`, msg.text());
    }
  });

  page.on('pageerror', err => {
    errorCount++;
    console.log('💥 PAGE CRASH ERROR:', err.name, '-', err.message);
    console.log(err.stack || err);
  });

  console.log('1. Đang mở trang đăng nhập https://h2milktea.vercel.app/ ...');
  await page.goto('https://h2milktea.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('admin');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  console.log('2. Đang truy cập https://h2milktea.vercel.app/pos ...');
  await page.goto('https://h2milktea.vercel.app/pos', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const hasAppError = bodyText.includes('Application error: a client-side exception');
  console.log('📊 Trạng thái trang /pos:', hasAppError ? '❌ VẪN LỖI' : '✅ HIỂN THỊ THÀNH CÔNG (Không còn lỗi Application error)');
  console.log('📄 Nội dung hiển thị tóm tắt:', bodyText.replace(/\s+/g, ' ').slice(0, 300));

  await browser.close();
  console.log(`🏁 Hoàn tất kiểm tra. Tổng số lỗi phát sinh: ${errorCount}`);
}

debug().catch(console.error);


