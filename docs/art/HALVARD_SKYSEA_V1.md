# Stage 1 — Halvard SkySea v1

## Art provenance and versioning
- Original generated painting: `art/source/halvard-skysea-v1.png` (887×1774). Preserved unchanged.
- Game runtime image: `public/assets/backgrounds/stage1-halvard-skysea-v1.webp` (generated, quality 91).
- Run `npm run art:bg` to regenerate. The `predev`, `preassets:check` and `prebuild` scripts also regenerate it automatically.
- Legacy Stage 1 procedural sky/citadels/ruins/sanctuary code remains as a fallback. Stages 2 and 3 are unchanged.

## Runtime behavior
- Only Stage 1 selects the illustrated background, once the asset is loaded and dimensions match.
- The painting is **not tiled**, since its horizon, temples, and sun must not visibly repeat.
- Fit illustration by width (720/887) in a 720×1280 logical viewport; use its ~160 logical px of vertical overscan for smooth camera drift over the full Stage 1.
- A subtle center-shading veil and Twilight/Boss tint improve bullet legibility.
- Radial-gradient wisps form 0.2× distant cloud parallax and 0.5× foreground sea mist; faint glints stay on the water.
- Keep original enemy, projectile, player, HUD, and effects draw order.
- Image load failure transparently falls back to existing procedural background.

## Performance / QA
- The raw painting is 2.4MB, and generated WebP aims for under 1MB.
- WebP signature and byte budget checked by `npm run assets:check`.
- Playwright checks resolution and actual render use (canvas drawImage interception).
- Verify Stage 2/3 visuals do not change and mobile projectiles remain readable.
