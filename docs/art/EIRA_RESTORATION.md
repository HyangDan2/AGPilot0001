# Eira original-art restoration (AGPilot0001)

Status: Source images restored to main; original-based motion compiler in place.

## Approved source
- Design source: art/source/valkyrie_eira_shmup_spritesheet_v2.jpg (v0.5)
- Clean canonical 256x256 RGBA key poses: public/assets/characters/eira/canonical/
- These are copied bit-for-bit from v0.7.1 commit a0324093459de3801ff6702c7fb102d8778af15e.
- Do not replace character identity, armor, wings, sword, hair or skirt with synthetic SVG geometry.
- Antigravity may prototype SVGs only under an explicit work order. Production artwork comes only from user-approved original assets.

## Output contract
Run: npm run art:eira

- Eight source-based idle frames with breathing/hover offsets: idle_0..idle_7
- Twelve source-based roll keyframes: roll_0..roll_11
- Source-based bank_left, bank_right, hover, thrust, slash_0, slash_1, charge and power_up
- Transparent PNGs: public/assets/characters/eira/frames/
- 1024x512 8-column RGBA runtime atlas: public/assets/characters/eira/eira-flight.png
- Atlas metadata: eira-flight.json, cell 128px, frame pivot 64x64
- Preserve all 16 canonical sources for deterministic future rebuilding.

## Policy and quality gates
- scripts/generate-all-assets.mjs must never generate or replace Eira artwork.
- scripts/restore-eira-original.mjs compiles only canonical PNGs, not procedural character drawings.
- Duplicate frame byte hashes are rejected for both 8 idle and 12 roll frames.
- CI regenerates the source-based atlas before verifying and deploying the game.
- The separate restore-eira-art workflow commits raster outputs back to main.
- This is a motion reconstruction from existing poses using limited transform interpolation; not 20 independently hand-illustrated poses. Further high-quality redraws require explicit artistic review.
