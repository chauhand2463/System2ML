'use client'

import { AuthProvider } from '@/hooks/use-auth'
import { DesignProvider } from '@/hooks/use-design'
import { WorkflowProvider } from '@/hooks/use-workflow'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DesignProvider>
        <WorkflowProvider>
          {children}
        </WorkflowProvider>
      </DesignProvider>
    </AuthProvider>
  )
}
