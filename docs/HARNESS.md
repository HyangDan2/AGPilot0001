# Development and verification harness

Status: P0 scaffold. Use Node 24.19.0 from .nvmrc (minimum 22.13). Adapted from the CDXPilot0006 harness; project-specific puzzle gates were replaced with shooter gates.

## Workflow and gates
Read AGENTS.md and ARCHITECTURE.md → inspect working files → identify ownership and plan → bounded implementation → relevant regression checks → full verify and browser checks for gameplay/visual/audio changes → visually inspect screenshots → update docs/QA.md and CHANGELOG.md → report actual outcomes. Resolve failures before advancing.

The committed lockfile fixes dependency versions. Commands:

| Command | Contract |
| --- | --- |
| npm ci | Reproducible installation |
| npm run dev | Local development server |
| npm run assets:check | PNG/WebP manifest, dimension, alpha-margin and size-budget checks (ART_PIPELINE.md) |
| npm run audio:render | Re-render all audio from `audio/score` with the offline synthesizer (requires ffmpeg) |
| npm run audio:check | Audio manifest, decode, duration, peak and loop-seam checks (AUDIO_PIPELINE.md) |
| npm run lint / npm run typecheck | Static checks |
| npm test | Pure simulation regression tests (Vitest) |
| npm run build | Production bundle |
| npm run verify | Environment, assets, audio, lint, typecheck, tests and build |
| npm run test:e2e | Production browser checks under the nested `/AGPilot0001/` base path |

## Simulation gate
Test player bounds and diagonal speed normalization, fire cooldown and shot patterns per power level, power loss on death, roll count/duration/invulnerability, respawn invulnerability, hitbox edges, enemy and bullet lifetimes, scoring once per kill, red-formation POW reward only on full wipe, pickups, boss part damage and phase transitions in any destruction order, single stage-clear and single game-over. Assert determinism: same seed + inputs → same snapshot hash. Run a headless full-stage playthrough driven only through `InputFrame` (no direct state mutation); record separately whether it clears without test invulnerability.

## Input and browser gate
Use real keyboard and pointer/touch actions for movement, firing, roll, pause/resume and restart. Assert model snapshots exposed only with `?test=1`; normal URLs must have no hooks. Touch: relative drag, auto-fire while held, roll button, `pointercancel`, multi-touch. Pinch and double-tap must keep `visualViewport.scale === 1`. Visibility loss pauses the game and audio. No console errors; missing-asset requests fall back without stopping play.

## Layout gate
Viewports: 320×568, 360×640, 390×844, 620×800, 844×390 and 1440×900. The 9:16 canvas stays fully visible and centered; HUD, overlays and the touch roll button remain inside the safe area. Capture title, play, boss and results screenshots and inspect them. DOM bounds alone do not establish visual quality.

## Asset gate
See ART_PIPELINE.md. Every runtime sprite is RGBA with a clear transparent border; generated sources and prompts are retained. Inspect the review sheet on checkerboard and dark backgrounds at runtime scale. Numerical checks do not establish visual quality.

## Audio gate
See AUDIO_PIPELINE.md. Browser tests observe actual AnalyserNode RMS: silent before the first gesture, audible after START, silent when muted or hidden, resumed afterwards, mute persisted after reload. Unavailable AudioContext must not break play. Headless signal checks do not certify musical quality, speaker output or physical iOS behavior.

## Failure recovery and evidence
Preserve the failing reproduction, seed, command, environment, logs, screenshot and trace. Fix the implementation; do not weaken tests or regenerate references to conceal a defect. Re-run affected checks and the phase gate.

Record exact command, result, viewport, seed/scenario, browser/OS, artifact path and remaining unverified work in QA.md. Documentation-only changes need path/command checks, not invented gameplay results. Local build success never proves remote publication.

## Hosted acceptance
After Pages deployment, repeat layout, input smoke and audio checks against the deployed URL (`E2E_URL=https://hyangdan2.github.io/AGPilot0001/ npm run test:e2e`) and record the commit identity separately from local E2E. Emulated devices are recorded separately from physical devices.
