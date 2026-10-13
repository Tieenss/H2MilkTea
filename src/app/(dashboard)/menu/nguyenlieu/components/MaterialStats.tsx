'use client';

import { Package, AlertTriangle, FileText, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Material } from '../types/material';

import { formatNumber } from '../utils/formatters';

interface MaterialStatsProps {
    materials: Material[];
}

export const MaterialStats: React.FC<MaterialStatsProps> = ({ materials }) => {
    const totalMaterials = materials.length;

    const units = Array.from(new Set(materials.map(m => m['Đơn vị tính']).filter(Boolean)));
    const unitCount = units.length;

    const totalWarningQuantity = materials.reduce((sum, m) => sum + (Number(m['Số lượng cảnh báo']) || 0), 0);

    const materialsWithNotes = materials.filter(m => m['Ghi chú'] && m['Ghi chú'].trim() !== '').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng nguyên vật liệu</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalMaterials}</div>
                    <p className="text-xs text-muted-foreground">
                        Đang quản lý
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng SL cảnh báo</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                        {formatNumber(totalWarningQuantity)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Ngưỡng cảnh báo
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Có ghi chú</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{materialsWithNotes}</div>
                    <p className="text-xs text-muted-foreground">
                        Đã có mô tả
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Đơn vị tính</CardTitle>
                    <Hash className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{unitCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Loại đơn vị
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};