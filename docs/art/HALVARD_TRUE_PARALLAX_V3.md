# HALVARD True Parallax v3

Stage 1 now renders an original clean plate plus truly isolated sprite objects.
The v1 illustrated background and all Stage 2/3 rendering are left intact.

## Runtime asset bundle
- `art/source/halvard-v3-runtime-bundle.zip` contains five optimized WebP files
  and the manifest. `npm run art:parallax` extracts and validates these into
  `public/assets/backgrounds/halvard-v3` on each build.
- The five original 941×1672 PNG paintings are preserved in
  `art/source/halvard-v3/`. Every sprite group comes from the user's approved
  no-warship sky-temple concept.
- Sprite atlases contain separated-alpha objects, **not** a whole-scene
  moving wallpaper. Their source rectangles and individual spawn positions are
  described in the JSON manifest.

## Depths
- L1: fixed sky/sea clean plate (with 20%-opacity shimmer clipped to the sea).
- L2: seven isolated floating-island objects at **30 logical px/s**.
- L3: three distinct large temple objects at **85 logical px/s**.
- L4: ten cloud shapes at **180 logical px/s**, rendered in front of the
  player at 58% opacity.

The scene preserves the 720×1280 gameplay coordinate system. Each independent
sprite loops through a deterministic world-space y-cycle; fresh sprites enter
from above as previous sprites leave below. Only Stage 1 switches to v3 and
only after all five textures + the manifest load correctly.

## Visual QA and fallback
- The in-game test URL `?test=1` exposes `window.__halvardV3` to toggle
  individual depths: `setVisible("temples", false)`, etc.
- End-to-end checks verify all images actually load, the depths scroll at
  visibly different rates, and hiding the cloud layer stops its draw calls.
- v3 missing/unavailable -> existing v1 art; v1 missing -> procedural
  legacy background. No existing assets are overwritten.

## Limits
The current ten-second standalone motion preview checks compositing and
motion; real-device FPS must still be profiled on a target phone. The first
background load may take several network frames before switching from v1.
