# Valley of the Kings (Wadi al-Muluk, Luxor West Bank) — "Valley of the Dead"

Status: **researched, nothing built yet.** Researched 2026-11-11. All lengths in metres.
Reference photographs: `research/photos/valley-of-the-kings/` (14 files + `CREDITS.md`).

## Sources and how each number was obtained

| Tag | Source | Notes |
| --- | --- | --- |
| **TMP-plan** | Theban Mapping Project survey sheets (vector PDFs), `thebanmappingproject.com/sites/default/files/plans/KVnn.pdf` — KV01, 02, 05, 06, 08, 09, 11, 14, 16, 17, 35, 47, 57, 62 fetched (KV34.pdf = 404) | **Printed** on the sheet: grid N/E and elevation of each entrance datum, axis bearing, spot elevations (m above sea level). **Scaled by me** from the vector line-work against the sheet's own scale bar (KV62 sheet 1:125 reduced, 8.1635 pt/m; KV9 sheet 1:200, 14.173 pt/m): every length/width/height below marked "scaled". Expect ±0.03–0.05 m; walls are rough-cut and not parallel, so widths vary by a few cm along a room. |
| **TMP-web** | TMP tomb pages (description, per-chamber H/W/L tables) | **Not readable**: `thebanmappingproject.com/tombs/...` answers HTTP 403 (Cloudflare) to automated clients; ARCE mirror and web.archive.org unreachable from the build sandbox. Only what third parties quote is used, and is marked so. The per-chamber tables on those pages should be checked by hand against the "scaled" figures here. |
| **de.wp** | German Wikipedia *KV62* (wikitext, 2026-11-11) — long, well-referenced article (Carter, Reeves, Eaton-Krauss, Getty) | room areas, stair/corridor lengths (these agree with my scaling to 1 cm, so they are evidently TMP's), sarcophagus size, wall-painting programme, hieroglyph captions, modern fittings |
| **en.wp** | English Wikipedia *Tomb of Tutankhamun*, *Tutankhamun's mummy*, *KV9*, *El Qurn*, *Valley of the Kings* (wikitext) | rounded room sizes after Reeves 1990 p. 70; mummy history |
| **OSM** | OpenStreetMap API 0.6, bbox 32.590,25.733,32.618,25.748 (© OpenStreetMap contributors, ODbL) | visitor centre, roads, paths, shelters, cliffs; tomb outlines traced by a mapper from the TMP plans (ways tagged `tunnel=yes`) |
| **DEM** | Copernicus GLO-30 tile N25 E032 | 30 m cells: fine for peaks and ridges, **too coarse for the narrow wadi floor** (reads 5–35 m high at tomb entrances because cells mix floor and cliff) — use TMP elevations for anything in the valley |
| **Getty** | Getty Conservation Institute, *Conservation and Management of the Tomb of Tutankhamen* project page | modern fittings, in words only |
| **photo** | the Commons photographs in `research/photos/valley-of-the-kings/` | arrangement of figures, colours, fittings — observation, not measurement |

**Disagreements — which to trust.** (1) KV62 room sizes: en.wp/Reeves rounds (antechamber 7.9 × 3.6, annexe 4.4 × 2.6, burial chamber 6.4 × 4.0, treasury 4.8 × 3.8); my scaling of the TMP sheet gives the same to within 0.05 — use the scaled figures. (2) Treasury floor: de.wp says it is "about level with the antechamber"; the TMP sheet prints 162.263 against 163.365 for the antechamber, i.e. 1.10 **below** — trust TMP. (3) KV62 antechamber spot levels differ slightly between the KV62 sheet (floor 163.365, ceiling 166.123) and the inset on the KV9 sheet (163.382, 166.370) — use the KV62 sheet; the 0.25 ceiling difference is unexplained. (4) al-Qurn summit: 420 m is the figure usually quoted in guidebooks (UNVERIFIED, no primary source found); en.wp says 450 m; the DEM gives 447–451 m — use 450. (5) KV9 length: en.wp/guidebooks "104 m"; TMP-web (quoted by a third party) "total length 116.84 m"; datum to rear wall of chamber K scaled along the axis = 108.5 m horizontal. Build from the per-section table.

---

## 1. Geography

### 1.1 Key points

| Item | Lat, Lon (WGS84) | Elevation (m asl) | Source |
| --- | --- | --- | --- |
| Central area of the East Valley (rest area between KV62, KV9, KV10, KV55) | 25.7403, 32.6014 | ≈170–171 (KV62 datum 170.550) | OSM; TMP-plan |
| Visitor centre building (centroid) | 25.74544, 32.60481 | ≈149 (DEM; open ground, so reliable to ±3) | OSM way 115773401 "Visitors center" |
| Visitor-centre footprint | ≈48 N–S × 35 E–W, irregular, perimeter 144 | — | OSM |
| Ticket office / taf-taf ticket booth | 25.74532, 32.60469 / 25.74530, 32.60459 | ≈150 | OSM nodes |
| Car and coach park | 25.74658, 32.60512 (≈125 × 100) | ≈148 | OSM way 89657572 |
| al-Qurn summit | 25.7360–25.7363, 32.5943–32.5957 (DEM maxima 450.6 and 447.3); en.wp infobox 25.7364, 32.5961 | **≈450** (see disagreement 4) | DEM; en.wp |
| al-Qurn from KV62 entrance | **bearing 231–236° (SW), 720–850 m horizontal, ≈280 m above the valley floor** → elevation angle ≈ 19–21° | — | computed |
| Highest ground of the Theban plateau behind | 480–490 at 1.4–1.5 km, bearing 245–270° | 490.7 max in window | DEM |

Visitor centre → KV62: 662 m straight, bearing 211° (SSW); the ground rises ≈21 m (149 → 170).

### 1.2 Tomb entrances

Entrance datum = the TMP survey point at the outer end of each entryway (its N/E/elevation is printed on the sheet). Converted to lat/lon by: (a) rotating TMP grid offsets by **27.04°** (TMP grid north lies 27.04° clockwise of true north — measured from the two north arrows on the KV9 sheet; consistent with printed axis bearings being true bearings, since the OSM-traced outlines of KV62 and KV9 run at 271° and 290–291°); (b) anchoring KV62's datum at 25.74033, 32.60139 (mean of two OSM-outline estimates 9 m apart; en.wp's infobox gives 25.74039, 32.60142). **Relative positions are survey-grade (cm); absolute position ±10 m.** E/N columns are metres true-east/true-north of the KV62 datum — use these to place entrances.

