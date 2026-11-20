export interface ReceiptData {
  receiptNumber: string;
  date: Date;
  cashier: string;
  customer: string;
  table?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
  }>;
  subtotal: number;
  vat?: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  notes?: string;
  paymentType?: string;
  enableVAT?: boolean;
}

const DEFAULT_COMPANY_INFO = {
  name: 'H2 MILKTEA',
  address: 'Số 61, Phúc Xuân, Trung Giã, Hà Nội',
  phone: '0399939240 - 0985561909',
  email: 'contact@h2milktea.vn',
  taxCode: '',
  website: 'h2milktea.vercel.app',
};

function createDefaultK80ReceiptSettings() {
  const posTemplate = {
    paperSize: '80mm',
    fontSize: 'medium',
    showLogo: true,
    showQR: true,
    showSignature: false,
    enableVAT: false,
    headerText: 'HÓA ĐƠN BÁN HÀNG',
    footerText: 'Cảm ơn quý khách!',
    companyInfo: { ...DEFAULT_COMPANY_INFO },
  };

  return {
    paperSize: '80mm',
    fontSize: 'medium',
    customWidth: 80,
    customHeight: 200,
    enableVAT: false,
    templates: {
      pos: posTemplate,
      kitchen: {
        paperSize: '80mm',
        fontSize: 'medium',
        showLogo: false,
        showQR: false,
        showSignature: false,
        enableVAT: false,
        headerText: 'PHIẾU BẾP / PHA CHẾ',
        footerText: 'Vui lòng kiểm tra kỹ topping & đá/đường',
        companyInfo: { ...DEFAULT_COMPANY_INFO },
      },
      order: { ...posTemplate },
      report: {
        paperSize: 'A4',
        fontSize: 'small',
        showCharts: true,
        showSummary: true,
        headerText: 'BÁO CÁO',
        landscape: true,
      },
    },
  };
}

function getOrInitReceiptSettings(): { settings: any; company: any } {
  const defaultSettings = createDefaultK80ReceiptSettings();
  let settings: any = null;
  let company: any = null;

  try {
    const savedSettings = localStorage.getItem('gigapos-receipt-settings');
    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }
  } catch {
    settings = null;
  }

  try {
    const savedCompany = localStorage.getItem('gigapos-company-info');
    if (savedCompany) {
      company = JSON.parse(savedCompany);
    }
  } catch {
    company = null;
  }

  if (!settings || !settings.templates || !settings.templates.pos) {
    settings = defaultSettings;
    try {
      localStorage.setItem('gigapos-receipt-settings', JSON.stringify(settings));
    } catch {
      // Bỏ qua lỗi ghi localStorage
    }
  }

  if (!company || !company.name) {
    company = settings?.templates?.pos?.companyInfo || { ...DEFAULT_COMPANY_INFO };
    try {
      localStorage.setItem('gigapos-company-info', JSON.stringify(company));
    } catch {
      // Bỏ qua lỗi ghi localStorage
    }
  }

  return { settings, company };
}

export const printReceiptWithSettings = async (
  receiptData: ReceiptData,
  templateType: 'pos' | 'kitchen' | 'order' | 'report' = 'pos'
): Promise<void> => {
  try {
    const { settings, company } = getOrInitReceiptSettings();
    const template =
      settings.templates?.[templateType] ||
      settings.templates?.pos ||
      createDefaultK80ReceiptSettings().templates.pos;

    // Generate receipt HTML based on template settings
    const receiptHtml = generateReceiptHtml(receiptData, template, company, templateType);
    
    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Không thể mở cửa sổ in');
    }

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();

    return new Promise((resolve) => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        resolve();
      }, 250);
    });
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
};

