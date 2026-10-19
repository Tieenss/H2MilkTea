import { chromium } from 'playwright-core';

async function debug() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('💥 PAGE CRASH ERROR:');
    console.log(err.stack || err.message);
  });

  console.log('1. Đang đăng nhập...');
  await page.goto('https://h2milktea.vercel.app/', { waitUntil: 'networkidle' });
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('admin');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  console.log('2. Đang truy cập /pos...');
  await page.goto('https://h2milktea.vercel.app/pos', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  await browser.close();
}

debug().catch(console.error);
