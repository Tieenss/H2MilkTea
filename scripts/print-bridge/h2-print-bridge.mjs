/**
 * H2 MilkTea — Trạm In Nền Trực Tiếp & In Từ Xa (Windows USB Printer Bridge)
 * -----------------------------------------------------------------------------
 * 1. Lắng nghe HTTP tại http://127.0.0.1:18181 để máy tính tại quầy in im lặng 100%
 *    mà KHÔNG hiện hộp thoại Ctrl+P của trình duyệt.
 * 2. Kết nối Supabase Realtime Channel `h2:print-bridge` để nhận lệnh in từ
 *    Điện thoại / Máy tính bảng gửi về và in đúng bàn, đúng máy in USB Windows.
 * 3. Sử dụng playwright-core (hoặc Edge/Chrome hệ thống) + PowerShell .NET
 *    System.Drawing.Printing để xuất bản in trực tiếp ra mọi Driver USB Windows.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Nạp biến môi trường từ .env.local hoặc .env
dotenv.config({ path: path.join(ROOT_DIR, '.env.local') });
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const PORT = Number(process.env.PRINT_BRIDGE_PORT || 18181);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let cachedBrowser = null;

async function getBrowser() {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    return cachedBrowser;
  }

  // Tìm trình duyệt Edge hoặc Chrome có sẵn trên Windows nếu Playwright chưa tải chromium riêng
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  const executablePath = candidates.find((p) => fs.existsSync(p));
  cachedBrowser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-gpu'],
  });
  return cachedBrowser;
}

/**
 * Lấy danh sách máy in đang cài đặt trên Windows bằng PowerShell
 */
async function listWindowsPrinters() {
  if (process.platform !== 'win32') {
    return [];
  }
  try {
    const psScript =
      'Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json -Compress';
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { timeout: 8000 }
    );
    const trimmed = String(stdout || '').trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((p) => ({
      name: String(p.Name || ''),
      driverName: String(p.DriverName || ''),
      portName: String(p.PortName || ''),
      isDefault: Boolean(p.Default),
      status: String(p.PrinterStatus ?? ''),
    }));
  } catch (err) {
    console.warn('[PrintBridge] Không thể liệt kê máy in Windows:', err?.message || err);
    return [];
  }
}

/**
 * Render HTML thành ảnh PNG độ phân giải 203 DPI (~8px/mm) bằng Chromium Headless
 * và gửi thẳng sang Windows Printer Driver qua .NET System.Drawing.Printing (Không hiện Ctrl+P)
 */
async function printHtmlSilently({ html, printerName, widthMm = 80, heightMm = 0, jobTitle = 'H2MilkTea Print' }) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    deviceScaleFactor: 2, // Tăng độ nét chữ cho máy in nhiệt 203 DPI
    viewport: {
      width: Math.max(200, Math.round(widthMm * 3.78)),
      height: heightMm > 0 ? Math.max(120, Math.round(heightMm * 3.78)) : 900,
    },
  });

  const page = await context.newPage();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'h2print-'));
  const imgPath = path.join(tempDir, 'print.png');

  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);

    // Nếu không cố định chiều cao (như hóa đơn K80 cuộn dài), đo chiều cao thực tế nội dung
    const screenshotOpts = {
      path: imgPath,
      fullPage: heightMm <= 0,
      omitBackground: false,
    };

    if (heightMm > 0) {
      await page.setViewportSize({
        width: Math.max(150, Math.round(widthMm * 3.78)),
        height: Math.max(100, Math.round(heightMm * 3.78)),
      });
    }

    await page.screenshot(screenshotOpts);
  } finally {
    await context.close();
  }

  if (process.platform !== 'win32') {
    console.log(`[PrintBridge] (Non-Windows mock print) Rendered ${imgPath} -> ${printerName}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    return;
  }

  try {
    const safePrinter = String(printerName || '').replace(/'/g, "''");
    const safeImg = imgPath.replace(/'/g, "''");
    const safeTitle = String(jobTitle || 'H2MilkTea').replace(/'/g, "''");

    // In thẳng ảnh ra Windows Printer Spooler với lề 0mm (PageBounds vừa khít khổ giấy)
    const psPrintScript = `
Add-Type -AssemblyName System.Drawing
$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.DocumentName = '${safeTitle}'
if ('${safePrinter}' -ne '') {
  $pd.PrinterSettings.PrinterName = '${safePrinter}'
}
if (-not $pd.PrinterSettings.IsValid) {
  Copy-Item -Path '${safeImg}' -Destination (Join-Path $env:TEMP 'h2-last-virtual-usb-spool.png') -Force
  Write-Output "VIRTUAL_SPOOL_OK:${safePrinter}"
  exit 0
}
if ($pd.PrinterSettings.PrinterName -match 'PDF|XPS|OneNote|Fax') {
  $pd.PrinterSettings.PrintToFile = $true
  $pd.PrinterSettings.PrintFileName = (Join-Path $env:TEMP "${safeTitle}.pdf")
}
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$img = [System.Drawing.Image]::FromFile('${safeImg}')
$pd.add_PrintPage({
  param($sender, $e)
  $bounds = $e.PageBounds
  $ratio = [Math]::Min($bounds.Width / $img.Width, $bounds.Height / $img.Height)
  $drawW = [int]($img.Width * $ratio)
  $drawH = [int]($img.Height * $ratio)
  $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $e.Graphics.DrawImage($img, 0, 0, $drawW, $drawH)
  $e.HasMorePages = $false
})
try {
  $pd.Print()
} finally {
  $img.Dispose()
  $pd.Dispose()
}
`;

    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psPrintScript],
      { timeout: 20000 }
    );
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  }
}

const processedJobIds = new Set();

async function processPrintJob(payload) {
  const {
    jobId = '',
    jobType = 'receipt',
    printerName = '',
    htmlList = [],
    html = '',
    widthMm = 80,
    heightMm = 0,
    tableName = '',
  } = payload || {};

  if (jobId) {
    if (processedJobIds.has(jobId)) {
      return { printedCount: 0, duplicateSkipped: true };
    }
    processedJobIds.add(jobId);
    if (processedJobIds.size > 200) {
      const first = processedJobIds.values().next().value;
      if (first) processedJobIds.delete(first);
    }
  }

  const items = Array.isArray(htmlList) && htmlList.length > 0 ? htmlList : html ? [html] : [];
  if (items.length === 0) {
    throw new Error('Không có nội dung HTML để in');
  }

  console.log(
    `[PrintBridge] Nhận lệnh in [${jobType.toUpperCase()}] (${items.length} bản) | Bàn: "${
      tableName || 'N/A'
    }" | Máy in: "${printerName || 'Mặc định Windows'}"`
  );

  for (let i = 0; i < items.length; i++) {
    await printHtmlSilently({
      html: items[i],
      printerName,
      widthMm: Number(widthMm) || (jobType === 'label' ? 50 : 80),
      heightMm: Number(heightMm) || (jobType === 'label' ? 30 : 0),
      jobTitle: `H2MilkTea-${jobType}-${tableName || 'POS'}-${i + 1}`,
    });
  }

  return { printedCount: items.length };
}

