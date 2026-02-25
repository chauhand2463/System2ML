import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ChevronRight, Bell, Shield, Users, Zap } from 'lucide-react'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-neutral-400">Manage your organization and preferences</p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Organization Settings */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-white">Organization</h2>
            </div>
            <div className="divide-y divide-neutral-800">
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Organization Name</p>
                  <p className="text-sm text-neutral-400">DataCorp ML</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Plan</p>
                  <p className="text-sm text-neutral-400">Enterprise</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Billing</p>
                  <p className="text-sm text-neutral-400">Manage payment methods</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
            </div>
          </div>

          {/* Team Settings */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Management
              </h2>
            </div>
            <div className="divide-y divide-neutral-800">
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Members</p>
                  <p className="text-sm text-neutral-400">3 members in organization</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Roles & Permissions</p>
                  <p className="text-sm text-neutral-400">Configure access levels</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Invitations</p>
                  <p className="text-sm text-neutral-400">Pending: 1 invitation</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </h2>
            </div>
            <div className="divide-y divide-neutral-800 p-6 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-white">Pipeline Deployments</p>
                  <p className="text-sm text-neutral-400">Notify on successful deployments</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-white">Failures & Errors</p>
                  <p className="text-sm text-neutral-400">Immediate alerts for failures</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-white">Data Drift</p>
                  <p className="text-sm text-neutral-400">Alert on significant drift</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-white">Weekly Reports</p>
                  <p className="text-sm text-neutral-400">Summary of system health</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </h2>
            </div>
            <div className="divide-y divide-neutral-800">
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Two-Factor Authentication</p>
                  <p className="text-sm text-neutral-400">Enabled</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">API Keys</p>
                  <p className="text-sm text-neutral-400">Manage API access</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">SSH Keys</p>
                  <p className="text-sm text-neutral-400">1 key configured</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Active Sessions</p>
                  <p className="text-sm text-neutral-400">Manage login sessions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Integrations
              </h2>
            </div>
            <div className="divide-y divide-neutral-800">
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Slack Integration</p>
                  <p className="text-sm text-neutral-400">Receive notifications in Slack</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-white">Webhooks</p>
                  <p className="text-sm text-neutral-400">Custom event webhooks</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500" />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-danger-500/20 bg-danger-500/5 overflow-hidden">
            <div className="p-6 border-b border-danger-500/20">
              <h2 className="text-lg font-bold text-danger-600">Danger Zone</h2>
            </div>
            <div className="p-6 space-y-4">
              <Button
                variant="outline"
                className="w-full border-danger-600 text-danger-600 hover:bg-danger-600/10"
              >
                Delete Organization
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
