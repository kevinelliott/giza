# Tomb of Queen Meresankh III (G 7530-sub), Eastern Cemetery

**Model:** `tools/blender/meresankh.py` → `assets/models/meresankh.glb`. Placed under its mastaba at 341 m E, 156 m S of Khufu (OSM place point); reached by fast travel (its stair ends at a lit doorway — not yet joined to the street above).

## Done

| Item | Value | Source |
| --- | --- | --- |
| Plan: three rooms (a main, b west/offering, c north) + shaft | a 7.1 × 3.4 m; c 2.7 × 4.7 m; b 5.3 × 2.7 m; two pillars between a and c; pillared wall between a and b; entrance in the east wall near the south end | Reisner, *History of the Giza Necropolis* I (1942), plan + section, scaled off its 5 m bar (Commons `MeresankhIII G7530.jpg`) |
| Heights | a, b 2.6 m; c 2.1 m | same section |
| Rock-cut chapel ~2 m below street level | — | Wikipedia *Tomb of Meresankh III* (Flentye 2006) |
| North wall of c: ten standing women under an inscribed architrave, graded in height, smaller and worn at the west end | modelled as 10 engaged figures | photo 64/65 |
| West room: niches with pairs of standing women, false door between | 2 niches × 2 figures | photos 67, 69, 70 |
| Ceilings painted red to imitate granite; modern plank floor, timber rails, floor tubes | materials/fittings | photos 55, 64, 70 |
| Burial shaft in room b (modern stair inside) | pit with grating | plan; photo 68 |

**Wall positions are now verified** against the excavation report — Dunham & Simpson, *The Mastaba of Queen Mersyankh III* (Giza Mastabas 1, 1974; PDF at gizapyramids.org, text extracted 2026-11-11), "Main Chamber" pp. 4–5:

- *North wall of the main room*: "the two standing figures of the queen" on the pillars, with the best-preserved colour, under "the lintel above the central opening".
- *West wall, right (north) end*: "three principal standing figures, respectively of Hetepheres, Mersyankh, and the latter's son Nebemakhet" — Hetepheres in the robe with pointed shoulders and the yellow wig.
- *East wall, north of the entrance*: "on the left the figure of Mersyankh's father, Kawab, occupies the full height"; registers of boats above and craftsmen (statue-making, metal workers) below.
- *South wall*: three statue niches below five registers (banquet, furniture).
- *West room*: west wall with palace-facade doors at either end, central false door, niches with two pairs of engaged female statues; burial pit in the floor.
- *North room*: "ten female statues engaged in the north wall with a single line of text above them".

**Photographs used as wall textures** — Richard Mortel, CC BY 2.0, Wikimedia Commons series *"Tomb of Queen Meresankh III, wife of Khafra, 4th dynasty, ca. 2640 BCE; Giza (NN).jpg"*:

| Texture | Photo | Shows | Placed | Verified |
| --- | --- | --- | --- | --- |
| `mer_pillar.jpg` | (55) | the queen, hand to chest, bright painted signs above | south face of the west pillar on the north wall | ✔ report (which of the two pillars is not established) |
| `mer_west.jpg` | (57) | painted hieroglyph band on yellow | lintel over the north-wall pillars | ✔ visible there in photo 55 |
| `mer_north.jpg` | (54) | Hetepheres II (yellow wig, pointed robe) and Meresankh | west wall of the main room, north end | ✔ report (Wikipedia's caption "north wall" is loose) |
| `mer_east.jpg` | (62) | registers of craftsmen | east wall, north of the entrance, lower part | ✔ report (exact extent along the wall estimated) |
| `mer_kawab.jpg` | (56) | Kawab, striding | east wall, north end, full height | ✔ report + caption |

All 30 photos of the series (45–74) were looked over as a contact sheet on 2026-11-11. Not yet used: 47–51 (entrance jamb reliefs: Khemetnu presenting the document, animals), 52–53 (red figures in registers), 58–61 (more painted bands), 63 (as 62), 66 (painted corner), 71 (incised text wall), 72 (painted head + signs), 73–74 (burial chamber).

**Statues:** now lofted figures (sheath dress, arms at the sides, tripartite wig framing the face), ten in the north room graded in height as in photo 64, two pairs in the west room's niches, and three niches in the south wall (report: "three statue niches"; group sizes 1 + 1 + 2 are a guess — plate IX would settle it). They are generic women, not portraits.

## Inscriptions

| Panel | Status | Notes |
| --- | --- | --- |
| Architrave over the ten statues | composed | Her titles ("king's daughter of his body, king's wife, Meresankh") in standard writings; the real line is longer — visible in photo 64 but not transcribed. |

## Todo

- Texture the remaining walls from the report's figures 4–12 (line drawings of every wall, in the same PDF, pp. after the plates) — these are the authoritative layout; the PDF's plates could be rendered with `pdftoppm` and used directly. South wall registers, west wall false door and palace-facade doors, the west room's four walls.
- Harvard's Digital Giza has the same drawings as images (drawings 50829, 50836, 50837…), but its image server refuses automated downloads — use the PDF.
- Burial chamber (photos 73–74) and the black granite sarcophagus (now in Cairo, JE 54935).
- The surface chapel of mastaba G 7530-7540 and the real entrance stair.
- Statue detail: individual faces, wigs and the smaller girls' proportions (the report identifies the ten as Hetepheres II, Meresankh and daughters).
