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
- Granite, 3.6 m tall; the face shows **Lepsius' own record of the stele** (*Denkmäler aus Aegypten und Aethiopien*, 1849, public domain; Commons `Giseh Traumstele (Lepsius) 01.jpg`), converted to incised lines (`assets/textures/dream_stele.png`): the lunette with Thutmose IV offering to the Sphinx on its pedestal on both sides under the winged disc, and the 13+ preserved lines of text, broken away below exactly as on the stone. This is the real inscription, not a composition.
- Only improvement left: a higher-resolution scan (the 1,400 px copy was used; Wikimedia throttled the larger one).

## Temples — partial
- Khafre Valley Temple: 44.6 m square, plan after Hölscher (from memory of the published plan, not traced): two east doorways, N–S antechamber, T-shaped hall with 6 + 10 granite pillars and architraves, NW passage to the causeway, alabaster floor. **Room sizes are estimates** — trace Hölscher 1912 pl. to fix. Statue pits and the 23 statue emplacements not modelled.
- Sphinx Temple: court with piers, east vestibule with two doorways, west niche. Court size from the satellite view; pier count/positions schematic — trace Ricke 1970.
- Amenhotep II temple: now ~22 m square, rotated 33° (satellite). Interior walls not traced.

## Todo

- Amenhotep II temple interior walls (visible in the imagery) — trace.
- Sphinx Temple interior: the satellite shows the open court with its pillar sockets and the two entrance corridors — trace the plan (Ricke 1970) instead of the current 6 × 2 pillar rows.
- Khafre Valley Temple interior: T-shaped pillared hall, two entrances, statue pits (Hölscher 1912 plan). Currently a walled square with pillar rows.
- Sphinx face: match photographs (eyes, lips, nemes stripes, remaining paint on the cheek). Not yet compared against photos.
- The enclosure's real shape: the cleared area extends ~75 m north of the body inside modern retaining walls (satellite); the game pit is a ±27 m rectangle.
