'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Terminal, Loader2, Sparkles } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formStep, setFormStep] = useState(0)
  const [inputFocus, setInputFocus] = useState('')
  
  const router = useRouter()
  const { register } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => setFormStep(1), 100)
      return () => clearTimeout(timer)
    }
  }, [mounted])

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#c9d1d9] font-mono flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(88,166,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,166,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className={`w-full max-w-md relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className={`text-center mb-8 transition-all duration-500 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 mb-4 hover:scale-110 transition-transform duration-300 cursor-pointer group">
            <Sparkles className="w-8 h-8 text-black group-hover:rotate-12 transition-transform" />
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            system2ml_
            <span className="animate-pulse text-cyan-400">█</span>
          </h1>
          <p className="text-[#8b949e] text-sm mt-2">Create New Account</p>
        </div>

        <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden transition-all duration-500 delay-200 hover:border-cyan-500/30">
          {/* Terminal Header */}
          <div className="bg-[#161b22] px-4 py-2 flex items-center gap-2 border-b border-[#30363d]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80 animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 animate-pulse delay-75" />
              <div className="w-3 h-3 rounded-full bg-green-500/80 animate-pulse delay-150" />
            </div>
            <div className="flex-1 text-center text-xs text-[#8b949e]">
              register.sh
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-shake">
                <span className="text-red-500">error:</span> {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name Field */}
              <div className={`transition-all duration-300 ${formStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <label className="block text-xs text-[#8b949e] mb-2 group">
                  <span className="text-cyan-400 transition-colors group-hover:text-cyan-300">$</span> FULL_NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setInputFocus('name')}
                  onBlur={() => setInputFocus('')}
                  className={`w-full bg-[#0a0a0a] border rounded px-4 py-3 text-white placeholder-[#6e7681] focus:outline-none transition-all duration-300 ${inputFocus === 'name' ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-[#30363d] hover:border-[#484f58]'}`}
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Email Field */}
              <div className={`transition-all duration-300 delay-100 ${formStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <label className="block text-xs text-[#8b949e] mb-2 group">
                  <span className="text-cyan-400 transition-colors group-hover:text-cyan-300">$</span> EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setInputFocus('email')}
                  onBlur={() => setInputFocus('')}
                  className={`w-full bg-[#0a0a0a] border rounded px-4 py-3 text-white placeholder-[#6e7681] focus:outline-none transition-all duration-300 ${inputFocus === 'email' ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-[#30363d] hover:border-[#484f58]'}`}
                  placeholder="user@system2ml.io"
                  required
                />
              </div>

              {/* Password Field */}
              <div className={`transition-all duration-300 delay-200 ${formStep >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <label className="block text-xs text-[#8b949e] mb-2 group">
                  <span className="text-cyan-400 transition-colors group-hover:text-cyan-300">$</span> PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setInputFocus('password')}
                    onBlur={() => setInputFocus('')}
                    className={`w-full bg-[#0a0a0a] border rounded px-4 py-3 pr-12 text-white placeholder-[#6e7681] focus:outline-none transition-all duration-300 ${inputFocus === 'password' ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-[#30363d] hover:border-[#484f58]'}`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e7681] hover:text-white transition-colors duration-300 hover:scale-110 text-xs"
                  >
                    {showPassword ? '[HIDE]' : '[SHOW]'}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className={`transition-all duration-300 delay-300 ${formStep >= 4 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <label className="block text-xs text-[#8b949e] mb-2 group">
                  <span className="text-cyan-400 transition-colors group-hover:text-cyan-300">$</span> CONFIRM_PASSWORD
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setInputFocus('confirm')}
                  onBlur={() => setInputFocus('')}
                  className={`w-full bg-[#0a0a0a] border rounded px-4 py-3 text-white placeholder-[#6e7681] focus:outline-none transition-all duration-300 ${inputFocus === 'confirm' ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-[#30363d] hover:border-[#484f58]'}`}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className={`transition-all duration-500 delay-400 ${formStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <Button
                  type="submit"
                  className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-mono py-3 mt-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(35,134,54,0.3)] disabled:hover:scale-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      ./register.sh --execute
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className={`mt-6 text-center text-[#8b949e] text-sm transition-all duration-500 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-cyan-400">$</span> already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 hover:underline">
            ./login.sh
          </Link>
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
