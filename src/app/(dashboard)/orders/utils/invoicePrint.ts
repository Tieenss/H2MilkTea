// utils/invoicePrint.ts
import { formatCurrency } from './invoiceFormatters';
import type { Invoice, InvoiceDetail } from '../types/invoice';

export const printReceipt = async (invoice: Invoice, details: InvoiceDetail[]): Promise<void> => {
  try {
    // Try to use the new settings-based print system
    const { printReceiptWithSettings } = await import('../../pos/utils/receiptPrint');
    
    // Convert invoice data to receipt format
    const receiptData = {
      receiptNumber: invoice.IDHOADON,
      date: new Date(invoice.Ngày),
      cashier: invoice['Nhân viên'],
      customer: invoice['Khách hàng'],
      table: invoice.IDBAN,
      items: details.map(detail => ({
        name: detail['Tên sản phẩm'],
        quantity: Number(detail['Số lượng']),
        price: Number(detail['Đơn giá']),
        total: Number(detail['Thành tiền']),
        notes: detail['Ghi chú']
      })),
      subtotal: Number(invoice['Tổng tiền']),
      discount: Number(invoice['Giảm giá']),
      total: Number(invoice['Tổng tiền']) + Number(invoice['VAT']) - Number(invoice['Giảm giá']),
      paid: Number(invoice['Khách trả']),
      change: Number(invoice['Tiền thừa']),
      notes: invoice['Ghi chú'],
      paymentType: invoice['Loại thanh toán']
    };

    await printReceiptWithSettings(receiptData, 'pos');
  } catch (error) {
    console.error('Error with new print system, falling back to old system:', error);
    
    // Fallback to old print system
    const printWindow = window.open('', '', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Không thể mở cửa sổ in');
    }

    const receiptHtml = generateInvoiceHtml(invoice, details);

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
  }
};