| Tomb | Owner | E | N | Lat | Lon | Datum elev. | Axis (true, direction walked going in) | OSM node (mid-tomb label, not the entrance) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KV62 | Tutankhamun | 0.0 | 0.0 | 25.74033 | 32.60139 | 170.550 | 271°40′52″ (W) | 25.74029, 32.60130 |
| KV9 | Ramesses V/VI | −8.2 | 0.0 | 25.74033 | 32.60131 | 174.306 | 290°20′02″ (WNW) | 25.74065, 32.60040 |
| KV17 | Seti I | +51.8 | −38.3 | 25.73998 | 32.60191 | 178.021 | 217°40′50″ (SW) | 25.73937, 32.60152 |
| KV11 | Ramesses III | −32.0 | −19.9 | 25.74015 | 32.60107 | 175.890 | 178°43′08″ (S) | 25.73907, 32.60109 |
| KV2 | Ramesses IV | +73.3 | +132.7 | 25.74153 | 32.60212 | 167.807 | 291°30′00″ (WNW) | 25.74172, 32.60169 |
| KV6 | Ramesses IX | +24.4 | +34.9 | 25.74064 | 32.60164 | 171.481 | 123°00′34″ (ESE) | 25.74026, 32.60228 |
| KV8 | Merenptah | −46.4 | +54.1 | 25.74082 | 32.60093 | 178.964 | 280°51′08″ (W) | 25.74098, 32.60007 |
| KV14 | Tausret / Setnakht | −161.5 | −125.2 | 25.73920 | 32.59978 | 186.830 | 263°37′46″ (W) | 25.73907, 32.59880 |
| KV34 | Thutmose III | — | — | UNVERIFIED (no TMP sheet at that URL) | | UNVERIFIED | bent axis | 25.73789, 32.60102 (the entrance is high in a cleft at the south head of the valley, reached by a modern steel stair) |
| KV35 | Amenhotep II | −122.7 | −19.2 | 25.74016 | 32.60017 | 185.500 | 289°05′20″ (WNW) | 25.74004, 32.59982 |
| KV16 | Ramesses I | +43.9 | −30.6 | 25.74005 | 32.60183 | 178.032 | 240°24′50″ (WSW) | 25.73983, 32.60155 |
| KV47 | Siptah | −138.2 | −111.2 | 25.73933 | 32.60001 | 185.160 | 172°02′10″ (S) | 25.73829, 32.60016 |
| KV57 | Horemheb | −62.4 | −28.2 | 25.74007 | 32.60077 | 173.242 | 357°43′25″ (N) | 25.74075, 32.60075 |
| KV5 | Sons of Ramesses II | +53.1 | +46.6 | 25.74075 | 32.60192 | 169.874 | 134°10′45″ (SE) | 25.74058, 32.60222 |
| KV1 | Ramesses VII (first tomb met coming in) | +48.8 | +235.0 | 25.74245 | 32.60188 | 171.219 | 327°43′03″ (NNW) | 25.74267, 32.60182 |

Reading the table: the wadi floor falls from ≈187 at the south-west heads (KV14, KV47, KV35) through ≈170.5 at the centre (KV62 — the lowest point of the central area) to ≈168 at KV2, then on down to ≈149 at the visitor centre. KV9's entrance is 8.2 m due west of KV62's and 3.76 m higher; KV9's entry ramp passes **over** KV62's antechamber (printed on both sheets).

### 1.3 Terrain

| Item | Value | Source |
| --- | --- | --- |
| Valley floor, central area | 170–175 | TMP-plan datums |
| Ancient bedrock floor at the centre | ≈5 m below the modern surface (KV62/KV55/KV63 are cut in bedrock under flood debris) | en.wp *Valley of the Kings* |
| Ground 100 / 200 / 300 / 400 m from KV62, by bearing (DEM, m asl) | N 192/207/198/227 · NE 173/169/177/180 (the exit wadi) · E 190/182/214/195 · SE 204/223/265/247 · S 215/242/256/283 · SW 194/219/243/269 · W 199/238/278/297 · NW 207/241/259/235 | DEM (smoothed; real cliffs are steeper) |
| Enclosing cliffs and spurs | rise 30–60 m above the floor within 100–200 m of the centre, 90–130 m within 400 m (S, SW, W); near-vertical limestone faces 10–30 m high with scree aprons | DEM + photos 01, 02, 04 |
| Cliff lines | OSM `natural=cliff` ways (e.g. 90357056, 90357058 at the south head; 255024410–255024419 along the access wadi) | OSM |
| Rock | white to buff Theban limestone with calcite veins, over shale; scree is pale grey-buff | de.wp |
| Site fence | 1.79 km perimeter | OSM way 1454237757 |

### 1.4 Modern visitor layout

