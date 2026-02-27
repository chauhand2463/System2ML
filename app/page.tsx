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
  Quote,
  Activity,
  Globe,
  Database,
  Lock,
  ChevronRight,
  MonitorSmartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Design',
    description: 'Autonomous agents generate state-of-the-art ML pipelines tailored to your unique constraints.',
    color: 'from-brand-400 to-brand-600',
    glow: 'shadow-brand-500/20'
  },
  {
    icon: Shield,
    title: 'Automated Governance',
    description: 'Built-in compliance and guardrails ensure your models meet regulatory and ethical standards.',
    color: 'from-violet-400 to-purple-600',
    glow: 'shadow-violet-500/20'
  },
  {
    icon: BarChart3,
    title: 'Advanced Observability',
    description: 'Deep-dive analytics into cost, carbon, latency, and drift with predictive alerting.',
    color: 'from-emerald-400 to-teal-600',
    glow: 'shadow-emerald-500/20'
  },
  {
    icon: Database,
    title: 'Smart Data Profiling',
    description: 'Instant insights into dataset topology, quality, and PII detection with automated fixes.',
    color: 'from-blue-400 to-cyan-600',
    glow: 'shadow-blue-500/20'
  },
  {
    icon: GitBranch,
    title: 'Multi-Cloud Deploy',
    description: 'Zero-effort deployment to Edge, On-prem, or any cloud provider with optimized binaries.',
    color: 'from-orange-400 to-red-600',
    glow: 'shadow-orange-500/20'
  },
  {
    icon: Activity,
    title: 'Feedback Loops',
    description: 'Continuous learning pipelines that auto-retrain and optimize based on production performance.',
    color: 'from-pink-400 to-rose-600',
    glow: 'shadow-pink-500/20'
  }
]

