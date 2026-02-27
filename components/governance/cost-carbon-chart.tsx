'use client'

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const costData = [
  { week: 'Week 1', compute: 1200, storage: 400, transfer: 300 },
  { week: 'Week 2', compute: 1400, storage: 420, transfer: 350 },
  { week: 'Week 3', compute: 1100, storage: 380, transfer: 280 },
  { week: 'Week 4', compute: 1600, storage: 450, transfer: 380 },
]

const carbonData = [
  { time: '00:00', grams: 120 },
  { time: '04:00', grams: 95 },
  { time: '08:00', grams: 180 },
  { time: '12:00', grams: 220 },
  { time: '16:00', grams: 260 },
  { time: '20:00', grams: 200 },
  { time: '24:00', grams: 150 },
]

const costBreakdown = [
  { name: 'Compute', value: 1200, color: '#6b8ef4' },
  { name: 'Storage', value: 400, color: '#10b981' },
  { name: 'Transfer', value: 300, color: '#f59e0b' },
]

export function CostAnalyticsChart({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [
    { date: 'Mon', value: 1200 },
    { date: 'Tue', value: 1400 },
    { date: 'Wed', value: 1100 },
    { date: 'Thu', value: 1600 },
  ]

  return (
    <div className="w-full h-72 bg-neutral-900/50 rounded-xl border border-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#737373"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#737373"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
            itemStyle={{ color: '#6b8ef4' }}
          />
          <Bar dataKey="value" fill="#6b8ef4" radius={[4, 4, 0, 0]} name="Cost" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CarbonEmissionsChart({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [
    { date: '00:00', value: 120 },
    { date: '04:00', value: 95 },
    { date: '08:00', value: 180 },
    { date: '12:00', value: 220 },
    { date: '16:00', value: 260 },
  ]

  return (
    <div className="w-full h-72 bg-neutral-900/50 rounded-xl border border-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#737373"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#737373"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}g`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
            itemStyle={{ color: '#14b8a6' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#14b8a6"
            strokeWidth={3}
            dot={{ fill: '#14b8a6', r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name="CO₂ Emissions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CostBreakdownPie({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [
    { name: 'Compute', value: 1200, color: '#6b8ef4' },
    { name: 'Storage', value: 400, color: '#10b981' },
    { name: 'Transfer', value: 300, color: '#f59e0b' },
  ]

  return (
    <div className="w-full h-72 bg-neutral-900/50 rounded-xl border border-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