| Item | Value | Source |
| --- | --- | --- |
| Visitor centre | single-storey; holds the ticket hall and a large transparent 3-D model of the valley and its tombs — interior layout UNVERIFIED | OSM (footprint); model: general knowledge, UNVERIFIED |
| Road, visitor centre → valley | asphalt service road + footway heading SSW up the wadi; ≈170 (service) + 312 (asphalt) m to the drop-off at ≈25.7418, 32.6030; width not tagged (photos: single lane, ≈4–5 m) | OSM ways 89657579, 1468423314 |
| "Taf-taf" electric train | rubber-tyred road train on that road (not on rails): small tractor unit + 2–3 open-sided roofed carriages with bench seats; own ticket booth at the visitor centre; run ≈480 m. Livery/colour varies by year — UNVERIFIED | OSM ticket node "TafTaf"; vehicle description general knowledge |
| Drop-off / upper gate | 25.7417–25.7418, 32.6029–32.6030: two site-map boards, building 6.4 × 4.6, flat-roofed shelter 29.9 × 4.7 | OSM nodes 13467828704/718, ways 1468423329, 116646283 |
| Main path up the valley | pedestrian way from the drop-off SW to the centre, ≈230 m; branches to KV8/KV9 (W), KV11/KV57 (S), KV16/KV17 (SE), KV34 (far S), KV14/KV47/KV35 (SW); compacted pale gravel/limestone with low kerbs, 3–6 m wide (photos) | OSM `highway=pedestrian/footway` (65 ways); width from photos 01, 04 |
| Shade shelters | flat roofs on posts with benches: 29.9 × 4.7 (drop-off), 11.1 × 3.3 (25.74090, 32.60233), 4.4 × 3.2 (25.74007, 32.60132, by KV62/KV10), plus the L-shaped one at the gate; rest-house building 28 × 7–11 at 25.74029, 32.60184 (central rest area) | OSM `building=roof` / `building=yes` |
| Tomb entrance surrounds | each open tomb has a low masonry enclosure of pale limestone rubble set in mortar, ≈0.8–1.2 m high, wrapping the stair/ramp cutting on three sides (flood protection after 1994); OSM maps 455 `barrier=wall` segments in the valley. Heights UNVERIFIED (photo estimate) | OSM; photos 01, 04, 05 |
| Entrance signs | free-standing or wall-fixed panel per tomb with number, owner, plan and isometric (TMP/SCA design, bilingual English/Arabic); a "tombs open today" board near the centre (25.74016, 32.60155) | OSM information nodes; photo 05 shows the older painted "TOMB OF TUT ANKH AMUN NO:62" sign |
| Gates | white-painted steel-bar gates at each entrance (photo 05) | photo |

---

## 2. KV62 — Tutankhamun

**Frame for the model.** Origin = TMP datum at the head of the stair (grid N 99,572.277, E 94,069.638; **170.550 m asl**). **x** runs into the tomb along the axis, true bearing **271.68°** (2° north of due west). **y** is perpendicular, positive to the **right** of someone walking in = true north (bearing 1.68°). **z** = metres above the antechamber floor (163.365 m asl), so the datum is at z = +7.185. Ignoring the 1.7° skew, "west wall" = far (+x) wall, "north wall" = +y wall, as everyone calls them.

Rock-cut in white limestone; all rooms rough-chiselled and undecorated except the burial chamber, which is plastered and painted. Total floor area 109.83 m² (de.wp, from TMP).

### 2.1 Elements (scaled from the TMP sheet unless stated)

| Element | x range | y range | Size | Floor z | Ceiling z / height | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Entryway A** (open stair pit, now under a modern shelter) | 0 → 5.61 | −0.42 → +1.26 | **5.61 long × 1.68 wide** (de.wp: 5.61 × 1.66) | +7.185 at top → +3.38 at foot (166.745 printed) | open; rock overhang above the lower steps | **16 steps**, each tread 0.27 × riser 0.24 (drawn as restored: total run 4.04–4.3, total fall 3.80); a short level landing precedes the first step. Steps 1–10 rock-cut; the lowest 6 were cut away for the burial, rebuilt in stone and mortar, removed again by Carter in 1930 (de.wp/Carter) — today a modern stair overlies them |
| **Gate B** (1st sealed doorway) | 5.61 → 6.62 | −0.37 → +1.22 | 1.59 wide, ≈1.0 thick, ≈2.1–2.4 high (lintel ragged; UNVERIFIED) | +3.38 | — | plastered rubble blocking ≈1 m thick, removed 1922; modern steel door here |
| **Corridor B** | 6.62 → 14.25 | −0.39 → +1.25 | **7.63 horizontal / 8.02 on the slope × 1.64–1.68 wide × 1.97 high vertically (1.87 perpendicular to the floor)** (de.wp: 7.67 × 1.66) | +3.05 → +0.55 | parallel to floor | **slope 18.0° down**; was filled with rubble |
| **Gate I** (2nd sealed doorway) | 14.25 → 15.18 | −0.35 → +1.13 | 1.50–1.58 wide, 0.93 thick, 1.83 high at the outer face, 2.11 at the inner | +0.55 → **+0.27** | — | the corridor floor ends **0.27–0.29 above the antechamber floor** (one step down into the room); second modern steel door |
| **Antechamber I** | 15.09/15.32 → 18.69/18.87 | −4.04 → +3.86 | **7.90 N–S × 3.55 E–W** (walls not square: 3.50–3.60) ; 28.02 m² (de.wp) | **0** (163.365 printed) | **+2.76** (166.123 printed) → height 2.73–2.76 | long axis N–S, corridor enters the east wall off-centre (door centre at y = +0.4, i.e. 4.4 from the south wall, 3.5 from the north). Beam niche in the west wall: 0.29 wide × 0.32 high × 0.15 deep, sill 0.25 above the floor, y = +0.69 → +0.98 |
| Partition I / J | — | +3.86 → +4.90 | ≈1.03 thick, full width of the antechamber's north end | — | — | dry-stone and plaster wall, not rock; held the sealed doorway. **Almost entirely dismantled by Carter**; today an open edge with the visitor balustrade. Original doorway size not measurable (TMP says so) — UNVERIFIED |
| **Annexe Ia** | 19.28/19.53 → 21.84/22.15 | −4.43 → −0.01 | **4.35 N–S × 2.60 E–W**; 11.14 m² (de.wp) | **−1.07** (162.296 printed) | +1.54 → height 2.58–2.68 | ceiling 1.22 lower than the antechamber's |
| Doorway I → Ia | 18.69 → 19.38 (0.70 thick) | −3.06 → −2.06 | **1.00 wide × 1.40–1.46 high** (de.wp: 1.40) | threshold at antechamber floor level (z = 0) | lintel +1.42 | in the antechamber's west wall, 1.0 from its SW corner. **"Sill": the annexe floor is 1.07 below the threshold** — a straight drop, no steps. Closed by a steel grille today |
| **Burial chamber J** | 15.37/15.44 → 21.51/21.82 | +4.80/+4.93 → +8.94/+8.97 | **6.37 E–W × 4.03–4.10 N–S**; 26.22 m² (de.wp) | **−0.94** (162.426 printed) | +2.76 (same plane as the antechamber ceiling) → **height 3.66–3.70** | long axis E–W, at right angles to the antechamber; its east wall is flush with the antechamber's east wall and it extends 2.9 further west. **Step down from the antechamber: 0.94.** Four magic-brick niches, one per wall, each 0.16–0.20 wide × 0.24–0.27 high × 0.10–0.18 deep (de.wp/Carter); plan shows the east one at y = +6.21 → +6.41 and the west one at y = +6.67 → +6.87 |
| **Treasury Ja** | 11.01/11.12 → 14.84/14.91 | +6.07 → +10.86 | **4.75 N–S × 3.80 E–W**; 18.06 m² (de.wp) | **−1.10** (162.263 printed; 0.16 below J) | +1.26 → height 2.33–2.36 | lies **east** of the burial chamber, i.e. back toward the entrance, north of the corridor |
| Doorway J → Ja | 14.90 → 15.40 (0.50 thick) | +7.63 → +8.76 | **1.12 wide × ≈1.55 high** above the J floor | step down 0.16 into the treasury | lintel +0.61 | in J's east wall, 0.2 from its NE corner; never blocked in antiquity; steel grille today |

