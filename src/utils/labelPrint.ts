import QRCode from 'qrcode';
import { CartItem } from '@/app/(dashboard)/pos/types/pos';
import { 
  LabelSettings, 
  PrintableLabelItem, 
  LabelOrderInfo,
  LabelElementSizes
} from '@/types/labelSettings';
import { getLabelSettings, LABEL_PAPER_SIZES, getPresetElementSizes } from './labelSettings';
import { formatCurrency } from '@/app/(dashboard)/pos/utils/formatters';
import { dispatchDirectOrRemotePrint } from './printBridgeClient';

// Chuẩn hóa chuỗi tiếng Việt (hỗ trợ cả NFC lẫn NFD) và loại bỏ dấu để so sánh danh mục chính xác
const normalizeText = (text?: string): string => {
  if (!text) return '';
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .trim();
};

const COFFEE_KEYWORDS = [
  'ca phe', 'cafe', 'coffee', 'bac xiu', 'espresso', 'latte', 'capuchino', 'cappuccino', 'cold brew', 'phin', 'den da', 'nau da'
];

export interface PrintOrderLabelsOptions {
  customSettings?: LabelSettings;
  forceAll?: boolean; // Khi thu ngân bấm in riêng lẻ 1 món hoặc đã chủ động tích chọn món từ modal
}

// Lấy kích thước tem theo mm
export const getLabelDimensions = (settings: LabelSettings): { width: number; height: number } => {
  if (settings.paperSize === 'custom') {
    return {
      width: settings.customWidthMm || 50,
      height: settings.customHeightMm || 30,
    };
  }
  const config = LABEL_PAPER_SIZES[settings.paperSize] || LABEL_PAPER_SIZES['50x30'];
  return { width: config.width, height: config.height };
};

// Sinh mã QR dưới dạng Data URL hình ảnh
export const generateQRCodeDataUrl = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 120,
      margin: 0,
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('Lỗi sinh mã QR cho tem dán:', error);
    return '';
  }
};

// Lấy bộ kích thước chi tiết đã đồng bộ với preset
export const resolveLabelElementSizes = (settings: LabelSettings): LabelElementSizes => {
  const presetSizes = getPresetElementSizes(settings.fontSize);
  return {
    ...presetSizes,
    ...(settings.elementSizes || {}),
  };
};

