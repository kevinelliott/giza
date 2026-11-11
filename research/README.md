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
| Great Pyramid of Khufu | done (survey) | **Blender, whole interior at true size**: al-Ma'mun's tunnel, Descending/Ascending Passages, plugs, Queen's Chamber and niche, Subterranean Chamber, Grand Gallery, antechamber, King's Chamber, Campbell's Chamber | Campbell's graffiti: 2 attested, 1 composed | [khufu](sites/khufu.md) |
| Pyramid of Khafre | done (survey) | exterior procedural; **Blender interior**: both passage systems, portcullis, burial chamber with sunk coffer, lower chamber (Petrie ch. 9) | Belzoni's 1818 inscription (wording attested, lettering not from a photo) | [khafre](sites/khafre.md) |
| Pyramid of Menkaure | done (survey) | **Blender**, to Petrie's measurements (true-size passages; lower-apartment depth still assumed) | panelled chamber: attested niche count | [menkaure](sites/menkaure.md) |
| Great Sphinx + enclosure | done (map + satellite check) | sculpted SDF; partial | **Dream Stele done** (Lepsius' record of the real text) | [sphinx](sites/sphinx.md) |
| Sphinx Temple, Khafre Valley Temple | done (plan agrees with OSM within 2 m) | **built from the published plan** (0.25 m grid); valley-temple pillars, beams and heights from Petrie | todo (statue emplacements) | [sphinx](sites/sphinx.md) |
| Amenhotep II temple | done (satellite) | outline only | todo | [sphinx](sites/sphinx.md) |
| Tomb of Meresankh III | measured (excavation report) | **Blender**; chapel, burial pit and chamber, sarcophagus | 8 photographs on walls, **positions verified** against the excavation report; architrave composed | [meresankh](sites/meresankh.md) |
| Eastern & Western cemeteries, Central Field | footprints done (OSM) | generic mastabas | todo (Meresankh III, Hemiunu, Qar, Idu…) | [cemeteries](sites/cemeteries.md) |
| Queens' pyramids, Khentkaus I, satellite pyramids | done (map) | procedural | todo | [minor-monuments](sites/minor-monuments.md) |
| Workers' town, Wall of the Crow, workers' cemetery | partial | schematic | n/a | [minor-monuments](sites/minor-monuments.md) |
| Modern town, roads, terrain | done (OSM, DEM, Sentinel-2) | generated | n/a | `tools/geo/README.md` |

## Tools

- `tools/geo/build_geodata.py` — map footprints, elevation, Sentinel-2 (redistributable data).
- `tools/geo/sat_view.py` — stitch ~0.26 m/px Esri imagery around a point **for measuring only** (not redistributable; never commit its output). Log measurements in the site file.
- `tools/blender/*.py` — Blender (`pip install bpy`) model builders → `assets/models/*.glb`.
- `tools/geo/temple_plans.py` — published temple plan → wall/pillar grid (`js/templedata.js`).
- `js/inscriptions.js` — every inscription, in Gardiner sign codes, with its status.

## Sources used so far

- Wikipedia, *Serapeum of Saqqara* (wikitext fetched 2026-11-11) — and through it Mariette 1882/1890, Linant de Bellefonds, Brugsch 1855/1884, Gunn 1926, Posener 1936, Dodson 2005.
- Wikimedia Commons photographs (viewed as reference, not redistributed) — listed per site.
- Petrie's 1880–82 Giza triangulation (via secondary transcription) — pyramid spacing.
- OpenStreetMap via Overture Maps; Copernicus GLO-30 DEM; Sentinel-2 L2A.
- Esri World Imagery, zoom 19 — measurement only.
- Lepsius, *Denkmäler aus Aegypten und Aethiopien* (1849), Dream Stele plate — public domain, used as a texture.
- Reisner, *A History of the Giza Necropolis* I (1942), plan of G 7530-sub — measured.
- Richard Mortel, photographs of the tomb of Meresankh III (CC BY 2.0, Wikimedia Commons) — four used as textures; all 30 reviewed.
- Wikipedia: *Pyramid of Menkaure*, *Dream Stele*, *Tomb of Meresankh III* (wikitext, 2026-11-11).

- Petrie, *The Pyramids and Temples of Gizeh* (1883), full text at ronaldbirdsall.com/gizeh/petrie/ — ch. 11 (inside of the Third Pyramid) and ch. 14 (the Granite Temple) used; chs. 6–9 cover the Great and Second Pyramids' interiors in the same detail and are the next thing to mine.
- Dunham & Simpson, *The Mastaba of Queen Mersyankh III* (Giza Mastabas 1, 1974), PDF from gizapyramids.org — wall-by-wall description.
- "Kahfre valley sphinx.svg" (HoremWeb, public domain, after Lehner & Verner) — temple plans.
- Lepsius, *Denkmäler* III Bl. 68, NYPL scan (public domain) — Dream Stele.

**Access notes.** gizapyramids.org serves the Giza Mastabas PDFs openly (text extracts with `pdftotext`; figures with `pdftoppm`) — the best source for the cemeteries. Harvard's *Digital Giza* pages load, but its image server (ids.lib.harvard.edu) refuses automated downloads: do not try to get round that; use the PDFs. Wikimedia throttles bursts — space requests a few seconds apart and never ask for a width larger than the original.
