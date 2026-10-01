// Moving weather in front of the landscape: rain in three depths, rare sheet
// lightning, and flocks of birds crossing at golden hour and dusk.

import { useEffect, useRef } from 'react'
import { labToCss } from '../color'
import type { SkyEngine } from '../engine'
import type { StageLayout } from '../layout'
import { mulberry32 } from '../noise'

const MAX_DROPS = 900
const RAIN_SLANT = 0.16 // horizontal drift per unit of fall

type Drop = { x: number; y: number; depth: number; len: number; speed: number }
type Bird = { dx: number; dy: number; phase: number; rate: number; size: number }
type Flock = { x: number; y: number; dir: 1 | -1; speed: number; birds: Bird[]; age: number }

const DEPTHS = [
  { alpha: 0.16, width: 0.8 },
  { alpha: 0.26, width: 1 },
  { alpha: 0.38, width: 1.3 },
]

export function AtmosphereCanvas({ engine, layout }: { engine: SkyEngine; layout: StageLayout }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { width: w, height: h } = layout
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const rand = mulberry32(Date.now() & 0xffff)
    const drops: Drop[] = Array.from({ length: MAX_DROPS }, () => {
      const depth = rand() < 0.45 ? 0 : rand() < 0.65 ? 1 : 2
      return {
        x: rand() * (w + h * RAIN_SLANT),
        y: rand() * h,
        depth,
        len: (8 + depth * 7 + rand() * 6) * Math.max(0.7, layout.scale),
        speed: h * (0.9 + depth * 0.45 + rand() * 0.3),
      }
    })

    let flock: Flock | null = null
    let nextFlock = 1.5
    let flash = { start: -1, strength: 0 }
    let nextFlash = 4 + rand() * 6
    let clock = 0

    const spawnFlock = (): Flock => {
      const dir = rand() < 0.5 ? 1 : -1
      const n = 5 + Math.floor(rand() * 7)
      const spacing = 16 * Math.max(0.7, layout.scale)
      const birds = Array.from({ length: n }, (_, i): Bird => {
        const rank = Math.ceil(i / 2)
        const side = i % 2 ? 1 : -1
        return {
          dx: -rank * spacing * (0.9 + rand() * 0.4),
          dy: side * rank * spacing * 0.55 + (rand() - 0.5) * 6,
          phase: rand() * Math.PI * 2,
          rate: 7 + rand() * 3,
          size: (4.5 + rand() * 2.5) * Math.max(0.75, layout.scale),
        }
      })
      return {
        x: dir === 1 ? -60 : w + 60,
        y: h * (0.18 + rand() * 0.22),
        dir,
        speed: 38 + rand() * 22,
        birds,
        age: 0,
      }
    }

    const drawRain = (amount: number, dt: number) => {
      const active = Math.round(MAX_DROPS * amount * Math.min(1, (w * h) / (1440 * 900) + 0.35))
      const paths = DEPTHS.map(() => new Path2D())
      for (let i = 0; i < active; i++) {
        const d = drops[i]
        d.y += d.speed * dt
        d.x -= d.speed * dt * RAIN_SLANT
        if (d.y > h + d.len) {
          d.y = -d.len - rand() * h * 0.2
          d.x = rand() * (w + h * RAIN_SLANT)
        }
        const p = paths[d.depth]
        p.moveTo(d.x, d.y)
        p.lineTo(d.x + d.len * RAIN_SLANT, d.y - d.len)
      }
      ctx.lineCap = 'round'
      DEPTHS.forEach((depth, i) => {
        ctx.strokeStyle = `rgb(214 222 232 / ${depth.alpha * Math.min(1, amount * 1.3)})`
        ctx.lineWidth = depth.width
        ctx.stroke(paths[i])
      })
    }

    const drawBirds = (amount: number, dt: number, color: string) => {
      if (!flock) {
        nextFlock -= dt
        if (nextFlock <= 0) flock = spawnFlock()
        return
      }
      const f = flock
      f.age += dt
      f.x += f.dir * f.speed * dt
      const bob = Math.sin(f.age * 0.8) * 4
      ctx.strokeStyle = color
      ctx.globalAlpha = amount
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const b of f.birds) {
        const x = f.x + b.dx * f.dir
        const y = f.y + b.dy + bob
        // Bursts of flapping between glides.
        const flapping = Math.sin(f.age * 0.9 + b.phase) > -0.3
        const lift = flapping ? Math.sin(f.age * b.rate + b.phase) * 0.55 : 0.2
        const s = b.size
        ctx.lineWidth = Math.max(1, s * 0.22)
        ctx.beginPath()
        ctx.moveTo(x - s, y - s * lift)
        ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.12, x, y)
        ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.12, x + s, y - s * lift)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const tail = Math.max(...f.birds.map((b) => -b.dx)) + 80
      if ((f.dir === 1 && f.x - tail > w) || (f.dir === -1 && f.x + tail < 0)) {
        flock = null
        nextFlock = 5 + rand() * 9
      }
    }

    const drawLightning = (chance: number, dt: number) => {
      nextFlash -= dt
      if (nextFlash <= 0) {
        flash = { start: clock, strength: 0.08 + rand() * 0.1 * chance }
        nextFlash = (9 + rand() * 14) / Math.max(0.3, chance)
      }
      if (flash.start < 0) return
      const t = clock - flash.start
      if (t > 0.6) {
        flash.start = -1
        return
      }
      // A soft double flicker; low contrast and rare, well under flash-safety limits.
      const a = flash.strength * (Math.exp(-t * 9) + (t > 0.18 ? 0.6 * Math.exp(-(t - 0.18) * 7) : 0))
      ctx.fillStyle = `rgb(232 238 255 / ${a})`
      ctx.fillRect(0, 0, w, h)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()
    let visible = true

    let dirty = true

    const frame = (dt: number) => {
      const { nums: n, colors: c } = engine.frame
      const active = n.rain > 0.01 || n.birds > 0.01 || flock !== null || (n.lightning > 0.01 && !reduceMotion)
      // Clear scenes (most of them) skip the full-canvas clear once it's empty.
      if (!active && !dirty) return
      ctx.clearRect(0, 0, w, h)
      dirty = active
      if (n.rain > 0.01) drawRain(n.rain, dt)
      if (n.birds > 0.01) drawBirds(n.birds, dt, labToCss(c.canopy))
      else flock = null
      if (n.lightning > 0.01 && !reduceMotion) drawLightning(n.lightning, dt)
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt
      frame(dt)
      raf = visible ? requestAnimationFrame(loop) : 0
    }

    // Reduced motion: a still frame of rain, no birds or lightning.
    const unsubscribe = reduceMotion
      ? engine.subscribe(({ nums }) => {
          ctx.clearRect(0, 0, w, h)
          if (nums.rain > 0.01) drawRain(nums.rain, 0)
        })
      : () => {}
    if (!reduceMotion) raf = requestAnimationFrame(loop)

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduceMotion && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    })
    io.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      unsubscribe()
      io.disconnect()
    }
  }, [engine, layout])

  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}
