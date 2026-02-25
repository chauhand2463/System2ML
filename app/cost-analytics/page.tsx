import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CostAnalyticsChart, CarbonEmissionsChart, CostBreakdownPie } from '@/components/governance/cost-carbon-chart'
import { DollarSign, Leaf, TrendingUp, AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CostAnalyticsPage() {
  const totalCost = '$4,900'
  const costTrend = '+8.2%'
  const totalCarbon = '1,225 g'
  const carbonTrend = '+12.5%'
  const monthlyEstimate = '$19,600'

  const stats = [
    { 
      label: 'Total Weekly Cost', 
      value: totalCost, 
      trend: costTrend,
      icon: DollarSign, 
      color: 'from-brand-500 to-brand-600',
      isPositive: false
    },
    { 
      label: 'Monthly Estimate', 
      value: monthlyEstimate, 
      trend: null,
      icon: TrendingUp, 
      color: 'from-amber-500 to-amber-600',
      isPositive: null
    },
    { 
      label: 'Weekly CO₂', 
      value: totalCarbon, 
      trend: carbonTrend,
      icon: Leaf, 
      color: 'from-emerald-500 to-emerald-600',
      isPositive: false
    },
    { 
      label: 'Cost Alerts', 
      value: '3', 
      trend: null,
      icon: AlertCircle, 
      color: 'from-purple-500 to-purple-600',
      isPositive: null
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cost & Carbon Analytics</h1>
            <p className="text-neutral-400">Track infrastructure costs and carbon emissions</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div 
                key={i}
                className="relative group overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-500 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {stat.trend && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${stat.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stat.trend}
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-neutral-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-6">Cost Over Time</h2>
            <CostAnalyticsChart />
          </div>
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-6">Cost Breakdown</h2>
            <CostBreakdownPie />
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-6">Carbon Emissions</h2>
          <CarbonEmissionsChart />
        </div>

        {/* Optimization Recommendations */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/20 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Optimization Recommendations</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl border border-warning-500/20 bg-warning-500/5">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-warning-500 mt-2" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Reduce compute for off-peak hours</h3>
                <p className="text-sm text-neutral-400">Scale down instances between 22:00-06:00 could save ~$1,200/month</p>
              </div>
              <Button variant="outline" size="sm" className="text-white border-neutral-700 hover:bg-neutral-800">
                Apply
              </Button>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border border-info-500/20 bg-info-500/5">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-info-500 mt-2" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Archive old model artifacts</h3>
                <p className="text-sm text-neutral-400">Moving unused artifacts to cold storage could reduce storage costs by 35%</p>
              </div>
              <Button variant="outline" size="sm" className="text-white border-neutral-700 hover:bg-neutral-800">
                Review
              </Button>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border border-success-500/20 bg-success-500/5">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-success-500 mt-2" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Use reserved instances for stable workloads</h3>
                <p className="text-sm text-neutral-400">Three pipelines are good candidates for reserved capacity pricing (~20% savings)</p>
              </div>
              <Button variant="outline" size="sm" className="text-white border-neutral-700 hover:bg-neutral-800">
                Configure
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
