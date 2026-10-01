// The sky behind everything: gradient, sun and moon, twinkling stars and the
// occasional shooting star. Clouds are drawn above this by CloudLayer.

import { useEffect, useRef } from 'react'
import { labToCss } from '../color'
import type { SkyEngine, Frame } from '../engine'
import { HORIZON_Y, toScreen, type StageLayout } from '../layout'
import { mulberry32 } from '../noise'

const STARS = (() => {
  const rand = mulberry32(7)
  return Array.from({ length: 260 }, () => ({
    x: rand(),
    y: rand() ** 1.4 * 0.8,
    r: 0.35 + rand() ** 3 * 1.1,
    b: 0.35 + rand() * 0.65,
    tw: 1.2 + rand() * 2.8, // twinkle speed
    ph: rand() * Math.PI * 2,
  }))
})()

type Meteor = { x: number; y: number; vx: number; vy: number; start: number; life: number }

function draw(ctx: CanvasRenderingContext2D, l: StageLayout, f: Frame, t: number, meteor: Meteor | null) {
  const { width: w, height: h } = l
  const { colors: c, nums: n } = f
  const [, horizon] = toScreen(l, 0, HORIZON_Y)
  const hy = Math.max(1, Math.min(h, horizon))

  // Base gradient
  const sky = ctx.createLinearGradient(0, 0, 0, hy)
  sky.addColorStop(0, labToCss(c.skyZenith))
  sky.addColorStop(Math.min(0.95, Math.max(0.05, n.skyMidStop)), labToCss(c.skyMid))
  sky.addColorStop(1, labToCss(c.skyHorizon))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Stars fade out toward the bright horizon.
  if (n.stars > 0.01) {
    ctx.fillStyle = '#ffffff'
    for (const s of STARS) {
      const sy = s.y * h
      if (sy > hy) continue
      const fade = Math.sqrt(1 - sy / hy)
      const twinkle = 0.72 + 0.28 * Math.sin(t * s.tw + s.ph)
      ctx.globalAlpha = n.stars * s.b * fade * twinkle
      ctx.beginPath()
      ctx.arc(s.x * w, sy, s.r * Math.max(1, l.scale), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  if (meteor && n.stars > 0.3) {
    const age = (t - meteor.start) / meteor.life
    if (age >= 0 && age <= 1) {
      const hx = meteor.x + meteor.vx * age
      const hy2 = meteor.y + meteor.vy * age
      const tail = ctx.createLinearGradient(hx, hy2, hx - meteor.vx * 0.25, hy2 - meteor.vy * 0.25)
      const a = Math.sin(age * Math.PI) * n.stars
      tail.addColorStop(0, `rgb(255 255 255 / ${0.85 * a})`)
      tail.addColorStop(1, 'rgb(255 255 255 / 0)')
      ctx.strokeStyle = tail
      ctx.lineWidth = 1.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(hx, hy2)
      ctx.lineTo(hx - meteor.vx * 0.25, hy2 - meteor.vy * 0.25)
      ctx.stroke()
    }
  }

  // Sun glow: a broad wash plus a tighter halo.
  const [sx, sy] = toScreen(l, n.sunX, n.sunY)
  if (n.glowStrength > 0.01) {
    const reach = Math.max(w, h) * (0.35 + 0.55 * n.glowStrength)
    const wash = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach)
    wash.addColorStop(0, labToCss(c.glow, 0.9 * n.glowStrength))
    wash.addColorStop(0.35, labToCss(c.glow, 0.35 * n.glowStrength))
    wash.addColorStop(1, labToCss(c.glow, 0))
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, w, h)
  }

  const sunR = n.sunSize * l.scale
  if (n.sunAlpha > 0.01) {
    const halo = ctx.createRadialGradient(sx, sy, sunR * 0.6, sx, sy, sunR * 5)
    halo.addColorStop(0, labToCss(c.sun, 0.55 * n.sunAlpha))
    halo.addColorStop(1, labToCss(c.sun, 0))
    ctx.fillStyle = halo
    ctx.fillRect(sx - sunR * 5, sy - sunR * 5, sunR * 10, sunR * 10)

    ctx.globalAlpha = n.sunAlpha
    ctx.fillStyle = labToCss(c.sun)
    ctx.beginPath()
    ctx.arc(sx, sy, sunR, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // Moon with a soft halo and faint maria.
  if (n.moonAlpha > 0.01) {
    const [mx, my] = toScreen(l, n.moonX, n.moonY)
    const mr = 17 * l.scale
    const halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 7)
    halo.addColorStop(0, `rgb(200 214 255 / ${0.22 * n.moonAlpha})`)
    halo.addColorStop(1, 'rgb(200 214 255 / 0)')
    ctx.fillStyle = halo
    ctx.fillRect(mx - mr * 7, my - mr * 7, mr * 14, mr * 14)

    ctx.globalAlpha = n.moonAlpha
    ctx.fillStyle = '#f3f1e8'
    ctx.beginPath()
    ctx.arc(mx, my, mr, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgb(160 165 180 / 0.25)'
    for (const [dx, dy, r] of [
      [-0.3, -0.2, 0.28],
      [0.25, 0.15, 0.22],
      [-0.05, 0.4, 0.16],
    ]) {
      ctx.beginPath()
      ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

export function SkyCanvas({ engine, layout }: { engine: SkyEngine; layout: StageLayout }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(layout.width * dpr)
    canvas.height = Math.round(layout.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const now = () => (reduceMotion ? 0 : (performance.now() - t0) / 1000)
    let meteor: Meteor | null = null
    let nextMeteor = 3 + Math.random() * 6

    const unsubscribe = engine.subscribe((frame) => draw(ctx, layout, frame, now(), meteor))

    // Twinkle at ~20 fps, and only while stars are out.
    let raf = 0
    let lastDraw = 0
    let visible = true
    const loop = (ms: number) => {
      raf = visible ? requestAnimationFrame(loop) : 0
      const frame = engine.frame
      if (frame.nums.stars < 0.05 || ms - lastDraw < 50) return
      lastDraw = ms
      const t = now()
      if (!meteor && t > nextMeteor) {
        const { width: w, height: h } = layout
        meteor = {
          x: w * (0.15 + Math.random() * 0.7),
          y: h * (0.04 + Math.random() * 0.2),
          vx: (Math.random() < 0.5 ? -1 : 1) * w * (0.12 + Math.random() * 0.1),
          vy: h * (0.08 + Math.random() * 0.06),
          start: t,
          life: 0.7 + Math.random() * 0.4,
        }
      }
      if (meteor && t > meteor.start + meteor.life) {
        meteor = null
        nextMeteor = t + 7 + Math.random() * 12
      }
      draw(ctx, layout, frame, t, meteor)
    }
    if (!reduceMotion) raf = requestAnimationFrame(loop)

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduceMotion && !raf) raf = requestAnimationFrame(loop)
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
