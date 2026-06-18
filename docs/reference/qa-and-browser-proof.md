# QA and Browser Proof

## Minimum Code Gates

```powershell
npm run lint
npm run test
npm run build
npm run analyze
npm run test:browser
```

## Required UI Proof

For frontend changes, verify the rendered app:

- Desktop viewport.
- Mobile viewport.
- All 12 group cards accessible.
- Group selection updates inspector.
- Inspector previous/next controls work.
- Favorites toggle persists.
- Theme/layout/timezone controls render and update.
- Reduced-motion mode disables nonessential animation.
- Topbar menu opens/closes the shared navigation state.
- Matches, Knockout, Teams, Players, Stats Hub, and Settings sections open and show real surfaces.
- Canvas/Three.js stage renders nonblank.
- No incoherent overlap, clipped primary text, or horizontal overflow.

## Screenshot Guidance

Use the in-app browser when available. If screenshot capture times out, use headless Chrome as a fallback and document that fallback.

Keep screenshots out of git. `qa/` is ignored.

## Accessibility Checks

Required for UI iterations:

- Keyboard focus visible on buttons and selects.
- Active group exposes `aria-pressed` and/or `aria-current`.
- Mobile navigation can be opened without pointer-only behavior.
- Reduced-motion preference honors both app toggle and OS preference.
- Text remains readable at mobile widths.
- Automated browser checks should have no critical or serious axe violations.

## Future Automated QA

Current:

- Playwright covers desktop/mobile command-center controls, planned nav labels, screenshots, keyboard focus, and serious/critical axe checks.
- Vitest covers standings edge cases and API route/provider fallback contracts.

Recommended:

- Screenshot regression for key viewports.
- Canvas pixel smoke check for the 3D stage.
- Provider non-200 and timeout contract tests.
- Preference persistence tests.