Depth below the modern surface: antechamber floor 7.2 below the datum; burial-chamber floor 8.1; the modern ground at the shelter is ≈0.9 above the datum.

### 2.2 Sarcophagus

| Item | Value | Source |
| --- | --- | --- |
| Box | single block of yellow-brown **quartzite**, corners repaired in calcite; **2.75 long × 1.33 wide × 1.49 high** | de.wp (after Eaton-Krauss 1993). Carter's "9 ft × 4 ft 10 in × 4 ft 10 in" = 2.74 × 1.47 × 1.47 is from memory of *The Tomb of Tut.ankh.Amen* II — UNVERIFIED; TMP plan as drawn 2.66 × 1.34. Trust 2.75 × 1.33 × 1.49 |
| Wall thickness / cavity | the plan draws three nested rectangles: 2.66 × 1.34 (outside), 2.42 × 1.10, 1.94 × 0.62 (innermost) — i.e. walls ≈0.12 at the rim with a stepped interior; depth UNVERIFIED | TMP-plan, scaled — approximate |
| Lid | **red granite**, painted yellow to match; **cracked right across the middle** (ancient, plaster-filled); ≈1250 kg; sloping "per-wer" shrine-roof profile, highest at the head (west) end | de.wp / Carter |
| Decoration | four winged goddesses in raised relief at the corners (Isis and Nephthys at the west/head end, Selket and Neith at the east/foot end), wings spread along the sides; cavetto cornice; base frieze of alternating djed and tyet signs on a black-painted plinth; rim text band and four text columns on each long side; winged sun-disc on the lid's head end | de.wp |
| Position in the chamber | plan rectangle x 17.33 → 20.00, y +6.21 → +7.56: **long axis E–W, head to the west; 1.93 from the east wall, ≈1.6–1.8 from the west wall, ≈1.35 from the south wall, ≈1.40 from the north wall**. Stands directly on the chamber floor, unmoved since 1922 | TMP-plan; de.wp |
| Contents, historically | golden lion-headed bier, three nested coffins (outer two gilded wood, inner 110.4 kg gold), the mummy. Outer coffin ≈2.1–2.2 long (en.wp: "7 ft") | en.wp |
| 1926–2007 | mummy on a sand tray inside the **outer gilded coffin**, inside the sarcophagus, under a **plate-glass sheet** replacing the lid | en.wp |
| Nov 2007 → today | **mummy moved to a climate-controlled glass case in the antechamber**, still there (photo 12, 2024): shrouded in linen to the neck, head and feet exposed, on a low dark-wood plinth under a frameless glass box ≈2.2 × 0.8 × 0.7 (photo estimate). Position of the case within the antechamber UNVERIFIED (it stands along a wall away from the viewing edge) | en.wp; photo; web search 2026-11 (Egyptian officials: the mummy stays in the tomb) |
| 12 July 2019 | **outer gilded coffin removed to the Grand Egyptian Museum** for conservation (first time out of the tomb); now shown there with the other two (GEM opened Nov 2025) | Ministry of Antiquities notice via web search |
| **Current arrangement (answer)** | the sarcophagus box stays in place **with the cracked granite lid back on it**, resting on timber battens (photo 11, April 2022); it holds no coffin. **The premise "outer gilded coffin with the mummy in a glass case in the antechamber" is half right: the mummy is in the antechamber case, the coffin is in Cairo.** Whether the lid has been moved again since 2022: UNVERIFIED | photo 11 |

### 2.3 Burial-chamber wall paintings

General (de.wp, Getty, photos 06–08, 10, 11):

- Ground colour of all four walls **golden yellow ochre** over white gypsum plaster ("house of gold"). North wall: figures were painted on white and the yellow filled in around them, slightly paler than the other three walls (Getty). Palette: red-brown, yellow, blue, green, black, white. Covered with dark brown spots (dead microbial growth, present since 1922) — keep them in the texture.
- **Ceiling: bare, rough-chiselled white limestone, no plaster, no paint**, with a dark flood stain (photo 10).
- Layout top to bottom: a narrow strip of yellow below the ceiling; a **dark blue "sky" band** (elongated *pt* sign, Gardiner N1) across the full width, ≈0.07–0.10 high; the figure field; a **black baseline** (earth, N17 *tꜣ*); below it a **plain white dado** to the floor.
- **Band heights are not published in anything I could read — APPROXIMATE, from photos:** dado ≈1.0 (0.9–1.2) high; figure field ≈2.4–2.6; sky band top ≈0.1 below the ceiling. Chamber height 3.66. Figures are well over life-size (≈2.0–2.2 from baseline to crown tip on the north wall). Check against the Getty/Factum Arte recording if it becomes reachable.
- Proportion grids: 20-square (Amarna) on the north, east and west walls, 18-square (traditional) on the south wall (de.wp).
- Narrative order: east → north → west → south (anticlockwise seen from above).

