import React from 'react';
import type { ForecastData } from '../types/forecast';

interface SeasonalAnalysisProps {
  data: ForecastData[];
}

export function SeasonalAnalysis({ data }: SeasonalAnalysisProps) {
  // Mock seasonal data
  const seasonalData = [
    { season: 'Mùa xuân', demand: 120, percentage: 25 },
    { season: 'Mùa hè', demand: 180, percentage: 38 },
    { season: 'Mùa thu', demand: 100, percentage: 21 },
    { season: 'Mùa đông', demand: 75, percentage: 16 }
  ];

  // Mock weekday data
  const weekdayData = [
    { day: 'Thứ 2', demand: 15, percentage: 12 },
    { day: 'Thứ 3', demand: 18, percentage: 14 },
    { day: 'Thứ 4', demand: 20, percentage: 16 },
    { day: 'Thứ 5', demand: 22, percentage: 18 },
    { day: 'Thứ 6', demand: 25, percentage: 20 },
    { day: 'Thứ 7', demand: 28, percentage: 22 },
    { day: 'Chủ nhật', demand: 30, percentage: 24 }
  ];

  const totalDemand = seasonalData.reduce((sum, item) => sum + item.demand, 0);

  return (
    <div className="space-y-6">
      {/* Seasonal Analysis */}
      <div>
        <h4 className="font-medium mb-3">Phân tích theo mùa</h4>
        <div className="space-y-3">
          {seasonalData.map((item, index) => (
            <div key={item.season} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{
                  backgroundColor: `hsl(${index * 90}, 70%, 60%)`
                }}></div>
                <span className="text-sm">{item.season}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: `hsl(${index * 90}, 70%, 60%)`
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekday Analysis */}
      <div>
        <h4 className="font-medium mb-3">Phân tích theo ngày trong tuần</h4>
        <div className="space-y-2">
          {weekdayData.map((item, index) => (
            <div key={item.day} className="flex items-center justify-between">
              <span className="text-sm">{item.day}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${(item.demand / 30) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {item.demand}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Tổng nhu cầu</div>
            <div className="font-medium">{totalDemand}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Mùa cao điểm</div>
            <div className="font-medium">Mùa hè (38%)</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ngày cao điểm</div>
            <div className="font-medium">Chủ nhật</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ngày thấp điểm</div>
            <div className="font-medium">Thứ 2</div>
          </div>
        </div>
      </div>
    </div>
  );
} 