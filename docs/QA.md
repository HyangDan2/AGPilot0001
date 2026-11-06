# Quality Assurance & Verification Record

## Local Verification Summary (v0.3.0 - 2026-11-07)
- Date: 2026-11-07
- Target: HD²LAB ARCADE : VALKYRIE EIRA (SKYBREAK)
- Node Version: v22.23.4 (npm 10.9.9)
- Assets Check: 12 items validated, total 2.58 MB (`scripts/check-assets.mjs`)
- Audio Check: 30 audio files validated, total 2.71 MB (`scripts/check-audio.mjs`)
- Vitest Model Tests: 12 passed (deterministic simulation, restart, non-invulnerable survival)
- Playwright E2E Tests: 11 passed across 6 viewports (320x568 to 1440x900)
- Screenshot Inspection: 6 evidence captures reviewed in `docs/evidence/` (title, combat, movement, boss, victory).
- Build Output: dist/index.html (0.82 kB), dist/assets/index-*.css (5.72 kB), dist/assets/index-*.js (44.17 kB)

## Local Verification Summary (v0.2.0 - 2026-11-06)
- Date: 2026-11-06
- Node Version: v22.23.4 (npm 10.9.9)
- Assets Check: 11 items validated, total 1.23 MB (`scripts/check-assets.mjs`)
- Audio Check: 30 audio files validated across `.ogg` and `.m4a` codecs, total 2.71 MB (`scripts/check-audio.mjs`)
- Vitest Model Tests: 12 passed (sim.test.ts, playthrough.test.ts, restart.test.ts, scaffold.test.ts)
- Playwright E2E Tests: 11 passed across 6 responsive viewports (320x568, 360x640, 390x844, 620x800, 844x390, 1440x900)
- Screenshot Inspection: 6 evidence captures inspected across Mobile Portrait (390x844) and Desktop HD (1440x900) for title, combat, boss, and victory screens (`docs/evidence/`).
- Build Output: dist/index.html, dist/assets/index-*.css, dist/assets/index-*.js

## Verified Gates (v0.2.0)
1. **P0 Defects & Restart Gate**:
   - `src/core/loop.ts`: RAF loop lifecycle cleanly started and stopped without duplicate loops or freezes on game restart.
   - `src/sim/enemies.ts` & `src/sim/world.ts`: Replaced unseeded `Math.random()` with seeded PRNG (`rand(world)`), restoring 100% determinism.
   - `src/ui/overlays.ts`: Removed duplicate roll triggers on `#btn-touch-roll` with 250ms debounce.
   - `src/input/touch.ts`: Added pointer cancellation and blur resets.
2. **P1 Visual & Renderer Gate**:
   - Multi-layer procedural ocean waves, water caustics, and specular highlights.
   - Archipelago islands with reefs and parallax movement.
   - Aircraft carrier with deck markings, wake wash, and elevator details.
   - Velocity-based banking and 3-blade propeller blur on player aircraft.
   - Multi-stage explosion sequences (shockwaves, fireballs, metallic shrapnel, smoke).
   - Warning banner: flashing `! WARNING ! HOSTILE LEVIATHAN DETECTED`.
3. **P2 Gameplay & Pacing Gate**:
   - Combat begins at 3.0s (within 1s of take-off), removing early dead time.
   - Paced boss encounters with midboss Albatross (64s) and Leviathan (100s).
   - Added headless survival playthrough test without invulnerability (`tests/playthrough.test.ts`).
4. **P3 Audio Gate**:
   - Synthesized 15 original tracks (BGM Title, BGM Stage, BGM Boss, Jingle Victory, Jingle Game Over, and 10 SFX).
   - Dual-codec encoding (`.ogg` and `.m4a`) with HTML5 Audio / Web Audio runtime decoding.
   - Handled mute, reduced motion, and background audio suspension.
5. **P4 QA & Screenshot Inspection Gate**:
   - Captured and reviewed 6 full screenshots in `docs/evidence/`.
   - Verified clean scaling, high-contrast neon cyan HUD, legible text, and zero UI collisions.

## Local Verification Summary (v0.1.0 - 2026-11-03)
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