const generateInvoiceHtml = (invoice: Invoice, details: InvoiceDetail[]): string => {
  const finalTotal = Number(invoice['Tổng tiền']) + Number(invoice['VAT']) - Number(invoice['Giảm giá']);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hóa đơn - ${invoice.IDHOADON}</title>
        <meta charset="UTF-8">
        <style>
            /* Receipt styles */
            body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                background-color: #f0f0f0;
            }

            #content {
                width: 80mm;
                background-color: white;
                padding: 5mm;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }

            .header, .footer {
                text-align: center;
                margin: 3mm 0;
            }

            .company-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 2mm;
            }

            .invoice-title {
                font-size: 14px;
                font-weight: bold;
                margin: 5mm 0;
                text-transform: uppercase;
            }

            .invoice-details {
                margin: 2mm 0;
                font-size: 11px;
            }

            .details-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1mm;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin: 3mm 0;
            }

            th {
                padding: 2mm 1mm;
                text-align: left;
                border-bottom: 1px solid #000;
                font-weight: bold;
                background-color: #f5f5f5;
            }

            td {
                padding: 1mm;
                text-align: left;
                border-bottom: 0.5px solid #ddd;
                vertical-align: top;
            }

            .text-right {
                text-align: right;
            }

            .text-center {
                text-align: center;
            }

            .total-section {
                margin-top: 3mm;
                padding-top: 2mm;
                border-top: 1px solid #000;
            }

            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1mm;
                font-size: 11px;
            }

            .final-total {
                font-weight: bold;
                font-size: 12px;
                border-top: 1px solid #000;
                padding-top: 1mm;
                margin-top: 2mm;
            }

            .notes {
                margin-top: 3mm;
                font-style: italic;
                font-size: 10px;
            }

            .footer {
                margin-top: 5mm;
                border-top: 1px dashed #000;
                padding-top: 2mm;
                font-size: 10px;
            }

            hr {
                border: none;
                border-top: 1px dashed #000;
                margin: 2mm 0;
            }

            @media print {
                body { 
                    margin: 0; 
                    padding: 0; 
                    background-color: white;
                }
                #content { 
                    box-shadow: none; 
                    width: 100%;
                    max-width: 80mm;
                }
            }
        </style>
    </head>
    <body>
        <div id="content">
            <div class="header">
                <div class="company-name">H2 MilkTea</div>
                <div><strong>Địa chỉ: Lâm Đồng</strong></div>
                <div>SĐT: 0326132124</div>
                <div>Website: h2milktea.vn</div>
            </div>

            <div class="text-center">
                <div class="invoice-title">Hóa đơn bán hàng</div>
                <div><strong>Số: ${invoice.IDHOADON}</strong></div>
                <div><strong>Ngày: ${new Date(invoice['Ngày']).toLocaleString('vi-VN')}</strong></div>
            </div>

            <div class="invoice-details">
                <div class="details-row">
                    <span>Khách hàng:</span>
                    <span><strong>${invoice['Khách hàng']}</strong></span>
                </div>
                <div class="details-row">
                    <span>Nhân viên:</span>
                    <span><strong>${invoice['Nhân viên']}</strong></span>
                </div>
                <div class="details-row">
                    <span>Bàn:</span>
                    <span><strong>${invoice.IDBAN}</strong></span>
                </div>
                <div class="details-row">
                    <span>Thanh toán:</span>
                    <span><strong>${invoice['Loại thanh toán']}</strong></span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40%">TÊN SẢN PHẨM</th>
                        <th style="width: 10%">ĐVT</th>
                        <th style="width: 15%" class="text-center">SL</th>
                        <th style="width: 15%" class="text-right">ĐƠN GIÁ</th>
                        <th style="width: 20%" class="text-right">THÀNH TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    ${details.map(detail => `
                        <tr>
                            <td>
                                ${detail['Tên sản phẩm']}
                                ${detail['Ghi chú'] ? `<br><small style="color: #666; font-style: italic;">${detail['Ghi chú']}</small>` : ''}
                            </td>
                            <td>${detail['Đơn vị tính'] || 'Cái'}</td>
                            <td class="text-center">${detail['Số lượng']}</td>
                            <td class="text-right">${formatCurrency(detail['Đơn giá'])}</td>
                            <td class="text-right">
                                <strong>${formatCurrency(detail['Thành tiền'])}</strong>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-row">
                    <span>Tổng tiền hàng:</span>
                    <span>${formatCurrency(invoice['Tổng tiền'])}</span>
                </div>
                <div class="total-row">
                    <span>VAT (10%):</span>
                    <span>${formatCurrency(invoice['VAT'])}</span>
                </div>
                ${Number(invoice['Giảm giá']) > 0 ? `
                <div class="total-row">
                    <span>Giảm giá:</span>
                    <span>-${formatCurrency(invoice['Giảm giá'])}</span>
                </div>
                ` : ''}
                <div class="total-row final-total">
                    <span>TỔNG CỘNG:</span>
                    <span>${formatCurrency(finalTotal)}</span>
                </div>
                <div class="total-row">
                    <span>Khách trả:</span>
                    <span>${formatCurrency(invoice['Khách trả'])}</span>
                </div>
                <div class="total-row">
                    <span>Tiền thừa:</span>
                    <span>${formatCurrency(invoice['Tiền thừa'])}</span>
                </div>
            </div>

            ${invoice['Ghi chú'] ? `
            <div class="notes">
                <strong>Ghi chú:</strong> ${invoice['Ghi chú']}
            </div>
            ` : ''}

            <div class="footer">
                <hr>
                <div class="text-center">
                    <div><strong>Cảm ơn quý khách đã mua hàng!</strong></div>
                    <div>Hẹn gặp lại quý khách</div>
                    <div style="margin-top: 2mm;">
                        Liên hệ hỗ trợ: 0326132124
                    </div>
                    <div style="margin-top: 2mm;">
                        Trạng thái: ${invoice['Trạng thái']}
                    </div>
                    <div style="margin-top: 2mm; font-size: 9px;">
                        In lúc: ${new Date().toLocaleString('vi-VN')}
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Generate receipt for kitchen/bar
export const printKitchenReceipt = async (orderData: {
  invoiceId: string;
  tableId: string;
  tableName: string;
  items: InvoiceDetail[];
  orderTime: string;
  employee: string;
}): Promise<void> => {
  const printWindow = window.open('', '', 'width=600,height=400');
  
  if (!printWindow) {
    throw new Error('Không thể mở cửa sổ in');
  }

  const kitchenHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Phiếu bếp - ${orderData.invoiceId}</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Courier New', monospace;
                font-size: 14px;
                margin: 10px;
                line-height: 1.3;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .order-info {
                margin-bottom: 15px;
                font-weight: bold;
            }
            .item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 5px;
                border-bottom: 1px dashed #ccc;
            }
            .item-name {
                flex: 1;
                margin-right: 10px;
            }
            .item-qty {
                font-weight: bold;
                min-width: 30px;
                text-align: right;
            }
            .note {
                font-style: italic;
                color: #666;
                font-size: 12px;
                margin-left: 10px;
            }
            @media print {
                body { margin: 0; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>PHIẾU BẾP</h2>
            <div>H2 MilkTea</div>
        </div>
        
        <div class="order-info">
            <div>Hóa đơn: ${orderData.invoiceId}</div>
            <div>Bàn: ${orderData.tableName}</div>
            <div>Thời gian: ${new Date(orderData.orderTime).toLocaleString('vi-VN')}</div>
            <div>Nhân viên: ${orderData.employee}</div>
        </div>

        <div class="items">
            ${orderData.items.map(item => `
                <div class="item">
                    <div class="item-name">
                        ${item['Tên sản phẩm']}
                        ${item['Ghi chú'] ? `<div class="note">${item['Ghi chú']}</div>` : ''}
                    </div>
                    <div class="item-qty">x${item['Số lượng']}</div>
                </div>
            `).join('')}
        </div>

        <div style="text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
            <strong>Tổng món: ${orderData.items.reduce((sum, item) => sum + Number(item['Số lượng']), 0)}</strong>
        </div>
    </body>
    </html>
  `;

  printWindow.document.write(kitchenHtml);
  printWindow.document.close();
  printWindow.focus();

  return new Promise((resolve) => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      resolve();
    }, 250);
  });
};

