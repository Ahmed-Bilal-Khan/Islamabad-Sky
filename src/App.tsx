import { useEffect, useState } from 'react'
import { SceneChips, ScenePanel } from './demo/Controls'
import { IslamabadSky } from './sky/IslamabadSky'
import { SCENES, SCENE_IDS, type SceneId } from './sky/scenes'

function sceneFromUrl(): SceneId {
  const param = new URLSearchParams(window.location.search).get('scene')
  return SCENE_IDS.find((id) => id === param) ?? 'after-rain'
}

/** The mobile scene chips sit over the bottom of the view; keep the mosque clear of them. */
const MOBILE_CONTROLS_INSET = 72

function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return matches
}

export default function App() {
  const isDesktop = useIsDesktop()
  const [scene, setSceneState] = useState<SceneId>(sceneFromUrl)

  useEffect(() => {
    document.title = `${SCENES[scene].name} · Islamabad Skies`
  }, [scene])

  const setScene = (id: SceneId) => {
    setSceneState(id)
    const url = new URL(window.location.href)
    url.searchParams.set('scene', id)
    window.history.replaceState(null, '', url)
  }

  return (
    <main>
      <IslamabadSky
        scene={scene}
        insetBottom={isDesktop ? 0 : MOBILE_CONTROLS_INSET}
        className="h-svh min-h-[560px] w-full"
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col [text-shadow:0_1px_12px_rgb(0_0_0/0.18)]">
          {/* Keeps the headline legible when bright cloud drifts behind it */}
          <div
            aria-hidden
            className="absolute -top-24 -left-24 h-[560px] w-[min(760px,120vw)]"
            style={{ background: 'radial-gradient(closest-side, var(--scrim), transparent)' }}
          />
          <header className="relative max-w-xl px-5 pt-8 sm:px-10 sm:pt-12" style={{ color: 'var(--ink)' }}>
            <p className="flex items-center gap-3 text-[11px] tracking-[0.16em] uppercase opacity-80">
              An animated skyline for React
              <span lang="ur" dir="rtl" className="font-urdu text-sm tracking-normal normal-case">
                اسلام آباد
              </span>
            </p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold text-balance sm:text-6xl">
              Islamabad, under every sky.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-pretty opacity-85">
              Faisal Masjid and the Margalla Hills, from Fajr to the golden light after the rain.
            </p>
          </header>

          <div className="absolute top-12 right-10 hidden max-h-[calc(100svh-6rem)] overflow-y-auto rounded-2xl lg:block">
            <ScenePanel value={scene} onChange={setScene} />
          </div>

          <p className="mt-auto hidden px-10 pb-8 text-[11px] tracking-[0.12em] text-white/80 uppercase tabular-nums lg:block">
            33.68° N, 73.05° E · {SCENES[scene].time} · {SCENES[scene].name}
          </p>

          <div className="mt-auto lg:hidden">
            <SceneChips value={scene} onChange={setScene} />
          </div>
        </div>
      </IslamabadSky>
    </main>
  )
}