const generateReceiptHtml = (
  receiptData: ReceiptData,
  template: any,
  company: any,
  templateType: string
): string => {
  const paperSize = template.paperSize || '80mm';
  const fontSize = template.fontSize || 'medium';
  
  // Get paper width based on size
  const paperWidths = {
    '58mm': '58mm',
    '80mm': '80mm',
    'A4': '210mm',
    'A5': '148mm',
    'custom': '80mm'
  };

  const fontSizes = {
    'small': '10px',
    'medium': '12px',
    'large': '14px',
    'xlarge': '16px'
  };

  const width = paperWidths[paperSize as keyof typeof paperWidths] || '80mm';
  const baseFontSize = fontSizes[fontSize as keyof typeof fontSizes] || '12px';

  if (templateType === 'pos' || templateType === 'order') {
    return generatePOSReceiptHtml(receiptData, template, company, width, baseFontSize);
  }
  if (templateType === 'kitchen') {
    return generatePOSReceiptHtml(
      { ...receiptData, subtotal: 0, discount: 0, total: 0, paid: 0, change: 0 },
      { ...template, headerText: template.headerText || 'PHIẾU BẾP / PHA CHẾ', showQR: false },
      company,
      width,
      baseFontSize
    );
  }
  return generatePOSReceiptHtml(receiptData, template, company, width, baseFontSize);
};

