'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userParam = searchParams.get('user')
    
    if (!userParam) {
      setError('No user data received')
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam))
      localStorage.setItem('system2ml_user', JSON.stringify(user))
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to parse user data:', err)
      setError('Failed to process authentication')
    }
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger-400 mb-4">{error}</p>
          <a href="/login" className="text-brand-400 hover:text-brand-300">
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
        <p className="text-neutral-400">Completing authentication...</p>
      </div>
    </div>
  )
}
