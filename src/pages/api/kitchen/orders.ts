import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  if (!await getAuthenticatedStaff(req.headers.cookie || '')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const supabase = createAdminSupabaseClient();
  if (!supabase) return res.status(503).json({ success: false, error: 'Order service is not configured.' });

  // Bộ lọc ca làm việc: Chỉ lấy các đơn trong vòng 16 giờ gần nhất, loại bỏ đơn ca cũ tồn đọng
  const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.from('pos_orders')
    .select('id,source,table_id,table_name,employee,items,notes,kitchen_status,payment_status,order_status,created_at,tracking_token')
    .eq('order_status', 'accepted')
    .neq('kitchen_status', 'served')
    .neq('payment_status', 'paid')
    .gte('created_at', sixteenHoursAgo)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ success: false, error: 'Could not load kitchen orders.' });

  const statusMap: Record<string, string> = { queued: 'pending', preparing: 'preparing', ready: 'ready', served: 'served' };
  const orders = (data || []).map((order) => ({
    id: order.id,
    source: order.source,
    tableId: order.table_id,
    tableName: order.table_name,
    employee: order.employee || (order.source === 'QR_TABLE' ? 'Khách QR' : 'Thu ngân'),
    items: (Array.isArray(order.items) ? order.items : []).map((item: Record<string, unknown>) => ({
      id: String(item.productId || ''),
      name: String(item.productName || ''),
      quantity: Number(item.quantity || 0),
      note: [item.size ? `Size: ${item.size}` : '', item.sugar ? `Đường: ${item.sugar}` : '', item.ice ? `Đá: ${item.ice}` : '', item.note || ''].filter(Boolean).join(' · '),
      unit: String(item.unit || ''),
    })),
    notes: order.notes,
    orderTime: order.created_at,
    status: statusMap[order.kitchen_status] || 'pending',
    priority: 'normal',
    trackingToken: order.tracking_token,
  }));
  return res.status(200).json({ success: true, orders });
}
