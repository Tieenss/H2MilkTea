// components/charts/ClientCharts.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface ClientChartsProps {
  salesData: any[]
  categoryData: any[]
}

export function ClientCharts({ salesData, categoryData }: ClientChartsProps) {
  return (
    <>
      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value, name) => [
            name === 'revenue' ? `${value.toLocaleString()}đ` : value,
            name === 'revenue' ? 'Doanh thu' : 'Đơn hàng'
          ]} />
          <Bar dataKey="revenue" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({name, value}) => `${name}: ${value}%`}
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </>
  )
}