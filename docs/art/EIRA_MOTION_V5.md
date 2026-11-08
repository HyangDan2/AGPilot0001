# Eira Motion v5 — 2026-11-09

## Approved motion source and frame contract

The user-approved, independently drawn artwork includes:
- **Idle v4:** 8 frames, flowing hair and red ribbon, subtle sword motion, wing feathers and legs
- **Slash L + Slash R:** 4+4 independently drawn sword-action poses, 2-hit combo with a brief recovery
- **Roll 360:** 24 generated poses, rear -> right profile -> front -> left profile -> rear, with the blue sword blade lengthened consistently

Production atlas: `public/assets/characters/eira/eira-motion-v5-atlas-256.png` (2048×1280 RGBA; 8 columns × 5 rows; 256px square cells). Lightweight alternate: `eira-motion-v5-atlas-128.png`. Frame order and anchor are defined in `eira-motion-v5.json`.

## Source preservation

All prior artwork is preserved unchanged:
- `public/assets/characters/eira/eira-motion-v2-atlas-256.png` — v2 runtime fallback
- `public/assets/characters/eira/eira-flight.png` — original character animation fallback
- `public/assets/characters/eira/canonical/` — approved original frame references

New generation sources are saved under `art/source/`; a contact sheet is saved under `art/reviews/`.

## Runtime

The new v5 atlas is loaded separately and takes precedence only after passing a dimension check. If loading fails, renderer uses v2 or original art. Animation selection prioritizes **Roll (24 at 20fps)**, then **Slash (4 poses per 8-tick swing)**, then **Idle (8 at 12fps)**. The simulation's 72-tick roll duration and melee cadence are unchanged. Existing gameplay physics, damage, and collision logic are unchanged.

The v5 artwork contains the 360° change in view itself; **do not rotate the sprite an extra 360°**. Keep the light trail afterimages behind Eira.

## Asset production notes

Individual source poses are newly illustrated, not achieved by rotating, enlarging, or skewing a single character image. Source frames are uniformly resized only while packing into the fixed-size game atlas. The roll's transparency is reconstructed using the matching source animation alpha so that the edited longer sword remains aligned.

## Rollback

To revert v5 without deleting any artwork, use the existing v2 loader branch in `src/render/renderer.ts` instead of v5. No original asset filenames were overwritten.
