// Faisal Masjid, seen from the south. Proportions follow reference photos:
// minarets ~10:1, the tent roof peaking at ~45% of minaret height, and a
// triangular finned facade under the front gable. Faces are split into
// left / front / right planes so the engine can light them from either side.

import { MOSQUE_X } from '../layout'
import { useSvgIds } from '../ids'

const CX = MOSQUE_X
const GROUND = 792

// [height fraction, half-width multiplier] from base to tip
const MINARET_PROFILE: [number, number][] = [
  [0, 0.66],
  [0.07, 0.66],
  [0.07, 0.5],
  [0.72, 0.43],
  [0.72, 0.45],
  [0.745, 0.6],
  [0.76, 0.6],
  [0.76, 0.4],
  [0.8, 0.4],
  [0.815, 0.44],
  [0.83, 0.38],
  [1, 0],
]

function minaret(x: number, base: number, h: number, w: number) {
  const edge = MINARET_PROFILE.map(([f, m]) => [base - f * h, m * w] as const)
  const left = edge.map(([y, hw]) => `${(x - hw).toFixed(1)},${y.toFixed(1)}`)
  const right = edge.map(([y, hw]) => `${(x + hw).toFixed(1)},${y.toFixed(1)}`)
  const lights: [number, number][] = []
  for (let f = 0.1; f < 0.7; f += 0.035) {
    lights.push([x - w * 0.46, base - f * h], [x + w * 0.46, base - f * h])
  }
  for (let i = -2; i <= 2; i++) lights.push([x + i * w * 0.27, base - 0.75 * h])
  lights.push([x, base - h + 4])
  return {
    left: `M${x},${base} L${left.join(' L')} Z`,
    right: `M${x},${base} L${right.join(' L')} Z`,
    lights,
  }
}

const REAR = [minaret(CX - 165, 772, 430, 30), minaret(CX + 165, 772, 430, 30)]
const FRONT = [minaret(CX - 280, GROUND, 460, 36), minaret(CX + 280, GROUND, 460, 36)]

// Tent roof
const APEX: [number, number] = [CX, 572]
const OUTER_L: [number, number] = [CX - 272, 774]
const OUTER_R: [number, number] = [CX + 272, 774]
const GABLE_L: [number, number] = [CX - 138, 774]
const GABLE_R: [number, number] = [CX + 138, 774]
const FACADE = { top: 604, base: 770, half: 114 }

const p = ([x, y]: [number, number]) => `${x},${y}`
// Slightly concave outer edges give the Bedouin-tent sag.
const roofLeft = `M${p(APEX)} Q${CX - 136},${700} ${p(OUTER_L)} L${p(GABLE_L)} Z`
const roofRight = `M${p(APEX)} Q${CX + 136},${700} ${p(OUTER_R)} L${p(GABLE_R)} Z`
const gable = `M${p(APEX)} L${p(GABLE_L)} L${p(GABLE_R)} Z`
const facade = `M${CX},${FACADE.top} L${CX - FACADE.half},${FACADE.base} L${CX + FACADE.half},${FACADE.base} Z`

const FINS = Array.from({ length: 18 }, (_, i) => CX - FACADE.half + 7 + i * 12.6)

const r = 7
const crescent = `M${CX - r},540 A${r} ${r} 0 0 0 ${CX + r},540 A${r} ${r * 0.55} 0 0 1 ${CX - r},540 Z`

const ROOF_LIGHTS: [number, number][] = []
for (let t = 0.04; t <= 1; t += 0.06) {
  ROOF_LIGHTS.push(
    [APEX[0] + (OUTER_L[0] - APEX[0]) * t, APEX[1] + (OUTER_L[1] - APEX[1]) * t ** 0.92],
    [APEX[0] + (OUTER_R[0] - APEX[0]) * t, APEX[1] + (OUTER_R[1] - APEX[1]) * t ** 0.92],
    [APEX[0] + (GABLE_L[0] - APEX[0]) * t, APEX[1] + (GABLE_L[1] - APEX[1]) * t],
    [APEX[0] + (GABLE_R[0] - APEX[0]) * t, APEX[1] + (GABLE_R[1] - APEX[1]) * t],
  )
}

