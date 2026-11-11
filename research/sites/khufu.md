# Great Pyramid of Khufu

## Done
- Base 230.4 m, original height 146.6 m (today 138.8 m, flat top), slope 51°50′ — standard survey values. Origin of the game grid.
- **Lower interior — Blender, true size and position** (`tools/blender/khufu_lower.py` → `khufu_lower.glb`; replaces the old enlarged, schematic corridors). Origin = base centre; passage plane 7.29 m east of it. Walk-tested in both builds: tunnel → breach → Ascending Passage → Queen's Chamber; tunnel → Descending Passage → Subterranean Chamber; both outside stairs; gallery foot → Great Step.

| Item | Built as | Source |
| --- | --- | --- |
| Entrance | floor 16.97 m above the base, in the north face; ragged mouth, iron gate standing open | Petrie 1883 §35 (668.2 in) |
| Descending Passage | 105.23 m at 26°31′23″, 1.05 × 1.20 m square to the slope (crouch); masonry above the pavement level, bedrock below; cleated boards, handrails, lamps | Petrie §36 (4143 in; angle) |
| Ascending Passage | leaves 28.19 m down; 39.29 m at 26°2′30″, same section; granite plugs fill its foot (top plug face visible; the lowest shows in the descending passage roof) | Petrie §38–39 (1110.6, 1546.8 in) |
| Al-Ma'mun's tunnel | mouth on the centre line ~7 m up; level, rough-hewn, ~2.1 × 2.35 m, 36 m south, then a cavity east to a breach just above the plugs, with a boarded ramp up into the passage and steps down to the Descending Passage | general plans; course/positions approximate |
| Queen's passage | 38.7 m level, 1.05 × 1.17 m; last 5.5 m floor 0.5 m lower (first 4.6 m is in `khufu_upper.glb`, under the gallery floor) | Petrie §40 (1523.9, 46.2, 216 in) |
| Queen's Chamber | 5.76 E–W × 5.23 N–S, walls 4.69 m, ridge 6.23 m, on the E–W axis; door at the NE corner; niche 4.67 m high, 1.57 m wide, 1.04 m deep, five corbels, axis 0.64 m south of the ridge, with the treasure-hunters' cut in its back; two 0.21 m shaft mouths | Petrie §41 |
| Subterranean | level passage 8.83 m with a recess on the west; chamber 14.06 E–W × 8.25 N–S; pit with railing; blind passage 16.4 m south; rock fins on the west | Petrie §37 (346, 553.5, 325.9 in) |
| Well shaft | lower mouth only (grille in the west wall of the Descending Passage, ~97 m down) | position approximate |

- **Upper interior — Blender** (`tools/blender/khufu_upper.py` → `khufu_upper.glb`), joined to the ascending passage at the foot of the gallery:

| Item | Built as | Source |
| --- | --- | --- |
| Grand Gallery | 46.7 m on a 26.5° slope, 8.6 m high, 2.06 m wide above the ramps, 1.04 m channel, ramps 0.52 × 0.6 m, 7 corbels of 7.5 cm from 2.29 m, 27 slot pairs, Great Step | Petrie 1883 (standard figures) |
| Antechamber | 2.97 × 1.65 × 3.8 m, granite south part, granite leaf, 3 portcullis slots per side; **the passages either side are true size, 1.05 × 1.11 m — the player must crouch** | Petrie |
| King's Chamber | 10.47 × 5.23 × 5.85 m, granite, entrance at the east end of the north wall, two shaft mouths | Petrie |
| Sarcophagus | 2.28 × 0.98 × 1.05 m, lidless, broken corner, near the west wall | Petrie |
| Campbell's Chamber | gabled top relieving chamber, uneven granite beam tops | Vyse 1837 (general form) |
| Modern fittings | wooden cleated walkway, handrails, a wooden ramp up the Great Step, lamps | general knowledge of the site today |

- Chevron blocks over the entrance; al-Ma'mun's tunnel mouth; boat pits from OSM outlines; mortuary temple 52.5 × 40 m with basalt floor.

## Inscriptions
| Panel | Status | Notes |
| --- | --- | --- |
| Campbell's: Khufu cartouche | attested | 𓐍𓅱𓆑𓅱 in red ochre. Placement on the wall is not from a photo. |
| Campbell's: Khnum-Khufu cartouche | attested | Fuller name; placement not from a photo. |
| Campbell's: gang name | composed | "The gang, Friends of Khufu" — gang names of this kind are recorded in the chambers; exact signs/position not checked against Vyse's/Perring's drawings. |

Walk-tested in the browser: from the ground outside, up the entrance stair, down and up the passages, up the gallery and its ramp to the low passage (standing: blocked; crouching: through to the King's Chamber).

## Schematic / todo
- Campbell's Chamber is reached by fast travel only; the four chambers below it (Davison, Wellington, Nelson, Lady Arbuthnot) and Vyse's shaft are not built. Graffiti positions need Perring's plates.
- Gallery: wall courses are drawn level, not parallel to the slope; the niches above the ramp slots and the groove along the third corbel are missing.
- King's Chamber: the real joint pattern (5 courses, 100 blocks) and the cracked ceiling beams are approximated by a regular grid.
- Subterranean: the level passage is 1.1 m high (really 0.92 m) so a crouching player fits; roof height (3.5 m) and the shape of the unfinished western half are approximate. Queen's Chamber: wall-course joints are the shader's regular grid, shaft heights approximate, salt encrustation not shown.
- Gallery foot: both ramps are omitted for the first 2.7 m (really only the west one is broken, at the well mouth); boards on the west ledge are the way up. The tunnel's exact course, and the descent beside the plugs, are regularised.
- Well shaft (upper mouth, shaft, grotto), the "Big Void" (ScanPyramids 2017) and the north-face corridor (2023): not modelled.
