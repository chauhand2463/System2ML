'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Shield, 
  BarChart3, 
  GitBranch, 
  Layers, 
  Cpu,
  Play,
  CheckCircle2,
  Menu,
  X,
  Star,
  Quote
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Design',
    description: 'Let AI generate optimal ML pipelines based on your constraints',
    color: 'from-violet-500 to-purple-600'
  },
  {
    icon: Shield,
    title: 'Constraint Validation',
    description: 'Validate cost, carbon, latency, and compliance requirements',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    icon: BarChart3,
    title: 'Real-time Monitoring',
    description: 'Track pipeline performance, costs, and carbon emissions',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: GitBranch,
    title: 'Pipeline Governance',
    description: 'Approval workflows and audit trails for all pipelines',
    color: 'from-orange-500 to-red-600'
  },
  {
    icon: Layers,
    title: 'Visual Pipeline Editor',
    description: 'Drag-and-drop interface for building ML workflows',
    color: 'from-pink-500 to-rose-600'
  },
  {
    icon: Cpu,
    title: 'Edge & Cloud Deploy',
    description: 'Deploy to batch, real-time, or edge environments',
    color: 'from-indigo-500 to-blue-600'
  }
]

const stats = [
  { value: '10x', label: 'Faster Development' },
  { value: '60%', label: 'Cost Reduction' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '50+', label: 'Pre-built Templates' }
]

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'ML Engineer at TechCorp',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    content: 'System2ML reduced our pipeline design time by 80%. The AI constraint validation is incredibly smart.',
    rating: 5
  },
  {
    name: 'Michael Chen',
    role: 'Data Science Lead at StartupX',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    content: 'Finally, a tool that understands both ML engineering and business constraints. Game changer!',
    rating: 5
  },
  {
    name: 'Emily Davis',
    role: 'CTO at AI Innovations',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    content: 'The governance features and audit trails give us the compliance we need. Highly recommended.',
    rating: 5
  }
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-gradient-radial from-brand-500/10 to-transparent rounded-full" />
      </div>

      {/* Navigation */}
      <nav className={`relative z-10 border-b border-white/10 backdrop-blur-xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                System2ML
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#how-it-works" className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">How it Works</a>
              <a href="#testimonials" className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">Testimonials</a>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-neutral-300 hover:text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white border-0 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300">
                  Get Started <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/10">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-neutral-400 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#how-it-works" className="text-neutral-400 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
                <a href="#testimonials" className="text-neutral-400 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
                <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-brand-500 to-brand-600">Get Started</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 md:pt-20 pb-16 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10 mb-6 md:mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-xs md:text-sm text-neutral-400">AI-Powered ML Pipeline Design</span>
            </div>

            <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Build ML Pipelines{' '}
              <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                with AI
              </span>
            </h1>

            <p className={`text-base md:text-xl text-neutral-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Design, validate, and deploy machine learning pipelines with intelligent 
              constraint-aware AI. Optimize for cost, carbon, latency, and compliance.
            </p>

            <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-sm md:text-base bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white border-0 shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all duration-300 hover:scale-105">
                  <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Start Building Free
                </Button>
              </Link>
              <Link href="/design-agent">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-sm md:text-base border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Try AI Designer
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-12 md:mt-20 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-1 md:mb-2">
                    {stat.value}
                  </div>
                  <div className="text-neutral-500 text-xs md:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-16 md:py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Everything you need for{' '}
              <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
                ML Pipeline Design
              </span>
            </h2>
            <p className="text-neutral-400 text-sm md:text-lg max-w-2xl mx-auto">
              Powerful features to design, validate, and deploy production-ready ML pipelines
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group relative p-6 md:p-8 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 md:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-white">{feature.title}</h3>
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              How it{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-neutral-400 text-sm md:text-lg max-w-2xl mx-auto">
              Design your ML pipeline in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { step: '01', title: 'Define Constraints', desc: 'Set your cost, carbon, latency, and compliance requirements' },
              { step: '02', title: 'AI Generates Design', desc: 'Our AI creates optimized pipeline designs matching your constraints' },
              { step: '03', title: 'Deploy & Monitor', desc: 'Deploy to your preferred environment and monitor in real-time' }
            ].map((item, i) => (
              <div key={i} className="relative text-center md:text-left">
                <div className="text-6xl md:text-8xl font-bold text-white/[0.03] absolute -top-2 -left-0 md:-left-4">{item.step}</div>
                <div className="relative pt-8 md:pt-12">
                  <h3 className="text-xl md:text-2xl font-bold mb-3 text-white">{item.title}</h3>
                  <p className="text-neutral-400 text-sm md:text-base">{item.desc}</p>
                </div>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-6 w-8 h-8 text-neutral-600 rotate-90 md:rotate-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 py-16 md:py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Loved by{' '}
              <span className="bg-gradient-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">
                ML Teams
              </span>
            </h2>
            <p className="text-neutral-400 text-sm md:text-lg max-w-2xl mx-auto">
              See what teams are saying about System2ML
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="relative p-6 md:p-8 rounded-2xl bg-neutral-900/50 border border-white/5">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-warning-500 text-warning-500" />
                  ))}
                </div>
                <Quote className="absolute top-4 right-4 w-8 h-8 text-neutral-800" />
                <p className="text-neutral-300 mb-6 leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white/10"
                  />
                  <div>
                    <div className="font-semibold text-white text-sm md:text-base">{testimonial.name}</div>
                    <div className="text-neutral-500 text-xs md:text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl md:rounded-3xl bg-gradient-to-br from-brand-900/50 via-neutral-900 to-violet-900/50 border border-white/10 p-8 md:p-12 lg:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-violet-500/10" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
                Ready to build smarter pipelines?
              </h2>
              <p className="text-neutral-400 text-sm md:text-xl mb-8 md:mb-10 max-w-xl mx-auto">
                Join thousands of teams designing ML pipelines with AI-powered constraint validation
              </p>
              <Link href="/login">
                <Button size="xl" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 text-base md:text-lg bg-white text-neutral-900 hover:bg-neutral-100 border-0 shadow-xl transition-all duration-300 hover:scale-105 font-semibold">
                  Get Started Free
                </Button>
              </Link>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mt-6 md:mt-8 text-xs md:text-sm text-neutral-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  14-day free trial
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold">System2ML</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-neutral-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            <div className="text-xs md:text-sm text-neutral-600">
              2026 System2ML. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
