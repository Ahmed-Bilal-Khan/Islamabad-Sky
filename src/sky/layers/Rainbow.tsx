// A partial rainbow for the clearing storm. A rainbow sits 42° around the point
// opposite the sun; with the sun setting in the west (left), that puts the arc
// in the east, rising from behind the hills on the right and fading upward.

import { useSvgIds } from '../ids'

const CX = 1820
const CY = 780
const R = 830
const BANDS = ['#ff5a4a', '#ff9d3c', '#ffe066', '#7ee08a', '#5aa8ff', '#9a7bff']
const BAND_W = 7

export function Rainbow() {
  const ids = useSvgIds()
  return (
    <g style={{ opacity: 'calc(var(--rainbow) * 0.62)' }}>
      <defs>
        <filter id={ids.id('rainbow-blur')} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <linearGradient id={ids.id('rainbow-fade')} gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="470">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={ids.id('rainbow-mask')} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
          <rect x="0" y="0" width="1600" height="900" fill={ids.url('rainbow-fade')} />
        </mask>
      </defs>
      <g mask={ids.url('rainbow-mask')}>
        {/* Sky inside the bow is a touch brighter than outside */}
        <circle cx={CX} cy={CY} r={R - BANDS.length * BAND_W} fill="#fff" opacity={0.07} />
        <g filter={ids.url('rainbow-blur')} fill="none" strokeWidth={BAND_W + 1}>
          {BANDS.map((color, i) => (
            <circle key={color} cx={CX} cy={CY} r={R - i * BAND_W} stroke={color} />
          ))}
        </g>
      </g>
    </g>
  )
}