// Print invoice summary (compact version)
export const printInvoiceSummary = async (invoice: Invoice): Promise<void> => {
  const printWindow = window.open('', '', 'width=600,height=400');
  
  if (!printWindow) {
    throw new Error('Không thể mở cửa sổ in');
  }

  const finalTotal = Number(invoice['Tổng tiền']) + Number(invoice['VAT']) - Number(invoice['Giảm giá']);

  const summaryHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Tóm tắt hóa đơn - ${invoice.IDHOADON}</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                margin: 10px;
                line-height: 1.4;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                padding: 2px 0;
            }
            .total-row {
                font-weight: bold;
                border-top: 1px solid #000;
                padding-top: 5px;
                margin-top: 10px;
            }
            @media print {
                body { margin: 0; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>TÓM TẮT HÓA ĐƠN</h2>
            <div>H2 MilkTea</div>
        </div>
        
        <div class="info-row">
            <span>Mã hóa đơn:</span>
            <strong>${invoice.IDHOADON}</strong>
        </div>
        <div class="info-row">
            <span>Ngày:</span>
            <span>${new Date(invoice['Ngày']).toLocaleString('vi-VN')}</span>
        </div>
        <div class="info-row">
            <span>Bàn:</span>
            <strong>${invoice.IDBAN}</strong>
        </div>
        <div class="info-row">
            <span>Khách hàng:</span>
            <span>${invoice['Khách hàng']}</span>
        </div>
        <div class="info-row">
            <span>Nhân viên:</span>
            <span>${invoice['Nhân viên']}</span>
        </div>
        <div class="info-row">
            <span>Thanh toán:</span>
            <span>${invoice['Loại thanh toán']}</span>
        </div>
        <div class="info-row">
            <span>Trạng thái:</span>
            <strong>${invoice['Trạng thái']}</strong>
        </div>

        <div style="margin-top: 15px;">
            <div class="info-row">
                <span>Tổng tiền hàng:</span>
                <span>${formatCurrency(invoice['Tổng tiền'])}</span>
            </div>
            <div class="info-row">
                <span>VAT (10%):</span>
                <span>${formatCurrency(invoice['VAT'])}</span>
            </div>
            ${Number(invoice['Giảm giá']) > 0 ? `
            <div class="info-row">
                <span>Giảm giá:</span>
                <span>-${formatCurrency(invoice['Giảm giá'])}</span>
            </div>
            ` : ''}
            <div class="info-row total-row">
                <span>TỔNG CỘNG:</span>
                <span>${formatCurrency(finalTotal)}</span>
            </div>
            <div class="info-row">
                <span>Khách trả:</span>
                <span>${formatCurrency(invoice['Khách trả'])}</span>
            </div>
            <div class="info-row">
                <span>Tiền thừa:</span>
                <span>${formatCurrency(invoice['Tiền thừa'])}</span>
            </div>
        </div>

        ${invoice['Ghi chú'] ? `
        <div style="margin-top: 15px; font-style: italic;">
            <strong>Ghi chú:</strong> ${invoice['Ghi chú']}
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px;">
            In lúc: ${new Date().toLocaleString('vi-VN')}
        </div>
    </body>
    </html>
  `;

  printWindow.document.write(summaryHtml);
  printWindow.document.close();
  printWindow.focus();

  return new Promise((resolve) => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      resolve();
    }, 250);
  });
};