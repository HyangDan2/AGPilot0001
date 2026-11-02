# Changelog

## [0.1.0] - 2026-11-03
### Added
- Complete original WWII-style vertical shooter engine (IRON WINGS) with TypeScript and Canvas 2D.
- Pure 60Hz deterministic simulation core with seedable RNG (`src/sim/`).
- 3-level weapon system, evasive roll maneuver with invulnerability, and red formation bonus rewards.
- Full Stage 1 wave progression: carrier take-off, enemy formations, midboss Albatross, and final boss Leviathan with 3 phases.
- Keyboard and mobile touch controls (relative drag, auto-fire, dedicated roll button).
- Responsive letterboxed 9:16 viewport supporting desktop and mobile screens.
- Web Audio sound synthesizer runtime for retro effects (shots, hits, explosions, rolls, fanfare).
- Local storage persistence for high scores and audio/motion settings.
- Automated verification harness (ESLint, TypeScript strict mode, Vitest unit tests, Playwright E2E browser tests).
- GitHub Actions CI/CD workflow deploying directly to GitHub Pages.
