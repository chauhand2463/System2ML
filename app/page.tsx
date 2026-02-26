'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Custom styled components for unique aesthetic
const TerminalBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    {/* CRT scanlines */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
    
    {/* Grid */}
    <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(34,211,238,0.03)_25%,rgba(34,211,238,0.03)_26%,transparent_27%,transparent_74%,rgba(34,211,238,0.03)_75%,rgba(34,211,238,0.03)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(34,211,238,0.03)_25%,rgba(34,211,238,0.03)_26%,transparent_27%,transparent_74%,rgba(34,211,238,0.03)_75%,rgba(34,211,238,0.03)_76%,transparent_77%,transparent)] bg-[length:60px_60px]" />
    
    {/* Glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyan-500/5 via-transparent to-transparent" />
    
    {/* Noise texture */}
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
  </div>
)

// Glitch text component
function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  const [glitching, setGlitching] = useState(false)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true)
      setTimeout(() => setGlitching(false), 200)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <span className={`relative inline-block ${className} ${glitching ? 'animate-pulse' : ''}`}>
      <span className="absolute -inset-1 bg-red-500/20 blur-sm opacity-0" style={{ animation: glitching ? 'glitch-1 0.2s ease-in-out' : 'none' }} />
      <span className="absolute -inset-1 bg-cyan-500/20 blur-sm opacity-0" style={{ animation: glitching ? 'glitch-2 0.2s ease-in-out' : 'none' }} />
      {text}
    </span>
  )
}

