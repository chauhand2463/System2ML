'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-500/30">

      {/* Sticky Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-black/50 backdrop-blur-md border-b border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-white rounded-sm transform rotate-45" />
          <div className="w-5 h-5 bg-brand-500 rounded-sm transform rotate-45 -ml-3 mix-blend-screen" />
        </div>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-10 text-xs font-bold tracking-widest uppercase text-neutral-400">
          <a href="#product" className="hover:text-white transition-colors">Product</a>
          <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#developers" className="hover:text-white transition-colors">Developers</a>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-6">
          <a href="/faq" className="hidden md:block text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">FAQ</a>
          <Link href="/dashboard">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white rounded-full px-6 py-2 h-auto text-xs font-bold uppercase tracking-widest">
              Launch App
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-40 px-6 max-w-[1400px] mx-auto pb-32">
        {/* Hero Typography & CTA */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-12">
          <h1 className="text-6xl md:text-8xl lg:text-[120px] font-medium leading-[0.9] tracking-tighter">
            Design.<br />
            Orchestrate.<br />
            Build.
          </h1>

          <div className="mt-8 md:mt-0 flex items-center gap-8">
            <div className="text-4xl text-neutral-700 font-light">/</div>
            <Link href="/dashboard">
              <button className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors">
                Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>

        {/* Abstract Hero Graphic Container */}
        <div className="w-full h-[400px] md:h-[600px] bg-[#1a153a] rounded-[40px] md:rounded-[60px] relative overflow-hidden mb-24 border border-white/5 shadow-[0_0_100px_-20px_rgba(107,142,244,0.15)] flex items-center justify-center">
          {/* Abstract Soundwave / Spline effect mimicking the reference */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[150%] flex items-center justify-center opacity-80 mix-blend-screen">
            <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2%,rgba(255,255,255,0.05)_2%,rgba(255,255,255,0.05)_4%)]" />
            <div className="absolute w-[120%] h-[40%] bg-black/80 blur-3xl transform -rotate-2" />
            <div className="absolute w-[120%] h-[40%] bg-[#08041a] blur-2xl transform rotate-3" />

            {/* Glowing Core */}
            <div className="absolute w-[40%] h-[40%] bg-brand-500/40 blur-[100px] rounded-full mix-blend-plus-lighter" />
            <div className="absolute w-[20%] h-[20%] bg-white/20 blur-[60px] rounded-full mix-blend-plus-lighter" />
          </div>

          {/* Vignette Overlay */}
          <div className="absolute inset-0 rounded-[40px] md:rounded-[60px] shadow-[inset_0_0_100px_40px_rgba(0,0,0,0.8)]" />
        </div>

        {/* Enterprise Logos */}
        <div className="flex flex-wrap items-center justify-between gap-8 mb-32 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="text-2xl font-black tracking-tighter">TensorFlow</div>
          <div className="text-2xl font-bold font-serif italic">PyTorch</div>
          <div className="text-xl font-medium tracking-widest uppercase flex items-center gap-2"><div className="w-4 h-4 bg-white rounded-full" /> HuggingFace</div>
          <div className="text-2xl font-light tracking-widest">Ray</div>
          <div className="text-2xl font-bold flex items-center gap-1"><div className="w-6 h-6 border-4 border-white rounded-sm transform rotate-12" /> ONNX</div>
        </div>

        {/* Stats & Approach Section */}
        <div className="border-t border-white/10 pt-20 mt-20 flex flex-col lg:flex-row gap-16 lg:gap-32 pb-24">
          <div className="flex-1">
            <div className="text-[120px] md:text-[180px] font-medium leading-[0.8] tracking-tighter mb-4 text-white">
              30<span className="text-white">%</span>
            </div>
            <div className="text-[#a0a0a0] font-medium leading-relaxed max-w-sm mt-8">
              30% Latency Drop<br />
              From standard unoptimized deployments
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center lg:border-l lg:border-[#222] lg:pl-16">
            <h3 className="text-3xl font-medium mb-6 text-white tracking-tight">ML Approach</h3>
            <p className="text-[#a0a0a0] text-xl leading-relaxed mb-10 max-w-md font-light">
              In every pipeline we generate we apply state-of-the-art quantization and pruning strategies.
              To get models to edge devices faster than ever.
            </p>
            <div>
              <Link href="/pipelines">
                <button className="group flex items-center justify-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors">
                  Create Pipeline
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Social Proof Footer Section */}
        <div className="border-t border-[#222] pt-16 flex flex-col md:flex-row gap-16 items-start md:items-center justify-between">
          <div className="flex items-center">
            {/* Overlapping Avatars */}
            <div className="flex -space-x-4">
              {[
                'bg-[#4f46e5]',
                'bg-[#2563eb]',
                'bg-[#059669]',
                'bg-[#38bdf8]'
              ].map((color, i) => (
                <div key={i} className={`w-16 h-16 rounded-full border-[3px] border-[#0a0a0a] ${color} overflow-hidden shadow-2xl`}>
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i + 10}&backgroundColor=transparent`} alt="Avatar" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-8 max-w-2xl">
            <div className="text-5xl text-neutral-600 font-light hidden md:block">/</div>
            <div>
              <p className="text-xl text-[#a0a0a0] leading-relaxed mb-4 font-light">
                "The MLOps team did amazing work. We got more than 4X inference speedups and we deployed to edge instantly."
              </p>
              <p className="font-bold text-sm text-white">
                Arjun, Principal ML Engineer <span className="text-neutral-500 font-normal">@Enterprise</span>
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities Grid */}
        <section id="product" className="mt-40 border-t border-[#222] pt-32">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
            <h2 className="text-6xl md:text-8xl font-medium tracking-tighter text-white">Platform <br /> Pillars.</h2>
            <p className="text-xl text-[#a0a0a0] max-w-sm font-light leading-relaxed">
              Three core engines running in sync to bring you unparalleled orchestration.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#0a0a0a] rounded-[40px] p-12 border border-[#222] hover:border-brand-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[60px] group-hover:bg-brand-500/20 transition-all duration-500" />
              <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#333] flex items-center justify-center mb-16">
                <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-3xl font-medium text-white mb-6">Design Agent</h3>
              <p className="text-[#a0a0a0] leading-relaxed mb-12 font-light">
                Autonomous system that navigates massive combinatorial search spaces to find your optimal pipeline configuration instantly.
              </p>
              <div className="mt-auto flex items-center text-sm font-bold tracking-widest uppercase text-brand-500 group-hover:text-brand-400">
                Explore Core <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-[40px] p-12 border border-[#222] hover:border-purple-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[60px] group-hover:bg-purple-500/20 transition-all duration-500" />
              <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#333] flex items-center justify-center mb-16">
                <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-3xl font-medium text-white mb-6">Governance</h3>
              <p className="text-[#a0a0a0] leading-relaxed mb-12 font-light">
                Continuous compliance engine. Enforce strict latency bounds, carbon footprints, and safety guardrails across all environments.
              </p>
              <div className="mt-auto flex items-center text-sm font-bold tracking-widest uppercase text-purple-500 group-hover:text-purple-400">
                Set Guardrails <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-[40px] p-12 border border-[#222] hover:border-emerald-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all duration-500" />
              <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#333] flex items-center justify-center mb-16">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="text-3xl font-medium text-white mb-6">Observability</h3>
              <p className="text-[#a0a0a0] leading-relaxed mb-12 font-light">
                Deep telemetry mapping. Pinpoint performance regressions and drift immediately with multi-dimensional real-time tracking.
              </p>
              <div className="mt-auto flex items-center text-sm font-bold tracking-widest uppercase text-emerald-500 group-hover:text-emerald-400">
                View Metrics <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Timeline */}
        <section id="solutions" className="mt-40 border-t border-[#222] pt-32 relative">
          <div className="absolute left-1/2 top-32 bottom-0 w-px bg-gradient-to-b from-brand-500/0 via-brand-500/20 to-brand-500/0 hidden md:block" />

          <h2 className="text-6xl md:text-8xl font-medium tracking-tighter text-white text-center mb-32">How It Flows.</h2>

          <div className="space-y-32">
            {[
              { num: '01', title: 'Define Objective', desc: 'Input your raw dataset and high-level goals. The system immediately profiles topologies and calculates theoretical bounds.' },
              { num: '02', title: 'Impose Constraints', desc: 'Set hard limits on inference latency (e.g. < 50ms) and cloud costs. The orchestrator prunes the search space accordingly.' },
              { num: '03', title: 'Agent Synthesis', desc: 'Autonomous planners construct, train, and test thousands of pipeline variants to find the absolute global optimum.' },
              { num: '04', title: 'Deploy Global', desc: 'One-click binary generation. Ship optimized ONNX models directly to edge devices or cloud clusters seamlessly.' }
            ].map((step, i) => (
              <div key={i} className={`flex flex-col md:flex-row items-center justify-between gap-12 md:gap-0 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                <div className="flex-1" />

                {/* Center Node */}
                <div className="w-16 h-16 rounded-full bg-[#111] border-4 border-black z-10 flex items-center justify-center shadow-[0_0_30px_-5px_var(--brand-500)] shadow-brand-500/20">
                  <span className="text-xl font-bold text-brand-500">{step.num}</span>
                </div>

                <div className={`flex-1 ${i % 2 === 0 ? 'md:pr-24 text-center md:text-right' : 'md:pl-24 text-center md:text-left'}`}>
                  <h4 className="text-3xl font-medium text-white mb-4">{step.title}</h4>
                  <p className="text-[#a0a0a0] text-lg font-light leading-relaxed max-w-sm ml-auto mr-auto md:ml-0 md:mr-0 inline-block">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Deep Dive Observability UI Mockup */}
        <section className="mt-40 bg-[#080808] border border-[#222] rounded-[60px] p-8 md:p-16 overflow-hidden relative">
          <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[150%] bg-emerald-500/5 blur-[120px] rounded-full transform rotate-12" />

          <div className="flex flex-col md:flex-row justify-between items-end mb-16 relative z-10">
            <div>
              <div className="text-emerald-500 font-bold tracking-widest text-xs uppercase mb-4">Real-Time Telemetry</div>
              <h2 className="text-5xl md:text-7xl font-medium tracking-tighter text-white">X-Ray Vision.</h2>
            </div>
            <p className="text-[#a0a0a0] max-w-sm font-light text-lg mt-8 md:mt-0">
              Stop guessing. See exactly where every millisecond of latency and gram of CO2 emanates from.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 relative z-10">
            {/* Fake Latency Chart */}
            <div className="lg:col-span-2 bg-black border border-[#222] rounded-[30px] p-8 flex flex-col justify-between min-h-[300px]">
              <div className="flex justify-between items-center mb-8">
                <span className="text-white font-medium">Global Latency Distribution</span>
                <span className="text-emerald-500 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full">-12ms Avg</span>
              </div>
              <div className="flex items-end gap-2 h-32 w-full">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm hover:bg-emerald-500/50 transition-colors relative group" style={{ height: `${Math.random() * 60 + 20}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#222] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{(Math.random() * 20 + 15).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fake KPIs */}
            <div className="flex flex-col gap-6">
              <div className="bg-black border border-[#222] rounded-[30px] p-8 flex-1 flex flex-col justify-center">
                <div className="text-neutral-500 text-sm mb-2">Total Carbon Reduced</div>
                <div className="text-4xl font-medium text-white">1,402 <span className="text-lg text-[#a0a0a0]">kg CO2</span></div>
              </div>
              <div className="bg-black border border-[#222] rounded-[30px] p-8 flex-1 flex flex-col justify-center">
                <div className="text-neutral-500 text-sm mb-2">Cost / 10k Inferences</div>
                <div className="text-4xl font-medium text-white">$0.04 <span className="text-lg text-[#a0a0a0]">USD</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Terminal CTA */}
        <section id="developers" className="mt-40 mb-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-medium tracking-tighter text-white mb-8">Ready to Build?</h2>
            <p className="text-xl text-[#a0a0a0] mb-16 font-light">
              Execute the orchestrator and watch the architecture compile before your eyes.
            </p>

            <div className="bg-[#050505] border border-[#333] rounded-2xl p-6 text-left shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 opacity-50" />
              <div className="flex items-center gap-2 mb-6 border-b border-[#222] pb-4">
                <div className="w-3 h-3 rounded-full bg-[#333]" />
                <div className="w-3 h-3 rounded-full bg-[#333]" />
                <div className="w-3 h-3 rounded-full bg-[#333]" />
              </div>

              <div className="font-mono text-sm space-y-4">
                <div className="text-brand-400">~/system2ml $ <span className="text-white type-animation">init orchestrator --target=edge --latency=40ms</span></div>
                <div className="text-neutral-500 opacity-0 animate-[fadeIn_1s_ease-in_2s_forwards]">[sys] Analyzing dataset topology... OK</div>
                <div className="text-neutral-500 opacity-0 animate-[fadeIn_1s_ease-in_3.5s_forwards]">[sys] Synthesizing pipelines: 14,021 architectures generated</div>
                <div className="text-emerald-400 opacity-0 animate-[fadeIn_1s_ease-in_5s_forwards]">{'>'} Optimal configuration found. Preparing deployment...</div>
              </div>

              <div className="mt-12 flex justify-center opacity-0 animate-[fadeIn_1s_ease-in_6s_forwards]">
                <Link href="/dashboard">
                  <Button className="bg-white text-black hover:bg-neutral-200 rounded-full px-8 py-6 text-lg font-bold shadow-[0_0_40px_-10px_white]">
                    Enter Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Expanded Extreme Footer */}
      <footer className="border-t border-[#222] bg-[#050505] pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute bottom-[-20%] left-[10%] w-[50%] h-[50%] bg-brand-500/5 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 lg:gap-8 mb-24 relative z-10">

          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-6 h-6 bg-white rounded-sm transform rotate-45" />
              <div className="w-6 h-6 bg-brand-500 rounded-sm transform rotate-45 -ml-4 mix-blend-screen" />
              <span className="text-2xl font-bold tracking-tighter ml-2 text-white">SYSTEM2ML</span>
            </div>
            <p className="text-[#a0a0a0] font-light leading-relaxed mb-8 max-w-sm">
              The autonomous design engine for enterprise machine learning. We orchestrate constraint-aware pipelines faster than humanly possible.
            </p>
            <div className="flex items-center gap-2 border border-[#333] rounded-full p-1 max-w-sm bg-black">
              <input type="email" placeholder="Updates via terminal..." className="bg-transparent border-none outline-none text-sm px-4 flex-1 text-white placeholder-neutral-600 font-mono" />
              <Button className="rounded-full h-8 px-4 text-xs font-bold bg-[#222] text-white hover:bg-[#333]">Subscribe</Button>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6 tracking-tight">Product</h4>
            <ul className="space-y-4 text-sm text-[#a0a0a0]">
              <li><a href="#" className="hover:text-white transition-colors">Design Agent</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Governance Rules</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Telemetry Engine</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Edge Deploy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6 tracking-tight">Developers</h4>
            <ul className="space-y-4 text-sm text-[#a0a0a0]">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub Repository</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6 tracking-tight">Company</h4>
            <ul className="space-y-4 text-sm text-[#a0a0a0]">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Customer Stories</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-[1400px] mx-auto pt-8 border-t border-[#222] flex flex-col md:flex-row items-center justify-between text-xs text-neutral-600 gap-4 uppercase tracking-widest font-bold">
          <div>&copy; 2026 System2ML Operations.</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-neutral-400">Privacy</a>
            <a href="#" className="hover:text-neutral-400">Terms</a>
            <a href="#" className="hover:text-neutral-400">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
