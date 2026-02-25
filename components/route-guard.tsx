'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const publicPaths = ['/', '/login', '/register', '/docs', '/pricing', '/auth/callback']

const designFlowPaths = [
  '/design/input',
  '/design/constraints',
  '/design/preferences',
  '/design/review',
  '/design/results',
  '/train/confirm',
  '/train/running',
  '/train/result',
]

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const isPublicPath = publicPaths.some(path => 
        pathname === path || pathname.startsWith('/api/')
      )
      
      if (isPublicPath) {
        setIsLoading(false)
        return
      }

      const user = localStorage.getItem('system2ml_user')
      if (!user) {
        router.push('/login')
        return
      }

      // Check design flow paths require dataset
      const isDesignFlowPath = designFlowPaths.some(path => 
        pathname.startsWith(path)
      )
      
      if (isDesignFlowPath) {
        const designState = localStorage.getItem('system2ml_design_state')
        if (!designState) {
          router.push('/datasets/new')
          return
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
