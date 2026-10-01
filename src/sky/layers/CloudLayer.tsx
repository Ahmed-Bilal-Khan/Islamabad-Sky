// Sun-lit clouds on a WebGL canvas, drawn between the sky gradient and the hills.
//
// The cloud field is fractal noise projected onto a flat "sky plane", so clouds
// shrink and flatten toward the horizon. Lighting is a cheap 2D trick: compare
// the density here with the density a step toward the sun. Edges facing the sun
// light up, which gives golden undersides when the sun is low, and thin cloud
// near the sun gets a bright forward-scattering rim.

import { useEffect, useRef, useState } from 'react'
import { labToRgb, type Lab } from '../color'
import type { SkyEngine } from '../engine'
import { HORIZON_Y, toScreen, type StageLayout } from '../layout'

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uSun;
uniform float uHorizon;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uSunCol;
uniform vec3 uHaze;
uniform float uCover;
uniform float uOpacity;
uniform float uScale;
uniform float uGlow;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return s;
}

// x: coverage (0..1), y: thickness (0..1) at a pixel, y measured downward.
vec2 cloud(vec2 px) {
  float h = (uHorizon - px.y) / uRes.y;
  if (h <= 0.0) return vec2(0.0);
  float depth = 1.0 / (h + 0.14);
  vec2 p = vec2((px.x - uRes.x * 0.5) / uRes.y * depth * 0.6, depth * 1.1) * uScale * 1.5;
  p.x += uTime * 0.035;
  vec2 warp = vec2(fbm(p * 0.6 + 3.1), fbm(p * 0.6 + 7.7));
  // Broad shapes from warped low-frequency noise, eroded by finer billows.
  float base = fbm(p * 0.8 + warp * 0.45);
  float billow = fbm(p * 2.9 + vec2(uTime * 0.02, 0.0));
  float d = base + (billow - 0.5) * 0.32;
  float threshold = mix(0.6, 0.2, uCover);
  // Nearby (overhead) clouds are magnified, so their edges need a tighter
  // falloff in noise space to stay equally crisp on screen.
  float soft = clamp(0.018 * depth, 0.014, 0.09);
  float fadeIn = smoothstep(0.0, 0.05, h);
  return vec2(smoothstep(threshold, threshold + soft, d), clamp((d - threshold) / 0.2, 0.0, 1.0)) * fadeIn;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float h = (uHorizon - px.y) / uRes.y;
  if (h <= -0.02) { gl_FragColor = vec4(0.0); return; }

  vec2 here = cloud(px);
  float c = here.x;
  if (c < 0.002) { gl_FragColor = vec4(0.0); return; }

  vec2 toSun = uSun - px;
  float sunDist = length(toSun) / uRes.y;
  vec2 dir = toSun / max(length(toSun), 1.0);
  vec2 toward = cloud(px + dir * uRes.y * 0.03);

  // Light falls off with how much cloud lies between this point and the sun;
  // sun-facing rims stay bright, thick cores fall into shadow.
  float occlusion = toward.y * 0.75 + here.y * 0.45;
  float light = clamp(1.05 - occlusion, 0.0, 1.0);
  light = light * light * (3.0 - 2.0 * light);

  vec3 col = mix(uShadow, uLit, light);

  // Forward scattering: thin cloud close to the sun glows with the sun's colour.
  float scatter = exp(-sunDist * 2.4) * uGlow;
  float thin = 1.0 - here.y;
  col += uSunCol * scatter * (0.25 + thin * 1.2);

  // Distant cloud melts into the horizon haze.
  col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.22, h)) * 0.55);

  float alpha = clamp(c * uOpacity, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed')
  }
  return shader
}

const rgb = (lab: Lab) => labToRgb(lab).map((v) => v / 255) as [number, number, number]

/**
 * Clouds are soft, so they render below screen resolution. If the device
 * struggles, quality steps down a level (fewer pixels to shade).
 */
const QUALITY = [0.6, 0.45, 0.33]
/** Clouds drift slowly; 30 fps is indistinguishable from 60 and halves GPU work. */
const FRAME_MS = 1000 / 30
/** Average frame interval that counts as struggling (well below 30 fps). */
const SLOW_MS = 48

const CANVAS_STYLE = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' } as const