const stats = [
  { value: '450%', label: 'ROI Improvement' },
  { value: '85ms', label: 'Inference Latency' },
  { value: '0.02kg', label: 'Carbon footprint/run' },
  { value: '24/7', label: 'Global Availability' }
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-brand-500/30">
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/10 blur-[180px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[180px] animate-pulse-slow delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] mask-radial">
          <div className="w-full h-full bg-[url('/extreme_hero_background_element_1772198551452.png')] bg-cover bg-center animate-spin-slow duration-[30s]" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-white/5 bg-black/20 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-[0_0_25px_-5px_rgba(107,142,244,0.5)] group-hover:scale-110 transition-all duration-500">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                SYSTEM2ML
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-10">
              {['Features', 'Intelligence', 'Governance', 'Enterprise'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-semibold text-neutral-400 hover:text-white transition-all duration-300 relative group">
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-brand-500 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-neutral-300 font-bold hover:bg-white/5">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="btn-premium bg-gradient-to-r from-brand-500 to-brand-600 hover:shadow-brand-500/40">
                  Launch Platform <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <button className="lg:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero: The Extreme Section */}
      <main className="relative z-10">
        <section className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6">
          <div className="text-center max-w-[1100px] mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-10 animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-ping" />
              <span className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase">Next-Generation AI Orchestration</span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-[110px] font-black tracking-tight leading-[0.9] mb-8 animate-fade-in delay-200">
              PIPELINES THAT <br />
              <span className="text-gradient-brand">THINK AHEAD.</span>
            </h1>

            <p className="text-lg md:text-2xl text-neutral-400 max-w-3xl mx-auto mb-14 leading-relaxed animate-fade-in delay-300">
              System2ML is the premier autonomous design engine. We don't just build pipelines;
              we evolve them based on your exact business constraints and real-world performance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in delay-400">
              <Link href="/dashboard">
                <Button size="xl" className="h-16 px-10 rounded-2xl bg-white text-black font-black text-lg hover:bg-neutral-200 shadow-[0_0_40px_-10px_white] hover:scale-105 transition-all duration-500">
                  Get Started for Free
                </Button>
              </Link>
              <Link href="/design-agent">
                <Button size="xl" variant="outline" className="h-16 px-10 rounded-2xl border-white/20 hover:bg-white/5 font-bold text-lg backdrop-blur-xl">
                  Explore AI Designer
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mt-32 animate-fade-in delay-500 max-w-5xl mx-auto w-full">
              {stats.map((stat, i) => (
                <div key={i} className="group cursor-default">
                  <div className="text-4xl md:text-6xl font-black text-white mb-2 group-hover:text-brand-400 transition-colors duration-500">{stat.value}</div>
                  <div className="text-xs md:text-sm font-bold tracking-widest text-neutral-500 uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Intelligence Preview Section */}
        <section id="intelligence" className="py-40 px-6 relative">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="animate-fade-in">
                <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                  Evolving Intelligence <br />
                  <span className="text-neutral-500">In Real-Time.</span>
                </h2>
                <p className="text-xl text-neutral-400 mb-10 leading-relaxed">
                  Our platform visualizes the complex intersection of data science and business value.
                  Watch as the AI Designer iterates through millions of permutations to find the
                  single most efficient pipeline for your hardware target.
                </p>
                <ul className="space-y-6">
                  {[
                    { icon: Zap, text: 'Self-optimizing hyperparameter optimization' },
                    { icon: Shield, text: 'Real-time drift detection and recovery' },
                    { icon: Leaf, text: 'Carbon-aware compute orchestration' }
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-lg font-medium text-neutral-300">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                        <item.icon className="w-5 h-5 text-brand-400" />
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative animate-fade-in delay-300">
                <div className="absolute -inset-10 bg-brand-500/20 blur-[100px] rounded-full opacity-30" />
                <div className="glass-morphism p-4 rounded-[40px] overflow-hidden transform lg:rotate-3 hover:rotate-0 transition-all duration-700 shadow-3xl">
                  <img
                    src="/premium_dashboard_preview_mockup_1772198662447.png"
                    alt="Platform Dashboard"
                    className="rounded-[30px] w-full border border-white/10"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Overhaul */}
        <section id="features" className="py-40 px-6 bg-white/[0.01]">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
              <div className="max-w-2xl">
                <h2 className="text-5xl md:text-7xl font-bold mb-6">Built for the <br /> <span className="text-gradient-brand">Enterprise Scale.</span></h2>
                <p className="text-xl text-neutral-400">Everything you need from local development to edge-optimized production deployments.</p>
              </div>
              <Button size="lg" className="h-14 px-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold">
                View All Features <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div key={i} className={`glass-card p-10 group relative h-full flex flex-col`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-10 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${feature.glow}`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-neutral-400 leading-relaxed text-lg mb-8">{feature.description}</p>
                  <div className="mt-auto pt-4 flex items-center text-sm font-black tracking-widest text-neutral-500 uppercase group-hover:text-white transition-colors">
                    Learn more <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA: Extreme Impact */}
        <section className="py-40 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="relative glass-morphism p-16 md:p-24 rounded-[60px] text-center overflow-hidden border-2 border-white/5">
              <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-brand-500/10 blur-[120px] -z-10" />
              <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-violet-500/10 blur-[120px] -z-10" />

              <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                THE FUTURE OF <br /> ML IS <span className="text-gradient-brand">AUTONOMOUS</span>.
              </h2>
              <p className="text-xl md:text-2xl text-neutral-400 mb-14 max-w-2xl mx-auto">
                Join the elite teams building robust, ethical, and highly-efficient machine learning infrastructure.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/dashboard">
                  <Button size="xl" className="h-16 px-12 rounded-2xl bg-brand-500 text-white font-black text-lg hover:bg-brand-600 shadow-[0_0_30px_-5px_var(--brand-500)] hover:scale-105 transition-all duration-500">
                    Get Started Now
                  </Button>
                </Link>
                <div className="text-sm font-bold text-neutral-500 tracking-widest uppercase text-center sm:text-left">
                  No Commitment Required
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Extreme Footer */}
      <footer className="border-t border-white/5 py-20 px-6 bg-black">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-4 gap-16">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter">SYSTEM2ML</span>
            </div>
            <p className="text-neutral-500 max-w-sm mb-8 font-medium">
              Revolutionizing enterprise AI with constraint-aware autonomous pipeline orchestration.
              Built for speed. Designed for precision.
            </p>
            <div className="flex gap-4">
              {[Globe, MonitorSmartphone, Lock].map((Icn, i) => (
                <div key={i} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer text-neutral-400 hover:text-white">
                  <Icn className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-white">Platform</h4>
            <ul className="space-y-4 text-neutral-500 font-bold text-sm">
              <li><a href="#" className="hover:text-white transition-colors">AI Designer</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Governence</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Observability</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-white">Company</h4>
            <ul className="space-y-4 text-neutral-500 font-bold text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto pt-16 mt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-black tracking-widest text-neutral-600 uppercase">
          <div>&copy; 2026 SYSTEM2ML OPS. ALL RIGHTS RESERVED.</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

const Leaf = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 2 7a7 7 0 0 1-7 7c-.7 0-1.3-.1-1.9-.3" />
    <path d="M11 20h4a2 2 0 0 0 2-2v-1" />
    <path d="M11 20H7a2 2 0 0 1-2-2v-1" />
    <path d="M14 16L9 11" />
  </svg>
)
