# Serapeum of Saqqara — Greater Vaults

**Where:** Saqqara, 29.876 N 31.210 E — about 13.6 km SSE of the Great Pyramid, *not* on the Giza plateau. In the game it sits at its true offset (x +7311 m, z +11440 m), underground, reached by fast travel.
**Model:** `tools/blender/serapeum.py` → `assets/models/serapeum.glb` (Blender 5.3 via `bpy`; lighting baked to vertex colours with Cycles). Loaded by `js/models.js`.

## Researched and built (done)

| Item | Value | Source |
| --- | --- | --- |
| Total length of the Greater Vaults | ~350 m, with a parallel service tunnel | Wikipedia (Mariette 1882) |
| Number of sarcophagi remaining | 24 | Wikipedia (Dodson 2005) |
| Sarcophagus body | 3.85 × 2.32 × 2.32 m | Linant de Bellefonds, via Wikipedia |
| Cavity | 3.17 × 1.46 × 1.73 m | same |
| Lid | 3.85 × 2.32 × 0.98 m | same |
| Mass | 37.6 t body + 24.4 t lid ≈ 62 t | same |
| Chamber floors | 2–3 m below the gallery; box let ~1 m into a fitted recess | Wikipedia (Mariette 1882) |
| Amasis II box | red granite, panelled, Pyramid-Text band round the top, signs painted green; lid moved to the entrance | Wikipedia; photo 2 |
| Cambyses II box | grey granite, only the lid inscribed, blocks the original entrance | Wikipedia (Posener 1936) |
| Khabash box | smaller, at the mouth of an unused tunnel, lid shoved aside, 2-line text on the lid end, round-ended cavity | Wikipedia; photo 4 |
| Inscribed Ptolemaic box | polished black; decoration only scratched: drawn cornice + torus, panelling, 3 text lines, **empty cartouches** | Wikipedia (Gunn 1926); photo 3 |
| Lid shape | thick slab, top edges chamfered; many pushed ajar | photos 1, 4 |
| Chambers | barrel-vaulted, lower walls lined with limestone masonry | photo 2 |
| Visitor fittings | fluorescent tubes lying on the floors, timber rails at gallery level | photos 1, 4 |

Reference photos (Wikimedia Commons, viewed 2026-11-11; not redistributed):
1. `The Serapeum at Saqqara, 1550-30 BCE (9).jpg` — typical black box, lid ajar, chamber from above.
2. `Sacrophag in the Serapeum without cover.jpg` — Amasis II box, vaulted masonry chamber.
3. `By ovedc - Serapeum of Saqqara - 18.jpg` — scratched decoration on the Ptolemaic box.
4. `Apis Sarcophagus of Khabash.jpg` — Khabash box in its tunnel.
5. `Serapeum of Saqqara, Greater Vaults, 1856.png` — downloaded, **not yet examined**.

## Inscriptions (see `js/inscriptions.js`)

| Panel | Status | Notes |
| --- | --- | --- |
| Amasis lid | composed | Titulary (Khnemibre / Ahmose cartouches, standard writings) + "he made as his monument for the Living Apis". From the published translation; **not checked sign-by-sign against the lid photo** (`The Serapeum, a burial place of Apis bulls… (50601646887).jpg`, not yet viewed). |
| Amasis box, 3 faces | placeholder | Panelling + band layout right; band text is a stand-in ("words spoken, Osiris-Apis, …"), not the actual Pyramid-Text spell. |
| Cambyses lid | composed | Mesutire / Cambyses cartouches + dedication "to his father Apis-Osiris". Layout (2 rows on the lid end) is a guess — no photo found yet. |
| Khabash lid | composed | "Year 2, month Athyr, under the Majesty of… Khabash". 2 rows as in photo 4; signs not checked against it at reading resolution. |
| Ptolemaic box, 3 faces | placeholder | Style matches photo 3 (thin scratched lines, cornice, panelling, empty cartouches). Text is "O Osiris-Apis" repeated — the real spells (Gunn 1926 gives them) not transcribed. South face should show a house façade with a small bolted door: **todo**. |

## Still open (todo)

- **Plan.** The layout is schematic: one straight 250 m gallery with 21 chambers alternating sides, a 76 m transverse passage (Amasis chamber off it, Cambyses box at its south end), Khabash tunnel off the west end. Trace Mariette's plan (Mariette 1882 pl.; Dodson 2005 fig.) for the true shape, the real chamber count/spacing per side, which chamber holds which box, and the service tunnel.
- Which boxes are black / grey / red, and which lids are on, ajar or missing — per chamber (currently random).
- Gallery cross-section (assumed 3.2 m wide, 4 m walls + 1.4 m vault). Chamber size (assumed 5.6 × 8.6 m).
- The Lesser Vaults (Ramesses II / Khaemweset) and the isolated tombs: not modelled.
- The stelae niches in the gallery walls (hundreds of votive stelae were set into the walls near the entrance): not modelled.
- The surface: dromos of sphinxes (Nectanebo I), the Ptolemaic hemicycle of Greek philosophers. Not modelled; entrance is a stair to a lit doorway.
- Real transcription of the Amasis band and the Ptolemaic spells (Gunn 1926a/b in ASAE 26).
