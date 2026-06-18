# Performance and Code-Splitting

## Current State

`npm run build` passes without a Vite chunk warning. The main app chunk is below 500 kB after moving the 3D stage behind a React `Suspense` boundary.

Current production build shape:

- `assets/index-*.js` - about 386 kB minified after the product-screen expansion.
- `assets/CinematicStage-*.js` - about 2 kB minified app glue.
- `assets/vendor-react-three-fiber-*.js` - about 167 kB minified.
- `assets/vendor-three-*.js` - about 697 kB minified and intentionally async.

`vite.config.ts` sets a 750 kB chunk warning budget because Three.js is isolated from first-load app code but remains large as an async vendor dependency.

## Required Work

### Split Heavy UI Dependencies

- Move the 3D stage into a lazy-loaded component. (Done)
- Lazy-load `three` and `@react-three/fiber` through that stage boundary. (Done)
- Keep standings, topbar, and essential app shell available before WebGL loads.
- Add a non-WebGL fallback for browsers where canvas or WebGL fails. (Partial: current fallback covers lazy loading, not WebGL failure after load.)

### Consider Additional Chunks

Current Vite/Rollup manual chunks isolate:

- `three`,
- `@react-three/fiber`.

Future chunk work can consider:

- `react` / `react-dom`,
- `framer-motion`,
- app code.

### Measure Bundle Size

Recommended tooling:

- `rollup-plugin-visualizer`, or
- `vite-bundle-visualizer`.

Bundle budget is implemented through `scripts/check-bundle-budget.mjs` and `npm run analyze`.

## Runtime Performance

Recommended:

- Respect persisted and OS reduced-motion preferences before starting animations.
- Avoid refresh intervals below a safe minimum.
- Add provider cache TTL and stale-while-revalidate behavior.
- Compress API responses at the proxy/CDN layer.
- Track web vitals in production.

## Acceptance Criteria

- Initial UI renders useful standings before 3D assets complete.
- 3D canvas is nonblank on supported browsers.
- Reduced-motion mode avoids nonessential spatial movement.
- Main chunk warning is resolved or replaced by a documented bundle budget.
- Mobile viewport remains readable and responsive.
