// Maps the 1600 × 900 landscape artwork onto any container size.
// The landscape is bottom-anchored; on narrow screens it is scaled up and the
// view pans toward the mosque so the landmark never gets cropped out.

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

// useLayoutEffect warns during server rendering; fall back to useEffect there.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const VIEW_W = 1600
export const VIEW_H = 900
export const MOSQUE_X = 900
/** Visual horizon (roughly the base of the far ridges), in viewBox units. */
export const HORIZON_Y = 640

export type StageLayout = {
  width: number
  height: number
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * `insetBottom` lifts the landscape so overlay controls don't cover the mosque;
 * the foreground trees extend below the artwork to fill the space underneath.
 */
export function computeLayout(width: number, height: number, insetBottom = 0): StageLayout {
  const usable = height - insetBottom
  // Fill the width, but never let the landscape shrink below ~60% of the height.
  const scale = Math.max(width / VIEW_W, (usable * 0.6) / VIEW_H)
  const artW = VIEW_W * scale

  // Blend the focus point from the centre toward the mosque as the view narrows.
  const overflow = Math.min(1, Math.max(0, (artW - width) / (artW * 0.4)))
  const focusX = VIEW_W / 2 + (MOSQUE_X - VIEW_W / 2) * overflow
  const offsetX = Math.min(0, Math.max(width - artW, width / 2 - focusX * scale))

  return { width, height, scale, offsetX, offsetY: usable - VIEW_H * scale }
}

export const toScreen = (l: StageLayout, x: number, y: number) =>
  [l.offsetX + x * l.scale, l.offsetY + y * l.scale] as const

export function useStageLayout(ref: RefObject<HTMLElement | null>, insetBottom = 0) {
  const [layout, setLayout] = useState<StageLayout | null>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const measure = () => {
      raf = 0
      const next = computeLayout(el.clientWidth, el.clientHeight, insetBottom)
      setLayout((prev) =>
        prev && prev.width === next.width && prev.height === next.height && prev.offsetY === next.offsetY ? prev : next,
      )
    }
    measure()
    // Window drags fire many resize events; settle on one layout per frame.
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(measure)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [ref, insetBottom])

  return layout
}
