'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formFocused, setFormFocused] = useState('')
  
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    const success = await login(email, password)
    
    if (success) {
      router.push('/dashboard')
    } else {
      setError('Invalid email or password')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-neutral-900 to-violet-900" />
        <div className="absolute inset-0">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[128px] transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
        </div>
        
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        
        <div className={`relative z-10 flex flex-col justify-center items-center w-full p-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-2xl shadow-brand-500/30 mb-8 transition-transform duration-500 hover:scale-110 hover:rotate-3 cursor-pointer`}>
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 text-center animate-in slide-in-from-bottom duration-500">
            Welcome to System2ML
          </h2>
          <p className="text-xl text-neutral-400 text-center max-w-md animate-in slide-in-from-bottom duration-500 delay-100">
            AI-powered ML pipeline design with constraint validation
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-6 animate-in slide-in-from-bottom duration-500 delay-200">
            {[
              { label: 'AI Design', value: '10x', icon: '⚡' },
              { label: 'Cost Save', value: '60%', icon: '💰' },
              { label: 'Uptime', value: '99.9%', icon: '🎯' },
              { label: 'Templates', value: '50+', icon: '📦' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="text-2xl font-bold text-brand-400 group-hover:text-brand-300 transition-colors">{stat.value}</div>
                <div className="text-sm text-neutral-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Terminal Preview */}
          <div className="mt-8 w-full max-w-md p-4 rounded-xl bg-black/50 border border-white/10 backdrop-blur-sm animate-in slide-in-from-bottom duration-500 delay-300">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-brand-400 font-mono">system2ml-cli</span>
            </div>
            <div className="font-mono text-sm text-neutral-300 space-y-1">
              <div><span className="text-brand-400">$</span> system2ml design --dataset data.csv</div>
              <div className="text-neutral-500 text-xs">Generating pipeline candidates...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className={`w-full max-w-md transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">System2ML</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 animate-in slide-in-from-bottom duration-500">Sign in</h1>
            <p className="text-neutral-400 animate-in slide-in-from-bottom duration-500 delay-100">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in shake duration-300">
                {error}
              </div>
            )}

            <div className={`space-y-2 transition-all duration-300 ${formFocused === 'email' ? 'scale-[1.02]' : ''}`}>
              <label className="block text-sm font-medium text-neutral-300">
                Email Address
              </label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${formFocused === 'email' ? 'text-brand-400' : 'text-neutral-500'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFormFocused('email')}
                  onBlur={() => setFormFocused('')}
                  placeholder="you@example.com"
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-300 hover:border-neutral-600"
                />
              </div>
            </div>

            <div className={`space-y-2 transition-all duration-300 ${formFocused === 'password' ? 'scale-[1.02]' : ''}`}>
              <label className="block text-sm font-medium text-neutral-300">
                Password
              </label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${formFocused === 'password' ? 'text-brand-400' : 'text-neutral-500'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFormFocused('password')}
                  onBlur={() => setFormFocused('')}
                  placeholder="••••••••"
                  className="w-full h-12 pl-12 pr-12 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-300 hover:border-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors duration-300 hover:scale-110"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                />
                <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm text-brand-400 hover:text-brand-300 transition-colors duration-300 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-500/25 disabled:hover:scale-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-neutral-950 text-neutral-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="h-12 rounded-xl border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 transition-all duration-300 hover:scale-[1.02] hover:border-neutral-600 flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                className="h-12 rounded-xl border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 transition-all duration-300 hover:scale-[1.02] hover:border-neutral-600 flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-neutral-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors duration-300 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
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
