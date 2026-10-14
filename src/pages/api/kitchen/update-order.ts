import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminSupabaseClient, getAuthenticatedStaff } from '@/lib/supabase/server';

const statusMap: Record<string, string> = {
  pending: 'queued', queued: 'queued', preparing: 'preparing', ready: 'ready', served: 'served',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  if (!await getAuthenticatedStaff(req.headers.cookie || '')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const supabase = createAdminSupabaseClient();
  if (!supabase) return res.status(503).json({ success: false, error: 'Order service is not configured.' });
  const orderId = String(req.body?.orderId || '');
  const kitchenStatus = statusMap[String(req.body?.status || '')];
  if (!orderId || !kitchenStatus) return res.status(400).json({ success: false, error: 'Invalid order or status.' });
  const { data: current, error: readError } = await supabase.from('pos_orders').select('*').eq('id', orderId).single();
  if (readError || !current) return res.status(404).json({ success: false, error: 'Order not found.' });
  const { data: updated, error } = await supabase.from('pos_orders').update({
    kitchen_status: kitchenStatus,
    updated_at: new Date().toISOString(),
    status_version: Number(current.status_version || 0) + 1,
  }).eq('id', orderId).eq('status_version', current.status_version).select('*').maybeSingle();
  if (error || !updated) return res.status(409).json({ success: false, error: 'Order changed on another device.' });
  if (updated.tracking_token) {
    const channel = supabase.channel(`qr-order:${updated.tracking_token}`);
    await new Promise<void>((resolve) => channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }));
    await channel.send({ type: 'broadcast', event: 'order-status', payload: {
      order_status: updated.order_status,
      kitchen_status: updated.kitchen_status,
      payment_status: updated.payment_status,
      rejection_reason: updated.rejection_reason,
      updated_at: updated.updated_at,
    } });
    await supabase.removeChannel(channel);
  }
  return res.status(200).json({ success: true });
}
