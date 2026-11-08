# Eira — ImageGen Batch 01 (Concept, Not Runtime Art)

Status: **DRAFT / REVIEW REQUIRED**.

This branch contains an initial AI-generated Eira concept preview. It is **not** an animation spritesheet, transparent character layer, or approved game asset, and must **not** be wired into `public/assets/`.

## Asset

- `eira-concept-batch01-preview.avif`: 256×261 AVIF compressed preview cropped from the generated concept board.
- The original 1536×1024 PNG concept board is provided separately in the ChatGPT conversation. The compressed preview is not a replacement for the full-resolution original.

## Art direction and QA

Character direction: silver braid, blue eyes, white feather ornaments, royal-blue/gold armor, ivory skirt, and straight two-handed sword. Preserve established Eira silhouette and anime/pixel-inspired game-art texture.

Before any production use, create and review separate high-resolution full-body pose frames with transparent background and safe canvas margins; validate fingers, sword tips, anatomy, frame continuity, and alignment. A concept board, repeated poses, and labels are not frame assets.

## Ownership

- **GPT/Codex** owns final illustration generation, frame drawings, timing and usage specifications, final art approval.
- **Antigravity** may only wire specifically approved art and run code/integration QA. No production art edits or generative SVG replacements.
- Test-only SVG prototypes require a separate explicit work order.

## Proposed next deliverables

1. Approved full-body Eira master artwork (transparent PNG).
2. Individual Idle and Slash animation key poses.
3. Frame-by-frame animation artwork with anchors and frame metadata.
4. Only after approval: lossless atlas packing and game integration.

Do not modify current production assets until replacement frames have been approved.