// Tạo HTML cho 1 con tem dán ly
export const renderSingleLabelHtml = async (
  item: PrintableLabelItem,
  orderInfo: LabelOrderInfo,
  settings: LabelSettings
): Promise<string> => {
  const { width, height } = getLabelDimensions(settings);
  const fields = settings.fields;
  const sizes = resolveLabelElementSizes(settings);

  let qrDataUrl = '';
  if (fields.showBarcodeOrQR === 'qr') {
    const qrContent = orderInfo.orderId ? `H2POS-${orderInfo.orderId}-${item.itemIndex}` : `H2-${item.name}`;
    qrDataUrl = await generateQRCodeDataUrl(qrContent);
  }

  const productNameBoldWeight = fields.productNameBold !== false ? 900 : 600;
  const priceBoldWeight = fields.priceBold !== false ? 800 : 500;
  const productNameWrapStyle =
    fields.productNameWrap !== false
      ? 'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;'
      : 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
  const headerJustify = fields.headerAlign === 'center' ? 'center; gap: 6px' : 'space-between';

  return `
    <div class="label-sticker" style="
      width: ${width}mm;
      height: ${height}mm;
      box-sizing: border-box;
      padding: 1.5mm 2mm;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #000;
      background: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      position: relative;
    ">
      <!-- HEADER -->
      <div style="display: flex; justify-content: ${headerJustify}; align-items: baseline; border-bottom: 0.5px solid #000; padding-bottom: 1px; margin-bottom: 1.5px;">
        <span style="font-weight: 800; font-size: ${sizes.storeNameSize}px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;">
          ${fields.showStoreName ? fields.storeName : ''}
        </span>
        <div style="font-size: ${sizes.tableAndIndexSize}px; font-weight: 700; white-space: nowrap;">
          ${fields.showTable && orderInfo.tableName ? `[${orderInfo.tableName}]` : ''}
          ${fields.showOrderIndex ? `<span style="margin-left: 2px;">#${item.itemIndex}/${item.totalItems}</span>` : ''}
        </div>
      </div>

      <!-- MAIN ITEM -->
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; overflow: hidden;">
        <div style="font-weight: ${productNameBoldWeight}; font-size: ${sizes.productNameSize}px; line-height: 1.15; margin-bottom: 2px; text-transform: uppercase; ${productNameWrapStyle}">
          ${item.name} ${item.size ? `[${item.size}]` : ''}
        </div>

        <!-- OPTIONS (Đường / Đá) -->
        ${fields.showOptions && (item.sugar || item.ice) ? `
          <div style="font-size: ${sizes.optionsSize}px; font-weight: 600; line-height: 1.1; margin-bottom: 1.5px;">
            ${item.sugar ? `Đường: ${item.sugar}` : ''}
            ${item.sugar && item.ice ? ' · ' : ''}
            ${item.ice ? `Đá: ${item.ice}` : ''}
          </div>
        ` : ''}

        <!-- TOPPINGS -->
        ${fields.showToppings && item.toppings && item.toppings.length > 0 ? `
          <div style="font-size: ${sizes.toppingsSize}px; color: #111; line-height: 1.1; margin-bottom: 1.5px;">
            ${item.toppings.map(t => `+ ${t}`).join(', ')}
          </div>
        ` : ''}

        <!-- NOTE -->
        ${fields.showNote && item.note ? `
          <div style="font-size: ${sizes.noteSize}px; font-style: italic; color: #222; line-height: 1.1;">
            * ${item.note}
          </div>
        ` : ''}
      </div>

      <!-- FOOTER -->
      <div style="border-top: 0.5px dashed #000; padding-top: 1.5px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="display: flex; align-items: center; gap: 4px;">
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" style="width: ${sizes.qrCodeSize}px; height: ${sizes.qrCodeSize}px; object-fit: contain;" alt="QR" />
          ` : fields.showBarcodeOrQR === 'barcode' ? `
            <div style="font-size: ${Math.max(6, sizes.metaSize - 0.5)}px; font-family: monospace; letter-spacing: -0.5px; border: 0.5px solid #000; padding: 0 2px;">
              |||||||||||||||
            </div>
          ` : ''}
          <div style="font-size: ${sizes.metaSize}px; line-height: 1.05;">
            ${fields.showDateTime ? `<div>${orderInfo.createdAt instanceof Date ? orderInfo.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (orderInfo.createdAt || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))}</div>` : ''}
            ${fields.showCashier && (orderInfo.cashier || orderInfo.cashierName) ? `<div>TN: ${orderInfo.cashier || orderInfo.cashierName}</div>` : ''}
          </div>
        </div>

        <div style="text-align: right;">
          ${fields.showPrice ? `
            <div style="font-weight: ${priceBoldWeight}; font-size: ${sizes.priceSize}px; line-height: 1.1;">
              ${formatCurrency(item.price)}
            </div>
          ` : ''}
          ${fields.footerMessage ? `
            <div style="font-size: ${sizes.footerMessageSize}px; font-style: italic; opacity: 0.85; line-height: 1.05;">
              ${fields.footerMessage}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

// ==========================================
// CHẾ ĐỘ 1: IN QUA TRÌNH DUYỆT (BROWSER PRINT)
// ==========================================
export const printLabelsViaBrowser = async (
  labelHtmlList: string[],
  settings: LabelSettings
): Promise<boolean> => {
  if (typeof window === 'undefined' || labelHtmlList.length === 0) return false;

  const { width, height } = getLabelDimensions(settings);

  // Tạo iframe ẩn để in tem
  const iframeId = 'h2-label-print-frame';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) return false;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>In tem nhãn dán ly - H2 MilkTea</title>
        <style>
          @page {
            size: ${width}mm ${height}mm;
            margin: 0;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            .label-container {
              width: ${width}mm;
              margin: 0;
              padding: 0;
            }
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          ${labelHtmlList.join('')}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Đợi hình ảnh/mã QR trong iframe tải xong trước khi in
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('Lỗi khi kích hoạt lệnh in tem trình duyệt:', err);
        resolve(false);
      }
    }, 350);
  });
};

// ==========================================
// CHẾ ĐỘ 2: IN TRỰC TIẾP QUA WEB SERIAL API (TSPL PROTOCOL)
// ==========================================
interface SerialPortLike {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable: {
    getWriter: () => {
      write: (data: Uint8Array) => Promise<void>;
      releaseLock: () => void;
    };
  };
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
}

