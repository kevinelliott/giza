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

## Todo

- Amenhotep II temple: make it ~22 m square and rotate ~33° (satellite). Its interior walls are visible in the imagery and could be traced.
- Sphinx Temple interior: the satellite shows the open court with its pillar sockets and the two entrance corridors — trace the plan (Ricke 1970) instead of the current 6 × 2 pillar rows.
- Khafre Valley Temple interior: T-shaped pillared hall, two entrances, statue pits (Hölscher 1912 plan). Currently a walled square with pillar rows.
- Dream Stele of Thutmose IV: 3.6 m granite; lunette with the king offering to two sphinxes, 14+ lines of text. Text is published — transcribe the lunette at least. Currently a blank slab.
- Sphinx face: match photographs (eyes, lips, nemes stripes, remaining paint on the cheek). Not yet compared against photos.
- The enclosure's real shape: the cleared area extends ~75 m north of the body inside modern retaining walls (satellite); the game pit is a ±27 m rectangle.
