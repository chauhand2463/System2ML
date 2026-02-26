'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface User {
  id: number
  name: string
  email: string
  avatar: string | null
  provider?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => void
  loginWithGithub: () => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('system2ml_token')
    if (token) {
      fetchCurrentUser(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchCurrentUser = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      } else {
        localStorage.removeItem('system2ml_token')
        localStorage.removeItem('system2ml_user')
      }
    } catch (error) {
      console.warn('Backend not available, using cached session')
      const cachedUser = localStorage.getItem('system2ml_user')
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser))
        } catch {
          localStorage.removeItem('system2ml_user')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      console.log('Attempting login to:', `${API_URL}/api/auth/login`)
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        localStorage.setItem('system2ml_token', data.token)
        localStorage.setItem('system2ml_user', JSON.stringify(data.user))
        setIsLoading(false)
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Login failed')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        alert('Cannot connect to backend server!\n\nPlease start the backend in Terminal 2:\nuvicorn ui.api:app --host 0.0.0.0 --port 8000')
      } else {
        alert(error.message || 'Login failed')
      }
    }
    
    setIsLoading(false)
    return false
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        localStorage.setItem('system2ml_token', data.token)
        localStorage.setItem('system2ml_user', JSON.stringify(data.user))
        setIsLoading(false)
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Registration failed')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        alert('Cannot connect to backend server!\n\nPlease start the backend in Terminal 2:\nuvicorn ui.api:app --host 0.0.0.0 --port 8000')
      } else {
        alert(error.message || 'Registration failed')
      }
    }
    
    setIsLoading(false)
    return false
  }

  const loginWithGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'
    const redirectUri = `${window.location.origin}/api/auth/callback/google`
    const scope = 'openid profile email'
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`
    window.location.href = authUrl
  }

  const loginWithGithub = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'your-github-client-id'
    const redirectUri = `${window.location.origin}/api/auth/callback/github`
    const scope = 'read:user user:email'
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`
    window.location.href = authUrl
  }

  const logout = async () => {
    const token = localStorage.getItem('system2ml_token')
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    setUser(null)
    localStorage.removeItem('system2ml_token')
    localStorage.removeItem('system2ml_user')
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithGoogle, loginWithGithub, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
