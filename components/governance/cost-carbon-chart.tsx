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

export function CostAnalyticsChart() {
  return (
    <div className="w-full h-72 bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Weekly Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={costData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis dataKey="week" stroke="#737373" />
          <YAxis stroke="#737373" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend />
          <Bar dataKey="compute" stackId="a" fill="#6b8ef4" name="Compute" />
          <Bar dataKey="storage" stackId="a" fill="#10b981" name="Storage" />
          <Bar dataKey="transfer" stackId="a" fill="#f59e0b" name="Transfer" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CarbonEmissionsChart() {
  return (
    <div className="w-full h-72 bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Carbon Emissions (g CO₂)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={carbonData}>
          <defs>
            <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis dataKey="time" stroke="#737373" />
          <YAxis stroke="#737373" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Line 
            type="monotone" 
            dataKey="grams" 
            stroke="#14b8a6" 
            strokeWidth={2}
            fill="url(#colorCarbon)"
            name="CO₂ Emissions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CostBreakdownPie() {
  return (
    <div className="w-full h-72 bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Cost Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={costBreakdown}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {costBreakdown.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
