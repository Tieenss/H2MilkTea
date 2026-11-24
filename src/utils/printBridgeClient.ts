// src/utils/printBridgeClient.ts
// Quản lý chế độ in trực tiếp không qua Ctrl+P (Local Print Bridge) & In từ xa từ Điện thoại -> Máy tính

export type DirectPrintMode = 'browser' | 'local_bridge' | 'remote_relay';

export interface LocalPrintDeviceConfig {
  mode: DirectPrintMode;
  bridgeUrl: string;
  receiptPrinterName: string;
  labelPrinterName: string;
  autoFallbackToBrowser: boolean;
}

export interface WindowsPrinterInfo {
  name: string;
  driverName: string;
  portName: string;
  isDefault: boolean;
  status: string;
}

const STORAGE_KEY = 'h2_print_bridge_device_config_v1';

export function isLikelyMobileOrTablet(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Windows NT|Macintosh|CrOS|Linux x86_64/i.test(ua) && !/Android|Mobile|iPad|iPhone|iPod/i.test(ua)) {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
}

export function getDefaultPrintDeviceConfig(): LocalPrintDeviceConfig {
  const isMobile = isLikelyMobileOrTablet();
  return {
    mode: isMobile ? 'remote_relay' : 'local_bridge',
    bridgeUrl: 'http://127.0.0.1:18181',
    receiptPrinterName: '',
    labelPrinterName: '',
    autoFallbackToBrowser: true,
  };
}

export function getPrintDeviceConfig(): LocalPrintDeviceConfig {
  const defaults = getDefaultPrintDeviceConfig();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function savePrintDeviceConfig(cfg: LocalPrintDeviceConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('h2:print-config-changed', { detail: cfg }));
  } catch {
    // ignore storage error
  }
}

/**
 * Đồng bộ tên máy in từ Cloud về máy hiện tại (rất hữu ích khi mở web trên Điện thoại lần đầu)
 */
export async function syncPrintConfigFromCloud(): Promise<LocalPrintDeviceConfig> {
  const current = getPrintDeviceConfig();
  if (typeof window === 'undefined') return current;
  try {
    const res = await fetch('/api/print/dispatch', { cache: 'no-store' });
    if (!res.ok) return current;
    const json = await res.json();
    if (json?.success && json.config) {
      const merged: LocalPrintDeviceConfig = {
        ...current,
        receiptPrinterName: json.config.receiptPrinterName || current.receiptPrinterName,
        labelPrinterName: json.config.labelPrinterName || current.labelPrinterName,
        bridgeUrl: json.config.bridgeUrl || current.bridgeUrl,
        autoFallbackToBrowser:
          typeof json.config.autoFallbackToBrowser === 'boolean'
            ? json.config.autoFallbackToBrowser
            : current.autoFallbackToBrowser,
      };
      savePrintDeviceConfig(merged);
      return merged;
    }
  } catch {
    // ignore network error
  }
  return current;
}

/**
 * Kiểm tra trạng thái Trạm In Nền Windows trên máy tính hiện tại & lấy danh sách máy in USB
 */
export async function probeLocalPrintBridge(
  bridgeUrl = 'http://127.0.0.1:18181'
): Promise<{ online: boolean; printers: WindowsPrinterInfo[] }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${bridgeUrl.replace(/\/$/, '')}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { online: false, printers: [] };
    const json = await res.json();
    return {
      online: Boolean(json?.ok),
      printers: Array.isArray(json?.printers) ? json.printers : [],
    };
  } catch {
    return { online: false, printers: [] };
  }
}

/**
 * Điều phối in im lặng không qua Ctrl+P (Local Bridge hoặc Remote Relay từ Điện thoại -> Máy tính)
 * Trả về { handled: true, ... } nếu đã in qua Bridge/Relay; trả về { handled: false } nếu cần fallback về Ctrl+P trình duyệt.
 */
export async function dispatchDirectOrRemotePrint(params: {
  jobType: 'receipt' | 'label';
  htmlList: string[];
  tableName?: string;
  widthMm: number;
  heightMm?: number;
  requestedBy?: string;
}): Promise<{
  handled: boolean;
  success: boolean;
  via: 'local_bridge' | 'remote_relay' | 'browser';
  message: string;
}> {
  const cfg = getPrintDeviceConfig();
  const printerName =
    params.jobType === 'label' ? cfg.labelPrinterName : cfg.receiptPrinterName;

  if (cfg.mode === 'browser') {
    return { handled: false, success: false, via: 'browser', message: 'Chế độ Ctrl+P trình duyệt' };
  }

  // 1. Nếu là Local Bridge (hoặc đang dùng máy tính quầy): Gửi thẳng về 127.0.0.1:18181 -> Không hiện Ctrl+P
  if (cfg.mode === 'local_bridge') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${cfg.bridgeUrl.replace(/\/$/, '')}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          jobType: params.jobType,
          printerName,
          tableName: params.tableName || 'Khách mang về',
          htmlList: params.htmlList,
          widthMm: params.widthMm,
          heightMm: params.heightMm || 0,
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (json?.success) {
          return {
            handled: true,
            success: true,
            via: 'local_bridge',
            message: `Đã in trực tiếp ${params.htmlList.length} bản ra máy in "${
              printerName || 'Mặc định Windows'
            }" (không qua Ctrl+P)!`,
          };
        }
      }
    } catch (err) {
      console.warn('[PrintBridge] Không kết nối được Trạm In cục bộ:', err);
    }

    if (!cfg.autoFallbackToBrowser) {
      return {
        handled: true,
        success: false,
        via: 'local_bridge',
        message: 'Chưa bật H2 Print Bridge trên máy tính. Vui lòng chạy H2-Print-Bridge.bat để in trực tiếp.',
      };
    }
    return { handled: false, success: false, via: 'browser', message: 'Fallback sang trình duyệt' };
  }

  // 2. Nếu là Remote Relay (Điện thoại / Máy tính bảng gửi lệnh sang Máy tính cắm máy in USB):
  if (cfg.mode === 'remote_relay') {
    try {
      const res = await fetch('/api/print/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: params.jobType,
          printerName,
          tableName: params.tableName || 'Khách mang về',
          htmlList: params.htmlList,
          widthMm: params.widthMm,
          heightMm: params.heightMm || 0,
          requestedBy: params.requestedBy,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        return {
          handled: true,
          success: true,
          via: 'remote_relay',
          message: json.message || `Đã gửi lệnh in bàn "${params.tableName}" sang máy tính quầy!`,
        };
      }
      return {
        handled: true,
        success: false,
        via: 'remote_relay',
        message: json?.error || 'Không thể gửi lệnh in từ xa.',
      };
    } catch (err: any) {
      return {
        handled: true,
        success: false,
        via: 'remote_relay',
        message: err?.message || 'Lỗi mạng khi gửi lệnh in sang máy tính quầy.',
      };
    }
  }

  return { handled: false, success: false, via: 'browser', message: 'Fallback' };
}
