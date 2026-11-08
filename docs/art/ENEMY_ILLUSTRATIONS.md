# AGPilot0001: illustrated enemy replacement v1

## Status
- Stage 1: Celestial Guardian (1)
- Stage 2: Siren, Seraph, Golem, Kraken (4)
- Stage 3: Seed Wisp, Thorn Mantis, Amber Moth, Root Guardian, Hollow Stag, Fate Weaver (6)
- 11 replacement designs in a transparent **2048 × 2048** master atlas.
- Existing original seven enemies are retained without any changes to their behavior or gameplay IDs.
- Original extracted artwork in \`art/source/valkyrie_eira_monster_spritesheet.jpg\` remains protected.

## Production assets
- \`public/assets/enemies/enemies-illustrated.png\`: **approved 11-enemy atlas**, using frame rectangles identical to the existing \`ENEMY_FRAMES\` coordinates.
- \`art/source/enemies-illustrated-v1-source.zip\`: reproducible backup of 11 transparent character PNGs.
- Renderer chooses the illustrated atlas for the 11 IDs, and the original atlas for all other IDs. Loading fallback is retained.
- Old SVG placeholders are deprecated; \`scripts/generate-all-assets.mjs\` is now a verification-only guard.

## Art fidelity disclosure
These are initial AI-illustrated enemy designs, extracted from a generated design sheet and trimmed to transparent PNGs. The sprites are static per enemy: the renderer applies subtle flapping transforms, not authored multi-frame attack animations. Art polish and dedicated boss-part animation can be enhanced separately without changing gameplay logic.

## QA
- Every atlas rectangle is 100% inside 2048×2048.
- Each enemy atlas cell has opaque color pixels and alpha transparency around it.
- Browser verification should confirm a transparent illustration for every listed enemy kind, stage 1-3.
- Do not let prototype SVG, Antigravity workflows or bulk generators overwrite the master source.
