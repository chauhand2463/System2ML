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
                Daniel, Principal ML Engineer <span className="text-neutral-500 font-normal">@Enterprise</span>
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
