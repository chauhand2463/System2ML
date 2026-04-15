'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function sanitizeUserData(data: any): any {
  if (typeof data === 'string') {
    return data.slice(0, 1000)
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeUserData)
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {}
    const allowedFields = ['id', 'email', 'name', 'role']
    for (const key of allowedFields) {
      if (key in data) {
        const val = data[key]
        sanitized[key] = typeof val === 'string' ? val.slice(0, 500) : val
      }
    }
    return sanitized
  }
  return data
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const userParam = searchParams.get('user')
    
    if (!tokenParam || !userParam) {
      setError('Missing authentication parameters')
      return
    }

    try {
      const userData = JSON.parse(decodeURIComponent(userParam))
      const sanitized = sanitizeUserData(userData)
      
      sessionStorage.setItem('system2ml_token', tokenParam.slice(0, 500))
      localStorage.setItem('system2ml_user', JSON.stringify(sanitized))
      
      router.push('/dashboard')
    } catch (err) {
      console.error('Auth callback error:', err)
      setError('Authentication failed')
    }
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-neutral-400">Completing authentication...</p>
      </div>
    </div>
  )
}
