import { useEffect, useRef, type KeyboardEvent } from 'react'
import { SCENES, SCENE_IDS, type SceneId } from '../sky/scenes'

type Props = { value: SceneId; onChange: (id: SceneId) => void }

const swatch = (id: SceneId) => {
  const c = SCENES[id].colors
  return `linear-gradient(180deg, ${c.skyZenith}, ${c.skyMid} 55%, ${c.skyHorizon})`
}

/**
 * Single-select radio group keyboard pattern: Tab enters at the selected scene,
 * arrows move between scenes (and select them), Home/End jump to the ends.
 */
function useRadioKeys({ value, onChange }: Props) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const i = SCENE_IDS.indexOf(value)
    const n = SCENE_IDS.length
    const next = {
      ArrowDown: (i + 1) % n,
      ArrowRight: (i + 1) % n,
      ArrowUp: (i - 1 + n) % n,
      ArrowLeft: (i - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const id = SCENE_IDS[next]
    onChange(id)
    e.currentTarget.querySelector<HTMLElement>(`[data-scene="${id}"]`)?.focus()
  }
}

export function ScenePanel(props: Props) {
  const { value, onChange } = props
  const onKeyDown = useRadioKeys(props)
  return (
    <aside className="pointer-events-auto w-64 rounded-2xl border border-white/10 bg-black/40 p-4 text-white shadow-2xl shadow-black/30 backdrop-blur-md">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-[13px] font-medium">islamabad-sky</span>
        <span className="text-[11px] text-white/60">v1.0.0</span>
      </div>
      <p id="scene-label" className="mb-2 text-[11px] tracking-[0.12em] text-white/70 uppercase">
        Scene
      </p>
      <div role="radiogroup" aria-labelledby="scene-label" onKeyDown={onKeyDown} className="flex flex-col gap-1">
        {SCENE_IDS.map((id) => {
          const active = id === value
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              data-scene={id}
              onClick={() => onChange(id)}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span
                aria-hidden
                className="size-5 shrink-0 rounded-md outline outline-1 -outline-offset-1 outline-white/15"
                style={{ background: swatch(id) }}
              />
              <span className="flex-1">{SCENES[id].name}</span>
              <span className="text-[11px] text-white/60 tabular-nums">{SCENES[id].time}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export function SceneChips(props: Props) {
  const { value, onChange } = props
  const onKeyDown = useRadioKeys(props)
  const groupRef = useRef<HTMLDivElement>(null)

  // Keep the selected chip in view, e.g. after arrowing past the edge.
  useEffect(() => {
    const chip = groupRef.current?.querySelector<HTMLElement>(`[data-scene="${value}"]`)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    chip?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [value])

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Scene"
      onKeyDown={onKeyDown}
      className="pointer-events-auto flex gap-2 overflow-x-auto bg-gradient-to-t from-black/45 to-transparent px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-width:none]"
    >
      {SCENE_IDS.map((id) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-scene={id}
            onClick={() => onChange(id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-[13px] backdrop-blur-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
              active ? 'border-white/30 bg-white/20 text-white' : 'border-white/10 bg-black/40 text-white/85'
            }`}
          >
            <span aria-hidden className="size-7 rounded-full" style={{ background: swatch(id) }} />
            {SCENES[id].name}
          </button>
        )
      })}
    </div>
  )
}
