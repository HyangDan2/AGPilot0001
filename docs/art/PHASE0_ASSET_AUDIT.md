# VALKYRIE EIRA : Phase 0 — Asset Audit & Character Design Standard

**Date**: 2026-11-06  
**Target Repository**: `HyangDan2/AGPilot0001`  
**Reference Source**: `HyangDan2/CDXPilot0005`  
**Objective**: Establish canonical design rules for Eira and reconcile official character art with the aerial key visual.

---

## 1. Character Sources & Asset Audit

| Asset | Source Location | Local Reference Path | Primary Role |
| :--- | :--- | :--- | :--- |
| **Official Style Reference** | `CDXPilot0005: art/generated/sd-v10/style-reference.png` | `art/reference/eira-style-reference.png` | **Primary Design Standard** (Pixel/Anime identity, costume details, proportions) |
| **Official Master Art v1** | `CDXPilot0005: art/generated/eira-master-v1.png` | `art/reference/eira-master-v1.png` | **Full-Resolution Reference** (High-detail armor plates, braid structure, facial profile) |
| **Aerial Combat Key Visual** | Uploaded by user (from current session) | `art/reference/eira-sky-keyvisual-v1.png` | **Key Visual & Mood Reference** (Title screen art, sky backdrop, magical arc effects) |

---

## 2. Design Continuity & Feature Comparison

| Feature | Official CDXPilot0005 Standard | Aerial Combat Key Visual | Top-Down Vertical Shooter Standard (AGPilot0001) |
| :--- | :--- | :--- | :--- |
| **Hair** | Silver-grey, thick braid resting over shoulder, **distinct red ribbon** at tip | Silver-white braided hair with red ribbon; dynamic wind spread | **Silver-grey braided hair trailing downward/backward** with bright red ribbon accent |
| **Eyes** | Calm royal blue | Luminous crystal blue | **Royal blue eyes** (visible in portrait and high-angle tilt) |
| **Valkyrie Helm** | Fitted winged helmet, **dual white feathered wings**, golden sunburst/wheel disc at temple | Winged headpiece with golden rosette and ruby jewel | **Dual white feathered wings with golden temple ornaments**; no mechanical antennas |
| **Torso & Armor** | Royal blue & gold pauldrons/cuirass, **central diamond pectoral ornament** | Royal blue cuirass with gold filigree and diamond chest gem | **Royal blue and polished gold armor** with central diamond chest insignia |
| **Skirt & Tassels** | Layered ivory cloth panels with gold geometric embroidery, **hanging golden cylindrical tassels** | Multi-layered flowing ivory skirt with gold trim and tassels | **Layered ivory skirt with gold hems and dangling tassels**, billowing against flight draft |
| **Boots & Greaves** | Royal blue pointed boots with gold knee guards and chevron accents | Royal blue armored greaves with sharp gold trim | **Royal blue & gold pointed boots**, angled downward during vertical flight |
| **Weapon** | Straight double-edged two-handed sword, blue grip, gold guard, blue jewel | Straight broadsword with winged gold crossguard and blue jewel | **Straight Oathblade** emitting cyan/blue magical arc energy |
| **Camera View** | Side-scrolling profile (2D side view facing right/left) | 3/4 aerial dynamic angle | **Top-Down / High-Angle 3/4 View**: Eira flies upward facing top of screen, viewed from slightly behind and above |

---

## 3. Strict Negative Constraints (Prohibitions)

1. **NO Simple Rotation of Sideview Art**: Side-scrolling sprites must **never** be rotated 90 degrees to face forward. Eira must be drawn in an authentic top-down aerial flight posture.
2. **NO Sci-Fi / Mecha Alterations**: No cybernetic thrusters, mechanical wings, futuristic guns, or laser cannons. Eira flies by divine valkyrie magic and wields her sacred blade.
3. **NO Character Silhouette Distortion**: Keep her silver braid, winged helmet, ivory skirt panels, and blue/gold armor immediately identifiable even when scaled to mobile screens (approx. 72×96 to 96×128 screen pixels).
4. **NO Placeholder Artwork**: All assets delivered must be verified, complete RGBA transparent graphics.

---

## 4. Proposed Gameplay Sprite & Motion Roadmap (Phase 1)

1. **Top-Down Aerial Idle**: Eira hovering in mid-air, gentle divine levitation bob, hair and skirt trailing downward, sword poised forward.
2. **Bank / Strafe Left & Right**: Slight body tilt (roll banking), ivory skirt and silver braid swaying opposite to movement direction.
3. **Arc Blade (Attack Level 1~3)**:
   - Level 1: Single forward cyan energy crescent blade.
   - Level 2: Twin parallel cyan blades with sound of resonant ringing steel.
   - Level 3: Triple spread blades (`Celestial Storm`) with radiant golden-cyan particles.
4. **Charge Attack (`Divine Judgement`)**: Charged thrust releasing a massive vertical piercing light beam.
5. **Aerial Roll (Evasive Maneuver)**: 360-degree high-speed barrel spin with cyan afterimages and invulnerability.
6. **Hit & Defeat**: Flashing white impact silhouette; defeated spiral descent with fading golden light particles.
