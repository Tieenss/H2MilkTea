'use client';

import React from 'react';
import { AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StocktakeAlert } from '../types/stocktake';

interface StocktakeAlertsProps {
  alerts: StocktakeAlert[];
  onMarkAsRead: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

export function StocktakeAlerts({ alerts, onMarkAsRead, onDismiss }: StocktakeAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            Cảnh báo kiểm kê
          </CardTitle>
          <CardDescription>
            Không có cảnh báo nào cần xử lý
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'discrepancy':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'low_stock':
        return 'bg-orange-50 border-orange-200';
      case 'discrepancy':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'low_stock':
        return 'bg-orange-100 text-orange-800';
      case 'discrepancy':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'Quá hạn';
      case 'low_stock':
        return 'Tồn kho thấp';
      case 'discrepancy':
        return 'Chênh lệch';
      default:
        return 'Thông báo';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Cảnh báo kiểm kê
          <Badge variant="secondary" className="ml-2">
            {alerts.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Các cảnh báo cần xử lý gấp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.IDCanhBao}
            className={`p-4 rounded-lg border ${getAlertColor(alert.LoaiCanhBao)} ${
              alert.DaDoc ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getAlertIcon(alert.LoaiCanhBao)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">
                      {alert.TieuDe}
                    </h4>
                    <Badge className={`text-xs ${getAlertBadgeColor(alert.LoaiCanhBao)}`}>
                      {getAlertTypeText(alert.LoaiCanhBao)}
                    </Badge>
                    {alert.DaDoc && (
                      <Badge variant="outline" className="text-xs">
                        Đã đọc
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {alert.NoiDung}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Ngày tạo: {new Date(alert.NgayTao).toLocaleDateString('vi-VN')}
                    </span>
                    {alert.NgayHetHan && (
                      <span>
                        Hạn xử lý: {new Date(alert.NgayHetHan).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!alert.DaDoc && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkAsRead(alert.IDCanhBao)}
                    className="h-8 px-2"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Đã đọc
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(alert.IDCanhBao)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 