// Quy đổi kích thước px trên giao diện sang mã font và hệ số nhân (x_mul, y_mul) chuẩn TSPL (203 DPI: 1mm = 8 dots)
const mapPxToTsplFont = (px: number): { font: string; xMul: number; yMul: number; lineHeightDots: number } => {
  if (px <= 7.5) {
    return { font: '1', xMul: 1, yMul: 1, lineHeightDots: 16 };
  }
  if (px <= 9.5) {
    return { font: '2', xMul: 1, yMul: 1, lineHeightDots: 20 };
  }
  if (px <= 12) {
    return { font: '3', xMul: 1, yMul: 1, lineHeightDots: 26 };
  }
  if (px <= 14.5) {
    return { font: '4', xMul: 1, yMul: 1, lineHeightDots: 32 };
  }
  if (px <= 17) {
    return { font: '3', xMul: 1, yMul: 2, lineHeightDots: 44 };
  }
  return { font: '4', xMul: 1, yMul: 2, lineHeightDots: 52 };
};

export const printLabelsViaWebSerial = async (
  items: PrintableLabelItem[],
  orderInfo: LabelOrderInfo,
  settings: LabelSettings
): Promise<boolean> => {
  const nav = typeof window !== 'undefined' ? (navigator as NavigatorWithSerial) : null;
  if (!nav?.serial) {
    throw new Error('Trình duyệt hiện tại không hỗ trợ Web Serial API (vui lòng dùng Google Chrome hoặc Microsoft Edge).');
  }

  const { width, height } = getLabelDimensions(settings);
  const fields = settings.fields;
  const sizes = resolveLabelElementSizes(settings);

  try {
    // Yêu cầu người dùng chọn cổng USB máy in
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();

    for (const item of items) {
      // Chuỗi lệnh TSPL (Thermal Series Printer Language)
      let tspl = '';
      tspl += `SIZE ${width} mm, ${height} mm\r\n`;
      tspl += `GAP 2 mm, 0 mm\r\n`;
      tspl += `DENSITY ${settings.density || 10}\r\n`;
      tspl += `DIRECTION 1\r\n`;
      tspl += `CLS\r\n`;

      const storeFont = mapPxToTsplFont(sizes.storeNameSize);
      const tableFont = mapPxToTsplFont(sizes.tableAndIndexSize);
      const productFont = mapPxToTsplFont(sizes.productNameSize);
      const optionsFont = mapPxToTsplFont(sizes.optionsSize);
      const toppingsFont = mapPxToTsplFont(sizes.toppingsSize);
      const noteFont = mapPxToTsplFont(sizes.noteSize);
      const priceFont = mapPxToTsplFont(sizes.priceSize);
      const metaFont = mapPxToTsplFont(sizes.metaSize);
      const footerFont = mapPxToTsplFont(sizes.footerMessageSize);

      // Header
      let y = 10;
      const headerHeight = Math.max(storeFont.lineHeightDots, tableFont.lineHeightDots);
      if (fields.showStoreName) {
        tspl += `TEXT 15,${y},"${storeFont.font}",0,${storeFont.xMul},${storeFont.yMul},"${fields.storeName.toUpperCase()}"\r\n`;
      }
      if (fields.showTable && orderInfo.tableName) {
        tspl += `TEXT ${width * 5},${y},"${tableFont.font}",0,${tableFont.xMul},${tableFont.yMul},"${orderInfo.tableName}"\r\n`;
      }
      if (fields.showOrderIndex) {
        tspl += `TEXT ${width * 6 + 45},${y},"${tableFont.font}",0,${tableFont.xMul},${tableFont.yMul},"#${item.itemIndex}/${item.totalItems}"\r\n`;
      }
      y += headerHeight + 4;

      // Tên món (hỗ trợ tự xuống 2 dòng nếu productNameWrap !== false và tên món dài)
      const fullProductName = `${item.name.toUpperCase()} ${item.size ? `[${item.size}]` : ''}`.trim();
      const maxCharsPerLine = sizes.productNameSize >= 14 ? 20 : 26;
      if (fields.productNameWrap !== false && fullProductName.length > maxCharsPerLine) {
        const line1 = fullProductName.slice(0, maxCharsPerLine);
        const line2 = fullProductName.slice(maxCharsPerLine, maxCharsPerLine * 2);
        tspl += `TEXT 15,${y},"${productFont.font}",0,${productFont.xMul},${productFont.yMul},"${line1}"\r\n`;
        y += productFont.lineHeightDots;
        tspl += `TEXT 15,${y},"${productFont.font}",0,${productFont.xMul},${productFont.yMul},"${line2}"\r\n`;
        y += productFont.lineHeightDots + 2;
      } else {
        tspl += `TEXT 15,${y},"${productFont.font}",0,${productFont.xMul},${productFont.yMul},"${fullProductName}"\r\n`;
        y += productFont.lineHeightDots + 2;
      }

      // Đường / Đá
      if (fields.showOptions && (item.sugar || item.ice)) {
        const optText = `${item.sugar ? `D:${item.sugar}` : ''} ${item.ice ? `Da:${item.ice}` : ''}`.trim();
        tspl += `TEXT 15,${y},"${optionsFont.font}",0,${optionsFont.xMul},${optionsFont.yMul},"${optText}"\r\n`;
        y += optionsFont.lineHeightDots;
      }

      // Topping
      if (fields.showToppings && item.toppings && item.toppings.length > 0) {
        const topText = item.toppings.map(t => `+${t}`).join(' ');
        tspl += `TEXT 15,${y},"${toppingsFont.font}",0,${toppingsFont.xMul},${toppingsFont.yMul},"${topText}"\r\n`;
        y += toppingsFont.lineHeightDots;
      }

      // Note
      if (fields.showNote && item.note) {
        tspl += `TEXT 15,${y},"${noteFont.font}",0,${noteFont.xMul},${noteFont.yMul},"* ${item.note}"\r\n`;
        y += noteFont.lineHeightDots;
      }

      // Footer trái (Ngày giờ & Thu ngân)
      const footerBaseY = Math.max(y + 4, height * 8 - 44);
      if (fields.showDateTime || fields.showCashier) {
        const timeStr = fields.showDateTime
          ? (orderInfo.createdAt instanceof Date
              ? orderInfo.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : (orderInfo.createdAt || ''))
          : '';
        const cashierStr = fields.showCashier ? (orderInfo.cashier || orderInfo.cashierName || '') : '';
        const metaLine = [timeStr, cashierStr ? `TN:${cashierStr}` : ''].filter(Boolean).join(' ');
        if (metaLine) {
          tspl += `TEXT 15,${footerBaseY},"${metaFont.font}",0,${metaFont.xMul},${metaFont.yMul},"${metaLine}"\r\n`;
        }
      }

      // Giá và Lời chúc cuối tem (Footer phải)
      if (fields.showPrice) {
        tspl += `TEXT ${width * 5 - 10},${footerBaseY - 4},"${priceFont.font}",0,${priceFont.xMul},${priceFont.yMul},"${formatCurrency(item.price)}"\r\n`;
      }
      if (fields.footerMessage) {
        tspl += `TEXT 15,${footerBaseY + metaFont.lineHeightDots},"${footerFont.font}",0,${footerFont.xMul},${footerFont.yMul},"${fields.footerMessage}"\r\n`;
      }

      // In 1 nhãn
      tspl += `PRINT 1,1\r\n`;

      await writer.write(encoder.encode(tspl));
    }

    writer.releaseLock();
    await port.close();
    return true;
  } catch (err: unknown) {
    console.error('Lỗi in qua Web Serial USB:', err);
    throw err;
  }
};

