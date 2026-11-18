/**
 * Playwright E2E Specification Suite for H2MilkTea ERP & POS
 * Phối hợp cùng `node scripts/run-e2e-test.mjs` để kiểm thử tự động trên trình duyệt thật (Chromium / Chrome CDP)
 */
import { chromium } from 'playwright-core';

export interface E2EScenarioSpec {
  id: string;
  title: string;
  route: string;
  linkedManualIds: string[];
}

export const PLAYWRIGHT_E2E_SPECS: E2EScenarioSpec[] = [
  {
    id: 'PW-E2E-01',
    title: 'Khách quét QR tại bàn (/order?table=B001) -> Chọn món, Topping, Chế độ chữ lớn -> Thu ngân nhận đơn tại POS',
    route: '/order',
    linkedManualIds: ['E2E-01-HP', 'E2E-01-EDGE', 'E2E-01-SEC'],
  },
  {
    id: 'PW-E2E-02',
    title: 'Đồng bộ giỏ hàng đa thiết bị (OCC HTTP 409) & Chuyển/Gộp bàn theo 4 khu vực chuẩn xếp A -> Z',
    route: '/pos',
    linkedManualIds: ['E2E-02-HP', 'E2E-02-EDGE', 'E2E-02-SEC'],
  },
  {
    id: 'PW-E2E-03',
    title: 'Thanh toán đa phương thức (Tiền mặt, VietQR SePay Webhook), Tích điểm CRM & Chống thanh toán trùng Idempotency',
    route: '/pos',
    linkedManualIds: ['E2E-03-HP', 'E2E-03-EDGE', 'E2E-03-SEC'],
  },
  {
    id: 'PW-E2E-04',
    title: 'Điều phối Bếp / Barista KDS (/kitchen) Realtime, SLA > 10 phút, Barista Mobile 1-Tap & Smart Batch Prep',
    route: '/kitchen',
    linkedManualIds: ['E2E-04-HP', 'E2E-04-EDGE', 'E2E-04-SEC'],
  },
  {
    id: 'PW-E2E-05',
    title: 'Khấu trừ tồn kho nguyên liệu tự động theo định mức BOM (/menu/cauhinhnguyenlieu -> /menu/nguyenlieu)',
    route: '/menu/cauhinhnguyenlieu',
    linkedManualIds: ['E2E-05-HP', 'E2E-05-EDGE', 'E2E-05-SEC'],
  },
  {
    id: 'PW-E2E-06',
    title: 'Đối soát Báo cáo Doanh thu (/reports/sales) & Cơ chế Xóa mềm Hóa đơn (/orders Soft Delete)',
    route: '/reports/sales',
    linkedManualIds: ['E2E-06-HP', 'E2E-06-EDGE', 'E2E-06-SEC'],
  },
];

export async function verifyPlaywrightDriverAvailable(): Promise<boolean> {
  return typeof chromium?.connectOverCDP === 'function';
}
