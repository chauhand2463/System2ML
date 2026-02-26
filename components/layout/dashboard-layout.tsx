'use client'

import React from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { PageTransition } from '@/components/ui/page-transition'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardLayoutComponent({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-neutral-950" suppressHydrationWarning>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-neutral-950">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}

export const DashboardLayout = React.memo(DashboardLayoutComponent)
