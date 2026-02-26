'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      setIsLoading(false)
      return
    }

    const success = await register(name, email, password)
    
    if (success) {
      router.push('/dashboard')
    } else {
      setError('Email already exists or registration failed')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#c9d1d9] font-mono flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(88,166,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,166,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 mb-4">
            <span className="text-2xl font-bold text-black">S2</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            system2ml_<span className="animate-pulse">█</span>
          </h1>
          <p className="text-[#8b949e] text-sm mt-2">Create New Account</p>
        </div>

        <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
          <div className="bg-[#161b22] px-4 py-2 flex items-center gap-2 border-b border-[#30363d]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center text-xs text-[#8b949e]">
              register.sh
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <span className="text-red-500">error:</span> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#8b949e] mb-2">
                  <span className="text-cyan-400">$</span> FULL_NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#30363d] rounded px-4 py-3 text-white placeholder-[#6e7681] focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>

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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#30363d] rounded px-4 py-3 pr-12 text-white placeholder-[#6e7681] focus:border-cyan-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e7681] hover:text-white transition-colors text-xs"
                  >
                    {showPassword ? '[HIDE]' : '[SHOW]'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8b949e] mb-2">
                  <span className="text-cyan-400">$</span> CONFIRM_PASSWORD
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#30363d] rounded px-4 py-3 text-white placeholder-[#6e7681] focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-mono py-3 mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="animate-pulse">processing...</span>
                ) : (
                  <span>./register.sh --execute</span>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-[#8b949e] text-sm">
          <span className="text-cyan-400">$</span> already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:underline">
            ./login.sh
          </Link>
        </p>
      </div>
    </div>
  )
}
