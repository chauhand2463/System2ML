import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CostAnalyticsChart, CarbonEmissionsChart, CostBreakdownPie } from '@/components/governance/cost-carbon-chart'
import { DollarSign, Leaf, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CostAnalyticsPage() {
  const totalCost = '$4,900'
  const costTrend = '+8.2%'
  const totalCarbon = '1,225 g'
  const carbonTrend = '+12.5%'
  const monthlyEstimate = '$19,600'

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cost & Carbon Analytics</h1>
            <p className="text-neutral-400">Track infrastructure costs and carbon emissions</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-400">Total Weekly Cost</p>
              <DollarSign className="w-5 h-5 text-brand-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{totalCost}</p>
            <p className="text-xs text-danger-500 font-medium">{costTrend} from last week</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-400">Monthly Estimate</p>
              <TrendingUp className="w-5 h-5 text-warning-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{monthlyEstimate}</p>
            <p className="text-xs text-neutral-500">Based on current usage</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-400">Weekly CO₂ Emissions</p>
              <Leaf className="w-5 h-5 text-success-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{totalCarbon}</p>
            <p className="text-xs text-danger-500 font-medium">{carbonTrend} from last week</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-400">Cost Optimization</p>
              <AlertCircle className="w-5 h-5 text-info-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">3 Alerts</p>
            <p className="text-xs text-neutral-500">View recommendations</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CostAnalyticsChart />
          <CostBreakdownPie />
        </div>

        <CarbonEmissionsChart />

        {/* Optimization Recommendations */}
        <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-bold text-white mb-6">Optimization Recommendations</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border border-warning-500/20 bg-warning-500/5">
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

            <div className="flex items-start gap-4 p-4 rounded-lg border border-info-500/20 bg-info-500/5">
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

            <div className="flex items-start gap-4 p-4 rounded-lg border border-success-500/20 bg-success-500/5">
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
