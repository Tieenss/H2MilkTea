'use client';

import { Users, Shield, Briefcase, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Employee } from '../types/employee';

interface EmployeeStatsProps {
  employees: Employee[];
}

export const EmployeeStats: React.FC<EmployeeStatsProps> = ({ employees }) => {
  const totalEmployees = employees.length;
  const adminCount = employees.filter(emp => emp['Phân quyền'] === 'Admin').length;
  const managerCount = employees.filter(emp => emp['Phân quyền'] === 'Giám đốc').length;
  const staffCount = employees.filter(emp => emp['Phân quyền'] === 'Nhân viên').length;

  const departments = Array.from(new Set(employees.map(emp => emp['Phòng']).filter(Boolean)));
  const departmentCount = departments.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            Tổng số nhân viên trong hệ thống
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quản trị viên</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{adminCount}</div>
          <p className="text-xs text-muted-foreground">
            Admin và Giám đốc: {adminCount + managerCount}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nhân viên</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{staffCount}</div>
          <p className="text-xs text-muted-foreground">
            Nhân viên thông thường
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Phòng ban</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{departmentCount}</div>
          <p className="text-xs text-muted-foreground">
            Tổng số phòng ban
          </p>
        </CardContent>
      </Card>
    </div>
  );
};