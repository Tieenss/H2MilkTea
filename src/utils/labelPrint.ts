import QRCode from 'qrcode';
import { CartItem } from '@/app/(dashboard)/pos/types/pos';
import { 
  LabelSettings, 
  PrintableLabelItem, 
  LabelOrderInfo 
} from '@/types/labelSettings';
import { getLabelSettings, LABEL_PAPER_SIZES } from './labelSettings';
import { formatCurrency } from '@/app/(dashboard)/pos/utils/formatters';

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

// Tạo HTML cho 1 con tem dán ly
export const renderSingleLabelHtml = async (
  item: PrintableLabelItem,
  orderInfo: LabelOrderInfo,
  settings: LabelSettings
): Promise<string> => {
  const { width, height } = getLabelDimensions(settings);
  const fields = settings.fields;

  let qrDataUrl = '';
  if (fields.showBarcodeOrQR === 'qr') {
    const qrContent = orderInfo.orderId ? `H2POS-${orderInfo.orderId}-${item.itemIndex}` : `H2-${item.name}`;
    qrDataUrl = await generateQRCodeDataUrl(qrContent);
  }

  // Tùy chỉnh kích thước font chữ
  const fontMultiplier = settings.fontSize === 'small' ? 0.85 : settings.fontSize === 'large' ? 1.15 : 1.0;

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
      <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 0.5px solid #000; padding-bottom: 1px; margin-bottom: 1.5px;">
        <span style="font-weight: 800; font-size: ${Math.round(10 * fontMultiplier)}px; text-transform: uppercase;">
          ${fields.showStoreName ? fields.storeName : ''}
        </span>
        <div style="font-size: ${Math.round(9 * fontMultiplier)}px; font-weight: 700;">
          ${fields.showTable && orderInfo.tableName ? `[${orderInfo.tableName}]` : ''}
          ${fields.showOrderIndex ? `<span style="margin-left: 2px;">#${item.itemIndex}/${item.totalItems}</span>` : ''}
        </div>
      </div>

      <!-- MAIN ITEM -->
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; overflow: hidden;">
        <div style="font-weight: 900; font-size: ${Math.round(11 * fontMultiplier)}px; line-height: 1.15; margin-bottom: 2px; text-transform: uppercase;">
          ${item.name} ${item.size ? `[${item.size}]` : ''}
        </div>

        <!-- OPTIONS (Đường / Đá) -->
        ${fields.showOptions && (item.sugar || item.ice) ? `
          <div style="font-size: ${Math.round(9 * fontMultiplier)}px; font-weight: 600; line-height: 1.1; margin-bottom: 1.5px;">
            ${item.sugar ? `Đường: ${item.sugar}` : ''}
            ${item.sugar && item.ice ? ' · ' : ''}
            ${item.ice ? `Đá: ${item.ice}` : ''}
          </div>
        ` : ''}

        <!-- TOPPINGS -->
        ${fields.showToppings && item.toppings && item.toppings.length > 0 ? `
          <div style="font-size: ${Math.round(8.5 * fontMultiplier)}px; color: #111; line-height: 1.1; margin-bottom: 1.5px;">
            ${item.toppings.map(t => `+ ${t}`).join(', ')}
          </div>
        ` : ''}

        <!-- NOTE -->
        ${fields.showNote && item.note ? `
          <div style="font-size: ${Math.round(8 * fontMultiplier)}px; font-style: italic; color: #222; line-height: 1.1;">
            * ${item.note}
          </div>
        ` : ''}
      </div>

      <!-- FOOTER -->
      <div style="border-top: 0.5px dashed #000; padding-top: 1.5px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="display: flex; align-items: center; gap: 4px;">
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" style="width: 18px; height: 18px; object-fit: contain;" alt="QR" />
          ` : ''}
          <div style="font-size: ${Math.round(7.5 * fontMultiplier)}px; line-height: 1.05;">
            ${fields.showDateTime ? `<div>${orderInfo.createdAt instanceof Date ? orderInfo.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : (orderInfo.createdAt || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))}</div>` : ''}
            ${fields.showCashier && (orderInfo.cashier || orderInfo.cashierName) ? `<div>TN: ${orderInfo.cashier || orderInfo.cashierName}</div>` : ''}
          </div>
        </div>

        <div style="text-align: right;">
          ${fields.showPrice ? `
            <div style="font-weight: 800; font-size: ${Math.round(10 * fontMultiplier)}px;">
              ${formatCurrency(item.price)}
            </div>
          ` : ''}
          ${fields.footerMessage ? `
            <div style="font-size: ${Math.round(6.5 * fontMultiplier)}px; font-style: italic; opacity: 0.85;">
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

      // Header
      if (fields.showStoreName) {
        tspl += `TEXT 15,10,"3",0,1,1,"${fields.storeName.toUpperCase()}"\r\n`;
      }
      if (fields.showTable && orderInfo.tableName) {
        tspl += `TEXT ${width * 6},10,"2",0,1,1,"${orderInfo.tableName}"\r\n`;
      }
      if (fields.showOrderIndex) {
        tspl += `TEXT ${width * 6 + 60},10,"2",0,1,1,"#${item.itemIndex}/${item.totalItems}"\r\n`;
      }

      // Tên món
      tspl += `TEXT 15,40,"3",0,1,1,"${item.name.toUpperCase()} ${item.size ? `[${item.size}]` : ''}"\r\n`;

      // Đường / Đá
      let y = 70;
      if (fields.showOptions && (item.sugar || item.ice)) {
        const optText = `${item.sugar ? `D:${item.sugar}` : ''} ${item.ice ? `Da:${item.ice}` : ''}`;
        tspl += `TEXT 15,${y},"2",0,1,1,"${optText}"\r\n`;
        y += 24;
      }

      // Topping
      if (fields.showToppings && item.toppings && item.toppings.length > 0) {
        const topText = item.toppings.map(t => `+${t}`).join(' ');
        tspl += `TEXT 15,${y},"1",0,1,1,"${topText}"\r\n`;
        y += 20;
      }

      // Note
      if (fields.showNote && item.note) {
        tspl += `TEXT 15,${y},"1",0,1,1,"* ${item.note}"\r\n`;
      }

      // Giá và Footer
      if (fields.showPrice) {
        tspl += `TEXT ${width * 5},${height * 7},"3",0,1,1,"${formatCurrency(item.price)}"\r\n`;
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
  customSettings?: LabelSettings
): Promise<{ success: boolean; labelCount: number; message: string }> => {
  const settings = customSettings || getLabelSettings();

  if (!settings.enabled) {
    return { success: false, labelCount: 0, message: 'Tính năng in tem nhãn dán ly đang bị tắt trong cài đặt.' };
  }

  // Lọc sản phẩm thuộc các danh mục được phép in tem
  const applicableCategories = settings.applicableCategories.map(c => c.toLowerCase());

  // Tách từng sản phẩm theo số lượng (vd: số lượng 2 -> 2 ly)
  const printableItems: Omit<PrintableLabelItem, 'itemIndex' | 'totalItems'>[] = [];

  for (const item of cartItems) {
    const itemRecord = item as unknown as Record<string, unknown>;
    const category = typeof itemRecord['Loại sản phẩm'] === 'string'
      ? itemRecord['Loại sản phẩm']
      : typeof itemRecord.category === 'string'
      ? itemRecord.category
      : '';
    const isApplicable = applicableCategories.length === 0 || 
      applicableCategories.some(cat => category.toLowerCase().includes(cat) || item.name.toLowerCase().includes(cat));

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
          category,
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

  // Chế độ in Trình duyệt
  const htmlList = await Promise.all(
    finalLabels.map(item => renderSingleLabelHtml(item, orderInfo, settings))
  );

  const ok = await printLabelsViaBrowser(htmlList, settings);
  return {
    success: ok,
    labelCount: totalItems,
    message: ok ? `Đã gửi lệnh in ${totalItems} tem nhãn dán ly thành công.` : 'Có lỗi khi gửi lệnh in.',
  };
};
