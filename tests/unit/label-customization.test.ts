import { describe, it, expect } from 'vitest';
import {
  getDefaultLabelSettings,
  getPresetElementSizes,
  DEFAULT_LABEL_ELEMENT_SIZES,
} from '@/utils/labelSettings';
import {
  renderSingleLabelHtml,
  resolveLabelElementSizes,
  getLabelDimensions,
} from '@/utils/labelPrint';
import type { PrintableLabelItem, LabelOrderInfo } from '@/types/labelSettings';

describe('Label Customization Engine (Giai đoạn 3 - Vấn đề 4)', () => {
  const sampleItem: PrintableLabelItem = {
    id: 'item-1',
    name: 'Trà Sữa Ô Long Nướng Trân Châu Hoàng Kim',
    size: 'L',
    sugar: '50%',
    ice: '70%',
    toppings: ['Trân châu hoàng kim', 'Kem cheese'],
    note: 'Ít ngọt, giao nhanh',
    price: 42000,
    itemIndex: 1,
    totalItems: 3,
  };

  const sampleOrder: LabelOrderInfo = {
    orderId: 'INV001',
    tableName: 'Bàn 05',
    cashierName: 'Thu Ngân A',
    createdAt: '10:30',
  };

  it('1. Khởi tạo đầy đủ 10 thông số kích thước chi tiết mặc định (DEFAULT_LABEL_ELEMENT_SIZES)', () => {
    const defaults = getDefaultLabelSettings();
    expect(defaults.elementSizes).toBeDefined();
    expect(defaults.elementSizes?.productNameSize).toBe(DEFAULT_LABEL_ELEMENT_SIZES.productNameSize);
    expect(defaults.elementSizes?.priceSize).toBe(DEFAULT_LABEL_ELEMENT_SIZES.priceSize);
    expect(defaults.elementSizes?.storeNameSize).toBe(DEFAULT_LABEL_ELEMENT_SIZES.storeNameSize);
    expect(defaults.elementSizes?.qrCodeSize).toBe(DEFAULT_LABEL_ELEMENT_SIZES.qrCodeSize);
  });

  it('2. Preset cỡ chữ (small, medium, large) trả về bộ kích thước tương ứng hợp lệ', () => {
    const small = getPresetElementSizes('small');
    const medium = getPresetElementSizes('medium');
    const large = getPresetElementSizes('large');

    expect(small.productNameSize).toBeLessThan(medium.productNameSize);
    expect(large.productNameSize).toBeGreaterThan(medium.productNameSize);
    expect(small.priceSize).toBeLessThan(large.priceSize);
  });

  it('3. Cho phép tùy chỉnh độc lập cỡ chữ Tên món (productNameSize) và Giá tiền (priceSize) trên HTML in ra', async () => {
    const customSettings = getDefaultLabelSettings();
    customSettings.elementSizes = {
      ...DEFAULT_LABEL_ELEMENT_SIZES,
      productNameSize: 16,
      priceSize: 15,
      storeNameSize: 12,
      noteSize: 9,
    };

    const html = await renderSingleLabelHtml(sampleItem, sampleOrder, customSettings);

    expect(html).toContain('font-size: 16px');
    expect(html).toContain('font-size: 15px');
    expect(html).toContain('font-size: 12px');
    expect(html).toContain('Trà Sữa Ô Long Nướng Trân Châu Hoàng Kim');
    expect(html).toContain('42.000');
  });

  it('4. Hỗ trợ tùy chọn xuống 2 dòng cho tên món dài (productNameWrap) và căn lề Header', async () => {
    const settingsWrap = getDefaultLabelSettings();
    settingsWrap.fields.productNameWrap = true;
    settingsWrap.fields.headerAlign = 'center';

    const htmlWrap = await renderSingleLabelHtml(sampleItem, sampleOrder, settingsWrap);
    expect(htmlWrap).toContain('-webkit-line-clamp: 2');

    const settingsSingleLine = getDefaultLabelSettings();
    settingsSingleLine.fields.productNameWrap = false;

    const htmlSingle = await renderSingleLabelHtml(sampleItem, sampleOrder, settingsSingleLine);
    expect(htmlSingle).toContain('white-space: nowrap');
  });

  it('5. Tương thích ngược an toàn khi cấu hình cũ chưa có trường elementSizes', () => {
    const legacySettings = getDefaultLabelSettings();
    delete legacySettings.elementSizes;
    legacySettings.fontSize = 'large';

    const resolved = resolveLabelElementSizes(legacySettings);
    expect(resolved.productNameSize).toBeGreaterThan(DEFAULT_LABEL_ELEMENT_SIZES.productNameSize);
    expect(getLabelDimensions(legacySettings)).toEqual({ width: 50, height: 30 });
  });
});
