import { formatCurrency, formatPoints } from './formatters';
import type { PaymentData } from '../types/pos';

// Load template from localStorage
const loadReceiptTemplate = () => {
  try {
    const savedTemplate = localStorage.getItem('gigapos-receipt-template');
    if (savedTemplate) {
      return JSON.parse(savedTemplate);
    }
  } catch (error) {
    console.error('Error loading receipt template:', error);
  }
  
  // Default template
  return {
    companyName: 'GIGA COFFEE',
    address: 'Đông Hà, Quảng Trị',
    phone: '0826438777',
    website: 'gigacoffee.vn',
    footer: 'Cảm ơn quý khách đã mua hàng!\nHẹn gặp lại quý khách',
    fontFamily: 'Arial, sans-serif',
    fontSize: 12,
    showLogo: false,
    logoUrl: ''
  };
};

export const printReceipt = async (paymentData: PaymentData): Promise<void> => {
  const printWindow = window.open('', '', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Không thể mở cửa sổ in');
  }

  const receiptHtml = generateReceiptHtml(paymentData);

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWindow.focus();

  // Print after a small delay to ensure loading
  return new Promise((resolve) => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      resolve();
    }, 250);
  });
};

export const generateReceiptHtml = (paymentData: PaymentData): string => {
  const template = loadReceiptTemplate();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hóa đơn - ${paymentData.id}</title>
        <meta charset="UTF-8">
        <style>
            /* Receipt styles - customizable */
            body {
                font-family: ${template.fontFamily};
                font-size: ${template.fontSize}px;
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
                font-size: ${template.fontSize + 4}px;
                font-weight: bold;
                margin-bottom: 2mm;
            }

            .invoice-title {
                font-size: ${template.fontSize + 2}px;
                font-weight: bold;
                margin: 5mm 0;
                text-transform: uppercase;
            }

            .invoice-details {
                margin: 2mm 0;
                font-size: ${template.fontSize - 1}px;
            }

            .details-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1mm;
            }

            .customer-info {
                background-color: #f5f5f5;
                padding: 2mm;
                border-radius: 2mm;
                margin: 2mm 0;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: ${template.fontSize - 2}px;
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
                font-size: ${template.fontSize - 1}px;
            }

            .final-total {
                font-weight: bold;
                font-size: ${template.fontSize}px;
                border-top: 1px solid #000;
                padding-top: 1mm;
                margin-top: 2mm;
                }

           .notes {
               margin-top: 3mm;
               font-style: italic;
               font-size: ${template.fontSize - 2}px;
           }

           .footer {
               margin-top: 5mm;
               border-top: 1px dashed #000;
               padding-top: 2mm;
               font-size: ${template.fontSize - 2}px;
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
               ${template.showLogo && template.logoUrl ? `<img src="${template.logoUrl}" alt="Logo" style="max-width: 100px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">` : ''}
               <div class="company-name">${template.companyName}</div>
               <div><strong>Địa chỉ: ${template.address}</strong></div>
               <div>SĐT: ${template.phone}</div>
               <div>Website: ${template.website}</div>
           </div>

           <div class="text-center">
               <div class="invoice-title">Hóa đơn bán hàng</div>
               <div><strong>Số: ${paymentData.id}</strong></div>
               <div><strong>Ngày: ${new Date(paymentData.date).toLocaleString('vi-VN')}</strong></div>
           </div>

           <div class="invoice-details">
               <div class="details-row">
                   <span>Khách hàng:</span>
                   <span><strong>${paymentData.customer}</strong></span>
               </div>
               
               ${paymentData.customerInfo ? `
               <div class="customer-info">
                   <div class="details-row">
                       <span>Số điện thoại:</span>
                       <span>${paymentData.customerInfo.phone}</span>
                   </div>
                   <div class="details-row">
                       <span>Loại khách hàng:</span>
                       <span><strong>${paymentData.customerInfo.type}</strong></span>
                   </div>
                   <div class="details-row">
                       <span>Điểm tích lũy:</span>
                       <span>${formatPoints(paymentData.customerInfo.points)} điểm</span>
                   </div>
               </div>
               ` : ''}
               
               <div class="details-row">
                   <span>Nhân viên:</span>
                   <span><strong>${paymentData.employee}</strong></span>
               </div>
               <div class="details-row">
                   <span>Bàn:</span>
                   <span><strong>${paymentData.tableId}</strong></span>
               </div>
           </div>

           <table>
               <thead>
                   <tr>
                       <th style="width: 40%">TÊN SẢN PHẨM</th>
                       <th style="width: 15%" class="text-center">SL</th>
                       <th style="width: 20%" class="text-right">ĐƠN GIÁ</th>
                       <th style="width: 25%" class="text-right">THÀNH TIỀN</th>
                   </tr>
               </thead>
               <tbody>
                   ${paymentData.items.map(item => `
                       <tr>
                           <td>
                               ${item.name}
                               ${item.note ? `<br><small style="color: #666; font-style: italic;">${item.note}</small>` : ''}
                           </td>
                           <td class="text-center">${item.quantity}</td>
                           <td class="text-right">${formatCurrency(item.price)}</td>
                           <td class="text-right">
                               <strong>${formatCurrency(item.price * item.quantity)}</strong>
                           </td>
                       </tr>
                   `).join('')}
               </tbody>
           </table>

           <div class="total-section">
               <div class="total-row">
                   <span>Tổng tiền hàng:</span>
                   <span>${formatCurrency(paymentData.total)}</span>
               </div>
               <div class="total-row">
                   <span>VAT (10%):</span>
                   <span>${formatCurrency(paymentData.vat)}</span>
               </div>
               ${paymentData.discount > 0 ? `
               <div class="total-row">
                   <span>Giảm giá:</span>
                   <span>-${formatCurrency(paymentData.discount)}</span>
               </div>
               ` : ''}
               <div class="total-row final-total">
                   <span>TỔNG CỘNG:</span>
                   <span>${formatCurrency(paymentData.total + paymentData.vat - paymentData.discount)}</span>
               </div>
               <div class="total-row">
                   <span>Khách trả:</span>
                   <span>${formatCurrency(paymentData.paidAmount)}</span>
               </div>
               <div class="total-row">
                   <span>Tiền thừa:</span>
                   <span>${formatCurrency(paymentData.change)}</span>
               </div>
           </div>

           ${paymentData.note ? `
           <div class="notes">
               <strong>Ghi chú:</strong> ${paymentData.note}
           </div>
           ` : ''}

           ${paymentData.customerInfo ? `
           <div class="notes">
               <strong>Cảm ơn ${paymentData.customerInfo.name}!</strong><br>
               Điểm tích lũy hiện tại: ${formatPoints(paymentData.customerInfo.points)} điểm
           </div>
           ` : ''}

           <div class="footer">
               <hr>
               <div class="text-center">
                   <div style="white-space: pre-line;">${template.footer}</div>
                   <div style="margin-top: 2mm;">
                       Liên hệ hỗ trợ: ${template.phone}
                   </div>
                   <div style="margin-top: 2mm; font-size: ${template.fontSize - 3}px;">
                       In lúc: ${new Date().toLocaleString('vi-VN')}
                   </div>
               </div>
           </div>
       </div>
   </body>
   </html>
 `;
};