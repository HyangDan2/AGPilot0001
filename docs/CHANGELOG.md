# Changelog

## [0.7.1] - 2026-11-07
### Added
- **Two-Stage Premium Campaign (2스테이지 프리미엄 캠페인)**:
  - Abandoned 10-stage dilution in favor of two highly distinct, polished stages:
    - **Stage 1 (HALVARD : Celestial Sanctuary)**:
      - Norse mythology celestial sanctum with golden sunrays, Bifrost entrance gates, floating ivory temples, waterfalls, and 53 normal enemies.
      - Midboss: Runic Gryphon (`albatross`); Final Boss: Corrupted Celestial Guardian.
    - **Stage 2 (RAGNAROK RIFT : Shattered Bifrost Void)**:
      - Shattered Bifrost rainbow shards, dark obsidian & violet storm void (`#060714` -> `#160a2c` -> `#2c0e3e` -> `#451249`), jagged obsidian citadels with molten red glow windows, crimson rift lightning.
      - Exactly 70 normal enemies (+33% enemy density over Stage 1).
      - Bullet speed multiplier of 1.2x across all enemy attacks for intensified challenge.
      - Stage 2 specialized monsters: Abyssal Phantom (`siren`), Shadow Drake (`seraph`), Obsidian Golem (`golem`).
      - Midboss: Abyssal Sentinel (`kraken`) with 4 destructible tentacle nodes; Final Boss: Abyssal Sky Dragon (`leviathan`).
  - **Seamless Stage Progression**:
    - Clearing Stage 1 displays the tactical `STAGE 01 CLEARED` screen with score tally and `[ENTER RAGNAROK RIFT]` button.
    - Carries over accumulated score, lives, power, and mana while resetting stage tick.
- **Pause Menu Return to Title (Phase 0 Fix)**:
  - Added dedicated `MAIN MENU` button to Pause overlay.
  - Clicking `MAIN MENU` opens a modal dialog: *"Current stage flight progress will be lost. Do you wish to continue?"* with `[CANCEL]` and `[CONFIRM]` buttons.
  - Clean lifecycle cleanup in `GameApp.returnToTitle()`: cancels RAF loop, stops BGM, persists high scores to local storage, resets world state, and renders the title screen without browser reload.
  - Added `MAIN MENU` button to Game Over and Final Campaign Victory screens.
  - Updated GameHub navigation link to same-tab (`target="_self"`).
- **Azure Aegis Orbs (이지스 오브 방어 위성)**:
  - Replaced rotating swords with dual Azure Aegis Orbs:
    - Outer translucent pulsing shield field, rotating runic ripple ring with dashed gold runes, and bright azure core with white center dot.
    - Preserves bullet parrying, score rewards, mana generation (+15 Mana per parry), and orbit collision damage.
- **Gungnir Ultimate v2 Multi-Phase Mechanics**:
  - Implemented 4 visual and damage phases:
    1. *Awakening*: Orbs converge, concentric Norse rune circles expand.
    2. *Summoning*: Colossal divine light lance descends from the heavens.
    3. *Divine Impact*: Deals 40 instant impact damage on activation frame and clears screen bullets; followed by 3 shockwave pulses at ticks 60, 45, 30 dealing 10 damage each (total 70 divine damage).
    4. *Recovery*: Holy embers fade and Eira returns to diagonal combat ready stance.
- **Quality Gates & Regression Suite**:
  - Added `tests/campaign.test.ts` verifying Stage 1 (53 enemies) & Stage 2 (70 enemies), 1.2x bullet speed multiplier, progression continuity, pause menu return to title, Aegis Orb parry, and Gungnir 70 total damage.
  - 8 test files, 38 unit tests, and 11 Playwright e2e tests all passing.
  - Evidence screenshots captured in `docs/evidence/` including Stage 2 combat, Confirm modal, Stage Clear, and Victory screens.

## [0.6.0] - 2026-11-07
### Added
- **Gungnir's Judgement Ultimate Skill (궁극기: 궁니르의 심판)**:
  - High-intensity screen-clearing holy lance beam triggered by Key C / L or mobile `[ULT]` touch button when Mana reaches 100%.
  - Cancels all active enemy projectiles on screen, awards +100 score per cancelled bullet, and pierces through the vertical forward corridor dealing 30 damage to massive enemies and bosses.
  - Multi-stage visual rendering with central blinding white core lance, cyan/gold outer corona, ascending sacred rune rings, focus magic circle, and 24-frame screen-shake burst.
- **Bullet Graze Mechanic (스침 판정)**:
  - Close-miss detection band (12~36px from Eira's center) rewarding aggressive bullet maneuvering.
  - Awards +250 score, +10 Mana, and increments persistent graze counter.
  - Emits directional cyan-gold spark particles and real-time audio chime.
- **Orbiting Aegis Swords Subweapon (이지스 소드 호위체)**:
  - Two ethereal glowing blades continuously orbit Eira at radius 72px.
  - Actively parries and disintegrates enemy projectiles that contact the orbit path, awarding defensive points.
  - Shreds close-contact flying enemies with rhythmic slicing damage.
- **Atmospheric Weather & Dynamic Creature Animations**:
  - Continuous drifting sacred white feathers across sky zones with sinusoidal drift physics.
  - Screen-wide lightning flash ribbons during Twilight Rift and Abyssal Storm phases.
  - Living wing-flapping oscillation physics applied to all airborne monster sprites (`kestrel`, `kestrelRed`, `harrier`, `albatross`, `leviathan`).
- **Touch Controls & HUD Refinement**:
  - Dedicated neon golden `[ULT]` circular button on mobile viewports with debounce protection.
  - Moved Mana / Ultimate bar to Top Center prominent position (`★ GUNGNIR READY! [C/ULT] ★`), eliminating any visual overlap with mobile touch buttons.
  - Integrated persistent Graze counter display into top HUD.
- **Audio Synthesis Expansion**:
  - Synthesized procedural sound effects for `sfx_graze` (crisp high-pitched crystal chime), `sfx_ultimate` (deep thunder resonance + ascending angelic chords), `sfx_slash` (airy blade whoosh), and `sfx_melee_hit` (metallic blade impact cut).
- **Test Gate & Determinism**:
  - Added `tests/expansion.test.ts` verifying Graze detection, Aegis sword parrying, Ultimate activation thresholds, bullet cancellation, and pure 60Hz replay determinism (Vitest 30/30 passed).

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
