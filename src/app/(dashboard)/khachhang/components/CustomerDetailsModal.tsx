// components/CustomerDetailsModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, Edit, Phone, Mail, MapPin, Calendar, Gift, CreditCard, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  formatCurrency, 
  formatCustomerDate, 
  formatCustomerDateTime,
  getCustomerTypeColor, 
  getCustomerStatusColor,
  formatPoints,
  formatAge,
  getTimeAgo
} from '../utils/customerFormatters';
import type { Customer, CustomerTransaction } from '../types/customer';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  transactions: CustomerTransaction[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSettleDebt?: (customer: Customer) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  transactions,
  isOpen,
  onClose,
  onEdit,
  onSettleDebt
}) => {
  if (!customer) return null;

  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter(t => t['Trạng thái'] === 'Đã thanh toán').length;
  const averageOrderValue = totalTransactions > 0 ? 
    transactions.reduce((sum, t) => sum + t['Tổng tiền'], 0) / totalTransactions : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Chi tiết khách hàng
            </DialogTitle>
            <Button onClick={onEdit} size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[75vh]">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Thông tin cá nhân</TabsTrigger>
              <TabsTrigger value="loyalty">Điểm & Ưu đãi</TabsTrigger>
              <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              {/* Customer Header */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    {customer['Tên khách hàng']?.charAt(0)?.toUpperCase() || 'K'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold">{customer['Tên khách hàng']}</h3>
                    <Badge className={getCustomerTypeColor(customer['Loại khách hàng'])}>
                      {customer['Loại khách hàng']}
                    </Badge>
                    <Badge className={getCustomerStatusColor(customer['Trạng thái'])}>
                      {customer['Trạng thái']}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Mã khách hàng: <span className="font-medium">{customer.IDKHACHHANG}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Thông tin liên hệ</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Số điện thoại</div>
                        <div className="font-medium">{customer['Số điện thoại']}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Email</div>
                        <div className="font-medium">{customer['Email'] || 'Chưa có'}</div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                      <div>
                        <div className="text-sm text-gray-600">Địa chỉ</div>
                        <div className="font-medium">{customer['Địa chỉ'] || 'Chưa có'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Thông tin cá nhân</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Ngày sinh</div>
                        <div className="font-medium">
                          {customer['Ngày sinh'] ? 
                            `${formatCustomerDate(customer['Ngày sinh'])} (${formatAge(customer['Ngày sinh'])})` 
                            : 'Chưa có'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="h-4 w-4 text-gray-500">👤</div>
                      <div>
                        <div className="text-sm text-gray-600">Giới tính</div>
                        <div className="font-medium">{customer['Giới tính']}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="h-4 w-4 text-gray-500">📅</div>
                      <div>
                        <div className="text-sm text-gray-600">Ngày tạo</div>
                        <div className="font-medium">{formatCustomerDateTime(customer['Ngày tạo'])}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {customer['Ghi chú'] && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Ghi chú</h4>
                  <p className="text-gray-700">{customer['Ghi chú']}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="loyalty" className="space-y-6">
              {/* Loyalty & Debt Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gift className="h-5 w-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-800">Điểm tích lũy</h4>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatPoints(customer['Điểm tích lũy'])}
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Tổng chi tiêu</h4>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(customer['Tổng chi tiêu'])}
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${Number(customer['Công nợ']) > 0 ? 'bg-amber-50 border border-amber-300' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <CreditCard className={`h-5 w-5 ${Number(customer['Công nợ']) > 0 ? 'text-amber-600' : 'text-gray-500'}`} />
                      <h4 className={`font-semibold ${Number(customer['Công nợ']) > 0 ? 'text-amber-900' : 'text-gray-700'}`}>Công nợ</h4>
                    </div>
                    {Number(customer['Công nợ']) > 0 && onSettleDebt && (
                      <Button size="sm" onClick={() => onSettleDebt(customer)} className="h-6 text-xs bg-amber-600 hover:bg-amber-700 text-white px-2">
                        Thu nợ
                      </Button>
                    )}
                  </div>
                  <div className={`text-2xl font-bold ${Number(customer['Công nợ']) > 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                    {formatCurrency(Number(customer['Công nợ']) || 0)}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <History className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Lần mua cuối</h4>
                  </div>
                  <div className="text-sm font-medium text-blue-600">
                    {customer['Lần mua cuối'] ? (
                      <div>
                        <div>{formatCustomerDate(customer['Lần mua cuối'])}</div>
                        <div className="text-xs">{getTimeAgo(customer['Lần mua cuối'])}</div>
                      </div>
                    ) : (
                      'Chưa mua hàng'
                    )}
                  </div>
                </div>
              </div>

              {/* Current Offers */}
              {customer['Ưu đãi hiện tại'] && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Ưu đãi hiện tại</h4>
                  <p className="text-purple-700">{customer['Ưu đãi hiện tại']}</p>
                </div>
              )}

              {/* Transaction Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalTransactions}</div>
                  <div className="text-sm text-gray-600">Tổng đơn hàng</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{completedTransactions}</div>
                  <div className="text-sm text-gray-600">Đơn hoàn thành</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(averageOrderValue)}
                  </div>
                  <div className="text-sm text-gray-600">Giá trị TB/đơn</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Lịch sử giao dịch ({transactions.length})</h4>
              </div>

              {transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã hóa đơn</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Bàn</TableHead>
                      <TableHead className="text-right">Tổng tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.IDHOADON}>
                        <TableCell className="font-medium">
                          {transaction.IDHOADON}
                        </TableCell>
                        <TableCell>
                          {formatCustomerDateTime(transaction['Ngày'])}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction['Bàn']}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transaction['Tổng tiền'])}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              transaction['Trạng thái'] === 'Đã thanh toán' 
                                ? 'bg-green-100 text-green-800'
                                : transaction['Trạng thái'] === 'Đã hủy'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {transaction['Trạng thái']}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Khách hàng chưa có giao dịch nào
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};