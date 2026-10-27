'use client';

import React from 'react';
import { AlertTriangle, Clock, CheckCircle, X, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StocktakeAlert } from '../types/stocktake';

interface StocktakeAlertsProps {
  alerts: StocktakeAlert[];
  onMarkAsRead: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onDismissAll?: () => void;
}

export function StocktakeAlerts({
  alerts,
  onMarkAsRead,
  onDismiss,
  onDismissAll,
}: StocktakeAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue':
      case 'warning':
        return <Clock className="h-4 w-4 text-red-500 mt-0.5" />;
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />;
      case 'discrepancy':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'overdue':
      case 'warning':
        return 'bg-red-50/80 border-red-200';
      case 'low_stock':
        return 'bg-orange-50/80 border-orange-200';
      case 'discrepancy':
      case 'error':
        return 'bg-amber-50/80 border-amber-200';
      default:
        return 'bg-blue-50/80 border-blue-200';
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case 'overdue':
      case 'warning':
        return 'bg-red-100 text-red-800';
      case 'low_stock':
        return 'bg-orange-100 text-orange-800';
      case 'discrepancy':
      case 'error':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'overdue':
      case 'warning':
        return 'Quá hạn';
      case 'low_stock':
        return 'Tồn kho thấp';
      case 'discrepancy':
      case 'error':
        return 'Chênh lệch';
      default:
        return 'Thông báo';
    }
  };

  const unreadCount = alerts.filter((a) => !(a.DaDoc ?? a.isRead)).length;

  return (
    <Card className="mb-6 border-orange-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cảnh báo kiểm kê
              <Badge variant="secondary" className="ml-1">
                {alerts.length} thông báo ({unreadCount} chưa đọc)
              </Badge>
            </CardTitle>
            <CardDescription>Các cảnh báo kiểm kê và chênh lệch tồn kho cần lưu ý</CardDescription>
          </div>

          {onDismissAll && alerts.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onDismissAll}
              className="h-8 text-xs text-gray-600 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Ẩn tất cả cảnh báo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const alertId = alert.IDCanhBao || alert.id;
          const alertType = alert.LoaiCanhBao || alert.type || 'info';
          const isRead = Boolean(alert.DaDoc ?? alert.isRead);
          const title = alert.TieuDe || alert.title || 'Cảnh báo kiểm kê';
          const content = alert.NoiDung || alert.message || '';
          const createdDate = alert.NgayTao || alert.date || new Date().toISOString();

          return (
            <div
              key={alertId}
              className={`p-3.5 rounded-xl border transition-all ${getAlertColor(alertType)} ${
                isRead ? 'opacity-65 bg-gray-50/80 border-gray-200' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {getAlertIcon(alertType)}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm text-gray-900">{title}</h4>
                      <Badge className={`text-xs ${getAlertBadgeColor(alertType)}`}>
                        {getAlertTypeText(alertType)}
                      </Badge>
                      {isRead && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          ✓ Đã đọc
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-1.5">{content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Ngày tạo: {new Date(createdDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isRead && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkAsRead(alertId)}
                      className="h-8 px-2.5 text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-semibold"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      Đã đọc
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title="Bỏ qua thông báo này"
                    onClick={() => {
                      if (onDismiss) {
                        onDismiss(alertId);
                      } else {
                        onMarkAsRead(alertId);
                      }
                    }}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
