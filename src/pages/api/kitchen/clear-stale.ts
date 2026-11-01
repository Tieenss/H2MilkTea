import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const staff = await getAuthenticatedStaff(req.headers.cookie || '');
  if (!staff) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return res.status(503).json({ success: false, error: 'Order service is not configured.' });
  }

  try {
    // 1. Cập nhật tất cả các đơn pos_orders có trạng thái bếp chưa phục vụ sang 'served'
    const { data: updatedOrders, error: updateError } = await supabase
      .from('pos_orders')
      .update({
        kitchen_status: 'served',
        updated_at: new Date().toISOString(),
      })
      .neq('kitchen_status', 'served')
      .select('id');

    if (updateError) {
      console.error('Error clearing stale kitchen orders:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    const clearedCount = updatedOrders?.length || 0;

    return res.status(200).json({
      success: true,
      clearedCount,
      message: `Đã dọn dẹp và đóng thành công ${clearedCount} đơn bếp tồn đọng trên hệ thống.`,
    });
  } catch (err: any) {
    console.error('Exception clearing stale kitchen orders:', err);
    return res.status(500).json({ success: false, error: err.message || 'Lỗi server khi dọn dẹp bếp.' });
  }
}