// =========================================================================
// 1. HTTP SERVER CỤC BỘ (CHO MÁY TÍNH QUẦY IN THẲNG KHÔNG QUA CTRL+P)
// =========================================================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    const printers = await listWindowsPrinters();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'H2MilkTea Print Bridge',
        port: PORT,
        printers,
        realtimeConnected: Boolean(SUPABASE_URL && SUPABASE_KEY),
      })
    );
    return;
  }

  if (req.method === 'GET' && req.url === '/printers') {
    const printers = await listWindowsPrinters();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, printers }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await processPrintJob(payload);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        console.error('[PrintBridge] Lỗi xử lý lệnh in HTTP:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err?.message || 'Lỗi in' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log('======================================================');
  console.log(' 🖨️  H2MILKTEA PRINT BRIDGE ĐANG CHẠY NGẦM');
  console.log(` 🌐 Cổng cục bộ: http://127.0.0.1:${PORT}`);
  const printers = await listWindowsPrinters();
  console.log(` 🖨️  Máy in Windows phát hiện (${printers.length}):`);
  printers.forEach((p) => {
    console.log(`    - ${p.name}${p.isDefault ? ' (Mặc định)' : ''} [${p.portName}]`);
  });
  console.log('======================================================');
});

// =========================================================================
// 2. KẾT NỐI SUPABASE REALTIME (NHẬN LỆNH IN TỪ ĐIỆN THOẠI / TABLET)
// =========================================================================
if (SUPABASE_URL && SUPABASE_KEY) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const channel = supabase.channel('h2:print-bridge');

  channel
    .on('broadcast', { event: 'remote_print_job' }, async ({ payload }) => {
      try {
        console.log(
          `[Remote Print] Nhận lệnh từ thiết bị "${payload?.requestedBy || 'Điện thoại'}" cho bàn "${
            payload?.tableName || 'N/A'
          }"`
        );
        const result = await processPrintJob(payload);
        await channel.send({
          type: 'broadcast',
          event: 'remote_print_ack',
          payload: {
            jobId: payload?.jobId,
            success: true,
            tableName: payload?.tableName,
            jobType: payload?.jobType,
            printedCount: result.printedCount,
          },
        });
      } catch (err) {
        console.error('[Remote Print] Lỗi in từ xa:', err);
        await channel.send({
          type: 'broadcast',
          event: 'remote_print_ack',
          payload: {
            jobId: payload?.jobId,
            success: false,
            tableName: payload?.tableName,
            error: err?.message || 'Lỗi in tại trạm máy tính',
          },
        });
      }
    })
    .subscribe((status) => {
      console.log(`[PrintBridge] Trạng thái kênh Supabase Realtime (h2:print-bridge): ${status}`);
    });
} else {
  console.warn(
    '[PrintBridge] Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL/KEY trong .env.local -> Chỉ chạy chế độ in cục bộ HTTP.'
  );
}
