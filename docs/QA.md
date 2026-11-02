# Quality Assurance & Verification Record

## Local Verification Summary
- Date: 2026-11-03
- Node Version: v22.23.4 (npm 10.9.9)
- Vitest Model Tests: 9 passed (sim.test.ts, playthrough.test.ts, scaffold.test.ts)
- Playwright E2E Tests: 10 passed across 6 responsive viewports (320x568, 360x640, 390x844, 620x800, 844x390, 1440x900)
- Build Output: dist/index.html, dist/assets/index-*.css, dist/assets/index-*.js

## Verified Gates
1. **P0 Scaffold Gate**: Vite 7, TS 5.9, ESLint 9, Vitest, Playwright, nested sub-path server, Actions CI workflow.
2. **P1 Simulation Gate**:
   - Player clamped within boundaries, diagonal speed normalization.
   - Fire cooldown, 3-level weapon progression (single, dual parallel, 3-way spread).
   - Evasive roll with bounded duration (72 ticks) and invulnerability.
   - Post-respawn invulnerability (180 ticks).
   - Red formation full-elimination reward (POW drop).
   - Circle-circle collision detection with boss multi-part hit detection.
   - 100% Determinism: verified identical seed + identical input yields identical states.
3. **P2 Input & Layout Gate**:
   - Keyboard (WASD / Arrows, Z/Space fire, X/Shift roll, P/Esc pause).
   - Pointer / Touch: relative drag (finger doesn't occlude plane), continuous touch auto-fire, dedicated Roll button on bottom right.
   - Responsive scaling: 9:16 aspect ratio box centered with letterboxing on wider displays.
4. **P5 Stage 1 & Headless Playthrough Gate**:
   - Full 3-minute Stage 1 wave timeline.
   - Carrier take-off intro sequence.
   - Kestrel fighter formations, swoops, dive-bombing Harriers, heavy Condor bombers, coastal Gunboats.
   - Midboss Albatross with twin engine destruction.
   - Stage Boss Leviathan: 4 engines + glowing core, 3 combat phases.
   - Victory explosions, no-miss bonus calculation, and stageClear event emission.
   - Headless playthrough test passes from start to clear.

## Hosted Deployment
- Target URL: https://hyangdan2.github.io/AGPilot0001/
- Pages Source: GitHub Actions (`workflow`)
