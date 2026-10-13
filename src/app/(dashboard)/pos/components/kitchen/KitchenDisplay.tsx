'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../../utils/formatters';
import type { CartItem } from '../../types/pos';

interface KitchenOrder {
  id: string;
  tableId: string;
  tableName: string;
  items: CartItem[];
  orderTime: string;
  employee: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  priority: 'normal' | 'urgent';
  estimatedTime?: number; // phút
  notes?: string;
}

interface KitchenDisplayProps {
  stationId?: string; // ID của trạm bếp (nếu có nhiều màn hình)
  maxOrders?: number; // Số đơn tối đa hiển thị
}

export const KitchenDisplay: React.FC<KitchenDisplayProps> = ({
  stationId = 'main',
  maxOrders = 12
}) => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/kitchen/${stationId}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Kitchen display connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleKitchenMessage(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Kitchen display disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [stationId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleKitchenMessage = (data: any) => {
    switch (data.type) {
      case 'NEW_ORDER':
        setOrders(prev => [data.order, ...prev].slice(0, maxOrders));
        if (soundEnabled) {
          playNotificationSound();
        }
        break;
      
      case 'UPDATE_ORDER':
        setOrders(prev => 
          prev.map(order => 
            order.id === data.orderId 
              ? { ...order, ...data.updates }
              : order
          )
        );
        break;
      
      case 'REMOVE_ORDER':
        setOrders(prev => prev.filter(order => order.id !== data.orderId));
        break;
      
      case 'CLEAR_ALL':
        setOrders([]);
        break;
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/new-order.mp3');
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const updateOrderStatus = (orderId: string, status: KitchenOrder['status']) => {
    // Send update to server
    fetch('/api/kitchen/update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status })
    });

    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, status }
          : order
      )
    );
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
      return 'border-red-500 bg-red-50';
    }
    if (age > 10) {
      return 'border-orange-500 bg-orange-50';
    }
    return 'border-gray-200 bg-white';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kitchen Display - {stationId.toUpperCase()}</h1>
            <p className="text-gray-600">
              {currentTime.toLocaleString('vi-VN')} | 
              <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '● Connected' : '● Disconnected'}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Orders in queue</div>
              <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
            </div>
            
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
            >
              {soundEnabled ? '🔊' : '🔇'} Sound
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map((order) => {
          const age = getOrderAge(order.orderTime);
          const priorityColor = getPriorityColor(order.priority, age);
          
          return (
            <Card
              key={order.id}
              className={`p-4 ${priorityColor} border-2 transition-all duration-200`}
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">
                    {order.tableName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    #{order.id.slice(-6)} • {order.employee}
                  </p>
                </div>
                
                <div className="text-right">
                  <Badge className={`${getStatusColor(order.status)} mb-1`}>
                    {order.status.toUpperCase()}
                  </Badge>
                  <div className={`text-sm font-medium ${
                    age > 15 ? 'text-red-600' : 
                    age > 10 ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {age}m ago
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2 mb-4">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex justify-between items-center p-2 bg-white rounded border"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {item.name}
                      </div>
                      {item.note && (
                        <div className="text-sm text-blue-600 italic">
                          {item.note}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-800">
                        x{item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Notes */}
              {order.notes && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm font-medium text-yellow-800">Note:</div>
                  <div className="text-sm text-yellow-700">{order.notes}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {order.status === 'pending' && (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    size="sm"
                  >
                    Start Cooking
                  </Button>
                )}
                
                {order.status === 'preparing' && (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    size="sm"
                  >
                    Mark Ready
                  </Button>
                )}
                
                {order.status === 'ready' && (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'served')}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    Served
                  </Button>
                )}

                <Button
                  onClick={() => updateOrderStatus(order.id, 'served')}
                  variant="outline"
                  size="sm"
                  className="text-gray-600"
                >
                  Remove
                </Button>
              </div>

              {/* Estimated Time */}
              {order.estimatedTime && (
                <div className="mt-2 text-center">
                  <div className="text-xs text-gray-500">
                    Est. time: {order.estimatedTime}m
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 text-xl">No orders in queue</p>
          <p className="text-gray-400 text-sm mt-2">
            New orders will appear here automatically
          </p>
        </div>
      )}
    </div>
  );
};