const REAR_LIGHTS = REAR.flatMap((m) => m.lights)
const FRONT_LIGHTS = FRONT.flatMap((m) => m.lights).concat(ROOF_LIGHTS)

function Lamps({ points }: { points: [number, number][] }) {
  const ids = useSvgIds()
  return (
    <g filter={ids.url('lamp-glow')} style={{ opacity: 'var(--mq-lights)' }} fill="#fff2d2">
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5} />
      ))}
    </g>
  )
}

const WING_TOP = 740

/** The low courtyard arcades that run out from the prayer hall. */
function Wing({ x, width }: { x: number; width: number }) {
  const arches = Math.floor(width / 16)
  return (
    <g>
      <rect x={x} y={WING_TOP} width={width} height={GROUND - WING_TOP} style={{ fill: 'var(--mq-front)' }} />
      <rect x={x} y={WING_TOP} width={width} height={4} style={{ fill: 'var(--mq-lit)' }} />
      {Array.from({ length: arches }, (_, i) => (
        <rect
          key={i}
          x={x + 5 + i * 16}
          y={WING_TOP + 11}
          width={7}
          height={20}
          rx={3.5}
          style={{ fill: 'var(--facade)', opacity: 0.55 }}
        />
      ))}
    </g>
  )
}

export function FaisalMasjid() {
  const ids = useSvgIds()
  return (
    <g>
      <defs>
        <radialGradient id={ids.id('flood')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3b3" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#ffe3b3" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffe3b3" stopOpacity="0" />
        </radialGradient>
        <filter id={ids.id('lamp-glow')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={ids.id('wet-gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" style={{ stopColor: 'var(--sheen)', stopOpacity: 0 }} />
          <stop offset="0.8" style={{ stopColor: 'var(--sheen)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--sheen)', stopOpacity: 0.85 }} />
        </linearGradient>
        <clipPath id={ids.id('facade-clip')}>
          <path d={facade} />
        </clipPath>
      </defs>

      {/* Floodlight wash behind the mosque at night */}
      <ellipse
        cx={CX}
        cy={730}
        rx={520}
        ry={300}
        fill={ids.url('flood')}
        style={{ opacity: 'var(--mq-lights)' }}
      />

      {REAR.map((m, i) => (
        <g key={i}>
          <path d={m.left} style={{ fill: 'var(--mq-left)' }} />
          <path d={m.right} style={{ fill: 'var(--mq-right)' }} />
        </g>
      ))}

      <Lamps points={REAR_LIGHTS} />

      <Wing x={CX - 390} width={192} />
      <Wing x={CX + 198} width={192} />

      {/* Tent roof */}
      <path d={gable} style={{ fill: 'var(--mq-front)' }} />
      <path d={roofLeft} style={{ fill: 'var(--mq-left)' }} />
      <path d={roofRight} style={{ fill: 'var(--mq-right)' }} />
      {/* Wet marble catches the bright sky low on each face */}
      <g fill={ids.url('wet-gloss')} style={{ opacity: 'var(--wet)' }}>
        <path d={roofLeft} />
        <path d={roofRight} />
        <path d={gable} />
      </g>
      <path d={facade} style={{ fill: 'var(--facade)' }} />
      <g clipPath={ids.url('facade-clip')} style={{ stroke: 'var(--facade-fin)' }} strokeWidth={3}>
        {FINS.map((x) => (
          <line key={x} x1={x} y1={FACADE.top} x2={x} y2={FACADE.base} />
        ))}
      </g>
      <line x1={CX} y1={572} x2={CX} y2={545} strokeWidth={2.5} style={{ stroke: 'var(--mq-lit)' }} />
      <path d={crescent} style={{ fill: 'var(--mq-lit)' }} />

      {/* Plinth */}
      <rect x={CX - 280} y={772} width={560} height={GROUND - 770 + 4} style={{ fill: 'var(--mq-base)' }} />

      {FRONT.map((m, i) => (
        <g key={i}>
          <path d={m.left} style={{ fill: 'var(--mq-left)' }} />
          <path d={m.right} style={{ fill: 'var(--mq-right)' }} />
        </g>
      ))}

      <Lamps points={FRONT_LIGHTS} />
    </g>
  )
}
