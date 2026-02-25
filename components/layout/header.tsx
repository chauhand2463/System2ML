'use client'

import React from 'react'
import { Search, Bell, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function HeaderComponent() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900 px-6 py-4 flex items-center justify-between">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search pipelines, runs..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-6">
        <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-neutral-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5 text-neutral-400" />
        </button>

        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
          AC
        </div>
      </div>
    </header>
  )
}

export const Header = React.memo(HeaderComponent)
