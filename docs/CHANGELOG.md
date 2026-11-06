# Changelog

## [0.2.0] - 2026-11-06
### Added
- **HD²LAB ARCADE Brand Integration**: Implemented official brand mark (`hd2lab.svg`), slogan "HYPER DIMENSIONAL DESIGN", cyber-military palette (`#080D23`, `#142650`, `#335DCB`, `#7955EA`, `#44D7F5`, `#D9E5FF`, `#FF5468`), and glowing stencil typography.
- **Visual Overhaul**: Multi-layered parallax rendering with deep sea waves, caustics, archipelago islands with coral reefs, animated carrier launch sequence, volumetric cloud shadows, velocity-based aircraft banking, spinning propeller blurs, wingtip hazard stripes, and multi-tier explosions (shockwave, fire, debris, smoke).
- **Arcade Warning & Boss Polish**: Flashing `! WARNING ! HOSTILE LEVIATHAN DETECTED` mid-screen alert, stage boss dynamic HP bars, distinct enemy silhouettes for Kestrel, Red Kestrel, Harrier, Condor, Gunboat, Albatross, and Leviathan.
- **Original Audio Pipeline**: Offline synthesis pipeline (`scripts/render-audio.mjs`) rendering 15 original tracks (3 BGMs, 2 jingles, 10 SFX) across Vorbis `.ogg` and AAC `.m4a` with dual-codec preloading and dynamic runtime fallback.
- **Pacing & Combat Flow**: Accelerated early game combat to engage first enemy wave at 3.0s (within 1s of take-off), eliminating 10s of dead time.
- **Deterministic Playthrough Verification**: Non-invulnerable human-equivalent survival test verifying normal stage playability.

### Fixed
- **Loop Lifecycle**: Fixed frozen restart bug by managing RAF request IDs across `startLoop()` / `stopLoop()` and preventing concurrent animation frame callbacks.
- **RNG Determinism**: Replaced unseeded `Math.random()` calls in enemy firing intervals (`src/sim/enemies.ts`) and victory fireworks (`src/sim/world.ts`) with seeded world PRNG (`rand(world)`).
- **Touch Input**: Fixed duplicate roll event dispatches by removing conflicting click handlers on `#btn-touch-roll` and adding pointer reset handlers on `pointercancel` and `lostpointercapture`.
- **Harness & Checkers**: Replaced placeholder asset and audio checkers with real file presence, manifest integrity, byte budget, and `ffprobe` decodability validation suites.

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
