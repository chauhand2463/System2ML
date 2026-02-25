'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ChevronRight, Bell, Shield, Users, Zap, Check, Github, Globe } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function SettingsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState({
    deployments: true,
    failures: true,
    drift: true,
    reports: true,
  })

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-neutral-400">Manage your organization and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent border border-brand-500/20 p-6 mb-8">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative flex items-center gap-6">
            <img
              src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"}
              alt="Profile"
              className="w-20 h-20 rounded-2xl border-4 border-white/10"
            />
            <div>
              <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
              <p className="text-neutral-400">{user?.email}</p>
              <p className="text-brand-400 text-sm mt-1 capitalize">{user?.provider || 'Email'} account</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Organization */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Organization</h2>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { label: 'Organization Name', value: 'DataCorp ML', icon: Globe },
                { label: 'Plan', value: 'Enterprise', icon: Zap },
                { label: 'Billing', value: 'Manage payment', icon: Users },
              ].map((item, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Connected Accounts</h2>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">GitHub</p>
                      <p className="text-sm text-neutral-500">Connected</p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'deployments', label: 'Pipeline Deployments', desc: 'Notify on successful deployments' },
                { key: 'failures', label: 'Failures & Errors', desc: 'Immediate alerts for failures' },
                { key: 'drift', label: 'Data Drift', desc: 'Alert on significant drift' },
                { key: 'reports', label: 'Weekly Reports', desc: 'Summary of system health' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="font-medium text-white group-hover:text-brand-400 transition-colors">{item.label}</p>
                    <p className="text-sm text-neutral-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                    className={`w-12 h-7 rounded-full transition-all duration-300 ${
                      notifications[item.key as keyof typeof notifications] 
                        ? 'bg-brand-500' 
                        : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-lg transform transition-transform duration-300 ${
                      notifications[item.key as keyof typeof notifications] 
                        ? 'translate-x-6' 
                        : 'translate-x-1'
                    }`} />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { label: 'Two-Factor Authentication', value: 'Enabled', icon: Shield },
                { label: 'API Keys', value: 'Manage access', icon: Zap },
                { label: 'Active Sessions', value: '2 active', icon: Users },
              ].map((item, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-neutral-500">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl bg-red-500/5 border border-red-500/20 overflow-hidden">
            <div className="p-5 border-b border-red-500/20">
              <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
            </div>
            <div className="p-5">
              <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
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
