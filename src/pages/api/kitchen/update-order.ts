import { NextApiRequest, NextApiResponse } from 'next';
import { kitchenOrders } from './orders';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { orderId, status } = req.body;

    // Cập nhật status của đơn hàng
    const orderIndex = kitchenOrders.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
      kitchenOrders[orderIndex] = {
        ...kitchenOrders[orderIndex],
        status,
        updatedAt: new Date().toISOString()
      };

      // Nếu status là 'served', có thể xóa sau 1 phút
      if (status === 'served') {
        setTimeout(() => {
          const index = kitchenOrders.findIndex(order => order.id === orderId);
          if (index !== -1) {
            kitchenOrders.splice(index, 1);
          }
        }, 60000); // 1 phút
      }

      res.status(200).json({ 
        success: true, 
        message: 'Order updated' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}