# Eira Celestial Arc Slash FX v1 — transparent PNG animation

## Scope and ownership
The approved Eira v6 40-pose character art is unchanged. This change is an **independent sword-arc effect**, not a redesign of Eira, wings, sword or movement poses. GPT/Codex own production artwork; Antigravity should not modify this artwork without an explicit work order.

## Art contract
- Generator: `scripts/generate-slash-fx.mjs` (deterministic 32 raster frames; SVG is only a build-time vector construction intermediate).
- Runtime output: `public/assets/fx/eira-slash-v1.png`, **2048×1024 RGBA**, transparent 256×256 cells, 8 columns × 4 rows.
- Manifest: `public/assets/fx/eira-slash-v1.json`.
- Row 0: L→R **back** cyan energy/trailing embers, frames 0–7.
- Row 1: R→L **back** gold energy/trailing embers, frames 0–7.
- Row 2: L→R **front** white cutting rim/bright tip, frames 0–7.
- Row 3: R→L **front** white cutting rim/bright tip, frames 0–7.
- Compose back behind Eira and front over Eira, aligned to `(player.x, player.y - 12)`.
- Exactly one 8-tick, 60 Hz simulation swing; do not interpolate unrelated character frames or modify collision data.
- Distinct hand-tuned crescent, bloom, broad energy ribbon, thin cutting edge, deterministic tip flecks. No indiscriminate full-screen flash.
- Reduced-motion retains the visible blade but reduces alpha; if image load fails, Canvas fallback renders the legacy crescent.

## Production, QA and deployment
```sh
npm ci
npm run art:slash
npm run art:slash -- --review  # optional preview saved under art/reviews
npm run verify
npm run test:e2e
```
`npm run dev`, `npm run build` and `npm run verify` regenerate the atlas automatically. GitHub Actions' existing `Verify and deploy` workflow generates it before validating and uploading `dist/`. The derived PNG is excluded from version control; source code and manifest are authoritative. The deployed Pages site serves the generated PNG, not an SVG approximation.

Visual acceptance: verify both directions in actual combat at 390×844 and desktop; check transparent borders, readable enemy silhouettes, 8-step trail motion, no character-art distortion, mobile performance and no missing-image errors. Build success alone does not establish visual acceptance. Record screenshots and hosted verification separately.
