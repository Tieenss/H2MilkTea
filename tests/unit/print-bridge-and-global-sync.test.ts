import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dispatchDirectOrRemotePrint,
  getDefaultPrintDeviceConfig,
  getPrintDeviceConfig,
  savePrintDeviceConfig,
  syncPrintConfigFromCloud,
} from '@/utils/printBridgeClient';
import { printReceiptWithSettings } from '@/app/(dashboard)/pos/utils/receiptPrint';
import { printOrderLabels } from '@/utils/labelPrint';

function installMockBrowserEnv() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  const mockWindow = {
    innerWidth: 1280,
    dispatchEvent: vi.fn(),
    open: vi.fn(() => null),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    configurable: true,
  });
  if (typeof globalThis.CustomEvent === 'undefined') {
    Object.defineProperty(globalThis, 'CustomEvent', {
      value: class CustomEvent {
        type: string;
        detail: unknown;
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
      configurable: true,
    });
  }
  return { mockWindow, mockLocalStorage };
}

describe('Print Bridge & Remote Phone-to-PC Print Dispatch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    installMockBrowserEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('tự động chọn mặc định local_bridge trên PC và remote_relay trên Điện thoại', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      configurable: true,
    });
    (globalThis.window as unknown as { innerWidth: number }).innerWidth = 1440;
    expect(getDefaultPrintDeviceConfig().mode).toBe('local_bridge');

    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' },
      configurable: true,
    });
    (globalThis.window as unknown as { innerWidth: number }).innerWidth = 390;
    expect(getDefaultPrintDeviceConfig().mode).toBe('remote_relay');
  });

  it('trả về handled=false khi ở chế độ browser (Ctrl+P)', async () => {
    savePrintDeviceConfig({
      mode: 'browser',
      bridgeUrl: 'http://127.0.0.1:18181',
      receiptPrinterName: 'XP-80C',
      labelPrinterName: 'XP-350B',
      autoFallbackToBrowser: true,
    });

    const result = await dispatchDirectOrRemotePrint({
      jobType: 'receipt',
      htmlList: ['<html><body>Bill</body></html>'],
      tableName: 'Bàn 01',
      widthMm: 80,
    });

    expect(result.handled).toBe(false);
    expect(result.via).toBe('browser');
  });

  it('gửi lệnh in trực tiếp tới Local Print Bridge ở chế độ local_bridge không qua Ctrl+P', async () => {
    savePrintDeviceConfig({
      mode: 'local_bridge',
      bridgeUrl: 'http://127.0.0.1:18181',
      receiptPrinterName: 'XP-80C USB',
      labelPrinterName: 'XP-350B USB',
      autoFallbackToBrowser: false,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, printed: 1 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await dispatchDirectOrRemotePrint({
      jobType: 'receipt',
      htmlList: ['<html><body>Hóa đơn Bàn 03</body></html>'],
      tableName: 'Bàn 03',
      widthMm: 80,
      heightMm: 0,
    });

    expect(result).toMatchObject({
      handled: true,
      success: true,
      via: 'local_bridge',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:18181/print');
    const body = JSON.parse(init.body);
    expect(body.printerName).toBe('XP-80C USB');
    expect(body.tableName).toBe('Bàn 03');
    expect(body.widthMm).toBe(80);
  });

  it('tôn trọng autoFallbackToBrowser khi Local Print Bridge không phản hồi', async () => {
    savePrintDeviceConfig({
      mode: 'local_bridge',
      bridgeUrl: 'http://127.0.0.1:18181',
      receiptPrinterName: 'XP-80C',
      labelPrinterName: 'XP-350B',
      autoFallbackToBrowser: false,
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const noFallback = await dispatchDirectOrRemotePrint({
      jobType: 'label',
      htmlList: ['<div>Tem</div>'],
      tableName: 'Bàn 02',
      widthMm: 50,
      heightMm: 30,
    });
    expect(noFallback.handled).toBe(true);
    expect(noFallback.success).toBe(false);

    savePrintDeviceConfig({
      ...getPrintDeviceConfig(),
      autoFallbackToBrowser: true,
    });

    const withFallback = await dispatchDirectOrRemotePrint({
      jobType: 'label',
      htmlList: ['<div>Tem</div>'],
      tableName: 'Bàn 02',
      widthMm: 50,
      heightMm: 30,
    });
    expect(withFallback.handled).toBe(false);
    expect(withFallback.via).toBe('browser');
  });

  it('gửi lệnh in từ xa (remote_relay) từ điện thoại kèm đúng tên bàn đã chọn', async () => {
    savePrintDeviceConfig({
      mode: 'remote_relay',
      bridgeUrl: 'http://127.0.0.1:18181',
      receiptPrinterName: 'XP-80C',
      labelPrinterName: 'XP-350B',
      autoFallbackToBrowser: true,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Đã gửi lệnh in cho bàn "Bàn 07" sang máy tính quầy!',
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await dispatchDirectOrRemotePrint({
      jobType: 'label',
      htmlList: ['<html><body>Tem 1</body></html>', '<html><body>Tem 2</body></html>'],
      tableName: 'Bàn 07',
      widthMm: 50,
      heightMm: 30,
      requestedBy: 'Nhân viên Mobile',
    });

    expect(result.handled).toBe(true);
    expect(result.success).toBe(true);
    expect(result.via).toBe('remote_relay');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/print/dispatch');
    const body = JSON.parse(init.body);
    expect(body.tableName).toBe('Bàn 07');
    expect(body.printerName).toBe('XP-350B');
    expect(body.jobType).toBe('label');
    expect(body.htmlList).toHaveLength(2);
  });

  it('đồng bộ tên máy in từ Cloud về thiết bị hiện tại', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          receiptPrinterName: 'Counter-K80',
          labelPrinterName: 'Counter-Label-50x30',
          bridgeUrl: 'http://127.0.0.1:18181',
          autoFallbackToBrowser: false,
        },
      }),
    }) as unknown as typeof fetch;

    const synced = await syncPrintConfigFromCloud();
    expect(synced.receiptPrinterName).toBe('Counter-K80');
    expect(synced.labelPrinterName).toBe('Counter-Label-50x30');
    expect(synced.autoFallbackToBrowser).toBe(false);
  });

  it('printReceiptWithSettings bỏ qua window.open (Ctrl+P) khi local_bridge thành công', async () => {
    savePrintDeviceConfig({
      mode: 'local_bridge',
      bridgeUrl: 'http://127.0.0.1:18181',
      receiptPrinterName: 'Counter-K80',
      labelPrinterName: '',
      autoFallbackToBrowser: false,
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await printReceiptWithSettings({
      receiptNumber: 'HD001',
      date: new Date('2026-11-24T10:00:00Z'),
      cashier: 'Thu ngân A',
      customer: 'Khách lẻ',
      table: 'Bàn 05',
      items: [{ name: 'Trà sữa trân châu', quantity: 1, price: 35000, total: 35000 }],
      subtotal: 35000,
      discount: 0,
      total: 35000,
      paid: 35000,
      change: 0,
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.tableName).toBe('Bàn 05');
    expect(sent.printerName).toBe('Counter-K80');
  });

  it('printOrderLabels gửi tem đúng bàn qua remote_relay khi dùng trên điện thoại', async () => {
    savePrintDeviceConfig({
      mode: 'remote_relay',
      bridgeUrl: 'http://127.0.0.1:18181',
      receiptPrinterName: 'Counter-K80',
      labelPrinterName: 'XP-350B',
      autoFallbackToBrowser: false,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Đã gửi lệnh in tem Bàn 12 sang máy tính quầy!',
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await printOrderLabels(
      [
        {
          id: 'item-1',
          name: 'Hồng trà sữa',
          price: 30000,
          quantity: 2,
          image: '',
          unit: 'Ly',
          size: 'L',
          sugar: '50%',
          ice: '50%',
          toppings: ['Trân châu đen'],
          category: 'Trà sữa',
        },
      ],
      {
        orderNumber: 'ORD-12',
        tableName: 'Bàn 12',
        cashierName: 'NV Mobile',
        createdAt: new Date('2026-11-24T10:05:00Z'),
      },
      { forceAll: true }
    );

    expect(result.success).toBe(true);
    expect(result.labelCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/print/dispatch');
    const body = JSON.parse(init.body);
    expect(body.tableName).toBe('Bàn 12');
    expect(body.printerName).toBe('XP-350B');
    expect(body.htmlList).toHaveLength(2);
    expect(body.htmlList[0]).toContain('@page');
  });
});