const generatePOSReceiptHtml = (
  receiptData: ReceiptData,
  template: any,
  company: any,
  width: string,
  fontSize: string
): string => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hóa đơn - ${receiptData.receiptNumber}</title>
        <meta charset="UTF-8">
        <style>
            @media print {
                @page {
                    size: ${width} auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 5mm;
                }
            }

            body {
                font-family: 'Courier New', monospace;
                font-size: ${fontSize};
                line-height: 1.4;
                margin: 0;
                padding: 5mm;
                max-width: ${width};
                color: #000;
            }

            .header {
                text-align: center;
                margin-bottom: 5mm;
                border-bottom: 1px solid #000;
                padding-bottom: 3mm;
            }

            .company-name {
                font-size: calc(${fontSize} + 4px);
                font-weight: bold;
                margin-bottom: 2mm;
                text-transform: uppercase;
            }

            .company-info {
                font-size: calc(${fontSize} - 1px);
                line-height: 1.2;
            }

            .receipt-title {
                font-size: calc(${fontSize} + 2px);
                font-weight: bold;
                text-align: center;
                margin: 3mm 0;
                text-transform: uppercase;
                border-bottom: 1px solid #000;
                padding-bottom: 2mm;
            }

            .receipt-info {
                margin: 3mm 0;
                font-size: calc(${fontSize} - 1px);
            }

            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1mm;
            }

            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 3mm 0;
                font-size: calc(${fontSize} - 1px);
            }

            .items-table th {
                border-bottom: 1px solid #000;
                padding: 1mm;
                text-align: left;
                font-weight: bold;
            }

            .items-table td {
                padding: 1mm;
                border-bottom: 1px dotted #ccc;
            }

            .item-notes {
                font-size: calc(${fontSize} - 2px);
                color: #666;
                font-style: italic;
                margin-left: 2mm;
            }

            .totals {
                margin: 3mm 0;
                border-top: 1px solid #000;
                padding-top: 2mm;
            }

            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1mm;
            }

            .final-total {
                font-weight: bold;
                font-size: calc(${fontSize} + 1px);
                border-top: 1px solid #000;
                padding-top: 1mm;
                margin-top: 2mm;
            }

            .footer {
                text-align: center;
                margin-top: 5mm;
                border-top: 1px solid #000;
                padding-top: 3mm;
                font-size: calc(${fontSize} - 1px);
            }

            .qr-section {
                text-align: center;
                margin: 3mm 0;
            }

            .signature-section {
                margin-top: 5mm;
                text-align: center;
            }

            .signature-line {
                border-bottom: 1px solid #000;
                width: 60%;
                margin: 5mm auto 2mm auto;
                height: 10mm;
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            ${template.showLogo ? '<div style="font-size: 18px; margin-bottom: 2mm;">🏪</div>' : ''}
            <div class="company-name">${company.name}</div>
            <div class="company-info">
                <div>${company.address}</div>
                <div>ĐT: ${company.phone}</div>
                <div>Email: ${company.email}</div>
                ${company.taxCode ? `<div>MST: ${company.taxCode}</div>` : ''}
                ${company.website ? `<div>Web: ${company.website}</div>` : ''}
            </div>
        </div>

        <!-- Receipt Title -->
        <div class="receipt-title">${template.headerText}</div>

        <!-- Receipt Info -->
        <div class="receipt-info">
            <div class="info-row">
                <span>Số HĐ:</span>
                <span>${receiptData.receiptNumber}</span>
            </div>
            <div class="info-row">
                <span>Ngày:</span>
                <span>${receiptData.date.toLocaleDateString('vi-VN')} ${receiptData.date.toLocaleTimeString('vi-VN')}</span>
            </div>
            <div class="info-row">
                <span>Thu ngân:</span>
                <span>${receiptData.cashier}</span>
            </div>
            <div class="info-row">
                <span>Khách hàng:</span>
                <span>${receiptData.customer}</span>
            </div>
            ${receiptData.table ? `
            <div class="info-row">
                <span>Bàn:</span>
                <span>${receiptData.table}</span>
            </div>
            ` : ''}
            ${receiptData.paymentType ? `
            <div class="info-row">
                <span>Thanh toán:</span>
                <span>${receiptData.paymentType}</span>
            </div>
            ` : ''}
        </div>

        <!-- Items -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40%;">Món</th>
                    <th style="width: 15%; text-align: center;">SL</th>
                    <th style="width: 20%; text-align: right;">Giá</th>
                    <th style="width: 25%; text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${receiptData.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">${formatCurrency(item.price)}</td>
                        <td style="text-align: right;">${formatCurrency(item.total)}</td>
                    </tr>
                    ${item.notes ? `
                    <tr>
                        <td colspan="4" class="item-notes">- ${item.notes}</td>
                    </tr>
                    ` : ''}
                `).join('')}
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
            <div class="total-row">
                <span>Tạm tính:</span>
                <span>${formatCurrency(receiptData.subtotal)}</span>
            </div>
            ${(template.enableVAT === true || (receiptData.vat ?? 0) > 0) ? `
            <div class="total-row">
                <span>VAT:</span>
                <span>${formatCurrency(receiptData.vat ?? 0)}</span>
            </div>
            ` : ''}
            ${receiptData.discount > 0 ? `
            <div class="total-row">
                <span>Giảm giá:</span>
                <span>-${formatCurrency(receiptData.discount)}</span>
            </div>
            ` : ''}
            <div class="total-row final-total">
                <span>Tổng cộng:</span>
                <span>${formatCurrency(receiptData.total)}</span>
            </div>
            <div class="total-row">
                <span>Tiền khách đưa:</span>
                <span>${formatCurrency(receiptData.paid)}</span>
            </div>
            <div class="total-row">
                <span>Tiền thừa:</span>
                <span>${formatCurrency(receiptData.change)}</span>
            </div>
        </div>

        ${receiptData.notes ? `
        <div style="margin: 3mm 0; border-top: 1px dotted #ccc; padding-top: 2mm;">
            <div style="font-weight: bold;">Ghi chú:</div>
            <div>${receiptData.notes}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div>${template.footerText}</div>
            
            ${template.showQR ? `
            <div class="qr-section">
                <div>Quét mã QR để thanh toán:</div>
                <div style="border: 2px solid #000; width: 60px; height: 60px; margin: 3mm auto; display: flex; align-items: center; justify-content: center; font-size: 10px;">
                    QR CODE
                </div>
            </div>
            ` : ''}

            ${template.showSignature ? `
            <div class="signature-section">
                <div>Chữ ký khách hàng:</div>
                <div class="signature-line"></div>
            </div>
            ` : ''}

            <div style="margin-top: 3mm; font-size: calc(${fontSize} - 2px);">
                Cảm ơn quý khách đã sử dụng dịch vụ!
            </div>
        </div>
    </body>
    </html>
  `;
};

