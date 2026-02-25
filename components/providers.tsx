'use client'

import { AuthProvider } from '@/hooks/use-auth'
import { DesignProvider } from '@/hooks/use-design'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DesignProvider>
        {children}
      </DesignProvider>
    </AuthProvider>
  )
}
