import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getTransactionTypeColor } from '../utils/formatters';
import { InventoryTransaction } from '../types/inventory';

interface InventoryDataTableProps {
  transactions: InventoryTransaction[];
  onViewDetails: (transaction: InventoryTransaction) => void;
  onEditTransaction: (transaction: InventoryTransaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  isAdmin: boolean;
  isManager: boolean;
}

export const InventoryDataTable: React.FC<InventoryDataTableProps> = ({
  transactions,
  onViewDetails,
  onEditTransaction,
  onDeleteTransaction,
  isAdmin,
  isManager
}) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg mb-2">Không có giao dịch nào</div>
        <div className="text-gray-400 text-sm">Hãy thêm giao dịch đầu tiên</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Mã giao dịch</TableHead>
            <TableHead className="w-[100px]">Loại</TableHead>
            <TableHead className="w-[150px]">Ngày giao dịch</TableHead>
            <TableHead>Nhà cung cấp</TableHead>
            <TableHead>Nhân viên</TableHead>
            <TableHead className="w-[120px] text-right">Tổng tiền</TableHead>
            <TableHead className="w-[100px]">Trạng thái</TableHead>
            <TableHead className="w-[120px] text-center">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.IDGiaoDich} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                {transaction.IDGiaoDich}
              </TableCell>
              <TableCell>
                <Badge className={getTransactionTypeColor(transaction.LoaiGiaoDich)}>
                  {transaction.LoaiGiaoDich}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(transaction.NgayGiaoDich)}
              </TableCell>
              <TableCell>
                {transaction.NhaCungCap || '-'}
              </TableCell>
              <TableCell>
                {transaction.NhanVienThucHien}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(transaction.TongTien)}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(transaction.TrangThai)}>
                  {transaction.TrangThai}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(transaction)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(isAdmin || isManager) && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTransaction(transaction)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTransaction(transaction.IDGiaoDich)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 