import React from 'react';
import type { ForecastData } from '../types/forecast';

interface DemandChartProps {
  data: ForecastData[];
}

export function DemandChart({ data }: DemandChartProps) {
  // Group data by material
  const materialGroups = data.reduce((groups, item) => {
    if (!groups[item.IDNguyenLieu]) {
      groups[item.IDNguyenLieu] = {
        name: item.TenNguyenLieu,
        data: []
      };
    }
    groups[item.IDNguyenLieu].data.push(item);
    return groups;
  }, {} as Record<string, { name: string; data: ForecastData[] }>);

  // Get top 3 materials by total forecast value
  const topMaterials = Object.values(materialGroups)
    .sort((a, b) => {
      const aTotal = a.data.reduce((sum, item) => sum + item.GiaTriDuBao, 0);
      const bTotal = b.data.reduce((sum, item) => sum + item.GiaTriDuBao, 0);
      return bTotal - aTotal;
    })
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {topMaterials.map((material, index) => {
        const totalForecast = material.data.reduce((sum, item) => sum + item.SoLuongDuBao, 0);
        const totalActual = material.data.reduce((sum, item) => sum + item.SoLuongThucTe, 0);
        const accuracy = material.data.reduce((sum, item) => sum + item.TyLeChinhXac, 0) / material.data.length;
        
        return (
          <div key={material.name} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">{material.name}</h4>
              <div className="text-sm text-muted-foreground">
                Độ chính xác: {accuracy.toFixed(1)}%
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tổng dự báo:</span>
                <span className="font-medium">{totalForecast.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tổng thực tế:</span>
                <span className="font-medium">{totalActual.toFixed(2)}</span>
              </div>
              
              {/* Simple bar chart */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs">Dự báo</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (totalForecast / 100) * 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center gap-2 mb-1 mt-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs">Thực tế</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (totalActual / 100) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {topMaterials.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Không có dữ liệu để hiển thị</p>
        </div>
      )}
    </div>
  );
} 