'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      key={pathname}
    >
      {children}
    </div>
  )
}

export function AnimatedPage({ 
  children, 
  className,
  animation = 'fade-up'
}: { 
  children: React.ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'slide'
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const animations = {
    'fade-up': isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
    'fade-down': isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8',
    'fade-left': isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8',
    'fade-right': isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
    'scale': isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
    'slide': isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full',
  }

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        animations[animation],
        className
      )}
    >
      {children}
    </div>
  )
}

export function StaggerContainer({ 
  children, 
  className,
  delay = 100 
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={className}>
      {Array.isArray(children) ? children.map((child, i) => (
        <div
          key={i}
          className={cn(
            'transition-all duration-500 ease-out',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
          style={{ transitionDelay: `${i * delay}ms` }}
        >
          {child}
        </div>
      )) : children}
    </div>
  )
}

export function FadeIn({ 
  children, 
  className,
  delay = 0 
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SlideIn({ 
  children, 
  className,
  direction = 'left',
  delay = 0 
}: { 
  children: React.ReactNode
  className?: string
  direction?: 'left' | 'right' | 'up' | 'down'
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const transforms = {
    left: isVisible ? 'translate-x-0' : '-translate-x-12',
    right: isVisible ? 'translate-x-0' : 'translate-x-12',
    up: isVisible ? 'translate-y-0' : '-translate-y-12',
    down: isVisible ? 'translate-y-0' : 'translate-y-12',
  }

  return (
    <div
      className={cn(
        'transition-all duration-700 ease-out',
        transforms[direction],
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  )
}

export function ScaleIn({ 
  children, 
  className,
  delay = 0 
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageLoader() {
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

export function AnimatedCard({ 
  children, 
  className,
  delay = 0,
  index = 0
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  index?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay + index * 100)
    return () => clearTimeout(timer)
  }, [delay, index])

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
    >
      {children}
    </div>
  )
}
