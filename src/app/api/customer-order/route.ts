import { NextRequest, NextResponse } from 'next/server';

interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  size: string;
  sugar: string;
  ice: string;
  note: string;
  unit: string;
}

interface OrderRequest {
  tableId: string;
  tableName: string;
  items: OrderItem[];
  totalAmount: number;
  note: string;
}

// Create a new customer order
export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json();
    const { tableId, tableName, items, totalAmount, note } = body;

    // Validate required fields
    if (!tableId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bàn hoặc món' },
        { status: 400 }
      );
    }

    // Validate items
    if (items.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Đơn hàng quá nhiều món (tối đa 50)' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productId || !item.productName || item.quantity <= 0 || item.quantity > 20) {
        return NextResponse.json(
          { success: false, error: 'Thông tin món không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Generate order ID
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderId = `QR${timestamp}${random}`;

    // Generate invoice ID (same format as POS)
    const invoiceId = `INV${timestamp}_QR`;

    // Build order detail notes (same format as POS HOADONDETAIL)
    const orderDetails = items.map(item => {
      const customizations: string[] = [];
      if (item.size) customizations.push(`Size: ${item.size}`);
      if (item.sugar) customizations.push(`Đường: ${item.sugar}`);
      if (item.ice) customizations.push(`Đá: ${item.ice}`);
      if (item.note) customizations.push(item.note);
      
      return {
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        total: item.unitPrice * item.quantity,
        unit: item.unit,
        note: customizations.join(' | '),
      };
    });

    // Try to save to Supabase
    let savedToSupabase = false;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Create main invoice record
        const now = new Date();
        const formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${now.toLocaleTimeString('vi-VN')}`;

        const invoiceData = {
          IDHOADON: invoiceId,
          IDBAN: tableId === 'takeaway' ? 'Khách mua về' : tableId,
          'Nhân viên': 'QR Order',
          'Khách hàng': 'Khách QR',
          'Ngày': formattedDate,
          'Tổng tiền': totalAmount.toString(),
          'VAT': '0',
          'Giảm giá': '0',
          'Khách trả': '0',
          'Tiền thừa': '0',
          'Ghi chú': note ? `[QR Order] ${note}` : '[QR Order]',
          'Trạng thái': 'Chờ xác nhận',
          'Trạng thái sự dụng bàn': 'Đang sử dụng',
          'Loại thanh toán': 'Chưa thanh toán',
          'Hóa đơn chi tiết': orderDetails.map(d => `${invoiceId}_${d.productId}`).join(' , '),
        };

        const { error: invoiceError } = await supabase
          .from('HOADON')
          .insert([invoiceData]);

        if (!invoiceError) {
          // Create invoice detail records
          const detailRecords = orderDetails.map(d => ({
            IDHOADONDETAIL: `${invoiceId}_${d.productId}`,
            IDHOADON: invoiceId,
            IDSP: d.productId,
            'Tên sản phẩm': d.productName,
            'Đơn vị tính': d.unit,
            'Đơn giá': d.unitPrice.toString(),
            'Số lượng': d.quantity.toString(),
            'Thành tiền': d.total.toString(),
            'Ghi chú': d.note,
          }));

          await supabase
            .from('HOADONDETAIL')
            .insert(detailRecords);

          savedToSupabase = true;
        }
      }
    } catch (supabaseError) {
      console.error('Supabase save error:', supabaseError);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      orderId,
      invoiceId,
      savedToDatabase: savedToSupabase,
      message: 'Đơn hàng đã được gửi thành công',
      order: {
        id: orderId,
        tableId,
        tableName,
        items: orderDetails,
        totalAmount,
        note,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Customer order error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý đơn hàng' },
      { status: 500 }
    );
  }
}
