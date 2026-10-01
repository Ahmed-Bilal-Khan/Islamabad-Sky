// Deterministic randomness so the landscape is identical on every render.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 1D value noise in [-1, 1] with smoothstep interpolation. */
export function valueNoise1D(seed: number) {
  const rand = mulberry32(seed)
  const lattice = Array.from({ length: 512 }, () => rand() * 2 - 1)
  return (x: number) => {
    const i = Math.floor(x)
    const f = x - i
    const u = f * f * (3 - 2 * f)
    const a = lattice[((i % 512) + 512) % 512]
    const b = lattice[(((i + 1) % 512) + 512) % 512]
    return a + (b - a) * u
  }
}

/** Fractal noise: sums octaves of value noise, normalised to roughly [-1, 1]. */
export function fbm1D(seed: number, octaves = 4) {
  const layers = Array.from({ length: octaves }, (_, i) => valueNoise1D(seed + i * 101))
  return (x: number) => {
    let sum = 0
    let amp = 1
    let freq = 1
    let norm = 0
    for (const n of layers) {
      sum += n(x * freq) * amp
      norm += amp
      amp *= 0.5
      freq *= 2.03
    }
    return sum / norm
  }
}