export function CloudLayer({ engine, layout }: { engine: SkyEngine; layout: StageLayout }) {
  const ref = useRef<HTMLCanvasElement>(null)
  // Layout lives in a ref so resizing only resizes the canvas: the GL context,
  // shader and drift position all survive.
  const layoutRef = useRef(layout)
  const resizeRef = useRef<() => void>(() => {})
  const [contextGeneration, setContextGeneration] = useState(0)

  useEffect(() => {
    layoutRef.current = layout
    resizeRef.current()
  }, [layout])

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas?.getContext('webgl', { premultipliedAlpha: true, antialias: false })
    if (!canvas || !gl) return

    let program: WebGLProgram
    try {
      program = gl.createProgram()!
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(program)
    } catch (err) {
      console.warn('[islamabad-sky] clouds disabled:', err)
      return
    }
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const U = {
      res: u('uRes'),
      time: u('uTime'),
      sun: u('uSun'),
      horizon: u('uHorizon'),
      lit: u('uLit'),
      shadow: u('uShadow'),
      sunCol: u('uSunCol'),
      haze: u('uHaze'),
      cover: u('uCover'),
      opacity: u('uOpacity'),
      scale: u('uScale'),
      glow: u('uGlow'),
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let quality = 0
    let k = 1
    let time = 40 // start mid-drift so the first frame isn't a noise seam
    let last = performance.now()
    let lastRender = 0
    let intervals: number[] = []
    let visible = true
    let raf = 0

    const render = () => {
      const l = layoutRef.current
      const { colors: c, nums: n } = engine.frame
      const [sx, sy] = toScreen(l, n.sunX, n.sunY)
      const [, hy] = toScreen(l, 0, HORIZON_Y)
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.time, time)
      gl.uniform2f(U.sun, sx * k, sy * k)
      gl.uniform1f(U.horizon, hy * k)
      gl.uniform3fv(U.lit, rgb(c.cloudLit))
      gl.uniform3fv(U.shadow, rgb(c.cloudShadow))
      gl.uniform3fv(U.sunCol, rgb(c.glow))
      gl.uniform3fv(U.haze, rgb(c.skyHorizon))
      gl.uniform1f(U.cover, n.cloudCover)
      gl.uniform1f(U.opacity, n.cloudOpacity)
      gl.uniform1f(U.scale, n.cloudScale)
      gl.uniform1f(U.glow, n.glowStrength * (0.35 + 0.65 * n.sunAlpha))
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const resize = () => {
      const l = layoutRef.current
      k = Math.min(window.devicePixelRatio || 1, 2) * QUALITY[quality]
      canvas.width = Math.max(1, Math.round(l.width * k))
      canvas.height = Math.max(1, Math.round(l.height * k))
      gl.viewport(0, 0, canvas.width, canvas.height)
      render() // resizing clears the canvas; repaint straight away
    }
    resizeRef.current = resize
    resize()

    const loop = (now: number) => {
      raf = visible ? requestAnimationFrame(loop) : 0
      if (now - lastRender < FRAME_MS - 2) return

      // Step quality down if frames keep arriving late.
      if (lastRender) intervals.push(now - lastRender)
      if (intervals.length >= 24) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
        intervals = []
        if (avg > SLOW_MS && quality < QUALITY.length - 1) {
          quality++
          resize()
        }
      }
      lastRender = now

      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      time += dt * engine.frame.nums.cloudSpeed
      render()
    }

    // Reduced motion: no drift, redraw only when the scene tokens change.
    const unsubscribe = reduceMotion ? engine.subscribe(render) : () => {}
    const start = () => {
      if (reduceMotion || raf) return
      last = performance.now()
      lastRender = 0
      intervals = []
      raf = requestAnimationFrame(loop)
    }
    start()

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    io.observe(canvas)

    // The browser can drop GL contexts (GPU reset, too many tabs). Rebuild when it comes back.
    let lost = false
    const onLost = (e: Event) => {
      e.preventDefault()
      lost = true
      cancelAnimationFrame(raf)
      raf = 0
      visible = false
    }
    const onRestored = () => setContextGeneration((g) => g + 1)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    return () => {
      cancelAnimationFrame(raf)
      unsubscribe()
      io.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      resizeRef.current = () => {}
      // Objects from a lost context are already gone; deleting them only warns.
      if (!lost) {
        gl.deleteBuffer(buf)
        gl.deleteProgram(program)
      }
    }
  }, [engine, contextGeneration])

  return <canvas ref={ref} aria-hidden style={CANVAS_STYLE} />
}