**North wall** (6.37 wide; the wall facing the visitor). Photo `06`. Seven figures in three scenes; listed **left (west) → right (east)** as the viewer sees them:

| # | Figure | Facing | Dress / attributes |
| --- | --- | --- | --- |
| 1 | **Osiris** | right | mummiform, white wrappings with red crossed bands, green face, white crown with plumes (atef); embraces the king |
| 2 | **Tutankhamun** | left | striped yellow-and-blue nemes, broad collar, white kilt; arms round Osiris |
| 3 | The king's **ka** | left | blue-black wig, ka-arms sign holding the Horus name on his head, hand on the king's shoulder, ankh in the other |
| 4 | **Nut** | right | long white dress with red sash, blue-black wig with white fillet; both hands held out palm-down with water ripples (*nyny* greeting) |
| 5 | **Tutankhamun** | left | short dark round wig with gold fillet and uraeus, white kilt; tall staff in the front hand, mace and ankh in the rear hand |
| 6 | **Tutankhamun as Osiris** | right | mummiform, white, white crown with plumes, crossed flails, winged-scarab pectoral |
| 7 | **Ay** | left | blue crown (khepresh) with uraeus, leopard skin of the sem-priest over a white kilt, raising the adze to the mummy's mouth |

Between 6 and 7: a low table with a second adze, a foreleg, an ostrich feather on a finger-shaped rod and the double-feather sign; above it five small cups in a row. Low on the wall at the far left: the magic-brick niche. The rope of the east-wall procession begins at the right edge.

