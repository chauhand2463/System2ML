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
  ChevronRight,
  Play,
  Plus,
  Database,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

function SidebarComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const mainMenu = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { label: 'New Dataset', href: '/datasets/new', icon: Plus, color: 'text-brand-400' },
    { label: 'Design Wizard', href: '/design/input', icon: Lightbulb, color: 'text-yellow-400' },
    { label: 'Pipelines', href: '/pipelines', icon: Zap, color: 'text-brand-400' },
    { label: 'Runs', href: '/runs', icon: Activity, color: 'text-emerald-400' },
    { label: 'Failures', href: '/failures', icon: AlertCircle, color: 'text-red-400' },
    { label: 'Design Agent', href: '/design-agent', icon: Lightbulb, color: 'text-purple-400' },
    { label: 'Approvals', href: '/approvals', icon: CheckCircle2, color: 'text-green-400' },
  ]

  const secondaryMenu = [
    { label: 'Monitoring', href: '/monitoring', icon: BarChart3, color: 'text-purple-400' },
    { label: 'Cost Analytics', href: '/cost-analytics', icon: DollarSign, color: 'text-amber-400' },
    { label: 'Governance', href: '/governance', icon: Users, color: 'text-cyan-400' },
    { label: 'Settings', href: '/settings', icon: Settings, color: 'text-neutral-400' },
  ]

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-72 h-screen bg-neutral-900/50 backdrop-blur-2xl border-r border-white/5 flex flex-col relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-brand-500/5 to-transparent" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative p-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg block tracking-tight">System2ML</span>
            <span className="text-xs text-neutral-500 font-medium">AI Pipeline Design</span>
          </div>
        </Link>
      </div>

      {/* Quick Action Button */}
      <div className="relative px-4 py-4">
        <Link
          href="/datasets/new"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          New Dataset
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="relative flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Workspace</div>
          {mainMenu.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/15 to-transparent text-white'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600 rounded-full" />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                  isActive 
                    ? 'bg-brand-500/20 text-brand-400' 
                    : 'bg-white/5 text-neutral-500 group-hover:bg-white/10 group-hover:text-white'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-brand-400 animate-pulse" />
                )}
              </Link>
            )
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-white/5">
          <div className="px-3 mb-2 text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Analytics</div>
          <div className="space-y-1">
            {secondaryMenu.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden',
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/15 to-transparent text-white'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600 rounded-full" />
                  )}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                    isActive 
                      ? 'bg-brand-500/20 text-brand-400' 
                      : 'bg-white/5 text-neutral-500 group-hover:bg-white/10 group-hover:text-white'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-brand-400 animate-pulse" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="relative p-3 border-t border-white/5">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"}
                alt="User"
                className="w-11 h-11 rounded-xl border-2 border-white/10"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-neutral-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Guest'}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email || 'Not signed in'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-300 group"
          >
            <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}

export const Sidebar = React.memo(SidebarComponent)
