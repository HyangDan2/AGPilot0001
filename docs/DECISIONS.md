# Decisions

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-11-03 | Canvas 2D + TypeScript, no engine | Small bundle, full control, simulation testable without a runtime engine. |
| 2026-11-03 | Pure fixed-step (60 Hz) seeded simulation | Deterministic tests, headless full-stage playthrough, reproducible QA seeds. |
| 2026-11-03 | 720×1280 logical field, 9:16 letterboxed | Arcade-style vertical play on both phones and desktops. |
| 2026-11-03 | Relative-drag touch with auto-fire; roll button | The finger never hides the plane; minimal touch targets. |
| 2026-11-03 | Generated art on flat chroma backgrounds, keyed by script | The image generator outputs RGB JPEG only (no alpha); keying probe produced clean edges. Margins are enforced by the packer, not trusted from the generator. |
| 2026-11-03 | One high-quality image per aircraft; bank/roll/hit/propeller done in code | Generated frame sequences are not consistent enough for animation. |
| 2026-11-03 | Audio composed and synthesized offline by a Node script, encoded with ffmpeg | No audio generator is available; deterministic re-rendering from text scores. |
| 2026-11-03 | Fictional factions and emblems; no "1942" naming | Avoid trademark/copyright and real national insignia. |
| 2026-11-03 | Harness adapted from CDXPilot0006 | Proven gate structure (model → verify → browser → visual review → deploy → hosted check). |
| 2026-11-03 | Documentation in English | Consistency with the source harness and agent tooling. |
