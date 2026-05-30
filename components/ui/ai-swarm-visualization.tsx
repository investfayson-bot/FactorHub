'use client'

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Settings, Zap, Brain, RefreshCw, Info } from "lucide-react"

export const AISwarmVisualization = () => {
  const [isRunning, setIsRunning] = useState(true)
  const [particleCount, setParticleCount] = useState(80)
  const [speed, setSpeed] = useState(2)
  const [connectionDistance, setConnectionDistance] = useState(150)
  const [showSettings, setShowSettings] = useState(false)
  const [activeRule, setActiveRule] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<{
    x: number; y: number; radius: number; color: string;
    vx: number; vy: number; opacity: number; canvasWidth?: number; canvasHeight?: number
  }[]>([])

  const rules = [
    { name: "Rede Neural", description: "Particulas formam conexoes como neuronios em uma rede neural, criando padroes inteligentes." },
    { name: "Inteligencia de Enxame", description: "Particulas exibem comportamento coletivo, simulando algoritmos de swarm intelligence." },
    { name: "Clusterizacao", description: "Particulas se agrupam demonstrando como algoritmos de clustering de IA funcionam." },
  ]

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const particles = []
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        color: '#14B8A6',
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        opacity: Math.random() * 0.5 + 0.5,
      })
    }
    particlesRef.current = particles
    return () => { cancelAnimationFrame(animationRef.current) }
  }, [particleCount, speed])

  useEffect(() => {
    if (!canvasRef.current || !isRunning) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    resizeCanvas()

    const handleResize = () => {
      if (particlesRef.current.length > 0) {
        const oldWidth = particlesRef.current[0].canvasWidth || canvas.width
        const oldHeight = particlesRef.current[0].canvasHeight || canvas.height
        resizeCanvas()
        particlesRef.current.forEach(p => {
          p.x = (p.x / oldWidth) * canvas.width
          p.y = (p.y / oldHeight) * canvas.height
          p.canvasWidth = canvas.width
          p.canvasHeight = canvas.height
        })
      }
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx = -p.vx
        if (p.y < 0 || p.y > canvas.height) p.vy = -p.vy

        if (activeRule === 1) {
          const cx = canvas.width / 2 + Math.sin(Date.now() / 2000) * 100
          const cy = canvas.height / 2 + Math.cos(Date.now() / 2000) * 100
          const dx = cx - p.x; const dy = cy - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 100) { p.vx += dx / dist * 0.02; p.vy += dy / dist * 0.02 }
        } else if (activeRule === 2) {
          const clusters = [
            { x: canvas.width * 0.25, y: canvas.height * 0.5 },
            { x: canvas.width * 0.5, y: canvas.height * 0.25 },
            { x: canvas.width * 0.75, y: canvas.height * 0.5 },
          ]
          const nearest = clusters.reduce((n, c) => {
            const d = Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2)
            return d < n.dist ? { dist: d, c } : n
          }, { dist: Infinity, c: clusters[0] })
          const dx = nearest.c.x - p.x; const dy = nearest.c.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 30) { p.vx += dx / dist * 0.03; p.vy += dy / dist * 0.03 }
        } else {
          if (Math.random() > 0.97) { p.vx += (Math.random() - 0.5) * 0.2; p.vy += (Math.random() - 0.5) * 0.2 }
          const maxV = 2 * speed
          const vSq = p.vx * p.vx + p.vy * p.vy
          if (vSq > maxV * maxV) { const r = maxV / Math.sqrt(vSq); p.vx *= r; p.vy *= r }
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
        ctx.globalAlpha = 1
      })

      ctx.strokeStyle = 'rgba(20,184,166,0.18)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < particlesRef.current.length; i++) {
        const a = particlesRef.current[i]
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const b = particlesRef.current[j]
          const dx = a.x - b.x; const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDistance) {
            ctx.globalAlpha = 1 - dist / connectionDistance
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      if (isRunning) animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationRef.current) }
  }, [isRunning, activeRule, speed, connectionDistance])

  const resetSimulation = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    particlesRef.current.forEach(p => {
      p.x = Math.random() * canvas.width
      p.y = Math.random() * canvas.height
      p.vx = (Math.random() - 0.5) * speed
      p.vy = (Math.random() - 0.5) * speed
    })
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#1E2D40] bg-[#111827]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1E2D40] px-5 py-3">
        <div className="flex items-center gap-3">
          <Brain size={16} className="text-teal-400" />
          <div>
            <div className="text-sm font-semibold text-slate-100">FactorHub AI Network</div>
            <div className="text-xs text-slate-500">Visualizacao em tempo real dos agentes</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetSimulation}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-[#1A2235] hover:text-slate-200"
          >
            <RefreshCw size={12} />
            Reset
          </button>
          <button
            onClick={() => setIsRunning(v => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isRunning
                ? "bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                : "bg-[#1A2235] text-slate-400 hover:text-slate-200"
            )}
          >
            <Zap size={12} />
            {isRunning ? "Pausar" : "Retomar"}
          </button>
          <button
            onClick={() => setShowSettings(v => !v)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              showSettings ? "bg-[#1A2235] text-slate-200" : "text-slate-500 hover:bg-[#1A2235] hover:text-slate-300"
            )}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="border-b border-[#1E2D40] bg-[#0F1926] px-5 py-4">
          <div className="flex flex-wrap gap-6 mb-4">
            {[
              { label: "Particulas", min: 20, max: 200, value: particleCount, step: 1, set: setParticleCount, fmt: (v: number) => String(v) },
              { label: "Distancia de conexao", min: 50, max: 250, value: connectionDistance, step: 10, set: setConnectionDistance, fmt: (v: number) => `${v}px` },
              { label: "Velocidade", min: 1, max: 5, value: speed, step: 0.5, set: setSpeed, fmt: (v: number) => `${v}x` },
            ].map(s => (
              <div key={s.label} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">{s.label}</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={e => s.set(Number(e.target.value))} className="w-28 accent-teal-400" />
                  <span className="text-xs text-slate-400 min-w-[36px] font-mono">{s.fmt(s.value)}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">Comportamento</div>
            <div className="flex gap-2">
              {rules.map((r, i) => (
                <button key={i} onClick={() => setActiveRule(i)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    activeRule === i ? "bg-teal-500 text-white" : "bg-[#1A2235] text-slate-400 hover:text-slate-200"
                  )}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full" style={{ height: 380 }}>
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute bottom-4 left-4 max-w-[240px] rounded-lg border border-[#1E2D40] bg-[#111827]/90 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Info size={12} className="text-teal-400 flex-shrink-0" />
            {rules[activeRule].name}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{rules[activeRule].description}</p>
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-[#1E2D40] bg-[#111827]/80 px-2.5 py-1 text-xs text-slate-500 backdrop-blur-sm font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          {particleCount} agentes
        </div>
      </div>
    </div>
  )
}