Captions (de.wp; Gardiner codes as given there; status **composed** in this repo's terms — not checked sign by sign against the photo):

- Above Ay, four columns, signs facing left: `R8-F35-V30-N19:N21*N21-V30:D4-Aa1-X1:X1` · `M23:X1-L2:X1-<-N5-L1*L1-L1->` · `G39-N5-<-R8-M17-X1-I9-M17-A2-M17-M17->` · `X8-S34-W19-N5:Z1-D&t&N17-V28-N5-V28` — "The good god, lord of the Two Lands, lord of ritual / King of Upper and Lower Egypt Kheperkheperure / Son of Re, God's-father Ay / given life like Re for ever and eternity". (Cartouche brackets and G39 added by me where de.wp writes `ra-zA`; verify.)
- Above the Osiride king (6), three columns: `R8-F35-V30-N19:N21*N21-V30-N28:a:Z2` · `M23:X1-L2:X1-<-N5-L1:Z2-V30->` · `G39-N5-<-M17-Y5:N35-X1*G43*X1-S34-S38-O28-M26->-X8-S34-D&t&N17` — "The good god, lord of the Two Lands, lord of appearances / King of Upper and Lower Egypt Nebkheperure / Son of Re, Tutankhamun ruler of Upper Heliopolis, given life for ever". This is the only place on the walls with both of his cartouches.
- Nut: "Lady of heaven, mistress of the gods; she makes *nyny* for the one she bore, she gives health and life to your nostril" (translation only).
- Above the king in scene 3: "The good god, lord of the Two Lands, lord of appearances, given life for ever and eternity" (translation only). Osiris: "Osiris, foremost of the West, the great god" — standard epithets, UNVERIFIED for this wall.

**East wall** (≈4.0 wide; on the visitor's right; the treasury doorway is at its far, north end, below the dado line). Photo `08`. Signs read left to right. **Left (north) → right (south):**

- Left two-thirds: **twelve men in white**, in five groups (de.wp; count the grouping off photo `08`), walking **left**, all with white mourning headbands, hauling a rope. The next-to-last pair have shaven heads and different dress — probably the two viziers. Above them, short columns of text: they say with one voice "Nebkheperure, come in peace, O god, protector of the land".
- Right third: the **mummy on a lion bier inside a canopied shrine** topped by friezes of uraei (photo `08`), standing on a **boat** (red and white streamers at prow and stern, wedjat eye on the prow) which stands on a **sledge**. Small figures of Nephthys at the prow and Isis at the stern. Above the mummy: "The good god, lord of the Two Lands, Nebkheperure, given life for ever and eternity" (one cartouche, throne name only).

**West wall** (≈4.0 wide; on the visitor's left). Photos `07`, `10`. First hour of the Amduat. A grid ruled in black:

- Top strip, full width, ≈0.25 high: one line of hieroglyphs (opening of the Amduat, first hour).
- Upper register, two panels. **Left panel: the solar boat** with the scarab **Khepri** between two figures raising their arms to it (their identity — usually given as two forms of Osiris — UNVERIFIED). **Right panel: five standing deities** facing left, named in de.wp as Maa, Nebet-uba, Heru, Ka-Shu, Nehes.
- Below: **three registers × four compartments = twelve squatting baboons**, blue-grey with red faces and hindquarters, all facing right, each with a short label in front — the twelve hours of the night. The magic-brick niche cuts into the bottom register near the middle of the wall (photos `07`, `10`).
- Closing text of the hour (translation, de.wp): "120 *iteru* to travel to this gateway. The hour that guides in this gateway — her name is 'She who smashes the foreheads of the enemies of Re'. It is the first hour of the night."

**South wall** (6.37 wide; behind and beside the visitor — the platform is against it). Only the western ≈2.8 survives; the eastern part was on the partition Carter took down. No colour photo on Commons; one black-and-white reproduction (see CREDITS). As the viewer faces it, **right (west) → left (east)**:

| # | Figure | Facing | Notes |
| --- | --- | --- | --- |
| 1 | **Hathor**, goddess of the West, "mistress of heaven" (*nbt pt*) | left (east) | holds an ankh to the king's nose, another in her lowered hand |
| 2 | **Tutankhamun** | right (west) | khat (bag) headdress with uraeus, white kilt |
| 3 | **Anubis** | right | jackal-headed, hand on the king's shoulder, ankh |
| 4 | **Isis** — *destroyed* | right | making *nyny* like Nut opposite; known from Burton's photograph of the reassembled blocks |
| 5–7 | **Three identical squatting underworld deities** — *destroyed* | right | stacked/in a row at the east end |

The fragments with 4–7 were stored in KV14 and are lost. For the model: paint 1–3, leave the eastern 3.5 as the open gap to the antechamber.

### 2.4 Modern fittings (Getty 2009–2019 project; photos)

| Item | What is known | Status |
| --- | --- | --- |
| Entrance | roofed shelter on four timber posts within masonry retaining walls (TMP sheet notes 1–3: "modern retaining wall", "modern shelter over entrance supported by retaining walls and four wooden columns", "modern steps leading to the shelter and tomb entrance"); low rubble enclosure wall (after the 1994 flood); barred steel gate; sign panel | TMP-plan notes; photo 05 |
| Stair and corridor | modern timber stair laid over the ancient steps; timber ramp with cross-battens and handrails down the corridor; steel security doors at the top and bottom of corridor B | de.wp; ramp details from general knowledge — UNVERIFIED |
| Antechamber | raised timber floor; **viewing edge at the north end where the partition stood**: balustrade of dark timber posts and top rail with glass infill panels, ≈1.1 high, looking down 0.94 into the burial chamber; visitors go no further | photo 10; Getty ("visitor walkways, protective barriers") |
| Mummy case | see 2.2 | photo 12 |
| Grilles | steel grilles across the annexe and treasury doorways | de.wp |
| Lighting | continuous warm-white LED strips in a low white housing along the **foot of the burial-chamber walls** (on the floor, lighting the dado and wall upward), plus low-level lighting on the platform; no ceiling fittings | photo 11; Getty ("lighting") |
| Ventilation | Getty installed an air supply/extract and filtration system to limit humidity, CO₂ and dust; duct routes and grille positions UNVERIFIED | Getty (summary only) |
| Burial-chamber floor | bare rock, uneven (photo 11) | photo |

---

## 3. KV9 — Ramesses V / VI (the large tomb chosen)

Chosen over KV17 because the KV9 sheet has a single straight axis with a full longitudinal section and printed levels, the tomb is open, and Commons has two section-by-section photo series. (KV17's three sheets were also fetched: datum 178.021, axis 217°40′50″, pillared halls F and J, side rooms Fa, Ja–Je, K — not measured yet.)

**Frame.** Origin = TMP datum at the outer end of the entry ramp (grid N 99,568.532, E 94,062.336; **174.306 m asl**; 8.2 m west of and 3.76 m above the KV62 datum). **x** along the axis, true bearing **290.33°**; **y** positive to the right going in (bearing 20.33°, NNE). Elevations in m asl (printed where marked *p*, otherwise scaled from the section: z = 174.306 − depth). TMP-web totals as quoted by a third party: max height 6.92, min width 2.48, max width 13.03, total length 116.84, area 510.07 m², volume 1572.26 m³; entrance type ramp; axis straight.

Gates are named for the room they lead into. Corridor lengths are gate-face to gate-face (this reproduces the two TMP-web figures a search engine quoted: 12.37 and 10.37).

| Section | x range | Length | Width | Floor elev. | Ceiling elev. | Height | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Entryway A** (open ramp) | −1.1 → 11.85 open; 11.85 → 14.70 under the rock overhang | 15.8 | 3.67–3.75 | 174.31 *p* → 173.6 at x 5 → 172.59 at 11.85 → 172.18 at 14.70 (173.079 *p* at x ≈ 7.5) | cutting sides rise to ≈180.9 at the overhang face | open | slope ≈8°; ramp with shallow side steps today under a timber walkway |
| Gate B | 14.70 → 15.44 | 0.74 | 2.76 | 172.2 | 175.9 | 3.61 | |
| **Corridor B** | 15.44 → 30.38 | 14.94 (12.65 at full width, then a 2.29-long narrowed bay 2.79 wide before the next gate) | 3.17 | 172.05 → 171.40 (171.586 *p* at x ≈ 23) | 175.9 → 175.1 | 3.8–3.9 | slope ≈3.3° |
| Gate C | 30.38 → 31.14 | 0.76 | 2.81 | 171.4 → 171.14 | 174.63 | 3.23–3.49 | |
| **Corridor C** | 31.14 → 43.51 | **12.37** | 3.17–3.18 | 171.13 level, dipping to 170.90 in the last 2.8 | 174.77 | **3.65** | one niche in each wall at x 33.32 → 35.90: 2.58 long × 0.52 deep × 1.07 high, sill 2.06 above the floor |
| Gate D | 43.51 → 44.27 | 0.76 | 2.72 | 170.9 | 174.39 | 3.26–3.48 | |
| **Corridor D** | 44.27 → 54.64 | **10.37** | 3.17–3.19 | 170.91 → 170.95 → 170.71 | 174.59 | 3.65 | a recess 0.69 long × 0.52 deep in each wall at x 53.84 → 54.53 |
| Gate E | 54.64 → 55.39 | 0.75 | 2.75 | 170.7 | 174.2 | 3.23–3.41 | |
| **Chamber E** ("well room"; no shaft was cut) | 55.39 → 59.90 | 4.51 | 4.16 (y −2.19 → +1.97) | 170.82 → 170.58 (170.653 *p*) | 174.45 | 3.63–3.87 | KV57 passes underneath (its room F: floor 152.699, ceiling 155.540 *p*) |
| Gate F | 59.90 → 61.10 | 1.20 (double jamb) | 2.70 | 170.55 | 174.06 | 3.26–3.73 | |
| **Pillared hall F** | 61.10 → 68.32 | 7.22 | **8.41–8.43** (y −4.35/−4.57 → +4.06/+3.86) | side floors 170.55 | 174.24 | 3.69 | **4 pillars**, 1.05–1.09 square, 3.68 high: at x 62.79 → 63.88 and x 65.57 → 66.64, y +1.36 → +2.40 and y −1.79 → −2.84 (aisle between the rows 3.15) |
| Central descent in F | 61.10 → 68.32 | 7.22 horizontal | 3.15 (y −1.89 → +1.26) | 170.50 → 167.81 | — | — | **slope 20.4° down**, between the pillar rows, cut through the hall floor; continues level 2.66 further to gate G |
| Passage under F's rear wall | 68.32 → 70.98 | 2.66 | 3.15 → 2.94 | 167.81 → 167.4 | 171.07 | 3.3–3.7 | |
| Gate G | 70.98 → 71.59 | 0.61 | 2.70 | 167.3 | 170.8 | 3.0–3.5 | |
| **Corridor G** | 71.59 → 78.90 | 7.31 | 3.16–3.20 | 167.28 → 167.25 (**167.249** *p*) | 170.97 | 3.70 | level |
| Gate H | 78.90 → 79.51 | 0.61 | 2.72 | 167.2 → 167.0 | 170.6 | 3.36–3.60 | |
| **Corridor H** | 79.51 → 89.24 | 9.73 | 2.97–3.17 | 167.00 → 165.71 at x 86.6 → 165.18 | 170.78 → 170.75 at x 86.6, then stepping down to 170.15 | 3.78 → 5.0 | **slope 10.3° down**; a hole at the upper left of the lintel at its end is where the cutters broke into **KV12** room G above (KV12 floor 169.472 *p*) — patched |
| Gate I | 89.24 → 90.01 | 0.77 | 2.68 | 165.3 → 165.0 | 168.66 | 3.36–3.66 | |
| **Chamber I** (antechamber) | 90.01 → 94.54 | 4.53 | 4.15–4.17 (y −2.81/−2.93 → +1.34/+1.24) | 165.00 → 164.82 | 168.67 (**168.631** *p*) | 3.7–3.85 | |
| Gate J | 94.54 → 95.5 | 0.54 + 0.44 reveal | 2.62 | 164.8 | 168.25 | 3.34–3.46 | double-leaf door swing drawn |
| **Burial chamber J** | 95.52 → 104.4 (rear wall face; pilasters reach 104.9) | 8.9–9.4 along the axis | **13.06** across (y −7.40 → +5.66; not centred — 7.4 to the left/SSW, 5.7 to the right/NNE) | benches/side platforms 164.8; **sunk central floor 163.69** (**163.692** *p*), ≈6.2 × 6.0, x 98.2 → 104.4, y ≈ −3.9 → +2.1; unfinished **pit** in it, floor 162.75, ≈3.7 × 2.6 at x ≈ 99.9 → 103.5 | walls rise to 168.45; **vault crown 169.68** | crown above the sunk floor **5.99**; above the benches 4.9; above the pit floor **6.93** (TMP-web max height 6.92 ✔); vault rise 1.23 | **barrel vault spanning front-to-back**, i.e. its axis runs across the tomb (parallel to the 13 m dimension). Four pillar stubs in a row across the front, 1.05–1.10 square, at x 97.05 → 98.2: y −5.90 → −4.85, −3.31 → −2.20, +0.42 → +1.49, +2.99 → +4.06. Rear-wall "pilasters" are two unfinished pillars still joined to the rock. A sloping vein of hard calcite stopped the cutting on the left side (sheet note 2) |
| Sarcophagus | in the sunk floor / pit | — | — | — | — | — | smashed in antiquity: fragments of the **red granite outer box** in the pit and beside it (sheet note 3), and the reassembled green conglomerate inner mummiform lid on a modern plinth (photo 14). Dimensions UNVERIFIED |
| **Chamber K** (rear room) | 104.5 → 108.5 | 4.0 | 2.40 (y −2.37 → +0.04; offset to the left of the axis) | 164.4 → 164.2 | 168.4 at the front falling to 167.5 | 4.3 → 2.85 at the rear wall | unfinished |

Overall: datum → rear wall of K = **108.5 m** horizontal; total descent of the floor 174.31 → 163.69 = **10.6 m**; from gate B the tomb is fully underground.

### 3.1 Decoration programme

Firm (TMP-web description as quoted verbatim by a third-party page, and en.wp after Piankoff 1954 / Brock 2001): which book is in which room — Book of Gates in B, C, D, E, F and K; Book of Caverns in B, C, D, E, F; Book of the Heavenly Cow in D; Amduat in the descent of F and in G, H; Book of the Dead in I; Book of the Earth in J; Books of the Day and of the Night on the ceilings of D, E(–F), G and J; Gates on the left/south walls and Caverns on the right/north walls of the upper corridors. **From memory, UNVERIFIED:** the division/hour numbers per corridor, the Book of the Dead chapter numbers, the list of deities on the pillars, and the colour notes.

Sunk relief, painted, on white-plastered limestone throughout; yellow-ochre ceilings with dark blue fields in the upper corridors, dark blue-black ceilings with yellow figures below. "Left" = south/SSW wall (y < 0), "right" = north/NNE wall (y > 0), going in.

| Section | Left wall | Right wall | Ceiling |
| --- | --- | --- | --- |
| Gate B lintel and jambs | sun disc with scarab and ram-headed Re between kneeling Isis and Nephthys; jambs with names of Ramesses VI over Ramesses V (gates B–F were first cut for Ramesses V) | | |
| Corridor B | king before Re-Horakhty and Osiris; **Book of Gates** begins (divisions 1–2) | king before Re-Horakhty and Osiris; **Book of Caverns** begins (divisions 1–2) | astronomical figures, constellations, decans |
| Corridor C | Book of Gates continues | Book of Caverns continues | astronomical figures; niches hold further Caverns/Gates scenes |
| Corridor D | Book of Gates (to division 9); excerpt of the **Book of the Heavenly Cow** | Book of Caverns (to division 5, with the large figure of Nut) | start of the paired **Book of the Day** and **Book of the Night**, each framed by an elongated Nut |
| Chamber E | Book of Gates | Book of Caverns | Books of Day and Night continue |
| Pillared hall F | Book of Gates divisions 10–11 and its final scene (Nun lifting the sun-boat, Nut above) | Book of Caverns concluded | Books of Day and Night; rear wall above the descent: double scene of the king censing and libating before Osiris enthroned in a shrine; pillars: king before deities (Ptah, Osiris, Amun-Re, Meretseger, Khonsu, Thoth, Re-Horakhty …) |
| Descent in F, corridors G and H | **Amduat** hours in sequence (1–5 on one side, 6–11 on the other; 7–11 abbreviated); winged serpents on the descent's side walls | Amduat | barques of Re; Books of Day and Night; cryptographic "enigmatic" compositions |
| Chamber I | **Book of the Dead** chapters 124–127 and the Negative Confession (ch. 125); king before Maat | Book of the Dead | king's cartouches, vultures, enigmatic scenes |
| Burial chamber J | **Book of the Earth** (parts A–D) on all four walls: resurrection of the sun-disc, Aker, decapitated enemies, arms raising the disc | Book of the Earth | **astronomical ceiling: Book of the Day and Book of the Night back to back**, each under a full-length figure of Nut arched along the vault, bodies yellow on dark blue-black, the sun-disc shown red passing along her body (photos 14, 15) |
| Chamber K | Book of Gates, closing scene | | |

Nearly a thousand Greek, Latin and Coptic visitors' graffiti (995 counted) are written over the upper walls, mostly in black ink — the corridors were half-filled then, so they sit high (en.wp).

Modern fittings in KV9 (photos 13, 14): timber boardwalk with cross-battens down the middle of every corridor, timber post-and-rail balustrades both sides ≈1.0 high, glass or acrylic screens in front of the walls in places, floor-level LED strips washing the walls and ceiling; in the burial chamber a timber platform along the front with a balustrade, the sarcophagus fragments on a low white plinth edged in timber.

---

## Built so far (`tools/blender/valley_kings.py` → `kv62.glb`, `valley_kings.glb`; native build only)

- **KV62 complete** at the TMP-sheet dimensions of 2.1 (stair, both gates, corridor at 18°, antechamber, annexe 1.07 m lower behind its 1.00 × 1.42 doorway, burial chamber 0.94 m lower, treasury 1.10 m lower, the four magic-brick niches), the sarcophagus at its plan position with the cracked lid back on, the mummy case, timber ramp, rails, balustrade with glass, grilles, LED strips at the foot of the painted walls. North, west and east walls carry the photographs 06–08 as textures (CC BY-SA 4.0, credited in the top-level README). Walk-tested in the native build: valley → stair → corridor → antechamber → burial chamber and back out.
- **Departures made for play, all deliberate:** the tomb is drawn running due west (true axis 271.7°); the corridor is 2.05 m high (survey 1.97) and the first gate's lintel is at 2.75 m so that the player's capsule clears them; gate jambs are flush with the corridor walls; a gap and four timber steps at the east end of the balustrade let the player go down into the burial chamber (visitors may not); the grilles stand open.
- **Not done in KV62:** the south wall painting (no usable photograph: plain yellow ground only); the sarcophagus's relief decoration (plain block with corner pilasters and cornice); the hieroglyph captions; the antechamber's raised timber floor is not modelled separately; ventilation.
- **Valley:** ground from Copernicus GLO-30 for 1.3 km around, resampled to 10 m and reworked: the wadi floor is cut down along the way in to the surveyed levels (visitor centre 149 m, entrances per the TMP datums), each ~30 m of rise is redrawn as a scree slope under a cliff (the model smooths the real cliffs away; these are placed by height band with a wandering edge, **not** from the mapped cliff lines), and al-Qurn is given back its point (280 m above the floor, 780 m away on bearing 233°). KV62's enclosure (walls, roof over the lower flight, gate, the photographed sign); thirteen other entrances as plain doorways in low enclosures at their surveyed positions, elevations and bearings (interiors not built); three shelters and the rest house from OSM footprints; the main path; the visitor centre as a plain single-storey block with a canopy and two booths (footprint size approximate); the asphalt road up to the drop-off, with a road train running on it (form from general knowledge, livery unverified).

## 4. Todo / approximate

- **TMP per-chamber tables** (height/width/length/area/volume for every room of KV62 and KV9) could not be read (403). Everything marked "scaled" above should be compared with them by a person with a browser. Expect agreement to a few cm; the two KV9 figures that leaked through a search snippet (12.37, 10.37) match exactly.
- **KV62 painted-band heights** (dado ≈1.0, figure field ≈2.5, sky band ≈0.08) are photo estimates. No published measured elevation of the walls was reachable. Getty's *Wall Paintings of the Tomb of Tutankhamen* report or the Factum Arte high-resolution recording would settle it.
- **KV62 south wall**: no usable photograph downloaded (HTTP 429); only a small black-and-white reproduction exists on Commons. Texture must be drawn or taken from Burton's 1923 photograph (Griffith Institute — licence to be checked).
- **Hieroglyphs**: only the two north-wall caption groups are given in sign codes (from de.wp), status "composed"; east, west and south wall texts are translations only.
- KV62 original doorway in the I/J partition, gate B height, the mummy case's exact place and size, the ventilation ducting, the corridor ramp and stair construction: UNVERIFIED.
- KV62 sarcophagus: Carter's figures are quoted from memory; lid thickness and the exact profile not found.
- Absolute lat/lon of all entrances ±10 m (relative positions are good to cm). A satellite check with `tools/geo/sat_view.py` on the KV62 shelter roof and the KV9 ramp would pin the anchor.
- KV34 entrance position and elevation; al-Qurn's exact summit height (420 vs 450); path widths; heights of the entrance walls and shelters; the taf-taf vehicle's dimensions and colours; visitor-centre interior — all UNVERIFIED.
- The DEM cannot give the wadi floor or the cliff faces at model scale; terrain near the tombs will have to be sculpted from the TMP datums in 1.2, the OSM cliff lines and photos 01, 02 and 04.
- KV9: sarcophagus dimensions; exact shape of the sunk floor and pit (the plan shows them skewed); pillar-face scene list; which Amduat hours are on which wall.
- KV17 (Seti I): sheets fetched, not measured.
