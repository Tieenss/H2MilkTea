import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

function parseDateFromString(dateString: string): Date {
  try {
    const [datePart, timePart] = dateString.split(' ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart ? timePart.split(':') : ['0', '0', '0'];
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  } catch {
    return new Date(0);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const prevFromParam = searchParams.get('prevFrom');
    const prevToParam = searchParams.get('prevTo');
    const categoriesParam = searchParams.get('categories');
    const paymentMethodsParam = searchParams.get('paymentMethods');
    const minAmount = searchParams.get('minAmount') ? Number(searchParams.get('minAmount')) : undefined;
    const maxAmount = searchParams.get('maxAmount') ? Number(searchParams.get('maxAmount')) : undefined;

    const fromDate = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = toParam ? new Date(toParam) : new Date();
    const prevFromDate = prevFromParam ? new Date(prevFromParam) : null;
    const prevToDate = prevToParam ? new Date(prevToParam) : null;

    const selectedCategories = categoriesParam ? categoriesParam.split(',').map((c) => c.trim()).filter(Boolean) : [];
    const selectedPayments = paymentMethodsParam ? paymentMethodsParam.split(',').map((p) => p.trim()).filter(Boolean) : [];

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Dịch vụ dữ liệu chưa sẵn sàng.' }, { status: 503 });
    }

    // Nạp các hóa đơn thành công từ bảng HOADON
    const invoiceQuery = await (supabase.from('HOADON') as any)
      .select('*')
      .eq('Trạng thái', 'Đã thanh toán');

    const allPaidInvoices: any[] = invoiceQuery.data || [];
    if (invoiceQuery.error) {
      return NextResponse.json(
        { success: false, error: invoiceQuery.error.message || 'Không thể lấy dữ liệu hóa đơn.' },
        { status: 500 }
      );
    }

    // Lọc hóa đơn kỳ hiện tại
    const currentInvoices: any[] = allPaidInvoices.filter((hd: any) => {
      if (hd['Trạng thái'] && hd['Trạng thái'] !== 'Đã thanh toán') return false;
      const d = hd.created_at ? new Date(hd.created_at) : parseDateFromString(String(hd['Ngày'] || ''));
      const total = Number(hd['Tổng tiền']) || 0;
      if (d < fromDate || d > toDate) return false;
      if (minAmount !== undefined && total < minAmount) return false;
      if (maxAmount !== undefined && total > maxAmount) return false;
      if (selectedPayments.length > 0 && !selectedPayments.includes(String(hd['Loại thanh toán'] || ''))) return false;
      return true;
    });

    // Lọc hóa đơn kỳ trước
    const prevInvoices: any[] = prevFromDate && prevToDate
      ? allPaidInvoices.filter((hd: any) => {
          if (hd['Trạng thái'] && hd['Trạng thái'] !== 'Đã thanh toán') return false;
          const d = hd.created_at ? new Date(hd.created_at) : parseDateFromString(String(hd['Ngày'] || ''));
          return d >= prevFromDate && d <= prevToDate;
        })
      : [];

    const currentRevenue = currentInvoices.reduce((sum: number, hd: any) => sum + (Number(hd['Tổng tiền']) || 0), 0);
    const currentOrders = currentInvoices.length;
    const currentAverageOrderValue = currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0;

    const previousRevenue = prevInvoices.reduce((sum: number, hd: any) => sum + (Number(hd['Tổng tiền']) || 0), 0);
    const previousOrders = prevInvoices.length;
    const previousAverageOrderValue = previousOrders > 0 ? Math.round(previousRevenue / previousOrders) : 0;

    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const ordersGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;
    const averageOrderValueGrowth =
      previousAverageOrderValue > 0
        ? ((currentAverageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100
        : 0;

    // Lấy chi tiết sản phẩm cho các hóa đơn trong kỳ (chỉ lấy cho hóa đơn thuộc kỳ hiện tại)
    const currentInvoiceIds = currentInvoices.map((hd: any) => String(hd.IDHOADON || '')).filter(Boolean);
    let details: any[] = [];
    let products: any[] = [];

    if (currentInvoiceIds.length > 0) {
      const [detailsRes, productsRes] = await Promise.all([
        (supabase.from('HOADONDETAIL') as any).select('*').in('IDHOADON', currentInvoiceIds.slice(0, 500)),
        (supabase.from('DMHH') as any).select('*'),
      ]);

      if (detailsRes.data) details = detailsRes.data;
      if (productsRes.data) products = productsRes.data;
    }

    const productMap = new Map<string, any>();
    for (const p of products) {
      if (p.IDSP) productMap.set(String(p.IDSP), p);
    }

    // Thống kê theo sản phẩm và danh mục
    const productStats = new Map<string, { id: string; name: string; quantity: number; revenue: number; category: string }>();
    const categoryStats = new Map<string, { name: string; revenue: number; orders: number; percentage: number }>();

    for (const d of details) {
      const prodId = String(d.IDSP || '');
      const p = productMap.get(prodId);
      const category = String(p ? p['Loại sản phẩm'] || 'Khác' : 'Khác');
      if (selectedCategories.length > 0 && !selectedCategories.includes(category)) continue;

      const qty = Number(d['Số lượng']) || 1;
      const rev = Number(d['Thành tiền']) || 0;

      // Product
      const prodExisting = productStats.get(prodId);
      if (prodExisting) {
        prodExisting.quantity += qty;
        prodExisting.revenue += rev;
      } else {
        productStats.set(prodId, {
          id: prodId,
          name: String(d['Tên sản phẩm'] || p?.['Tên sản phẩm'] || prodId),
          quantity: qty,
          revenue: rev,
          category,
        });
      }

      // Category
      const catExisting = categoryStats.get(category);
      if (catExisting) {
        catExisting.revenue += rev;
        catExisting.orders += 1;
      } else {
        categoryStats.set(category, {
          name: category,
          revenue: rev,
          orders: 1,
          percentage: 0,
        });
      }
    }

    for (const cat of categoryStats.values()) {
      cat.percentage = currentRevenue > 0 ? Math.round((cat.revenue / currentRevenue) * 1000) / 10 : 0;
    }

    // Thống kê theo phương thức thanh toán
    const paymentStats = new Map<string, { method: string; count: number; revenue: number; percentage: number }>();
    for (const hd of currentInvoices) {
      const method = String(hd['Loại thanh toán'] || 'Tiền mặt');
      const rev = Number(hd['Tổng tiền']) || 0;
      const existing = paymentStats.get(method);
      if (existing) {
        existing.count += 1;
        existing.revenue += rev;
      } else {
        paymentStats.set(method, {
          method,
          count: 1,
          revenue: rev,
          percentage: 0,
        });
      }
    }

    for (const p of paymentStats.values()) {
      p.percentage = currentOrders > 0 ? Math.round((p.count / currentOrders) * 1000) / 10 : 0;
    }

    // Thống kê theo giờ trong ngày (0-23h)
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, revenue: 0 }));
    for (const hd of currentInvoices) {
      const d = hd.created_at ? new Date(hd.created_at) : parseDateFromString(String(hd['Ngày'] || ''));
      const h = d.getHours();
      if (h >= 0 && h < 24) {
        hourlyStats[h].orders += 1;
        hourlyStats[h].revenue += Number(hd['Tổng tiền']) || 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        current: {
          revenue: currentRevenue,
          orders: currentOrders,
          averageOrderValue: currentAverageOrderValue,
          products: Array.from(productStats.values()).sort((a, b) => b.quantity - a.quantity),
          categories: Array.from(categoryStats.values()).sort((a, b) => b.revenue - a.revenue),
          paymentMethods: Array.from(paymentStats.values()).sort((a, b) => b.count - a.count),
          hourlyData: hourlyStats,
        },
        previous: {
          revenue: previousRevenue,
          orders: previousOrders,
          averageOrderValue: previousAverageOrderValue,
        },
        comparison: {
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          ordersGrowth: Math.round(ordersGrowth * 10) / 10,
          averageOrderValueGrowth: Math.round(averageOrderValueGrowth * 10) / 10,
          isRevenuePositive: revenueGrowth >= 0,
          isOrdersPositive: ordersGrowth >= 0,
          isAverageOrderValuePositive: averageOrderValueGrowth >= 0,
        },
      },
    });
  } catch (err: any) {
    console.error('Lỗi khi tính toán báo cáo doanh thu:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
