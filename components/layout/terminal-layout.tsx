'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Terminal sidebar navigation
const navItems = [
  { href: '/dashboard', label: 'dashboard', icon: '⌘' },
  { href: '/datasets/new', label: 'new_dataset', icon: '+' },
  { href: '/design/input', label: 'design', icon: '∼' },
  { href: '/pipelines', label: 'pipelines', icon: '⇥' },
  { href: '/runs', label: 'runs', icon: '▶' },
  { href: '/monitoring', label: 'monitor', icon: '◉' },
  { href: '/governance', label: 'governance', icon: '✓' },
  { href: '/cost-analytics', label: 'costs', icon: '$' },
  { href: '/settings', label: 'settings', icon: '⚙' },
]

export function TerminalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#c9d1d9] font-mono">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-10 bg-[#161b22] border-b border-[#30363d] z-50 flex items-center px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-black">
            S2
          </div>
          <span className="text-sm font-bold">system2ml_</span>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 text-xs text-[#8b949e]">
            <span>{pathname}</span>
            <span className="animate-pulse">_</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8b949e]">v2.0</span>
          <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-10 bottom-0 w-48 bg-[#0d1117] border-r border-[#30363d] flex flex-col">
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1f6feb] text-white'
                    : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
                }`}
              >
                <span className="w-4 text-center text-xs opacity-60">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className="ml-auto animate-pulse">●</span>}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-3 border-t border-[#30363d]">
          <div className="text-xs text-[#8b949e] mb-2">
            <span className="text-[#3fb950]">❯</span> user@system2ml
          </div>
          <button className="text-xs text-[#f85149] hover:underline">
            logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-48 pt-10 min-h-screen">
        <div className={`p-6 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-48 right-0 h-6 bg-[#161b22] border-t border-[#30363d] flex items-center px-4 text-xs text-[#8b949e]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            connected
          </span>
          <span>API: localhost:8000</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Python</span>
          <span>2.0.0</span>
        </div>
      </footer>
    </div>
  )
}
