// The Margalla Hills as four ridges, far → near. Each ridge is a hand-placed
// macro profile (the rough skyline seen from the south) with seeded noise on
// top. Colour comes from CSS variables so the engine can relight them.

import { VIEW_H, VIEW_W } from '../layout'
import { fbm1D, mulberry32 } from '../noise'
import { useSvgIds } from '../ids'

type Ridge = {
  profile: [number, number][]
  seed: number
  detail: number
  wavelength: number
  /** Small scallops that read as forest canopy on nearer slopes. */
  canopy?: number
}

const RIDGES: Ridge[] = [
  {
    profile: [[0, 505], [180, 470], [380, 438], [560, 452], [760, 410], [980, 425], [1180, 392], [1380, 432], [1600, 462]],
    seed: 11,
    detail: 24,
    wavelength: 190,
  },
  {
    profile: [[0, 548], [220, 506], [430, 522], [640, 484], [860, 514], [1060, 478], [1260, 506], [1450, 474], [1600, 510]],
    seed: 23,
    detail: 20,
    wavelength: 150,
  },
  {
    profile: [[0, 600], [170, 566], [390, 586], [590, 552], [800, 582], [1010, 560], [1210, 584], [1420, 548], [1600, 578]],
    seed: 37,
    detail: 16,
    wavelength: 120,
    canopy: 1.5,
  },
  {
    profile: [[0, 652], [210, 628], [430, 652], [650, 610], [880, 640], [1100, 618], [1340, 648], [1600, 624]],
    seed: 53,
    detail: 12,
    wavelength: 95,
    canopy: 2.6,
  },
]

function interpolate(profile: [number, number][], x: number) {
  let i = 0
  while (i < profile.length - 2 && x > profile[i + 1][0]) i++
  const [x0, y0] = profile[i]
  const [x1, y1] = profile[i + 1]
  const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)))
  const u = (1 - Math.cos(t * Math.PI)) / 2
  return y0 + (y1 - y0) * u
}

function buildRidge(r: Ridge) {
  const noise = fbm1D(r.seed)
  const ridged = fbm1D(r.seed + 3, 3)
  const fine = fbm1D(r.seed + 7, 2)
  const pts: string[] = []
  const ys: number[] = []
  let sum = 0
  let count = 0
  for (let x = -10; x <= VIEW_W + 10; x += 4) {
    // Ridged noise (1 - |n|)³ adds the sharper spurs and saddles of the Margallas.
    const spur = (1 - Math.abs(ridged(x / (r.wavelength * 1.2)))) ** 2.5
    let y = interpolate(r.profile, x) + noise(x / r.wavelength) * r.detail - spur * r.detail * 0.8
    if (r.canopy) y -= Math.abs(fine(x / 9)) * r.canopy * 2
    pts.push(`${x},${y.toFixed(1)}`)
    ys.push(y)
    sum += y
    count++
  }
  return { d: `M-10,${VIEW_H} L${pts.join(' L')} L${VIEW_W + 10},${VIEW_H} Z`, meanY: sum / count, ys }
}

const BUILT = RIDGES.map(buildRidge)

/** Crest height of a ridge at x, in viewBox units. */
function ridgeY(index: number, x: number) {
  const ys = BUILT[index].ys
  return ys[Math.min(ys.length - 1, Math.max(0, Math.round((x + 10) / 4)))]
}

type Lamp = { x: number; y: number; twinkle: boolean }

function cluster(seed: number, ridge: number, cx: number, spread: number, n: number, below: [number, number]) {
  const rand = mulberry32(seed)
  return Array.from({ length: n }, (): Lamp => {
    const x = cx + (rand() - 0.5) * spread
    return { x, y: ridgeY(ridge, x) + below[0] + rand() * (below[1] - below[0]), twinkle: rand() < 0.35 }
  })
}

/** The Pir Sohawa road: switchbacks climbing the second ridge up to Monal. */
function switchbacks(): Lamp[] {
  const lamps: Lamp[] = []
  let x = 1300
  let y = ridgeY(2, 1300) + 10
  for (let leg = 0; leg < 5; leg++) {
    const dir = leg % 2 ? 1 : -1
    for (let i = 0; i < 10; i++) {
      x += dir * 6.5
      y += 1.7
      if (i % 2 === 0 && y > ridgeY(2, x) + 5) lamps.push({ x, y, twinkle: false })
    }
  }
  return lamps
}

// Lights on ridge 2 (Monal and its road) and ridge 3 (Daman-e-Koh, Saidpur village)
const HILL_LAMPS: Record<number, Lamp[]> = {
  2: [...cluster(71, 2, 1300, 22, 6, [5, 10]), ...switchbacks()],
  3: [...cluster(83, 3, 1132, 30, 7, [6, 12]), ...cluster(97, 3, 395, 90, 14, [22, 48])],
}

function HillLamps({ lamps }: { lamps: Lamp[] }) {
  const ids = useSvgIds()
  return (
    <g filter={ids.url('hill-glow')} fill="#ffcf8a" style={{ opacity: 'var(--hill-lights)' }}>
      {lamps.map((l, i) => (
        <circle
          key={i}
          cx={l.x.toFixed(1)}
          cy={l.y.toFixed(1)}
          r={1.3}
          className={l.twinkle ? 'isky-twinkle' : undefined}
          style={l.twinkle ? { animationDelay: `${(i * 0.37) % 3}s` } : undefined}
        />
      ))}
    </g>
  )
}

/** Valley mist sits just above each nearer ridge's crest line. */
const MIST_BANDS = BUILT.slice(1).map((r, i) => ({ y: r.meanY - 78, h: 110, strength: 0.55 + i * 0.12 }))

export function Ridges() {
  const ids = useSvgIds()
  return (
    <g>
      <defs>
        <linearGradient id={ids.id('mist-band')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--mist)', stopOpacity: 0 }} />
          <stop offset="0.7" style={{ stopColor: 'var(--mist)', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: 'var(--mist)', stopOpacity: 0 }} />
        </linearGradient>
        <filter id={ids.id('hill-glow')} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {BUILT.map((r, i) => (
        <g key={i}>
          <path d={r.d} style={{ fill: `var(--hill-${i})` }} />
          {MIST_BANDS[i] && (
            <rect
              x={0}
              y={MIST_BANDS[i].y}
              width={VIEW_W}
              height={MIST_BANDS[i].h}
              fill={ids.url('mist-band')}
              style={{ opacity: `calc(var(--mist-opacity) * ${MIST_BANDS[i].strength})` }}
            />
          )}
          {HILL_LAMPS[i] && <HillLamps lamps={HILL_LAMPS[i]} />}
        </g>
      ))}
      {/* Low mist over the city, in front of the nearest ridge */}
      <rect
        x={0}
        y={660}
        width={VIEW_W}
        height={130}
        fill={ids.url('mist-band')}
        style={{ opacity: 'calc(var(--mist-opacity) * 0.8)' }}
      />
    </g>
  )
}
