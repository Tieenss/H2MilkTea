import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: any) => string | number;
}

export interface FormattedExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns?: ExportColumn[];
  data: any[];
  summaryRows?: Array<{ label: string; value: string | number }>;
  preparedBy?: string;
}

function normalizeRowsAndColumns(options: FormattedExportOptions): {
  columns: ExportColumn[];
  rows: Record<string, any>[];
} {
  const { data, columns } = options;
  if (!Array.isArray(data) || data.length === 0) {
    return { columns: columns || [], rows: [] };
  }

  const effectiveColumns: ExportColumn[] =
    columns && columns.length > 0
      ? columns
      : Object.keys(data[0])
          .filter((k) => k !== '_RowNumber')
          .map((key) => ({
            key,
            label: key,
            align: typeof data[0][key] === 'number' ? 'right' : 'left',
          }));

  const rows = data.map((row, idx) => {
    const formatted: Record<string, any> = { STT: idx + 1 };
    effectiveColumns.forEach((col) => {
      const rawVal = row[col.key];
      formatted[col.label] = col.format ? col.format(rawVal, row) : rawVal ?? '';
    });
    return formatted;
  });

  return {
    columns: [{ key: 'STT', label: 'STT', align: 'center' }, ...effectiveColumns],
    rows,
  };
}

// 1. Xuất file Excel (.xlsx) có tiêu đề quán, ngày xuất, định dạng độ rộng cột tự động và dòng tổng kết
export function exportToFormattedExcel(options: FormattedExportOptions) {
  const { title, subtitle, filename, summaryRows = [] } = options;
  const { columns, rows } = normalizeRowsAndColumns(options);

  const nowStr = new Date().toLocaleString('vi-VN');
  const aoa: any[][] = [
    ['HỆ THỐNG TRÀ SỮA & ĐỒ UỐNG H2 MILKTEA'],
    [title.toUpperCase()],
    [subtitle || `Ngày xuất báo cáo: ${nowStr}`],
    [],
    columns.map((c) => c.label),
  ];

  rows.forEach((r) => {
    aoa.push(columns.map((c) => r[c.label] ?? ''));
  });

  if (summaryRows.length > 0) {
    aoa.push([]);
    summaryRows.forEach((s) => {
      const summaryLine = new Array(columns.length).fill('');
      summaryLine[1] = s.label;
      summaryLine[columns.length - 1] = s.value;
      aoa.push(summaryLine);
    });
  }

  aoa.push([]);
  aoa.push(['', 'Người lập biểu', '', '', 'Quản lý phê duyệt']);

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Tự động căn chỉnh độ rộng cột dễ nhìn
  const colWidths = columns.map((col, colIdx) => {
    let maxLen = col.label.length;
    rows.forEach((r) => {
      const cellStr = String(r[col.label] ?? '');
      if (cellStr.length > maxLen) maxLen = cellStr.length;
    });
    return { wch: colIdx === 0 ? 6 : Math.min(42, Math.max(12, maxLen + 4)) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCao_H2MilkTea');

  const dateSuffix = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateSuffix}.xlsx`);
}

// 2. Xuất file CSV (.csv) kèm BOM UTF-8 hiển thị tiếng Việt chuẩn trên Excel
export function exportToFormattedCSV(options: FormattedExportOptions) {
  const { filename } = options;
  const { columns, rows } = normalizeRowsAndColumns(options);

  const headerLine = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const bodyLines = rows.map((r) =>
    columns
      .map((c) => {
        const val = r[c.label] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateSuffix = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `${filename}_${dateSuffix}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Tạo HTML chuẩn A4 dùng chung cho xuất Word (.doc) và In trực tiếp (Print A4)
function buildPrintableHtmlDocument(options: FormattedExportOptions): string {
  const { title, subtitle, summaryRows = [], preparedBy = 'Quản trị viên H2' } = options;
  const { columns, rows } = normalizeRowsAndColumns(options);
  const nowStr = new Date().toLocaleString('vi-VN');

  const headerCells = columns
    .map(
      (col) =>
        `<th style="border:1px solid #334155;padding:8px 10px;background-color:#eef2ff;color:#1e1b4b;font-weight:700;text-align:${
          col.align || 'left'
        };font-size:12px;">${col.label}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map((col) => {
          const val = r[col.label] ?? '';
          const displayVal =
            typeof val === 'number' && col.key !== 'STT'
              ? val.toLocaleString('vi-VN')
              : String(val);
          return `<td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:${
            col.align || 'left'
          };font-size:12px;background-color:${bg};">${displayVal}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const summaryHtml =
    summaryRows.length > 0
      ? `<div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">
          ${summaryRows
            .map(
              (s) =>
                `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                  <strong>${s.label}:</strong>
                  <span style="font-weight:700;color:#1e40af;">${
                    typeof s.value === 'number' ? s.value.toLocaleString('vi-VN') : s.value
                  }</span>
                </div>`
            )
            .join('')}
        </div>`
      : '';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: "Times New Roman", Arial, sans-serif;
      color: #0f172a;
      line-height: 1.45;
      margin: 0;
      padding: 10px;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
    .store-name { font-size: 16px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; }
    .store-sub { font-size: 12px; color: #475569; }
    .report-title { text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 14px 0 4px 0; }
    .report-sub { text-align: center; font-size: 12px; color: #475569; margin-bottom: 16px; font-style: italic; }
    table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .signature-table { width: 100%; margin-top: 28px; text-align: center; border-collapse: collapse; }
    .signature-table td { width: 50%; vertical-align: top; font-size: 13px; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="text-align:left;">
        <div class="store-name">HỆ THỐNG TRÀ SỮA H2 MILKTEA</div>
        <div class="store-sub">Báo cáo & Biểu mẫu Quản trị Hệ thống POS</div>
      </td>
      <td style="text-align:right;font-size:12px;color:#475569;">
        <div>Ngày in: ${nowStr}</div>
        <div>Tổng số bản ghi: <strong>${rows.length}</strong></div>
      </td>
    </tr>
  </table>

  <div class="report-title">${title}</div>
  <div class="report-sub">${subtitle || `Trích xuất dữ liệu ngày ${nowStr}`}</div>

  <table class="data-table">
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  ${summaryHtml}

  <table class="signature-table">
    <tr>
      <td>
        <strong>Người lập biểu</strong><br/>
        <span style="font-size:11px;font-style:italic;">(Ký và ghi rõ họ tên)</span>
        <div style="height:65px;"></div>
        <strong>${preparedBy}</strong>
      </td>
      <td>
        <strong>Quản lý cửa hàng</strong><br/>
        <span style="font-size:11px;font-style:italic;">(Ký duyệt & đóng dấu)</span>
        <div style="height:65px;"></div>
        <strong>Ban Quản Lý H2 MilkTea</strong>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 3. Xuất file Word (.doc) định dạng bảng biểu chuẩn đẹp
export function exportToFormattedWord(options: FormattedExportOptions) {
  const html = buildPrintableHtmlDocument(options);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateSuffix = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `${options.filename}_${dateSuffix}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 4. Mở cửa sổ In biểu mẫu A4 trực tiếp (hoặc Lưu PDF)
export function printFormattedA4(options: FormattedExportOptions) {
  const html = buildPrintableHtmlDocument(options);
  const printWindow = window.open('', '_blank', 'width=960,height=800');
  if (!printWindow) {
    // Fallback tải file Word nếu trình duyệt chặn popup
    exportToFormattedWord(options);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}
