// A tiny render-loop store. Scene changes animate outside React: each frame the
// blended tokens are pushed to subscribers (canvas + CSS variables), so the
// component tree never re-renders during a transition.

import { hexToLab, mixLab, type Lab } from './color'
import { COLOR_KEYS, NUM_KEYS, type ColorKey, type NumKey, type SceneDef } from './scenes'

export type Frame = {
  colors: Record<ColorKey, Lab>
  nums: Record<NumKey, number>
}

type Listener = (frame: Frame) => void

export function sceneToFrame(scene: SceneDef): Frame {
  const colors = {} as Record<ColorKey, Lab>
  for (const k of COLOR_KEYS) colors[k] = hexToLab(scene.colors[k])
  return { colors, nums: { ...scene.nums } }
}

export function blend(a: Frame, b: Frame, t: number): Frame {
  const colors = {} as Record<ColorKey, Lab>
  const nums = {} as Record<NumKey, number>
  for (const k of COLOR_KEYS) colors[k] = mixLab(a.colors[k], b.colors[k], t)
  for (const k of NUM_KEYS) nums[k] = a.nums[k] + (b.nums[k] - a.nums[k]) * t
  return { colors, nums }
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function createSkyEngine(initial: Frame) {
  let current = initial
  let from = current
  let to = current
  let start = 0
  let duration = 0
  let raf = 0
  const listeners = new Set<Listener>()

  const emit = () => listeners.forEach((fn) => fn(current))

  const tick = (now: number) => {
    // rAF timestamps can precede the start time; clamp so a blend never extrapolates.
    const t = duration === 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration))
    current = blend(from, to, easeInOutCubic(t))
    emit()
    raf = t < 1 ? requestAnimationFrame(tick) : 0
  }

  return {
    get frame() {
      return current
    },
    subscribe(fn: Listener) {
      listeners.add(fn)
      fn(current)
      return () => {
        listeners.delete(fn)
      }
    },
    transitionTo(target: Frame, ms: number) {
      cancelAnimationFrame(raf)
      from = current
      to = target
      start = performance.now()
      duration = ms
      raf = requestAnimationFrame(tick)
    },
    destroy() {
      cancelAnimationFrame(raf)
      listeners.clear()
    },
  }
}

export type SkyEngine = ReturnType<typeof createSkyEngine>
