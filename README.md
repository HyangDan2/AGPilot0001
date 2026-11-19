# VALKYRIE EIRA — SKYBREAK

An original Norse-fantasy vertical-scrolling arcade shooter for desktop and mobile browsers, published by **HD²LAB ARCADE** and built with TypeScript, Canvas 2D and Web Audio on a fixed-step simulation (no game engine).

**Play:** https://hyangdan2.github.io/AGPilot0001/

## Gameplay

- **Three-stage campaign** — Halvard → Ragnarok Rift → Yggdrasil Heart. Each stage has its own midboss (Albatross, Kraken, Hollow Stag) and boss (Celestial Guardian, Leviathan, Fate Weaver). Power, score and mana carry over between stages; clearing Stage 3 reaches the victory screen.
- **Arc blade + shots** — holding Fire fires the main cannon and swings the two-hit arc-blade melee combo. POW pickups raise cannon power 1 → 3 and then add a progressive centre / left / right lane multiplier (up to ×3.0 per lane).
- **Evasive roll** — a short invulnerable roll on a limited charge (3 at launch, up to 6 through pickups).
- **Orbiting Aegis orbs** — two orbs absorb one body hit each and grant 0.75 s of invulnerability when they break; Aegis pickups restore a destroyed orb.
- **Gungnir's Judgement** — the ultimate charges from grazes, kills, melee hits, orb parries and pickups, and fires when the mana gauge reaches 100%.
- **Stage results** — monsters purged accuracy, a no-miss bonus, stage score and the stored top record, plus a preview of the next mission.
- **Comfort settings** — sound on/off, motion FX on/FX low (reduced motion) and a persisted high score in `localStorage`. On phones the game asks for portrait orientation and pauses itself while the device is landscape.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys / WASD | Drag anywhere (relative) |
| Fire + arc blade | Z / Space (hold) | Automatic while touching |
| Evasive roll | X / Shift / K | ROLL button (bottom-right) |
| Ultimate | C / L / U | ULT button |
| Pause | P / Esc | Pause button in the HUD |

## Development

```bash
nvm use        # Node 24 (22.13+ works)
npm ci
npm run dev    # http://127.0.0.1:5173
npm run verify # assets + audio checks, lint, typecheck, unit tests, production build
npx playwright install chromium && npm run test:e2e
```

`npm run build` (and `dev`) first regenerate the art pipeline outputs (`art:bg`, `art:parallax`, `art:slash`, `art:stage23`) from the sources in `art/`, so a fresh clone needs no manual asset step. Audio is synthesised by `npm run audio:render` and checked by `npm run audio:check`.

## Deployment

GitHub Pages is served by the `Verify and deploy` workflow (`.github/workflows/ci.yml`): pushes to `main` run the verification gate and the Playwright suite, and only a verified `dist/` is uploaded. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — module layout, fixed-step loop, asset contracts
- [Harness](docs/HARNESS.md) — how to build, verify and test
- [Decisions](docs/DECISIONS.md), [QA](docs/QA.md), [Changelog](docs/CHANGELOG.md)
- [AGENTS.md](AGENTS.md) — repository rules for contributors

All art and audio are original works produced for this project: the character, enemy and background art lives under `art/` with its production notes in `docs/art/`, and the 36 music and sound tracks are rendered from `scripts/render-audio.mjs`. Mechanics are inspired by classic vertical arcade shooters; no third-party assets are used.
