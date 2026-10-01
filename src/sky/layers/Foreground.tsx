// Islamabad reads as green: a low band of city trees in front of the mosque
// plinth, and two layers of canopy framing the view from the sides.

import { VIEW_H, VIEW_W } from '../layout'
import { mulberry32 } from '../noise'
import { useSvgIds } from '../ids'

type Canopy = {
  seed: number
  top: (x: number) => number
  rMin: number
  rMax: number
}

const bump = (x: number, at: number, width: number, height: number) =>
  height * Math.exp(-(((x - at) / width) ** 2))

const CANOPIES: Canopy[] = [
  // City trees between the viewer and the mosque
  { seed: 5, top: (x) => 770 - bump(x, 200, 260, 14) - bump(x, 1450, 220, 12), rMin: 6, rMax: 13 },
  // Framing trees, back layer
  {
    seed: 9,
    top: (x) => 846 - bump(x, 0, 300, 175) - bump(x, 1600, 270, 140),
    rMin: 20,
    rMax: 40,
  },
  // Framing trees, front layer
  {
    seed: 17,
    top: (x) => 892 - bump(x, -40, 210, 125) - bump(x, 1650, 190, 100),
    rMin: 24,
    rMax: 48,
  },
]

function buildCanopy(c: Canopy) {
  const rand = mulberry32(c.seed)
  const circles: [number, number, number][] = []
  let x = -70
  while (x < VIEW_W + 70) {
    const r = c.rMin + rand() * (c.rMax - c.rMin)
    const cy = c.top(x) + r * 0.6 + (rand() - 0.5) * r * 0.5
    circles.push([x, cy, r])
    x += r * (0.85 + rand() * 0.4)
  }
  // The base runs well below the artwork so lifted layouts (insetBottom) stay filled.
  const bottom = VIEW_H + 600
  const base = `M-80,${bottom} ${circles.map(([cx, cy]) => `L${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ')} L${VIEW_W + 80},${bottom} Z`
  return { circles, base }
}

const BUILT = CANOPIES.map(buildCanopy)
const FILLS = ['var(--canopy-mid)', 'var(--canopy-back)', 'var(--canopy)']
/** Nearer canopy gets a wider rim of low sunlight. */
const RIM_WIDTH = [0.45, 0.8, 1]

// Street lights glimpsed between the city trees at night.
const CITY_LAMPS = (() => {
  const rand = mulberry32(29)
  return Array.from({ length: 72 }, () => ({
    x: rand() * VIEW_W,
    y: 774 + rand() * 18,
    r: 0.9 + rand() * 0.8,
    twinkle: rand() < 0.2,
  }))
})()

export function Foreground() {
  const ids = useSvgIds()
  return (
    <g>
      <defs>
        {/* Rim light is strongest on the side facing the sun and fades across the frame */}
        <linearGradient id={ids.id('rim-grad')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VIEW_W} y2="0">
          <stop offset="0" style={{ stopColor: 'var(--rim)', stopOpacity: 'var(--rim-left)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--rim)', stopOpacity: 'var(--rim-mid)' }} />
          <stop offset="1" style={{ stopColor: 'var(--rim)', stopOpacity: 'var(--rim-right)' }} />
        </linearGradient>
        {BUILT.map((c, i) => (
          <g key={i} id={ids.id(`canopy-${i}`)}>
            <path d={c.base} />
            {c.circles.map(([cx, cy, r], j) => (
              <circle key={j} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={r.toFixed(1)} />
            ))}
          </g>
        ))}
      </defs>

      {BUILT.map((_, i) => (
        <g key={i}>
          {/* Rim light: a lit copy, then the canopy nudged away from the sun to reveal its edge */}
          <use href={ids.href(`canopy-${i}`)} fill={ids.url('rim-grad')} />
          <use
            href={ids.href(`canopy-${i}`)}
            style={{
              fill: FILLS[i],
              transform: `translate(calc(var(--rim-dx) * ${RIM_WIDTH[i]}), calc(var(--rim-dy) * ${RIM_WIDTH[i]}))`,
            }}
          />
          {i === 0 && (
            <g filter={ids.url('hill-glow')} fill="#ffc77a" style={{ opacity: 'var(--hill-lights)' }}>
              {CITY_LAMPS.map((l, j) => (
                <circle
                  key={j}
                  cx={l.x.toFixed(1)}
                  cy={l.y.toFixed(1)}
                  r={l.r.toFixed(2)}
                  className={l.twinkle ? 'isky-twinkle' : undefined}
                  style={l.twinkle ? { animationDelay: `${(j * 0.53) % 3}s` } : undefined}
                />
              ))}
            </g>
          )}
        </g>
      ))}
    </g>
  )
}
