# Research tracker

One file per site in `sites/`. Each records **what has been researched, from
which source, what was built from it, and what is still open** — so nobody
repeats the same lookup or re-examines the same wall.

**Before researching anything, read the site's file. After, update it.**

## Status words

| Word | Meaning |
| --- | --- |
| `done` | Researched from a cited source and built to match. |
| `partial` | Some of it researched/built; the file says exactly which part. |
| `schematic` | Built, but from general knowledge or a rough estimate — needs a real source. |
| `todo` | Not researched yet. |

Inscriptions have their own scale (also in `js/inscriptions.js`):
`attested` (the sign sequence is a standard published writing), `composed`
(hieroglyphs composed from a published translation; not yet checked sign by
sign against a photo of the stone), `placeholder` (layout/style from photos,
text not).

## Site index

| Site | Layout / position | 3D model | Surfaces & inscriptions | File |
| --- | --- | --- | --- | --- |
| Serapeum of Saqqara (Greater Vaults) | schematic plan; sizes done | **Blender**, done (first pass) | 4 inscribed boxes: 2 composed, 2 placeholder | [serapeum](sites/serapeum.md) |
| Great Pyramid of Khufu | done (survey) | procedural; interior partial | none yet (relieving-chamber graffiti todo) | [khufu](sites/khufu.md) |
| Pyramid of Khafre | done (survey) | procedural; interior schematic | todo | [khafre](sites/khafre.md) |
| Pyramid of Menkaure | done (survey) | procedural; interior schematic | todo | [menkaure](sites/menkaure.md) |
| Great Sphinx + enclosure | done (map + satellite check) | sculpted SDF; partial | Dream Stele todo | [sphinx](sites/sphinx.md) |
| Sphinx Temple, Khafre Valley Temple, Amenhotep II temple | done (satellite check) | schematic enclosures | todo | [sphinx](sites/sphinx.md) |
| Eastern & Western cemeteries, Central Field | footprints done (OSM) | generic mastabas | todo (Meresankh III, Hemiunu, Qar, Idu…) | [cemeteries](sites/cemeteries.md) |
| Queens' pyramids, Khentkaus I, satellite pyramids | done (map) | procedural | todo | [minor-monuments](sites/minor-monuments.md) |
| Workers' town, Wall of the Crow, workers' cemetery | partial | schematic | n/a | [minor-monuments](sites/minor-monuments.md) |
| Modern town, roads, terrain | done (OSM, DEM, Sentinel-2) | generated | n/a | `tools/geo/README.md` |

## Tools

- `tools/geo/build_geodata.py` — map footprints, elevation, Sentinel-2 (redistributable data).
- `tools/geo/sat_view.py` — stitch ~0.26 m/px Esri imagery around a point **for measuring only** (not redistributable; never commit its output). Log measurements in the site file.
- `tools/blender/*.py` — Blender (`pip install bpy`) model builders → `assets/models/*.glb`.
- `js/inscriptions.js` — every inscription, in Gardiner sign codes, with its status.

## Sources used so far

- Wikipedia, *Serapeum of Saqqara* (wikitext fetched 2026-11-11) — and through it Mariette 1882/1890, Linant de Bellefonds, Brugsch 1855/1884, Gunn 1926, Posener 1936, Dodson 2005.
- Wikimedia Commons photographs (viewed as reference, not redistributed) — listed per site.
- Petrie's 1880–82 Giza triangulation (via secondary transcription) — pyramid spacing.
- OpenStreetMap via Overture Maps; Copernicus GLO-30 DEM; Sentinel-2 L2A.
- Esri World Imagery, zoom 19 — measurement only.

Reachable but not yet mined: Harvard *Digital Giza* (giza.fas.harvard.edu) — tomb plans, wall photos and drawings for the cemeteries; the place to start for mastaba reliefs.
