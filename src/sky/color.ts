// Perceptual colour blending. Scenes are authored in hex, blended in OKLab so
// that transitions (e.g. gold → indigo) stay luminous instead of going muddy.

export type Lab = [number, number, number]

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = toLinear(((n >> 16) & 255) / 255)
  const g = toLinear(((n >> 8) & 255) / 255)
  const b = toLinear((n & 255) / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function labToRgb([L, A, B]: Lab): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3

  return [
    Math.round(clamp01(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)) * 255),
    Math.round(clamp01(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)) * 255),
    Math.round(clamp01(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)) * 255),
  ]
}

export const mixLab = (a: Lab, b: Lab, t: number): Lab => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export function labToCss(lab: Lab, alpha = 1): string {
  const [r, g, b] = labToRgb(lab)
  return alpha >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha.toFixed(3)})`
}
