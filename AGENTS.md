# IRON WINGS contributor contract

## Required workflow
1. Read AGENTS.md, docs/ARCHITECTURE.md, docs/HARNESS.md and PLAN.md before changes.
2. Inspect existing files and working changes; preserve user work and original assets.
3. Identify the owning module, affected contracts and current phase gate.
4. Make the smallest coherent change; keep the simulation independent of rendering, DOM and audio.
5. Run relevant regression checks. Gameplay changes require the full verification and browser gates; visual changes also require actual screenshot inspection; audio changes require audio checks and an analyser-based browser test.
6. Fix unresolved failures before advancing. Never disable assertions, loosen thresholds or replace reference screenshots to conceal failures.
7. Update architecture/decisions for contracts, art/audio pipeline docs for asset changes, and QA/changelog for results and user-visible changes.
8. Report changed behavior/files, actual commands/outcomes, limitations and unverified checks separately.

## Project invariants
- `sim.step(world, input)` is the only place that mutates game state. Renderer, FX, HUD and audio consume read-only snapshots and emitted events.
- The simulation runs at a fixed 60 Hz step and uses seeded randomness; identical seed + input sequence produce identical results.
- Tuning (waves, hit points, bullet speeds, scores) lives in data tables, not in render code.
- A destroyed enemy is scored and removed exactly once. Paused or terminal games reject gameplay input.
- Player invulnerability (roll, respawn) is explicit state with a bounded duration.
- Logical playfield is 720×1280 (9:16). Rendering scales to the viewport; simulation never reads screen size.
- Missing images or audio must not stop play: draw fallback shapes, stay silent.
- Storage failure is recoverable. Clean up listeners, audio nodes and pending work on transitions.
- Respect reduced motion (no screen shake/flash), mute settings and mobile safe areas; block pinch/double-tap zoom on the play surface.
- All art and audio are original. Do not use the "1942" name, Capcom assets or real national insignia.
- Distinguish model tests, asset analysis, browser execution and physical-device acceptance.

## Scope and documents
Implementation was authorized on 2026-11-03 (stage 1 MVP). Report only checks actually executed. Local verification does not prove deployment; confirm hosted behavior separately.

Decisions are recorded in docs/DECISIONS.md. Art provenance is in art/PROMPTS.md and docs/ART_PIPELINE.md; audio provenance in docs/AUDIO_PIPELINE.md. All repository documentation is written in English.
