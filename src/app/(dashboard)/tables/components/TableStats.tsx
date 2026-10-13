'use client';

import { MapPin, Users, CheckCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Table } from '../types/table';

interface TableStatsProps {
  tables: Table[];
}

export const TableStats: React.FC<TableStatsProps> = ({ tables }) => {
  const totalTables = tables.length;
  const activeTables = tables.filter(t => t['Trạng thái'] === 'Đang hoạt động').length;
  const maintenanceTables = tables.filter(t => t['Trạng thái'] === 'Bảo trì').length;

  const totalCapacity = tables.reduce((sum, table) => sum + (Number( table['Sức chứa tối đa']) || 0), 0);
  const averageCapacity = totalTables > 0 ? (totalCapacity / totalTables).toFixed(1) : '0';

  const activeRate = totalTables > 0 ? 
    (activeTables / totalTables * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng số bàn</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTables}</div>
          <p className="text-xs text-muted-foreground">
            Hoạt động: {activeTables} | Bảo trì: {maintenanceTables}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng sức chứa</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {totalCapacity} người
          </div>
          <p className="text-xs text-muted-foreground">
            Trung bình: {averageCapacity} người/bàn
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bàn hoạt động</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{activeTables}</div>
          <p className="text-xs text-muted-foreground">
            Tỷ lệ: {activeRate}%
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bảo trì</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{maintenanceTables}</div>
          <p className="text-xs text-muted-foreground">
            Cần kiểm tra
          </p>
        </CardContent>
      </Card>
    </div>
  );
};