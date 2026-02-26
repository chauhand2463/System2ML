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
  const [isBackendDown, setIsBackendDown] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const isPublicPath = publicPaths.some(path => 
        pathname === path || pathname.startsWith('/api/')
      )
      
      if (isPublicPath) {
        setIsLoading(false)
        return
      }

      const token = localStorage.getItem('system2ml_token')
      const userStr = localStorage.getItem('system2ml_user')
      
      if (!token || !userStr) {
        router.push('/login')
        return
      }

      try {
        const user = JSON.parse(userStr)
        setIsLoading(false)
      } catch {
        localStorage.removeItem('system2ml_token')
        localStorage.removeItem('system2ml_user')
        router.push('/login')
        return
      }

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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-brand-500/30 rounded-full" />
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-neutral-400 text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
