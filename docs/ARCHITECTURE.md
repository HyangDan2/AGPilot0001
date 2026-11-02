# Architecture

## Overview
IRON WINGS is a static Vite + TypeScript app rendered with Canvas 2D (no game engine). A pure, seeded simulation advances at a fixed 60 Hz step; the renderer, FX, HUD and audio only consume its read-only state and emitted events.

```
input/ (keyboard, touch) ──InputFrame──▶ core/loop ──▶ sim.step(world, input) ──▶ GameEvent[]
                                              │                    │                 ├─▶ audio/ (sfx, bgm)
                                              │                    └─ World (read) ──┼─▶ render/ (canvas, hud)
ui/ DOM overlays (title, pause, results) ◀────┘                                      └─▶ render/fx (visual-only particles)
```

## Modules
| Path | Responsibility |
| --- | --- |
| `src/sim/` | Pure game rules: world, player, enemies, patterns, bullets, collision, boss, stage data, RNG. No DOM/Canvas/Audio imports. |
| `src/input/` | Keyboard and pointer input merged into one `InputFrame` per tick. |
| `src/core/` | Fixed-step loop, app state machine (title → play → paused → results), test hooks (`?test=1` only). |
| `src/render/` | Canvas renderer, scrolling background, sprite cache with fallbacks, HUD, visual FX. |
| `src/audio/` | Web Audio runtime: buffer loading, SFX voice limiting, looping BGM, mute/volume persistence. |
| `src/ui/` | DOM overlays and settings. |
| `src/storage.ts` | Recoverable localStorage wrapper (high score, settings). |

## Coordinate system
Logical playfield 720×1280, origin top-left, +y downward. Player faces up; enemies face down (nose toward the player). Sim units are logical pixels and seconds.

## Asset contracts

### Sprites — `public/assets/sprites.json`
Owned by the art pipeline (ART_PIPELINE.md). The renderer loads it at startup and falls back to shapes for any missing entry.

```jsonc
{
  "version": 1,
  "sprites": {
    "player": {
      "file": "sprites/player.png",   // relative to public/assets/
      "w": 192, "h": 192,              // stored pixel size (RGBA)
      "drawW": 96, "drawH": 96,        // logical draw size on the 720×1280 field
      "facing": "up",                  // "up" | "down" | "none"
      "points": {}                     // optional named anchors, normalized 0..1 in the stored image
    }
  },
  "backgrounds": {
    "ocean": { "file": "bg/ocean.webp", "w": 720, "h": 1440, "tileY": true }
  }
}
```

Required sprite ids: `player`, `enemy_kestrel`, `enemy_kestrel_red`, `enemy_harrier`, `enemy_condor`, `enemy_gunboat`, `midboss_albatross`, `boss_leviathan` (points `engine1`..`engine4`, `core`), `carrier`, `island_a`, `island_b`, `island_c`, `fx_fireball`, `fx_smoke`, `item_pow`, `item_roll`, `item_medal`, `cloud_a`, `cloud_b`, `cloud_c`. Required backgrounds: `ocean` (vertically seamless), `title` (key art, 1080×1920 or 9:16).

Logical draw sizes (width): player 96 · kestrel 76 · harrier 84 · condor 170 · gunboat 110 (ship length vertical) · albatross 300 · leviathan 600 · carrier 220 · islands 360–480 · fireball 128 · smoke 128 · items 52 · clouds 420.

### Audio — `public/assets/audio.json`
Owned by the audio pipeline (AUDIO_PIPELINE.md).

```jsonc
{
  "version": 1,
  "formats": ["m4a", "ogg"],          // runtime picks the first the browser can decode
  "sounds": {
    "bgm_stage": { "base": "audio/bgm_stage", "kind": "bgm", "loop": true, "loopStart": 3.2, "loopEnd": 92.8, "gain": 0.8 },
    "sfx_shot1": { "base": "audio/sfx_shot1", "kind": "sfx", "gain": 0.5, "maxVoices": 3 }
  }
}
```

Required ids — BGM: `bgm_title` (loop), `bgm_stage` (loop), `bgm_boss` (loop), `jingle_clear`, `jingle_gameover`. SFX: `sfx_shot1`, `sfx_shot2`, `sfx_shot3`, `sfx_hit`, `sfx_explode_s`, `sfx_explode_m`, `sfx_explode_l`, `sfx_pickup`, `sfx_roll`, `sfx_player_down`, `sfx_warning`, `sfx_ui`.

## Events → presentation
| GameEvent | Audio | Visual |
| --- | --- | --- |
| `shot` | `sfx_shot{level}` | muzzle flash |
| `hit` | `sfx_hit` | white flash on target |
| `explode` s/m/l/boss | `sfx_explode_*` | fireball + debris + smoke, shake for l/boss |
| `pickup` | `sfx_pickup` | sparkle |
| `roll` | `sfx_roll` | roll animation |
| `playerDown` | `sfx_player_down` | large explosion |
| `warning` | `sfx_warning`, BGM → `bgm_boss` | WARNING banner |
| `stageClear` | `jingle_clear` | results overlay |
| `gameOver` | `jingle_gameover` | game-over overlay |