// ==========================================
// HÀM ĐIỀU PHỐI IN TOÀN BỘ TEM LY CỦA ĐƠN HÀNG
// ==========================================
export const printOrderLabels = async (
  cartItems: CartItem[],
  orderInfo: LabelOrderInfo,
  customSettingsOrOptions?: LabelSettings | PrintOrderLabelsOptions
): Promise<{ success: boolean; labelCount: number; message: string }> => {
  const options: PrintOrderLabelsOptions = 
    customSettingsOrOptions && 'connectionType' in customSettingsOrOptions
      ? { customSettings: customSettingsOrOptions as LabelSettings }
      : (customSettingsOrOptions as PrintOrderLabelsOptions) || {};

  const settings = options.customSettings || getLabelSettings();

  if (!settings.enabled) {
    return { success: false, labelCount: 0, message: 'Tính năng in tem nhãn dán ly đang bị tắt trong cài đặt.' };
  }

  // Lọc sản phẩm thuộc các danh mục được phép in tem
  const applicableCategories = settings.applicableCategories.map(c => normalizeText(c));
  const isCoffeeAllowed = applicableCategories.some(c => c.includes('ca phe') || c.includes('cafe') || c.includes('coffee'));

  // Tách từng sản phẩm theo số lượng (vd: số lượng 2 -> 2 ly)
  const printableItems: Omit<PrintableLabelItem, 'itemIndex' | 'totalItems'>[] = [];

  for (const item of cartItems) {
    const itemRecord = item as unknown as Record<string, unknown>;
    const rawCategory = typeof itemRecord['Loại sản phẩm'] === 'string'
      ? itemRecord['Loại sản phẩm']
      : typeof itemRecord.category === 'string'
      ? itemRecord.category
      : '';
    const normCategory = normalizeText(rawCategory);
    const normName = normalizeText(item.name);

    // Kiểm tra món cà phê qua từ khóa nếu trong cài đặt đã bật danh mục Cà phê (Mục #6)
    const isCoffeeItem = COFFEE_KEYWORDS.some(kw => normCategory.includes(kw) || normName.includes(kw));

    // Nếu thu ngân bấm in riêng lẻ món này (cartItems.length === 1) hoặc có flag forceAll: Luôn cho phép in
    const isForcePrint = options.forceAll || cartItems.length === 1;

    const isApplicable = isForcePrint ||
      applicableCategories.length === 0 || 
      applicableCategories.some(cat => normCategory.includes(cat) || normName.includes(cat)) ||
      (isCoffeeAllowed && isCoffeeItem);

    if (isApplicable) {
      const qty = Math.max(1, item.quantity || 1);
      for (let i = 0; i < qty; i++) {
        printableItems.push({
          id: `${item.id}-${i}`,
          name: item.name,
          size: item.size,
          sugar: item.sugar,
          ice: item.ice,
          toppings: item.toppings,
          note: item.note,
          price: item.price,
          category: rawCategory,
        });
      }
    }
  }

  const totalItems = printableItems.length;
  if (totalItems === 0) {
    return { success: false, labelCount: 0, message: 'Đơn hàng không có sản phẩm nào thuộc danh mục cần in tem ly.' };
  }

  const finalLabels: PrintableLabelItem[] = printableItems.map((item, idx) => ({
    ...item,
    itemIndex: idx + 1,
    totalItems,
  }));

  // Thực hiện in theo chế độ đã cấu hình
  if (settings.connectionType === 'usb_serial') {
    try {
      await printLabelsViaWebSerial(finalLabels, orderInfo, settings);
      return { success: true, labelCount: totalItems, message: `Đã in thành công ${totalItems} tem ly qua cổng USB.` };
    } catch (error: unknown) {
      console.warn('In qua Web Serial thất bại, chuyển hướng sang In Trình duyệt...', error);
      // Fallback tự động sang Browser Print nếu người dùng huỷ cấp quyền USB
    }
  }

  // Chế độ in Trình duyệt / Trạm in trực tiếp / In từ xa qua điện thoại
  const htmlList = await Promise.all(
    finalLabels.map(item => renderSingleLabelHtml(item, orderInfo, settings))
  );

  const { width, height } = getLabelDimensions(settings);
  const wrappedHtmlList = htmlList.map((labelHtml) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: ${width}mm ${height}mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .label-container { width: ${width}mm; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div class="label-container">${labelHtml}</div>
  </body>
</html>`);

  const bridgeResult = await dispatchDirectOrRemotePrint({
    jobType: 'label',
    htmlList: wrappedHtmlList,
    tableName: orderInfo.tableName || orderInfo.tableId || 'Khách mang về',
    widthMm: width,
    heightMm: height,
    requestedBy: orderInfo.cashierName || orderInfo.cashier,
  });

  if (bridgeResult.handled) {
    return {
      success: bridgeResult.success,
      labelCount: totalItems,
      message: bridgeResult.message || (bridgeResult.success
        ? `Đã gửi lệnh in ${totalItems} tem nhãn dán ly thành công.`
        : 'Không thể in tem qua trạm in trực tiếp.'),
    };
  }

  const ok = await printLabelsViaBrowser(htmlList, settings);
  return {
    success: ok,
    labelCount: totalItems,
    message: ok ? `Đã gửi lệnh in ${totalItems} tem nhãn dán ly thành công.` : 'Có lỗi khi gửi lệnh in.',
  };
};
