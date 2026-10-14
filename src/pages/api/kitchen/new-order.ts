import type { NextApiRequest, NextApiResponse } from 'next';

// Legacy endpoint retired: all new orders must go through /api/orders validation.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({ success: false, error: 'Endpoint cũ đã đóng. Hãy dùng luồng tạo đơn mới.' });
}
