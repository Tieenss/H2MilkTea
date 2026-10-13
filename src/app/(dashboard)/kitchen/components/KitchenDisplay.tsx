'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/app/(dashboard)/pos/utils/formatters';

interface KitchenOrder {
  id: string;
  tableId: string;
  tableName: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    note?: string;
    unit: string;
  }>;
  orderTime: string;
  employee: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  priority: 'normal' | 'urgent';
  estimatedTime?: number;
  notes?: string;
}

interface KitchenDisplayProps {
  stationId?: string;
  maxOrders?: number;
}

export const KitchenDisplay: React.FC<KitchenDisplayProps> = ({
  stationId = 'main',
  maxOrders = 12
}) => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);

  // Polling để nhận đơn hàng mới (thay thế WebSocket)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/kitchen/orders');
        if (response.ok) {
          const data = await response.json();
          const newOrders = data.orders || [];
          
          // Check for new orders to play sound
          if (newOrders.length > lastOrderCount && lastOrderCount > 0 && soundEnabled) {
            playNotificationSound();
          }
          
          setOrders(newOrders);
          setLastOrderCount(newOrders.length);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setIsConnected(false);
      }
    };

    // Initial fetch
    fetchOrders();
    
    // Poll every 3 seconds
    const interval = setInterval(fetchOrders, 3000);

    return () => clearInterval(interval);
  }, [lastOrderCount, soundEnabled]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: KitchenOrder['status']) => {
    try {
      const response = await fetch('/api/kitchen/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });

      if (response.ok) {
        setOrders(prev => 
          prev.map(order => 
            order.id === orderId ? { ...order, status } : order
          ).filter(order => order.status !== 'served') // Remove served orders
        );
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getOrderAge = (orderTime: string): number => {
    return Math.floor((currentTime.getTime() - new Date(orderTime).getTime()) / (1000 * 60));
  };

  const getStatusColor = (status: KitchenOrder['status']) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-800 border-red-200';
      case 'preparing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'served': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: KitchenOrder['priority'], age: number) => {
    if (priority === 'urgent' || age > 15) {
      return 'border-red-500 bg-red-50 shadow-red-100 shadow-lg';
    }
    if (age > 10) {
      return 'border-orange-500 bg-orange-50 shadow-orange-100 shadow-lg';
    }
    return 'border-gray-200 bg-white shadow-sm';
  };

  const getStatusText = (status: KitchenOrder['status']) => {
    switch (status) {
      case 'pending': return 'CHỜ LÀM';
      case 'preparing': return 'ĐANG LÀM';
      case 'ready': return 'HOÀN THÀNH';
      case 'served': return 'ĐÃ PHỤC VỤ';
      default: return status.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                🍳 Kitchen Display - {stationId.toUpperCase()}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentTime.toLocaleString('vi-VN')} | 
                <span className={`ml-2 flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {isConnected ? 'Đang kết nối' : 'Mất kết nối'}
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Đơn hàng chờ</div>
                <div className="text-3xl font-bold text-blue-600">{orders.length}</div>
              </div>
              
              <Button
                onClick={() => setSoundEnabled(!soundEnabled)}
                variant={soundEnabled ? "default" : "outline"}
                size="lg"
                className="text-base"
              >
                {soundEnabled ? '🔊' : '🔇'} 
                <span className="ml-2">{soundEnabled ? 'Bật âm thanh' : 'Tắt âm thanh'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-6">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-2xl font-medium">Không có đơn hàng nào</p>
            <p className="text-gray-400 text-lg mt-2">
              Đơn hàng mới sẽ hiển thị tại đây
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => {
              const age = getOrderAge(order.orderTime);
              const priorityColor = getPriorityColor(order.priority, age);
              
              return (
                <Card
                  key={order.id}
                  className={`p-6 ${priorityColor} border-2 transition-all duration-200 hover:scale-105`}
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-800">
                        {order.tableName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        #{order.id.slice(-6)} • {order.employee}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Badge className={`${getStatusColor(order.status)} mb-2 text-xs px-3 py-1`}>
                        {getStatusText(order.status)}
                      </Badge>
                      <div className={`text-sm font-bold ${
                        age > 15 ? 'text-red-600' : 
                        age > 10 ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {age} phút trước
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-6">
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex justify-between items-start p-3 bg-white rounded-lg border shadow-sm"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 text-base">
                            {item.name}
                          </div>
                          {item.note && (
                            <div className="text-sm text-blue-600 italic mt-1 font-medium">
                              📝 {item.note}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-bold text-xl text-gray-800 bg-blue-100 px-3 py-1 rounded-full">
                            x{item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Notes */}
                  {order.notes && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm font-semibold text-yellow-800">📋 Ghi chú:</div>
                      <div className="text-sm text-yellow-700 mt-1">{order.notes}</div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-3">
                    {order.status === 'pending' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 text-base font-semibold"
                        size="lg"
                      >
                        🔥 Bắt đầu làm
                      </Button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="bg-green-500 hover:bg-green-600 text-white py-3 text-base font-semibold"
                        size="lg"
                      >
                        ✅ Hoàn thành
                      </Button>
                    )}
                    
                    {order.status === 'ready' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'served')}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-3 text-base font-semibold"
                        size="lg"
                      >
                        🚀 Đã phục vụ
                      </Button>
                    )}

                    <Button
                      onClick={() => updateOrderStatus(order.id, 'served')}
                      variant="outline"
                      size="lg"
                      className="text-gray-600 border-gray-300 hover:bg-gray-50 py-2"
                    >
                      ❌ Xóa đơn
                    </Button>
                  </div>

                  {/* Order Time Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                      Thời gian đặt: {new Date(order.orderTime).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};