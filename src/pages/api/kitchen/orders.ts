import { NextApiRequest, NextApiResponse } from 'next';

// Temporary in-memory storage (trong production nên dùng database)
let kitchenOrders: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Lọc chỉ những đơn chưa served
    const activeOrders = kitchenOrders.filter(order => order.status !== 'served');
    
    res.status(200).json({ 
      success: true, 
      orders: activeOrders 
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Export để các API khác có thể sử dụng
export { kitchenOrders };