'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Zap,
  Activity,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  BarChart3,
  DollarSign,
  Settings,
  Users,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

function SidebarComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()

  const mainMenu = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Pipelines', href: '/pipelines', icon: Zap },
    { label: 'Runs', href: '/runs', icon: Activity },
    { label: 'Failures', href: '/failures', icon: AlertCircle },
    { label: 'Design Agent', href: '/design-agent', icon: Lightbulb },
    { label: 'Approvals', href: '/approvals', icon: CheckCircle2 },
  ]

  const secondaryMenu = [
    { label: 'Monitoring', href: '/monitoring', icon: BarChart3 },
    { label: 'Cost Analytics', href: '/cost-analytics', icon: DollarSign },
    { label: 'Governance', href: '/governance', icon: Users },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-64 h-screen bg-neutral-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-all duration-300 group-hover:scale-105">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg block">System2ML</span>
            <span className="text-xs text-neutral-500">AI Pipeline Design</span>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainMenu.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/20 to-brand-600/10 text-brand-400 border border-brand-500/20 shadow-lg shadow-brand-500/10'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-brand-400")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                )}
              </Link>
            )
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-white/5">
          <div className="px-4 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Analytics</div>
          <div className="space-y-1">
            {secondaryMenu.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/20 to-brand-600/10 text-brand-400 border border-brand-500/20 shadow-lg shadow-brand-500/10'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-brand-400")} />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
          <img
            src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"}
            alt="User"
            className="w-10 h-10 rounded-xl border-2 border-white/10"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Guest'}</p>
            <p className="text-xs text-neutral-500 truncate">{user?.email || 'Not signed in'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}

export const Sidebar = React.memo(SidebarComponent)
