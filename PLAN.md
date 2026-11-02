# Plan — stage 1 MVP

Approved 2026-11-03. Phases advance only after their gate passes (HARNESS.md).

| Phase | Deliverable | Gate |
| --- | --- | --- |
| P0 | Harness docs, scaffold, CI, Pages | verify passes, Actions green, Pages responds |
| P1 | Pure simulation + placeholder rendering | Vitest simulation gate |
| P2 | Keyboard/touch input, DOM overlays | E2E input + layout |
| P3 | Generated art + pipeline | assets:check + review-sheet inspection |
| P4 | Synthesized audio + runtime | audio:check + analyser RMS E2E |
| P5 | Stage 1 content, midboss, boss, balance | headless clear + real-input smoke |
| P6 | Polish, branding, deployment | hosted acceptance |

## Game summary
- Player: 3 lives, power levels 1–3 (POW pickups, −1 on death), 3 evasive rolls per life (~1.2 s invulnerable).
- Red formations drop a POW when fully destroyed.
- Stage 1 (~3 min): carrier take-off over the ocean → fighter formations → red formation + bombers → archipelago with gunboats → midboss (Albatross) → mixed waves → boss (Leviathan: four engines + core, three phases) → results.
- Out of scope for MVP: continues, multiple stages, online leaderboards.
