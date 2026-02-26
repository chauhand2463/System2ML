'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { useAuth } = await import('@/hooks/use-auth')
      const { login } = useAuth()
      const success = await login(email, password)
      
      if (success) {
        router.push('/dashboard')
      } else {
        setError('Authentication failed. Check credentials.')
      }
    } catch (err) {
      setError('Connection error. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#c9d1d9] font-mono flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(88,166,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,166,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 mb-4">
            <span className="text-2xl font-bold text-black">S2</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            system2ml_<span className="animate-pulse">█</span>
          </h1>
          <p className="text-[#8b949e] text-sm mt-2">Authentication Required</p>
        </div>

        {/* Terminal Window */}
        <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
          {/* Title bar */}
          <div className="bg-[#161b22] px-4 py-2 flex items-center gap-2 border-b border-[#30363d]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center text-xs text-[#8b949e]">
              login.sh
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <span className="text-red-500">error:</span> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#8b949e] mb-2">
                  <span className="text-cyan-400">$</span> EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#30363d] rounded px-4 py-3 text-white placeholder-[#6e7681] focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="user@system2ml.io"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8b949e] mb-2">
                  <span className="text-cyan-400">$</span> PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#30363d] rounded px-4 py-3 text-white placeholder-[#6e7681] focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">◐</span>
                    authenticating...
                  </span>
                ) : (
                  <span>./authenticate</span>
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6">
            <div className="text-center text-xs text-[#6e7681]">
              <span className="text-[#8b949e]">Don&apos;t have an account?</span>{' '}
              <Link href="/register" className="text-cyan-400 hover:underline">
                register
              </Link>
            </div>
          </div>
        </div>

        {/* OAuth */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#30363d]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0a0a0a] px-4 text-[#6e7681]">or continue with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-2.5 rounded border border-[#30363d] hover:bg-[#161b22] transition-colors text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 rounded border border-[#30363d] hover:bg-[#161b22] transition-colors text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-[#6e7681] hover:text-cyan-400 transition-colors">
            ← return_home
          </Link>
        </div>
      </div>
    </div>
  )
}