// Terminal typing effect
function Typewriter({ text, className = "", speed = 50 }: { text: string; className?: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("")
  
  useEffect(() => {
    setDisplayed("")
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])
  
  return <span className={className}>{displayed}<span className="animate-pulse">|</span></span>
}

// Cursor blink
function Cursor() {
  return <span className="inline-block w-2.5 h-5 bg-cyan-400 ml-0.5 animate-pulse" />
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [showMenu, setShowMenu] = useState(false)
  
  const codeLines = [
    "$ system2ml init --template optimal",
    "→ Analyzing dataset...",
    "→ Generating pipeline candidates...",
    "→ Validating constraints...",
    "→ 3 pipelines approved",
    "$ system2ml train --pipeline p2",
    "→ Training started (estimated: $4.20)",
    "→ Epoch 45/100 [=============>---] 65%",
    "→ Cost: $2.73 | Carbon: 0.41kg",
    "→ Training complete! Model ready.",
  ]
  
  useEffect(() => {
    setMounted(true)
    
    // Terminal animation
    let delay = 0
    codeLines.forEach((line, i) => {
      delay += 400 + Math.random() * 300
      setTimeout(() => {
        setTerminalLines(prev => [...prev, line])
      }, delay)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-mono overflow-x-hidden selection:bg-cyan-500/30">
      <TerminalBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center font-bold text-black text-sm">
              S2
            </div>
            <span className="font-bold text-white tracking-tight">system2ml_</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-cyan-400 transition-colors">/features</a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">/docs</a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">/pricing</a>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors">
              login
            </Link>
            <Link href="/register">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm h-8 px-4">
                get_started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div className="order-2 lg:order-1">
              <div className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  v2.0 — now with constraint-aware AI
                </span>
              </div>
              
              <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                ML pipelines that{' '}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-[length:200%_auto] animate-gradient">
                  actually work
                </span>
              </h1>
              
              <p className={`text-gray-400 text-lg mb-8 max-w-lg leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                Describe what you want. Get pipelines optimized for cost, carbon, latency, and compliance. No more failed experiments.
              </p>
              
              <div className={`flex flex-wrap gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <Link href="/register">
                  <Button className="bg-white text-black hover:bg-gray-200 font-semibold h-12 px-6 group">
                    <span>./start</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:border-cyan-500 hover:text-cyan-400 h-12 px-6">
                    watch_demo
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right - Terminal */}
            <div className={`order-1 lg:order-2 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="relative">
                {/* Terminal window */}
                <div className="bg-[#0d1117] rounded-lg border border-gray-800 shadow-2xl shadow-cyan-500/5 overflow-hidden">
                  {/* Title bar */}
                  <div className="bg-[#161b22] px-4 py-2 flex items-center gap-2 border-b border-gray-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 text-center text-xs text-gray-500 font-mono">
                      system2ml — bash
                    </div>
                  </div>
                  
                  {/* Terminal content */}
                  <div className="p-4 font-mono text-sm min-h-[280px]">
                    {terminalLines.map((line, i) => (
                      <div key={i} className="mb-1 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                        {line.startsWith("$") ? (
                          <div className="flex">
                            <span className="text-emerald-400 mr-2">❯</span>
                            <span className="text-gray-300">{line.slice(2)}</span>
                          </div>
                        ) : line.startsWith("→") ? (
                          <div className="text-cyan-400 ml-4">{line.slice(2)}</div>
                        ) : (
                          <div className="text-gray-500">{line}</div>
                        )}
                      </div>
                    ))}
                    <div className="h-4" />
                  </div>
                </div>
                
                {/* Floating stats */}
                <div className="absolute -bottom-6 -left-6 bg-[#161b22] border border-gray-800 rounded-lg p-4 shadow-xl">
                  <div className="text-xs text-gray-500 mb-2">system_status</div>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">99.9%</div>
                      <div className="text-xs text-gray-500">uptime</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">$2.73</div>
                      <div className="text-xs text-gray-500">avg_cost</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="text-cyan-400">const</span> features = {'{'}
            </h2>
            <p className="text-gray-400">Everything you need to ship production ML.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "AI Pipeline Generation", desc: "Natural language → optimized DAG", icon: "⚡", code: "ai.generate()" },
              { title: "Constraint Validation", desc: "Cost, carbon, latency, compliance", icon: "✓", code: "validate.constraints()" },
              { title: "Live Training Monitor", desc: "Real-time metrics with auto-stop", icon: "📊", code: "monitor.live()" },
              { title: "Enterprise Governance", desc: "Approvals, audits, lineage", icon: "🔒", code: "govern.secure()" },
              { title: "Multi-Cloud Deploy", desc: "AWS, GCP, Azure, edge", icon: "☁", code: "deploy.anywhere()" },
              { title: "Failure Memory", desc: "AI learns from past mistakes", icon: "🧠", code: "ai.learn()" },
            ].map((feature, i) => (
              <div 
                key={i}
                className="group bg-[#0d1117] border border-gray-800 hover:border-cyan-500/50 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                  <code className="text-xs text-gray-600 group-hover:text-cyan-400 transition-colors">
                    {feature.code}
                  </code>
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <span className="text-3xl text-gray-600">{'}'}</span>
          </div>
        </div>
      </section>

      {/* Code vs Natural Language */}
      <section className="relative py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Write less code.
                <br />
                <span className="text-cyan-400">Ship faster.</span>
              </h2>
              <p className="text-gray-400 mb-8">
                Describe your goals in plain English. Our constraint-aware AI generates production-ready pipelines that respect your budget, compliance, and performance requirements.
              </p>
              
              <div className="space-y-4">
                {[
                  "Generate a classification pipeline with &lt;$10 cost",
                  "Create an edge-deployable model &lt;50MB",
                  "Build carbon-neutral training workflow",
                ].map((prompt, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-400">
                    <span className="text-emerald-400">❯</span>
                    <span>{prompt}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800">
                <span className="text-gray-500"># pipeline.yaml</span>
              </div>
              <pre className="text-gray-300 overflow-x-auto">
{`pipeline:
  name: optimal_classifier
  constraints:
    max_cost: $10
    max_carbon: 1kg
    max_latency: 100ms
  model:
    type: gradient_boosting
    framework: lightgbm
  deploy:
    target: edge
    format: onnx`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block mb-8">
            <code className="text-cyan-400 text-lg">
              $ npm install -g system2ml
            </code>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to ship?
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Join 10,000+ engineers building better ML pipelines. Free forever for individuals.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-14 px-8 text-lg">
                start_building()
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:border-cyan-500 h-14 px-8">
                talk_to_sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-cyan-400">❯</span>
            <span>system2ML © 2024</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-cyan-400 transition-colors">github</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">twitter</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">discord</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">docs</a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .animate-gradient {
          animation: gradient 3s linear infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
