# Great Sphinx, its enclosure, and the temples in front

## Done

| Item | Value | Source |
| --- | --- | --- |
| Position | 326.1 m E, 431.0 m S of Khufu's centre | OSM outline (Overture) |
| Size | 73 m paw–tail, 20 m high, 19 m across the haunches | Wikipedia |
| Enclosure floor level | 42.5 m below Khufu's base | Copernicus DEM |
| **Satellite check** (Esri z19, 0.2586 m/px, 2026-11-11, centre 29.97527 N 31.13757 E) | Sphinx incl. shadow ≈ 76 m long; Sphinx Temple ≈ 44 × 46.5 m, its west wall ~8.5 m east of the paw tips; Khafre Valley Temple directly south of it across a ~8 m gap; Amenhotep II temple ≈ 22 m square, **rotated ~33°**, centred 50 m E / 34 m N of the Sphinx's centre; Khafre's causeway passes just south of the Sphinx ditch heading for the valley temple's NW corner. | `tools/geo/sat_view.py` |
| Game vs satellite | Sphinx Temple 46 × 43 m, gap to paws 8 m ✔; valley temple gap 11 m (real ~8) ✔; Amenhotep temple position ✔ (49.8 E / 35.4 N) but built 20 × 14 m axis-aligned ✘ | — |

Model: `js/sphinx.js` (signed-distance sculpt). Enclosure walls: displaced rock.

## Dream Stele — done
- Granite, 3.6 m tall; the face carries **Lepsius' own record of the stele** (*Denkmäler aus Aegypten und Aethiopien*, Abth. III Bl. 68, 1849, public domain), converted to incised lines (`assets/textures/dream_stele.png`, 2048 px wide): the lunette with Thutmose IV offering to the Sphinx on its pedestal on both sides under the winged disc, and the preserved lines of text, broken away below as on the stone. This is the real inscription.
- Source scan: the New York Public Library copy on Wikimedia Commons (3840 × 4769 px). Signs are legible at arm's length.

## Temples — done from a published plan
- `tools/geo/temple_plans.py` rasterises "Kahfre valley sphinx.svg" (HoremWeb, Wikimedia Commons, **public domain**, after Lehner and Verner; copy in `research/plans/`) into a 0.4 m grid of solid cells (`js/templedata.js`), from which the game builds every wall, pier and pillar of **Khafre's valley temple** (two east doorways, antechamber, T-shaped hall with 16 pillars, magazines, the passage to the causeway, the long south room) and the **Sphinx Temple** (court with piers, east and west sanctuaries, north and south colonnades, two east doorways).
- Scale and position come from the Sphinx drawn in the same plan (73.5 m = 850 px). Cross-check: the plan puts the valley temple's centre at 395.3 E / 490.6 S and the Sphinx Temple's at 390.8 E / 438.1 S; the OSM footprints say 395.1 / 492.0 and 392.9 / 437.1 — agreement within ~2 m.
- Free-standing pieces under 12 m² are treated as pillars/piers (lower, granite). Heights are estimates: valley temple walls 7.5 m, Sphinx Temple walls 4.6 m, pillars 4.1 m.
- Khafre's causeway now ends at the valley temple's north-west corner, where the plan shows it entering.
- Amenhotep II temple: ~22 m square, rotated 33° (satellite). Interior walls not traced.

## Todo

- Amenhotep II temple interior walls (visible in the imagery) — trace.
- Valley temple: the 23 statue emplacements, the roof terrace and stair, wall casing detail (granite inside and out, alabaster floor now covers the whole interior).
- Temple wall heights per room; 0.4 m grid makes the diagonal causeway passage stepped.
- Sphinx face: match photographs (eyes, lips, nemes stripes, remaining paint on the cheek). Not yet compared against photos.
- The enclosure's real shape: the cleared area extends ~75 m north of the body inside modern retaining walls (satellite); the game pit is a ±27 m rectangle.
