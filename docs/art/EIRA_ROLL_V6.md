# Eira Roll v6 — clean 360-degree turn

## Changes
- Updated 24 Roll sprites only, based on latest approved independent 24-pose reference.
- When Eira faces away, the red head ornament is hidden behind the feathered wing ornaments.
- No magical flash trails were retained in Roll sprite art.
- Roll-only renderer afterimages, aura specks, and invulnerability barrier rings are suppressed in v6.
- No changes to idle 8, slash 8, combo timing, gameplay collision, shields, or ULT balance.

## Assets
- `public/assets/characters/eira/eira-motion-v6-atlas-256.png` — 2048×1280 transparent RGBA atlas, 8×5 256px cells (40 frames).
- `public/assets/characters/eira/eira-motion-v6-atlas-128.png` — compact review/alternate atlas.
- `public/assets/characters/eira/eira-motion-v6.json` — frame coordinates and timing.
- `art/source/eira-roll-v6-approved-no-flash-original.png` — untrimmed, approved 24-frame source sheet.

## Rollback
The v6 image has a separate loader. If unavailable, runtime automatically selects the existing v5 image, then v2 and the original atlas. Removing v6 loader/selection code reverts to the prior behavior without replacing old art files.

## Quality checks
24 individual roll frames preserve transparent cell corners. v5 first 16 cells were copied pixel-identically. Source transparency was re-segmented to remove light backdrop while retaining silver hair and white feathers.
