# Islamabad Skies

An animated skyline of Islamabad for React: Faisal Masjid and the Margalla Hills under eight different skies, from Fajr to the golden light after the rain.

```tsx
import { IslamabadSky } from './sky'

<IslamabadSky scene="after-rain" style={{ height: '100vh' }}>
  <h1>Your headline</h1>
</IslamabadSky>
```

## Scenes

| `scene` | Time | What you see |
|---|---|---|
| `fajr` | 4:52 AM | Indigo sky, stars fading, mosque and hill lights still on |
| `morning` | 6:40 AM | Peach light from the east, mist in the valleys, birds |
| `clear` | 11:30 AM | Blue sky, white cumulus, crisp green hills |
| `golden-hour` | 6:15 PM | Sun low over the western ridge, gold-lit clouds, rim light on the trees |
| `monsoon` | 3:15 PM | Overcast, rain, low cloud on the ridges, occasional sheet lightning |
| `after-rain` | 6:48 PM | Storm deck lit gold from below, rainbow in the east, wet marble |
| `maghrib` | 7:12 PM | Rose and purple dusk, the mosque and city lights coming on |
| `night` | 11:05 PM | Moon, stars, the floodlit mosque, Daman-e-Koh and the Monal road |

Switching `scene` blends every colour and effect over `transitionMs`.

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `scene` | `SceneId` | `'after-rain'` | Which sky to show |
| `transitionMs` | `number` | `2600` | Blend time between scenes (0 when the user prefers reduced motion) |
| `insetBottom` | `number` | `0` | Pixels to keep clear for overlay controls; the landscape lifts and the trees fill in below |
| `className`, `style` | | | Applied to the root. Give it a height |
| `children` | `ReactNode` | | Overlay content, rendered above the scene |

The root also exposes `--ink` (a text colour that reads on the current sky) and `--scrim` (a soft backdrop for text) as CSS variables, so overlay content can follow the scene.

## How it's built

Layers, back to front:

1. **Sky** (`SkyCanvas`, 2D canvas): gradient, sun and glow, moon, twinkling and shooting stars
2. **Clouds** (`CloudLayer`, WebGL): noise projected onto a sky plane and lit from the sun's position, which gives gold undersides at sunset
3. **Landscape** (SVG): rainbow, four Margalla ridges with valley mist and hill lights, Faisal Masjid, the tree canopy with low-sun rim light and street lights
4. **Weather** (`AtmosphereCanvas`, 2D canvas): rain, birds, lightning

Each scene in `src/sky/scenes.ts` is plain data: colours plus numbers such as `cloudCover`, `rain` and `hillLights`. The engine blends between them in OKLab and pushes the result to the canvases and to CSS variables the SVG reads, without React re-rendering. To add a sky, add an entry to `SCENES`.

## Performance and accessibility

- Clouds render below screen resolution and at 30 fps, and drop to a lower resolution if frames arrive late
- Animation pauses when the scene is scrolled out of view or the tab is hidden
- If the browser loses the WebGL context, the clouds rebuild when it returns; if WebGL is unavailable, the sky still renders without clouds
- With `prefers-reduced-motion`, clouds, birds, lightning and twinkling stop, and scene changes are instant
- The scene is one `role="img"` with a description; the demo's scene picker is a radio group with arrow-key support
- Each instance scopes its SVG ids, so several skies can share a page

## Scripts

```bash
npm run dev        # demo site
npm run build      # demo site → dist/
npm run build:lib  # component only → dist-lib/ (ES module + types, React external)
```

The component lives entirely in `src/sky/` and needs no stylesheet. To use it elsewhere, copy that folder or use the `dist-lib` build.
