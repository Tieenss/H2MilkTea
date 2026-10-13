import { NextApiRequest, NextApiResponse } from 'next';
import { kitchenOrders } from './orders';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const orderData = req.body;
    
    // Thêm đơn hàng mới vào queue
    kitchenOrders.push({
      ...orderData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    console.log('New order added to kitchen:', orderData.id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Order sent to kitchen' 
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}