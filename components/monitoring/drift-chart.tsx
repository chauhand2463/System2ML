'use client'

import React from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const driftData = [
  { time: '00:00', drift: 0.02, threshold: 0.05 },
  { time: '04:00', drift: 0.031, threshold: 0.05 },
  { time: '08:00', drift: 0.045, threshold: 0.05 },
  { time: '12:00', drift: 0.052, threshold: 0.05 },
  { time: '16:00', drift: 0.068, threshold: 0.05 },
  { time: '20:00', drift: 0.075, threshold: 0.05 },
  { time: '24:00', drift: 0.082, threshold: 0.05 },
]

const performanceData = [
  { metric: 'Latency (ms)', value: 45, target: 50 },
  { metric: 'Throughput (ops/s)', value: 1200, target: 1000 },
  { metric: 'Error Rate (%)', value: 0.5, target: 1.0 },
  { metric: 'CPU Usage (%)', value: 62, target: 80 },
]

const qualityData = [
  { date: '2024-02-14', accuracy: 0.94, precision: 0.92, recall: 0.89 },
  { date: '2024-02-15', accuracy: 0.945, precision: 0.925, recall: 0.895 },
  { date: '2024-02-16', accuracy: 0.94, precision: 0.918, recall: 0.887 },
  { date: '2024-02-17', accuracy: 0.935, precision: 0.91, recall: 0.88 },
  { date: '2024-02-18', accuracy: 0.93, precision: 0.905, recall: 0.875 },
  { date: '2024-02-19', accuracy: 0.928, precision: 0.902, recall: 0.872 },
  { date: '2024-02-20', accuracy: 0.925, precision: 0.898, recall: 0.87 },
]

const DriftChartComponent = () => {
  return (
    <div className="w-full h-64 bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Data Drift Detection</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={driftData}>
          <defs>
            <linearGradient id="colorDrift" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis dataKey="time" stroke="#737373" />
          <YAxis stroke="#737373" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Area type="monotone" dataKey="drift" stroke="#ef4444" fill="url(#colorDrift)" />
          <Line type="monotone" dataKey="threshold" stroke="#3b82f6" strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export const DriftChart = React.memo(DriftChartComponent)

const PerformanceChartComponent = () => {
  return (
    <div className="w-full h-64 bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Performance Metrics</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={performanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis dataKey="metric" stroke="#737373" angle={-45} textAnchor="end" height={100} />
          <YAxis stroke="#737373" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend />
          <Bar dataKey="value" fill="#6b8ef4" name="Current" />
          <Bar dataKey="target" fill="#737373" name="Target" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const PerformanceChart = React.memo(PerformanceChartComponent)

const QualityTrendChartComponent = () => {
  return (
    <div className="w-full h-64 bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Model Quality Trend</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={qualityData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis dataKey="date" stroke="#737373" />
          <YAxis stroke="#737373" domain={[0.85, 1]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend />
          <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Accuracy" />
          <Line type="monotone" dataKey="precision" stroke="#f59e0b" strokeWidth={2} name="Precision" />
          <Line type="monotone" dataKey="recall" stroke="#ef4444" strokeWidth={2} name="Recall" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const QualityTrendChart = React.memo(QualityTrendChartComponent)
