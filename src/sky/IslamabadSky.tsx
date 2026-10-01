import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { labToCss, mixLab } from './color'
import { createSkyEngine, sceneToFrame, type Frame } from './engine'
import { IdPrefixProvider } from './ids'
import { VIEW_H, VIEW_W, useStageLayout } from './layout'
import { AtmosphereCanvas } from './layers/AtmosphereCanvas'
import { CloudLayer } from './layers/CloudLayer'
import { Foreground } from './layers/Foreground'
import { FaisalMasjid } from './layers/FaisalMasjid'
import { Rainbow } from './layers/Rainbow'
import { Ridges } from './layers/Ridges'
import { SkyCanvas } from './layers/SkyCanvas'
import { SCENES, type SceneId } from './scenes'

type Props = {
  scene?: SceneId
  /** Blend duration between scenes. Ignored when the user prefers reduced motion. */
  transitionMs?: number
  /** Pixels to keep clear at the bottom for overlay controls; trees fill in below. */
  insetBottom?: number
  className?: string
  style?: CSSProperties
  /** Overlay content (headlines, controls). Rendered above the scene. */
  children?: ReactNode
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const HILL_DEPTH = [0, 0.38, 0.68, 1]

/** Derives every CSS variable the SVG layers and overlay read from. */
function writeVars(el: HTMLElement, { colors: c, nums: n }: Frame) {
  const set = (k: string, v: string) => el.style.setProperty(k, v)
  const face = (lit: number) => labToCss(mixLab(c.mosqueShade, c.mosqueLit, clamp01(lit)))

  HILL_DEPTH.forEach((t, i) => set(`--hill-${i}`, labToCss(mixLab(c.hillFar, c.hillNear, t))))
  set('--canopy', labToCss(c.canopy))
  set('--canopy-back', labToCss(mixLab(c.hillNear, c.canopy, 0.78)))
  set('--canopy-mid', labToCss(mixLab(c.hillNear, c.canopy, 0.45)))
  set('--mist', labToCss(c.mist))
  set('--mist-opacity', n.mistAmount.toFixed(3))
  set('--mq-left', face(0.5 - 0.5 * n.lightDir))
  set('--mq-right', face(0.5 + 0.5 * n.lightDir))
  set('--mq-front', face(0.62))
  set('--mq-base', face(0.3))
  set('--mq-lit', labToCss(c.mosqueLit))
  set('--facade', labToCss(c.facade))
  set('--facade-fin', labToCss(mixLab(c.facade, c.mosqueShade, 0.5)))
  set('--mq-lights', n.mosqueLights.toFixed(3))
  set('--rim', labToCss(mixLab(c.glow, c.sun, 0.45)))
  const rim = n.rimLight * 0.8
  set('--rim-left', (rim * (0.05 + 0.95 * clamp01(-n.lightDir))).toFixed(3))
  set('--rim-right', (rim * (0.05 + 0.95 * clamp01(n.lightDir))).toFixed(3))
  set('--rim-mid', (rim * 0.12).toFixed(3))
  set('--rim-dx', `${(-n.lightDir * 3.4).toFixed(2)}px`)
  set('--rim-dy', '1.1px')
  set('--sheen', labToCss(mixLab(c.sun, c.skyHorizon, 0.4)))
  set('--wet', (n.wetSheen * 0.8).toFixed(3))
  set('--rainbow', n.rainbow.toFixed(3))
  set('--hill-lights', n.hillLights.toFixed(3))
  set('--ink', labToCss(c.ink))
  // A soft scrim behind overlay text, opposite in tone to the ink.
  const inkIsLight = c.ink[0] > 0.6
  set('--scrim', inkIsLight ? 'rgb(8 10 20 / 0.32)' : 'rgb(255 255 255 / 0.34)')
}

// Shipped with the component so it needs no global stylesheet. React dedupes it by href.
const TWINKLE_CSS = `@keyframes isky-twinkle{0%,100%{opacity:1}45%{opacity:.35}60%{opacity:.85}}
.isky-twinkle{animation:isky-twinkle 3.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.isky-twinkle{animation:none}}`

const FILL: CSSProperties = { position: 'absolute', inset: 0 }

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function IslamabadSky({
  scene = 'after-rain',
  transitionMs = 2600,
  insetBottom = 0,
  className = '',
  style,
  children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const idPrefix = `isky${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const c = SCENES[scene].colors
  const layout = useStageLayout(rootRef, insetBottom)
  const [engine] = useState(() => createSkyEngine(sceneToFrame(SCENES[scene])))

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    return engine.subscribe((frame) => writeVars(el, frame))
  }, [engine])

  useEffect(() => {
    engine.transitionTo(sceneToFrame(SCENES[scene]), prefersReducedMotion() ? 0 : transitionMs)
  }, [engine, scene, transitionMs])

  useEffect(() => () => engine.destroy(), [engine])

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        // Shown until the first frame paints, so there's no blank flash.
        background: `linear-gradient(180deg, ${c.skyZenith}, ${c.skyMid} 50%, ${c.skyHorizon} 75%, ${c.canopy} 75%)`,
        ...style,
      }}
    >
      <style href="isky-twinkle" precedence="default">
        {TWINKLE_CSS}
      </style>
      <IdPrefixProvider value={idPrefix}>
        <div role="img" aria-label={`Faisal Masjid and the Margalla Hills, ${SCENES[scene].name.toLowerCase()}`} style={FILL}>
          {layout && <SkyCanvas engine={engine} layout={layout} />}
          {layout && <CloudLayer engine={engine} layout={layout} />}
          {layout && (
            <svg
              aria-hidden
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              style={{
                position: 'absolute',
                overflow: 'visible',
                left: layout.offsetX,
                top: layout.offsetY,
                width: VIEW_W * layout.scale,
                height: VIEW_H * layout.scale,
              }}
            >
              <Rainbow />
              <Ridges />
              <FaisalMasjid />
              <Foreground />
            </svg>
          )}
          {layout && <AtmosphereCanvas engine={engine} layout={layout} />}
        </div>
      </IdPrefixProvider>
      {children}
    </div>
  )
}
