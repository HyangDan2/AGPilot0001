# IRON WINGS

An original WWII-themed vertical-scrolling arcade shooter for desktop and mobile browsers, built with TypeScript, Canvas 2D and Web Audio, deployed to GitHub Pages.

**Play:** https://hyangdan2.github.io/AGPilot0001/

## Controls
| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys / WASD | Drag anywhere (relative) |
| Fire | Z / Space (hold) | Automatic while touching |
| Evasive roll | X / Shift | Roll button (bottom-right) |
| Pause | P / Esc | Pause button |

## Development
```bash
nvm use        # Node 24 (22.13+ works)
npm ci
npm run dev
npm run verify
npx playwright install chromium && npm run test:e2e
```

See [AGENTS.md](AGENTS.md), [docs/HARNESS.md](docs/HARNESS.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

All art and audio are original works produced for this project (see art/PROMPTS.md and docs/AUDIO_PIPELINE.md). Gameplay mechanics are inspired by classic 1940s-themed arcade shooters; no third-party assets are used.
