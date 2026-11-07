# Changelog

## [0.5.0] - 2026-11-07
### Added
- **Alternating Left/Right Sword Combat (좌우 교대 검격)**:
  - Strictly alternating slash sequence: LEFT → RIGHT → LEFT → RIGHT (1: L→R, 2: R→L, 3: L→R, 4: R→L) tied to dedicated high-definition animation frames (`slash_0` and `slash_1`).
  - Swept capsule/arc melee Hitbox (130px reach, 140° frontal arc) with 1 hit per enemy per swing ID.
  - Hybrid combat: distant enemies take Arc Blade projectiles (1 dmg); close enemies take direct Oathblade melee damage (2 normal, 3 enhanced when power level >= 2).
  - Tactile arcade hitstop crunch (deterministic 2-tick freeze on melee strike).
  - Directional swept slash arcs (radiant cyan for L→R, radiant cyan-gold for R→L) with high-velocity cutting sparks.
  - Unit tests verifying alternating sequence, swept hit range, hybrid damage, and hitstop in `tests/melee.test.ts`.
- **Eira Character Visual Upgrade**:
  - Enlarged in-game display size to default 160px logical pixels (from 96px) ensuring clear visibility of silver braid, winged helmet, blue/gold armor, and layered skirt while keeping Hurtbox radius strictly at 10.
  - Portable asset packer scripts (`scripts/pack-eira-flight.mjs`, `scripts/pack-fantasy-enemies.mjs`) referencing repository-relative paths in `art/source/`.
- **Fantasy Celestial Kingdom Environment (4 Continuous Stages)**:
  - Replaced WWII ocean and islands with a 4-zone Celestial Kingdom:
    1. *Celestial Sanctuary* (0..25s): Brilliant azure dawn, golden divine sunrays, floating sanctuary landing dais.
    2. *Ruined Sky Kingdom* (25..50s): Royal sunset, distant floating castle citadels with cascading waterfalls and spires.
    3. *Twilight Rift* (50..75s): Arcane violet storm, crackling lightning ribbons, and floating monolithic ruins with glowing cyan/gold runes.
    4. *Abyssal Throne* (75s+ / Boss): Obsidian storm vortex, rotating dark rings, and dragon domain lightning.
  - 4-layer parallax: Far sky & auroras (0.0x), Distant citadels (0.2x), Mid floating temple ruins (0.5x), Near passing clouds & drifting mana crystal shards (1.1x).
- **Enemy Flight Continuity**:
  - Refactored `src/sim/patterns.ts` (`hover`, `loopL`, `loopR`) to strictly obey `ENTER → HOLD → SWEEP → EXIT` state transitions without coordinate jumps.
  - Added automated continuity tests in `tests/patterns.test.ts` (10 tests) asserting no single-tick teleportation steps.
- **Mobile Safe Area & Viewport**:
  - Implemented `100dvh`, `-webkit-fill-available`, and `env(safe-area-inset-top/bottom/left/right)` protecting HUD and touch controls (minimum 44×44px hit targets) from browser URL and home bars.
- **Combat Pacing & Dynamic Spawn Director**:
  - First enemy wave engages within 1.8s; reinforcement waves spawn every 2~3s; active on-screen enemies capped at 16 to preserve performance on mobile.
- **HD2Lab Platform & GameHub Integration**:
  - Added HTTPS navigation buttons to GameHub (`https://hyangdan2.github.io/GameHub/`) and HD2Lab Home (`https://hyangdan2.github.io/`) on Title, Pause, GameOver, and Victory screens.
  - Registered AGPilot0001 in `HyangDan2/GameHub` catalog (`data/games.json`, `assets/games/valkyrie-eira.webp`, `docs/onboarding/valkyrie-eira.md`).

## [0.3.0] - 2026-11-07
### Added
- **VALKYRIE EIRA (SKYBREAK) Master Fantasy Redesign**:
  - Reimagined WWII aviation shmup into an original 2D vertical-scrolling fantasy shooter starring Valkyrie Eira (`HyangDan2/CDXPilot0005` canonical design).
  - High-angle top-down/3/4 perspective flight sprite sheet ([`eira-flight.png`](file:///Users/jaehyukshim/AGWS/AGPilot0001/public/assets/characters/eira/eira-flight.png)) featuring hover/idle, bank left/right, sword thrust, Arc Blade slash, rune charge, and 360-degree aerial roll maneuver.
  - Fantasy monster enemy armada ([`enemies-atlas.png`](file:///Users/jaehyukshim/AGWS/AGPilot0001/public/assets/enemies/enemies-atlas.png)): Shadow Gargoyles, Crimson Drakes, Skyfang Phantoms, Armored Behemoths, Floating Arcane Bastions, Ancient Sky Guardian Gryphon, and 4-winged Abyssal Sky Dragon.
  - High-resolution key visual title background ([`eira-title-bg.webp`](file:///Users/jaehyukshim/AGWS/AGPilot0001/public/assets/title/eira-title-bg.webp)) with glowing title typography.
  - Magic combat visual effects: glowing cyan crescent Arc Blades (Lv1/2/3) and magenta-violet arcane plasma orbs.
  - Ancient Sky Sanctuary Landing Dais intro sequence replacing military carrier.
  - Full automated asset extraction and packing pipelines (`scripts/pack-eira-flight.mjs`, `scripts/pack-fantasy-enemies.mjs`).
  - Visual review sheets generated on transparent checkerboard for Eira and monsters.
  - Updated E2E browser tests and asset validation budget.

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
