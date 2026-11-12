# 3dSolarSystem

**Live site: <https://divitgangrade-lab.github.io/3dSolarSystem/>**

An interactive orrery. The Sun, eight planets, Earth's moon, and the rings of
Saturn and Uranus are drawn procedurally in WebGL: every surface, cloud band,
ring and star is generated at runtime, so the project ships no image files.

## Repository layout

| Path | What it is |
| --- | --- |
| `index.html`, `assets/` | The published build. Generated, served by GitHub Pages from the repository root. Do not edit by hand. |
| `web/` | The React app source. React Bits drives the whole interface: masthead, inspector, transport, body rail, dossier and boot screen. |
| `standalone/` | The zero-build version. Open it in a browser and it runs; Three.js is loaded from a pinned CDN. |

## The React app

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in web/dist
npm run lint     # oxlint
```

The scene lives in `web/src/scene/orrery.js` and mounts into the canvas and label
layer that React renders. It exposes a small interface (`start`, `subscribe`,
`focusBody`, `setPaused`, `setSpeed`, `overview`) so the UI never reaches into
the renderer's state.

### Dossier drawer

The drawer's six React Bits components (`TiltedCard`, `AnimatedList`, `BlurText`,
`PixelCard`, `LineSidebar`, `Lightning`) are `React.lazy` imports behind a single
Suspense boundary, so they never load until the drawer opens. Pointing at or
focusing the Dossier toggle warms them first.

While the drawer is open, Close receives focus, Tab stays inside the panel, and
closing restores focus to the toggle. Escape closes the drawer without also
resetting the camera.

On screens narrower than 560px the section nav becomes a horizontal row above a
full-width panel, because the two-column layout cannot hold both.

### Bundle shape

| Chunk | Size | Gzip | When it loads |
| --- | --- | --- | --- |
| `index-*.js` | 627 kB | 215 kB | first paint |
| `orrery-*.js` | 593 kB | 149 kB | first paint, after the boot screen |
| dossier chunks | 64 kB total | 25 kB | first drawer open, warmed on hover |

## Publishing

GitHub Pages serves the `main` branch root, so the built app is committed there:

```bash
cd web
npm run build
rm -rf ../assets
cp -r dist/. ..
cd ..
touch .nojekyll
```

The build uses a relative base, so the same files work at `/` and at
`/3dSolarSystem/`. After pushing, confirm the new hashed bundle is served:

```bash
curl -s https://divitgangrade-lab.github.io/3dSolarSystem/ | grep -o 'index-[^"]*\.js'
```

## Controls

- Drag to orbit, scroll or pinch to zoom. Right-drag or shift-drag pans, and
  releases the camera from a followed body.
- Click a world, its label, or a row in the body rail to frame it.
- `Space` pauses and resumes.
- `Escape` closes the dossier if it is open, otherwise returns to the full system.
- `0`-`9` jump to a body in rail order. `D` opens the dossier.

## Interface inventory: 25 React Bits components

Fetched from the React Bits registry with `web/scripts/fetch-reactbits.mjs`
(JS + plain CSS variants), never hand-written.

| Area | Components |
| --- | --- |
| Text (9) | SplitText, GradientText, ShinyText, BlurText, DecryptedText, CountUp, RotatingText, SplitFlapText, TextType |
| Motion (6) | AnimatedContent, Magnet, ClickSpark, Noise, GlareHover, BorderGlow |
| Components (8) | SpotlightCard, ElasticSlider, TiltedCard, AnimatedList, PixelCard, LineSidebar, StarBorder, ElectricBorder |
| Backgrounds (2) | DotGrid, Lightning |

## Notes

- `standalone/index.html` embeds its own copy of the scene script, while the
  React app imports the ported module. They are kept in sync by hand; if the
  React app becomes the only target, removing the standalone removes that
  duplication.
- `artifacts/` holds review screenshots and is git-ignored.
- `web/dist` and `web/node_modules` are generated and not committed.
