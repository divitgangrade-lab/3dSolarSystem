# Orrery interface

The React front end for the solar system. See the repository README for controls
and the component inventory.

- `src/scene/orrery.js` — the WebGL scene, ported from the standalone page. Owns
  the canvas, labels, camera and picking; exposes `start`, `subscribe`,
  `getSnapshot`, `focusBody`, `setPaused`, `setSpeed`, `overview`.
- `src/reactbits/` — component source fetched verbatim from the React Bits
  registry. Do not hand-edit; re-run the fetcher instead:
  `node scripts/fetch-reactbits.mjs SplitText Dock`.
- `src/App.jsx` — the interface: masthead, inspector, transport, body rail,
  dossier drawer and boot screen.

```bash
npm install
npm run dev
npm run build
npm run lint
```
