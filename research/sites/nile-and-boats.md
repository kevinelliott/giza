# The Nile and its boats (Luxor, Cairo/Giza; modern and ancient)

Researched 2026-11-11. Status: **research only — nothing built yet.** Every number has its
source in the right-hand column. Three kinds of source are used and they are not equal:

- **published** — a figure printed in a cited book, paper, operator sheet or museum record.
- **measured** — taken by us from OpenStreetMap geometry (redistributable, ODbL) or from Esri
  World Imagery at zoom 19 (0.269 m/px at Luxor; *measurement only*, image not kept). Good to about ±1 m.
- **estimated** — scaled off a photograph, or derived by arithmetic. Marked as such; treat as ±20 %.

Anything marked **UNVERIFIED** is a figure from general knowledge that no fetched source confirmed.

Photos: `research/photos/nile-and-boats/` (18 files, credits in `CREDITS.md` there).

---

## 1a. The river at Luxor

| Item | Value | Source |
| --- | --- | --- |
| Channel width opposite Luxor Temple | **490–515 m** bank to bank (514 m on the line 25.70158,32.63323 → 25.70022,32.63812; 491 m at the west ferry landing) | measured: OSM river polygon (relation 2063478, bank ways 1082545535 / 208106967) |
| Width range, 3 km of river through the town | 415 m (narrowest, 25.6898 N) to 545 m (25.7076 N) | measured: same |
| Course through town | straight, flowing **NNE (≈ 035°)**; no island between the temple and the ferry | measured: OSM; Esri imagery |
| General depth and width of the Egyptian Nile | "about 500 m wide and 10 m deep at its deepest point (when not in flood)" | published: Wikipedia *Nile*, citing Bunbury 2023 p. 45 |
| Reach-average section below Aswan | ≈ 600 m wide × 5 m deep (a reach average, not a Luxor sounding) | published, but only seen as a search-result summary of an Egyptian journal paper (journals.ekb.eg reset every connection) — treat as indicative |
| **Depth to model at Luxor** | 4–6 m mean, ≈ 10 m in the thalweg (which hugs the east/corniche side, where the cruise ships lie); shoals to < 2 m on the west side | estimated from the two rows above. **No Luxor sounding found** |
| Navigable minimum | cruise ships draw 1.5–1.55 m (below); cruising stopped in Dec 2017 when depth fell to ≈ 1.4 m near Kom Ombo | published: operator sheets; Egypt Today 2017 (search summary) |
| Discharge released at Aswan | mean 2,757 m³/s (87 km³/yr); ≈ 700 m³/s in Nov–Jan, ≈ 2,900 m³/s in Jun–Aug | published: Wikipedia *Nile* (Senay 2014); seasonal pair from a search-result summary only |
| **Current speed** | **≈ 0.3 m/s in winter, ≈ 1.0–1.2 m/s in summer** (Q ÷ (500 m × 5 m)); use 0.5 m/s as a default | **estimated** (derived). No measured velocity for Luxor found |
| Seasonal level change since the High Dam (1970) | The annual flood no longer reaches Luxor. Levels now follow irrigation releases: highest June–August, lowest in the "winter closure" (about 40 days, Dec–Feb). Size of the swing at Luxor: **≈ 2–3 m, UNVERIFIED** | published for the pattern (search summaries: winter closure since the 1970s; "the river at its lowest as it passes through Luxor at this time of year"). The metre figure is from memory — no gauge record found (DAHITI altimetry needs a login; Egyptian journal PDFs unreachable) |
| Water colour | Clear, silt-free since the dam. In the reference photos: deep blue-green to slate blue under a clear sky (≈ `#2f4f6b`–`#3d5f73`), olive-green in the shallows and in shadow (≈ `#4a5a3c`), silvery grey at low sun. Never the brown of pre-dam flood photographs. Small wind chop; boat wakes are white | estimated by eye from `felucca-luxor-sail.jpg`, `ferry-luxor-2013-side.jpg`, `cruise-ships-luxor-underway.jpg` (hex values are my reading of the JPEGs, not sampled systematically) |
| East bank form (corniche) | Two-level embankment. Upper level: Corniche el-Nil road and promenade. Lower level: a paved quay / garden terrace beside the water. A stone-faced, slightly battered retaining wall separates them, with stairs every 50–100 m. At the water: a low stone-pitched revetment, not a sheer quay — ships lie 3–8 m off and use gangways | from `corniche-luxor-lower-promenade.jpg`, `corniche-luxor-from-above.jpg`, `cruise-ships-luxor-moored-corniche.jpg`, satellite |
| Corniche wall heights | upper promenade ≈ **6–7 m** above water; lower quay ≈ **1.5–2.5 m** above water (summer / winter); retaining wall between them ≈ 4–5 m | **estimated** from people and deck heights in the photos (a cruise ship's third passenger deck is level with the upper promenade). No survey found |
| West bank form | natural sloping bank of grey-brown Nile mud and sand, 1:3 to 1:5, with reeds, grass, banana and palm behind; a short stone-pitched slope and a small paved plaza only at the ferry landing. Launches nose straight onto the mud or tie to small floating pontoons | from `west-bank-landing-luxor-launch.jpg`, satellite. At the landing itself the photo shows a low vertical quay wall ≈ 1.5 m above water with a ferry alongside, a mosque minaret and the floodlight masts of the football pitch behind |
| Luxor Temple (for placement) | centre ≈ 25.6995 N, 32.6391 E; the temple's long axis runs parallel to the river, its west wall ≈ 100–150 m from the water | read off Esri imagery — approximate |

### Ferry landings and moorings (lat, lon WGS84)

| Item | Position | Source |
| --- | --- | --- |
| **National (baladi) ferry — West Bank landing** | **25.70491 N, 32.63566 E** — short pier + pontoon ≈ 10 × 9 m; a 24 m ferry was alongside in the imagery | OSM node 281892639 (ferry_terminal) and pier way 1230861059; confirmed on Esri imagery |
| **National ferry — East Bank landing (current)** | **25.70841 N, 32.64386 E** — pontoon terminal on the lower corniche in front of Luxor Museum; a 23 m ferry alongside in the imagery | OSM node 9200889184 and route way 25844084 ("Luxor–Westbank public ferry"); Wikivoyage *Luxor/West Bank* gives 25.7084, 32.644; confirmed on Esri imagery |
| Ferry route | 917 m, diagonal across the stream (bearing ≈ 245° east → west) | OSM way 25844084 |
| *Disagreement* | Older guidebooks (Frommer's: "the public ferry that departs from below the Luxor Temple") put the east landing in front of the temple, ≈ 850 m further south. **Trust OSM + imagery for the present day**; use the temple position only for a pre-2010s scene. I could not date the move | Frommer's via search summary; OSM |
| Motor-launch jetties, East Bank (in front of Luxor Temple) | 25.70144 N, 32.63858 E — a floating jetty ≈ 55 m long with 10–20 launches moored side by side, plus a T-shaped pontoon ≈ 20 m north of it | OSM pier ways 275819966 / 705664976, node 5347100968 ("local ferry to West Bank"); Esri |
| Motor-launch jetties, West Bank | 25.7039 N, 32.6353 E (large pontoon ≈ 25 × 12 m) and 25.7026 N, 32.6340 E; launches in rows of 4–6 all along 25.7015–25.7045 N | OSM pier ways 275819967 / 702972990; Wikivoyage 25.70309, 32.63427; Esri |
| Launch crossing routes | 465 m and 481 m (temple jetty ↔ west pontoons); a third, 712 m, runs along the west side | OSM ferry ways 1230865599, 1230861057, 1230861055 |
| **Cruise-ship mooring stretch** | the whole East Bank lower corniche from ≈ 25.694 N (south of the Winter Palace) to ≈ 25.716 N (north of the Museum), ≈ 2.5 km; densest directly in front of Luxor Temple (25.6995–25.7008 N) and from the Museum northward (25.706–25.712 N). None on the West Bank | Esri imagery; OSM piers |
| **How they raft up** | parallel to the bank, **bows upstream (pointing south** — the pointed end of every hull in the imagery is the southern one**)**, hulls touching on fenders, **3–5 abreast** (a raft of 4 measured: 4 × 14.2 m = 57 m out from the bank). Innermost ship has one or two gangways to the lower quay; passengers of outer ships walk through the reception lobbies of the inner ones (lobby doors are amidships and line up). Rafts are spaced 20–60 m apart along the bank | measured on Esri imagery (cruise raft at 25.7003 N, 32.6377 E); `cruise-ships-luxor-rafted-bow.jpg`; lobby walk-through is general knowledge, UNVERIFIED by a cited source |

## 1b. The river at Cairo / Giza

| Item | Value | Source |
| --- | --- | --- |
| Main (east) channel at Gezira, on the line of Qasr el-Nil Bridge | **335 m** water width | measured: OSM river polygon (ways 42409050, 699870993) |
| Same channel at the 6th October Bridge (≈ 700 m downstream) | 291 m | measured: OSM |
| West channel at Gezira (el-Bahr el-A'ma), at el-Galaa Bridge | 123 m | measured: OSM |
| Main (west) channel at Roda, lat 30.0175 N | **405 m** (Giza bank → Roda); Roda island 566 m wide; east channel (Sayalet el-Roda) only 62 m | measured: OSM (ways 143052808, 24763856, 699870990) |
| Flow direction | north; discharge near Cairo 1,251 m³/s mean | published: Wikipedia *Nile* |
| Corniche wall | vertical or steeply battered masonry / concrete river wall along both banks and round both islands, with an iron or concrete balustrade ≈ 1 m high at pavement level; pavement ≈ **4–5 m above water (estimated, UNVERIFIED)**. Below it a continuous line of moored restaurant boats, rowing-club pontoons and felucca jetties; OSM maps > 40 small piers between Qasr el-Nil and el-Galaa | OSM pier ways 7062887xx / 7063025xx / 7063134xx; height from memory of photographs — not measured |
| **Great Pyramid → nearest point of the Nile** | **8.09 km on bearing 075° (ENE)** to the west bank at 29.99760 N, 31.21543 E (Giza side, just north of the el-Mounib bridge). Due east (089°) the bank is 8.35 km away at 29.97994 N, 31.22077 E | measured: OSM river polygon (relation 2063663, way 143052808) from the pyramid centre 29.97914 N, 31.13422 E |

### Bridges near Roda / Gezira

| Bridge | Position | Length | Type | Source |
| --- | --- | --- | --- | --- |
| **Qasr el-Nil** (ex Khedive Ismail), Tahrir ↔ Gezira | 30.0437 N, 31.2299 E | **382 m** (trust this); OSM bridge ways total 456 m with approach viaducts; the river here is 335 m. Wikipedia's infobox says "1 932 m", which is impossible for a 335 m channel — almost certainly the year 1932 misread as a length | steel arch girder bridge, 7 spans, originally with an opening (swing) span; Dorman Long, built 1931–33, opened 6 June 1933; four bronze lions (Jacquemart) at the ends | Wikipedia *Qasr El Nil Bridge*; 382 m from *List of bridges in Egypt* and egy.com (search summaries); OSM ways 671616073, 688630289 |
| **6th October Bridge** | 30.0492 N, 31.2292 E | 20.5 km elevated highway in all; the first Nile phase (Gezira → Agouza, 1969–72) was 130 m | concrete girder | Wikipedia *6th October Bridge* |
| **el-Galaa** (west channel, Gezira ↔ Dokki) | 30.0403 N, 31.2210 E | 138 m | low steel girder, formerly opening — type UNVERIFIED | OSM ways 24749354 / 50219750 |
| **Abbas** (Giza ↔ Roda south) | 30.0159 N, 31.2198 E | 457 m (over a 405 m channel) | modern concrete girder replacing the 1908 steel swing bridge — type UNVERIFIED | OSM ways 25011669 / 25011677 |
| **el-Gamaa / University** (Giza ↔ Roda north) | 30.0284 N, 31.2202 E | 620 m with approaches | concrete girder — type UNVERIFIED | OSM ways 24764172 / 38427387 |
| **el-Malek el-Saleh** (Roda ↔ Old Cairo, small east channel) | 30.0158 N, 31.2281 E | 56 m span (424 m with ramps) | girder | OSM |
| **el-Mounib** (ring road, nearest crossing to the pyramids) | 29.9882 N, 31.2207 E | 2,870 m viaduct | concrete motorway viaduct | OSM way 315155139 |

---

## 2. Modern boats

### 2.1 Felucca (lateen-rigged passenger sailboat)

Two sizes are in use; build the larger for Luxor/Aswan tourist boats.

| Item | Small felucca | Tourist felucca (Luxor / Aswan) | Source |
| --- | --- | --- | --- |
| Hull length | **6.1 m** (20 ft) | **8–10 m**; one blog says "about 15 m", a tour operator "15–20 ft" — the first is too big for the boats in the photos, the second is the small type | small: published, measured drawing by a model-boat author (modelboats.co.uk "Feluccas – Butterflies of the Nile"). Large: **estimated** from people in `felucca-luxor-moored.jpg` |
| Beam | ≈ 2.0 m | 2.8–3.2 m (L/B ≈ 3) | estimated |
| Draught | 0.3–0.4 m; pivoting centreboard | 0.4–0.6 m; centreboard or shallow keel | centreboard published (modelboats); depths estimated |
| Freeboard | 0.4 m | 0.5–0.7 m; strong sheer rising to the bow | estimated from photos |
| Mast | **3.4 m** above deck (11 ft 3 in), stout, same diameter all the way, with footholds nailed on for climbing; stepped about ¼ of the length from the bow (position from photos) | ≈ 0.9 × hull length (**7–9 m**), raked slightly forward | small: published; large: estimated from `felucca-aswan-moored-pair.jpg` |
| Yard | **7.7 m** (25 ft 2 in) = 1.26 × hull; two spars lashed together | ≈ 1.9 × hull length (**15–18 m**), two or three spars fished together, slung at about ⅓ from its lower end; **left hoisted and peaked up at ≈ 65–70° when moored**, sail furled along it | small: published; large: estimated from the same photo |
| Boom | 3.5 m (11 ft 5 in) | usually none — loose-footed | published / photos |
| Sail | Tall narrow triangle (lateen / settee: a very short luff, long hoist along the yard). Peak 2–2.5 × the hull length above the water on the large boats. Cotton, white to pale grey, vertical cloths ≈ 0.6 m wide; often patched | published (cotton); photos |
| Rig variants | one mast normally; two-masted (two lateens) for cargo boats | Wikipedia *Felucca*; modelboats |
| Capacity | 6–10 passengers + 2–3 crew | Wikipedia *Felucca* ("usually able to board ten passengers and the crew consists of two or three") |
| Layout | Short foredeck with a sliding hatch; open well aft of the mast with **bench seating round the sides and stern (U-shape) and a low central table/platform**; benches covered with flat cushions or striped rugs; helmsman at the stern on a long tiller to a big outboard rudder | published (modelboats figs. 2, 6, 7); photos |
| Awning | flat or slightly cambered canvas on a light pipe/wood frame ≈ 1.7 m above the benches, covering the passenger well only | photos |
| Propulsion | sail; two long oars stowed up the mast; **no engine** (if becalmed, towed by a launch) | published (modelboats); Wikipedia |
| Colours, **Luxor** | hull white with a **red-orange bottom / boot-top band** carried well above the waterline; sheer strake and rubbing strake in blue or green; mast white with red / green / blue bands; name in Arabic and Latin on the bow; flags (Egyptian, and whatever nation the customer might be) at the yard peak | `felucca-luxor-moored.jpg`, `felucca-luxor-sail.jpg` |
| Colours, **Aswan** | the same white over red, plainer; white sails; seen against granite boulders and the sand slope of the West Bank | `felucca-aswan-moored-pair.jpg`; Commons `Felucca R04.jpg`, `Felucca on the Nile (53709847874).jpg` (viewed, not kept) |
| Height above water | sail peak ≈ 18–22 m (large); mast head ≈ 8–10 m | estimated |

### 2.2 Dahabiya (two-masted lateen houseboat)

| Item | Value | Source |
| --- | --- | --- |
| Hull length | **25–45 m typical; 38–42 m is the common modern replica**; extremes 34.5 m and 55 m | published: Filovent overview (25–45 m); *Dahabiya Dream* 131 ft ≈ 40 m (Sailogy); custom 2025 boat 42 m (Samboat); *Feddya* 47.5 m (Arcon Yachts); *Philae* 55 m (search summary) |
| Beam | **7.0–7.5 m** (8 m for the largest) | published: Sailogy 7.00; Arcon 7.5; Samboat 8 |
| Draught | **1.0–1.5 m**, flat bottom ("around one metre to one and a half metres"); Sailogy lists 1.70; the Samboat "4 m" must be an error | published: Filovent; Sailogy. Trust 1.0–1.5 |
| Decks | 2: a cabin deck in the hull/main deck with large shuttered windows, and a **full-length sun deck** on its roof; some have a lower row of cabins aft, giving two rows of windows at the stern | `dahabiya-luxor-side-with-tug.jpg` |
| Height above water | sun-deck floor ≈ 3.5–4 m; awning top ≈ 6.5 m; fore-yard peak ≈ 20–25 m | estimated from the same photo |
| Cabins / guests | 4–12 cabins (6–8 usual), 8–20 guests, crew 8–15 | published: Filovent; Sailogy (6 cabins / 12 berths) |
| Rig | **two masts, each with one lateen**: a big one right in the bows (mast ≈ 12 m, raked forward; yard ≈ 30–35 m) and a small one at the very stern (yard ≈ 12–15 m). One recorded boat: main mast 12.5 m, 360 m² of sail on a 34.5 m hull | Filovent ("two masts… the forward mast generally the taller"); 12.5 m / 360 m² from a Wikipedia mirror via search summary; yard lengths **estimated** from photos |
| Propulsion | **no engine**: sails when the wind serves, otherwise **towed or pushed by a diesel tug**; an on-board diesel generator for electricity | published: Wikipedia *Dahabeah* |
| Tug | ≈ 12–15 m × 4 m steel launch, white hull, varnished wooden wheelhouse, tyre fenders all round; lashed alongside the stern quarter or pushing on the stern, or towing ahead on a 30–50 m line | estimated from `dahabiya-luxor-side-with-tug.jpg` (the tug in that photo is pushing, made fast at the stern) |
| Livery | cream or white hull and house; dark varnished wood shutters, doors and rails; white scalloped awning over the sun deck and a second awning over the open foredeck lounge; name in gilt script on the side aft; life-rings on the sun-deck rail | photos |
| Distinguishing shape | long, low, barge-like; overhanging raked bow carrying the foremast; open-sided foredeck saloon; square stern; staircase from foredeck to sun deck | photos; Wikipedia ("shallow-bottomed, barge-like") |

### 2.3 Standard Luxor–Aswan cruise ship ("floating hotel")

| Item | Value | Source |
| --- | --- | --- |
| Length × beam | **72 m × 14 m** is the standard (set by the Esna lock). Recorded: *Jaz Royale* 72 × 14; *Crown Prince* 72 × 14.5; *Nile Goddess* 72 × 13; *Nile Dolphin* 72 × 15; *Sonesta St George* 75 × 15; small older class *Nile Empress* 61.2 × 10.6 | published: CruiseMapper; operator fact sheets (Slideshare); Central Holidays (via search summary) |
| The same, measured | 71–73 m long; ships in a raft sit at **14.2 m centres** | measured: Esri imagery at Luxor |
| Draught | **1.5 m** (1.50 *Nile Goddess*, 1.55 *Crown Prince*, 1.16 *Nile Empress*) | published: as above |
| Height | **11.0 m** (*Nile Goddess*; the sheet does not say whether from keel or waterline — I read it as keel to top of the sun-deck rail, i.e. ≈ 9.5 m above water, plus awnings to ≈ 12 m) | published figure; interpretation is mine |
| Decks | **5**: lower (half below water: restaurant, portholes), main (reception lobby amidships, cabins), two cabin decks, sun deck. A few have 4 | published: CruiseMapper ("Decks 5, decks with cabins 3") |
| Deck heights | ≈ **2.7 m** floor to floor (estimated: 11 m ÷ 4 closed decks). Lower-deck portholes ≈ 0.5 m above water; main-deck floor ≈ 1.2 m above water | **estimated** |
| Capacity | 52–75 cabins, 104–150 passengers, crew 70–75 | published: CruiseMapper |
| Propulsion | 2–3 diesels of 250–400 hp each (e.g. 1 × 380 + 2 × 400 hp Caterpillar) on steerable stern drives; 2 generators ≈ 300 kW + 1 standby; ≈ 12 kn / 22 km/h | published: *Crown Prince* sheet; *Sonesta St George* speed |
| Hull shape | a box: plumb sides for the full length, short raked bow with a blunt stem, flat bottom, square stern. Superstructure the full width of the hull and nearly the full length | photos; satellite |
| Window pattern | cabin decks: a continuous row of large rectangular picture windows (≈ 1.6 × 1.4 m) at ≈ 3.5 m cabin pitch, one or two per cabin, often with a shallow French balcony rail; lower deck: a row of round portholes (≈ 0.5 m) just above the water; main deck amidships: double glass lobby doors on both sides | `cruise-ships-luxor-moored-corniche.jpg`, `cruise-ships-luxor-underway.jpg` |
| Sun deck | pool ≈ 6 × 3 to 8 × 4 m, 1.2 m deep, **at the bow end** (4 of 5 ships in the imagery) or amidships; artificial-turf or teak deck; sun loungers in rows; one or two fixed awnings (steel frame, white or blue canvas) each ≈ 12 × 10 m over the middle and aft thirds; a bar pavilion | measured / seen on Esri imagery; photos |
| Funnel | none of any size — two short exhaust stacks or a low dummy funnel casing right aft; wheelhouse low at the fore end of the upper cabin deck or on the sun deck | photos; UNVERIFIED in detail |
| Name board | name in Latin capitals and in Arabic on both bows, and on a large board or painted panel high on the side amidships / on the sun-deck rail | photos |
| Gangways | aluminium, ≈ 6–8 m × 1 m with rope rails, from the main-deck lobby door to the quay; ship-to-ship crossings are short plates between lobby doors | photos; UNVERIFIED lengths |
| Livery | overwhelmingly white; dark-tinted glass; a blue, dark-green or gold band at main-deck level; blue hull bottoms; orange life-rings along every rail; rust streaks at the scuppers | photos |

### 2.4 Luxor "national ferry" (baladi ferry)

| Item | Value | Source |
| --- | --- | --- |
| Length × beam | **23–24 m × 6.4 m** | measured: Esri imagery, one vessel at each terminal |
| Draught | ≈ 1.0 m — UNVERIFIED | estimated |
| Decks | **2**: lower deck open-sided between square pillars (≈ 9 bays), upper deck open with a canopy | `ferry-luxor-2013-side.jpg` |
| Height above water | lower deck floor ≈ 0.9 m; upper deck floor ≈ 3.2 m; canopy top ≈ 5.8 m | **estimated** from seated passengers in the photo |
| Hull | steel, double-ended barge shape with a rounded spoon bow and a square stern with a hinged landing flap; black / dark grey sides, **red boot-top** | photo |
| Upper deck | rows of slatted wooden benches facing fore and aft, a central aisle; bulwark of flat steel panels cut in a repeating **lotus / cartouche pattern**; white canvas canopy on a pipe frame over the forward two-thirds | photo |
| Paint scheme 2011–2013 | cream / pale yellow superstructure, grey-black hull, red bottom; a winged-sun or cobra ornament on the bow | `ferry-luxor-2013-side.jpg`; Commons `Luxor Ferry R02.jpg` (2011, bow-on; viewed, not kept) |
| Paint scheme 2018 | **royal-blue hull**, yellow-ochre superstructure with pharaonic motifs in blue, green and red (winged scarab on the bow), blue pipework, orange life-rings | `ferry-luxor-2018-bow.jpg` |
| Propulsion | single inboard diesel, exhaust through the canopy | UNVERIFIED |
| Capacity | ≈ 150–200 people — **UNVERIFIED** (no source found; ≈ 80–100 are visible seated in the photo) | estimated |
| Service | shuttles continuously, crossing ≈ 5–8 minutes; fare EGP 25 for foreigners | Wikivoyage; times from memory |

### 2.5 Luxor motor launches ("lanch")

| Item | Value | Source |
| --- | --- | --- |
| Length × beam | **9.5–11.5 m × 2.4–3.0 m** (dozens measured, moored in rows) | measured: Esri imagery, both banks |
| Draught / freeboard | ≈ 0.4 m / 0.6 m | estimated |
| Height above water | canopy top ≈ 2.6–2.8 m | estimated from `motor-launch-and-cruise-line-luxor.jpg`, `west-bank-landing-luxor-launch.jpg` |
| Hull | wooden or GRP open boat, moderately flared bow, transom stern; **white with a red-orange bottom** showing at the bow wave; a blue or green sheer stripe | photo |
| Canopy | flat rigid roof for nearly the whole length on 8–10 thin white steel posts; a valance of scalloped cloth or painted board with the boat's name; roll-down side curtains | photos |
| Seating | benches down both sides facing inward, patterned cushions; 10–16 passengers; helmsman at the stern | photo; capacity estimated |
| Propulsion | small inboard or outboard diesel at the stern, 8–10 kn | estimated |
| Decoration and flags | name board across the bow in Latin and Arabic (the one photographed is *Hatshepsut*); strings of small pennants along the roof edge; an Egyptian flag, often with a British / German / other flag for the tourists, on a staff at the bow; tyre or rope fenders | photos |

### 2.6 Cairo river bus, water taxi, dinner boats

| Item | Value | Source |
| --- | --- | --- |
| Public river bus route (central) | Giza / University ↔ Maspero (TV building), 2.68 km along the east channel past Gezira; terminals 30.0304 N, 31.2187 E and 30.0514 N, 31.2305 E | OSM ferry way 52480094 |
| Old river-bus boats | steel single-deck boats ≈ 20–25 m, enclosed cabin with a continuous row of windows, blue-and-white — **UNVERIFIED** (no photo or sheet found) | memory only |
| New electric river buses (ordered May 2026) | **19 m × 5.5 m, draught 1.0 m, 60 passengers**; built by Suez Canal Company for Modern Boats under RINA supervision; five ordered | published: Ahram Online (search summary; the page itself returned 403 to our client, so not read directly) |
| Nile Taxi (private) | small speedboats, up to 16 passengers; stops at Manial, Tahrir, Giza, Shubra, Maadi, Zamalek | published: Wamda 2013; CairoScene 2023 (search summaries) |
| Amphibious "Nile Bus" (tourist) | 12 m × 2.5 m, 3.8 m high, 43 passengers, 15–18 km/h afloat | published: Business Monthly (search summary) |
| Dinner-cruise boats (*Nile Maxim*, *Nile Pharaoh*, *Nile Crystal*) | *Nile Maxim*: up to 250 guests; *Nile Crystal*: two dining decks. **No lengths published** — estimate 40–50 m × 10–12 m, 2–3 decks. *Nile Pharaoh* is styled as a pharaonic barge with gilded papyrus-column sides and a falcon figurehead — UNVERIFIED | capacities from operator pages (search summaries); dimensions and styling not documented |
| Cairo feluccas | same boat as §2.1 (small/medium), hired from jetties at Garden City and Maadi; OSM has "Dok Dok Boating" at 30.03677 N, 31.22900 E | OSM node 6545265585 |

---

## 3. Ancient boats

### 3.1 The Khufu ship ("solar boat"), 4th Dynasty, c. 2500 BC

| Item | Value | Source |
| --- | --- | --- |
| Length overall | **43.4 m** (Jenkins' introduction rounds it to "forty-five", and elsewhere "forty-three"; Brown lecture slide "43 m"). Trust 43.4 | Jenkins, *The Boat Beneath the Pyramid* (1980), p. 108 (text beside ill. 93); Wikipedia |
| Beam | **5.9 m** | Jenkins p. 108 |
| Depth | **1.78 m**, base line to upper deck planking, at the widest point just aft of midships | Jenkins p. 108 |
| Draught | **1.48 m** maximum | Jenkins p. 108 |
| Displacement | **about 45 tons** | Jenkins p. 108 |
| Material | Lebanon cedar; tenons of Christ's-thorn (sidder); lashings of halfa grass | Wikipedia; Jenkins |
| Pieces | 1,224 pieces (651 "elements"), found in 13 layers under 41 limestone blocks (≈ 16 t each) in a pit **32.5 m long × 5 m wide** | Jenkins (chapters on the discovery and excavation) |
| Bottom | flat, **no keel**: 8 timbers in three sections (forward, midships, aft) | Jenkins (reconstruction chapter, with the strakes drawing ill. 81) |
| Side planking | **11 planks each side**: garboard strake (3 timbers), three stealers, binding strake (2 timbers), sheer strake (3 timbers); carvel (edge to edge); **13–14 cm thick**; joined end to end by S-shaped hook scarfs, edges also joggled | Jenkins p. 100 |
| Fastening | sewn: rope through V-shaped holes that **do not pierce the outer face** (the outside is smooth, no stitches visible); one rope can run the whole girth; plus unpegged mortise-and-tenon joints; half-round battens lashed over every seam inside | Jenkins pp. 100–102 and caption to ill. 80 |
| Internal structure | **16 frames**, each from one piece of cedar; **7 forked stanchions** carrying a central stringer; **46 deck beams** (thwarts) notched into the stringer and the sheer strakes; a side girder each side resting on the beams; deck of removable hatch panels | Jenkins p. 102 |
| Stem and stern | papyriform: separate carved pieces that **slide like sleeves over the pointed hull ends**; the lashing here is the only stitching visible outside and is hidden by curved rectangular battens. **Bow** (to the west as found): a near-vertical post ending in a flared papyrus-umbel. **Stern**: raked and curving forward over the afterdeck | Jenkins captions to ills. 78–79, 82, 93; `khufu-ship-bow-post.jpg`, `khufu-ship-gem-whole.jpg` |
| **Stem / stern post heights** | **both ≈ 5.5–7 m above the keel line, the bow slightly the higher — estimated and UNVERIFIED.** Scaled from Jenkins' ill. 93, which is a composite photograph with strong perspective, so the error could be ± 1 m. No published figure was found; Lipke 1984 or Landström 1970 would settle it | estimated |
| Oars | **12 in all: 5 pairs of rowing oars** on the foredeck, **6.5 to nearly 8.5 m long**, with leaf-shaped (lanceolate) blades, **+ 1 pair of steering oars a little over 6.5 m** on the afterdeck, each carved from one piece. They may have been only for steering while the ship was towed | Jenkins pp. 106–108 |
| Deckhouse | just aft of midships, full width between the side girders; **≈ 9 m long ("about 30 feet") and ≈ 2.5 m high**; built of **12 panels (5 each side, 1 each end)**; a double door with a sliding bolt at the fore end → an antechamber (≈ 2.1 m, "seven-foot") → a second double door → main cabin with **3 palm-capital columns** carrying the roof beam; a single door aft; no windows. Width ≈ 4.2 m — estimated | length: NOVA *Building Pharaoh's Ship*; height: Brown Univ. lecture slide (search summary); layout: Jenkins p. 103. NOVA says 22 panels — **trust Jenkins' 12** |
| Main canopy | an open frame of **36 slender columns with papyrus-bud finials** round the deckhouse, carrying beams that arch ≈ 15 cm above its roof (for wet matting); it runs on forward of the deckhouse over the oarsmen "several metres" (≈ 9–10 m, estimated from ill. 93) | Jenkins pp. 103–106; `khufu-ship-gem-2025-deck.jpg` |
| Fore canopy (baldachin) | small, on **10 slender poles** with papyrus-bud finials, near the bow; ≈ 3 m long × 2.5 m high — size estimated | Jenkins p. 103; size from ill. 93 |
| Mast / rigging | none found; one thicker beam forward of midships may be a mast partner | Jenkins p. 102 |
| Colour | bare cedar, now dark brown; ropes pale straw | photos |
| Where it was | reassembled 1958–68; shown from 1982 in the Solar Boat Museum over its pit on the south side of the Great Pyramid, 29°58′41″ N 31°08′04″ E, **bow to the west** | Jenkins; Wikipedia |
| **Where it is now** | **Grand Egyptian Museum, Giza — moved August 2021** in one piece (BBC 7 Aug 2021); displayed in the separate Khufu's Boats building, on a raised cradle with walkways at keel, deck and upper levels | Wikipedia *Khufu ship*; `khufu-ship-gem-2025-deck.jpg`, `khufu-ship-gem-whole.jpg` |

### 3.2 River travelling boats — Meketre's models (early Middle Kingdom, **not** New Kingdom)

The brief filed Meketre under the New Kingdom; the Met dates the models to **c. 1981–1975 BC, early
12th Dynasty**. They are still the best three-dimensional evidence for a Nile travelling boat, and
New Kingdom river boats differ mainly in having a larger deckhouse and a wider, lower sail.

| Model (Met accession) | Model size | Notes | Source |
| --- | --- | --- | --- |
| Travelling boat being rowed (20.3.1) | hull **128 cm**; 175 cm with rudder; 30.5 cm across the oars; 37 cm high | yellow-ochre (wood-coloured) hull with a red-brown sheer line; white deck with red beams; ≈ 16–18 rowers seated in two files; a white forked mast-crutch amidships (mast unstepped); **vaulted cabin aft, ≈ ⅕ of the length, covered with chequered matting and painted hide shields**; lookout with a sounding weight in the bow; one big steering oar on a post at the stern | Met Open Access record 544214; `meketre-travelling-boat-rowed-met.jpg` (rower count read off the photo, approximate) |
| Travelling boat being rowed (20.3.2) | 117 cm | — | Met 544213 |
| **Model sailboat** (20.3.4) | hull **145 cm**; 158 cm with rudder; beam 28 cm, **81 cm "with mast"** (i.e. across the spar); 53.4 cm high, **112 cm with mast** | **green hull with papyriform ends** (umbel finials, the stern one curved back inboard) — a boat of the funerary/pilgrimage type rigged for sailing; pole mast amidships banded green, white and red, with fore- and back-stays; **no sail or yard survives in the photo** (the 81 cm width "with mast" is the Met's figure for the spar); crew hauling on a halyard; light canopy on four posts aft of the mast; steering oar lashed to a tall rudder post | Met 577298; `meketre-model-sailboat-met.jpg` |
| Kitchen tender (20.3.3) | 147 cm with rudder; 73 cm across the oars | follows the travelling boat | Met 544212 |
| Paddling boat (20.3.5) | 132.5 cm; beam 38 cm | papyriform funerary type | Met 544211 |
| Sporting boat (20.3.6) | hull 112.5 × 23.7 cm | light skiff type for fishing and fowling | Met 544126 |

| Full-size reading (model sailboat ÷ assumed scale) | Value | Source |
| --- | --- | --- |
| Scale | not recorded. If the crew figures (≈ 20–22 cm standing) are 1.65 m men the scale is ≈ 1:8, giving a boat **≈ 11–12 m long**. Reliefs suggest real travelling boats were 15–20 m. **Use 16 m; UNVERIFIED** | estimated |
| Proportions (from the model, scale-free) | length : beam = **5.2 : 1** (145 : 28 cm); mast ≈ **0.5 × length** above the deck (112 cm overall height less ≈ 35 cm of hull and stand — approximate); yard / sail width ≈ **0.56 × length** (81 cm) | computed from Met dimensions |
| Hull form | spoon-shaped, round-bilged, no keel; long overhanging ends, the stern rising higher than the bow; working boats yellow-ochre (bare wood), papyriform boats green | both Meketre photos |
| Steering | **one large steering oar** over the stern, lashed to a tall rudder post and worked by a tiller (New Kingdom boats usually have **two**, one on each quarter) | model; Jenkins (rudder posts by the Middle Kingdom) |
| Mast and sail | single pole mast amidships, **one square sail** on an upper yard, wider than tall in the New Kingdom, with a boom along its foot; mast unstepped and laid on crutches when rowing downstream | mast, stays and crutch: models. The sail itself is on neither model photo — sail shape is from reliefs in general and the Punt reconstruction (§3.3), UNVERIFIED for river boats |
| Cabin | vaulted mat-covered deckhouse right aft (travelling boat), or a light four-post canopy (sailboat) | models |

### 3.3 Hatshepsut's Punt ships (New Kingdom, 18th Dynasty, c. 1470 BC)

Sea-going, but the same construction as the big river ships and the best-drawn New Kingdom hulls.
Numbers are from the full-size reconstruction *Min of the Desert* (2008), built from the Deir
el-Bahari reliefs and the timbers found at Mersa/Wadi Gawasis.

| Item | Value | Source |
| --- | --- | --- |
| Length overall | **20.3 m** (main hull 18.3 m) | Couser, Ward & Vosmer 2012 (RINA paper), Table 1 |
| Beam at the sheer | **4.9 m** | same |
| Draught / displacement (as designed, three load cases) | 0.85–1.18 m / 21–30 t | same, Table 2 |
| Other length estimates for the relief ships | "over 20 m" (five ships); ≈ 21 m ("seventy feet"); ≈ 25 m (Landström) — **trust the 20.3 m reconstruction** | search summaries; Landström figure from memory, UNVERIFIED |
| Mast | **single pole mast amidships, tip 8.3 m above deck**, unstayed in the reconstruction; ≈ 22 cm diameter at the deck, 14 cm at the top | same, Table 4 and §3.3 |
| Yards | **two**: upper yard **15.7 m**, 7.7 m above deck when hoisted; lower yard (boom) **16.7 m**, 2.0 m above deck; each built of two tapering spars lashed at the middle, the ends curving up | same, Table 4 |
| Sail | **one rectangular linen sail, much wider than tall: 14.3 m along the head, 14.5 m along the foot, ≈ 5.7 m deep, 80.9 m²** | same, Table 4 |
| Steering | **two steering oars (quarter rudders)**, one on each quarter, on stanchions, worked by tillers | same, §5.2; Punt relief |
| Rowers | the relief shows **15 oars a side (30 rowers)** — from the standard literature, UNVERIFIED here; the reconstruction made 2.5 kn with 14 rowers and sailed with a crew of 20–30 | relief count from memory; rowing trial published |
| Hull form | long, shallow, crescent profile; stem a plain upright post, **stern curved back inboard and ending in a papyrus / lotus umbel**; a **hogging truss** (a heavy rope from bow to stern over crutches) to stop the ends drooping; deck-beam ends projecting through the sides in a row | Punt relief; Couser et al. |
| Construction | thick cedar planks edge-joined with deep unpegged mortise-and-tenon joints, no frames worth the name; planks 14–22 cm thick | Couser et al.; Ward |

### 3.4 Papyrus skiff

| Item | Value | Source |
| --- | --- | --- |
| Length × beam | **≈ 4–5 m × 0.9–1.1 m** for a two-man fowling skiff; up to ≈ 8 m for a raft carrying four or five — **UNVERIFIED**, from tomb scenes in general, no measured source fetched | estimated |
| Nearest measured parallel | Meketre's sporting boat model: hull 112.5 × 23.7 cm, i.e. **length : beam 4.7 : 1** (a wooden boat imitating the type) | Met 544126 |
| Construction | bundles of papyrus stems lashed with papyrus rope every 20–30 cm; thickest amidships (≈ 0.35 m), tapering to both ends; **bow turned up gently, stern turned up higher and bound into a tight point or a flared umbel**; a mat or plank platform amidships | general; Jenkins ch. on papyrus rafts |
| Draught / freeboard | ≈ 0.1 m / 0.15–0.25 m | estimated |
| Propulsion | punt pole (≈ 3 m) or one or two paddles; no sail on the small ones | general |
| Colour | fresh: bright green; dry: straw-yellow to pale brown; lashings a darker brown | general |
| Shape descendants | the papyriform ends of the Khufu ship and of Meketre's paddling boat copy this shape in wood | Jenkins |

---

## 4. Reference images

All in `research/photos/nile-and-boats/`, 18 files, ≤ 1920 px wide; full credits and licences in
`CREDITS.md` there. Sixteen are from Wikimedia Commons (CC0 / CC BY / CC BY-SA). Two are
Metropolitan Museum Open Access (CC0) images taken from the Met's own server — the Commons API was
rate-limiting us (HTTP 429) for most of the session, so the Commons copies could not be looked up.

| File | Shows | Use for |
| --- | --- | --- |
| `felucca-luxor-sail.jpg` | felucca under full sail, Luxor, bow three-quarter | sail shape, yard length, colours |
| `felucca-luxor-moored.jpg` | a dozen feluccas moored at a Luxor jetty | hull colours, awnings, peaked-up yards, flags |
| `felucca-aswan-moored-pair.jpg` | two feluccas side-on at Aswan, sails furled | **proportions of hull, mast and yard** |
| `dahabiya-luxor-side-with-tug.jpg` | dahabiya *Rois* side-on, tug made fast at the stern | **whole profile**, both masts, awnings, tug |
| `cruise-ships-luxor-moored-corniche.jpg` | cruise ships alongside the corniche, from the upper promenade | windows, portholes, name, **corniche levels** |
| `cruise-ships-luxor-rafted-bow.jpg` | five ships rafted side by side, bows on | rafting, bow shape |
| `cruise-ships-luxor-underway.jpg` | two ships under way, side three-quarter | **deck count, window pattern, sun deck** |
| `motor-launch-and-cruise-line-luxor.jpg` | motor launch head-on; a line of about a dozen moored cruise ships behind | launch colours and name board; the mooring stretch |
| `west-bank-landing-luxor-launch.jpg` | covered launch side-on; West Bank landing, ferry at the quay, Theban hills | **launch profile; West Bank landing** |
| `ferry-luxor-2013-side.jpg` | national ferry, high three-quarter view; a ferry landing with spare ferries behind (probably the East Bank terminal below the arcaded New Corniche) | **ferry layout and deck heights** |
| `ferry-luxor-2018-bow.jpg` | national ferry bow-on, blue-and-yellow pharaonic livery | current paint scheme |
| `corniche-luxor-lower-promenade.jpg` | panorama of the lower New Corniche: river wall, garden terrace, arcaded retaining wall, stairs | **east bank section** |
| `corniche-luxor-from-above.jpg` | corniche road, balustrade, lower quay, moored feluccas and launches, from a roof by the temple | plan of the bank at Luxor Temple |
| `khufu-ship-gem-2025-deck.jpg` | Khufu ship in the GEM: foredeck, oars, canopy frame, deckhouse | oars, canopy columns, deck |
| `khufu-ship-gem-whole.jpg` | Khufu ship in the GEM, whole hull seen from the stern end | sheer, stern post, deckhouse position |
| `khufu-ship-bow-post.jpg` | the upright papyriform bow post from below (old museum, 2014) | post shape, sleeve joint, oars |
| `meketre-model-sailboat-met.jpg` | Meketre model sailboat, side-on | papyriform hull, mast, canopy, steering oar |
| `meketre-travelling-boat-rowed-met.jpg` | Meketre travelling boat being rowed, side-on | **river travel boat**: cabin, rowers, steering |

Also worth fetching later (seen, on Commons, free licences — titles in `CREDITS.md`): Khufu
deckhouse (`Giseh Sonnenbarke 07.jpg`), hull planking (`Cheops Boat 01.JPG`), the stitched model
(`Model of Khufu's solar barque with top removed.jpg`), a second dahabiya profile (`Dahabeah R04.jpg`),
the 2011 ferry bow (`Luxor Ferry R02.jpg`). The best true side elevation of the Khufu ship is
Jenkins' ill. 93 (book pp. 108–109, PDF pages 110–111) — copyright, look at it, do not copy it.

## Todo / approximate

- **Luxor depth, current speed and seasonal level swing** are derived or from memory. Needs a
  Nile Research Institute cross-section or the Luxor gauge series. The Egyptian journal site
  (journals.ekb.eg) reset every connection and DAHITI needs an account — not pursued further.
- **Corniche wall heights** (Luxor 6–7 m / 1.5–2.5 m; Cairo 4–5 m) are scaled off photographs.
- **East ferry landing**: present position is solid (OSM + imagery); when it moved from in front of
  Luxor Temple is unknown. No close photograph of the West Bank landing itself was obtained — only the
  distant view in `west-bank-landing-luxor-launch.jpg` (2007).
- **Felucca, tourist size**: 8–10 m hull and the mast/yard ratios are scaled off two photographs;
  only the 6.1 m boat has a measured drawing. Draughts are guesses.
- **Dahabiya rig**: yard lengths and mast heights estimated; only one published mast height (12.5 m).
- **Cruise ship**: deck-to-deck height, window sizes, gangway length, funnel arrangement are
  estimates; the "11 m height" datum is ambiguous (keel or waterline).
- **National ferry**: capacity, draught, engine unverified; heights scaled from seated passengers.
- **Motor launch**: capacity and engine estimated.
- **Cairo**: old river-bus boats and the dinner boats have no documented dimensions; no photo
  obtained (Commons search was rate-limited to nothing). Bridge types for el-Galaa, Abbas and
  el-Gamaa are from memory.
- **Khufu ship**: stem and stern post heights (5.5–7 m) and the deckhouse width (4.2 m) are
  estimates. Deckhouse length and height come from NOVA and a lecture slide, not from Jenkins.
  Lipke, *The Royal Ship of Cheops* (BAR 1984) has the measured drawings — not available online.
- **Meketre**: full-size scale is assumed; neither model photo shows a sail set; a Punt-ship relief
  photograph and a papyrus-skiff photograph were not obtained (Commons search rate-limited).
- **Punt ships**: rower count (15 a side) and Landström's 25 m are from memory.
- **Papyrus skiff**: all dimensions estimated.
- Not researched: Aswan (Elephantine, the cataract), Esna lock, Luxor Bridge, sandbanks, night lighting
  of the boats.

## Sources

- OpenStreetMap, live API extracts 2026-11-11 (Luxor 25.692–25.708 N; Giza bank 29.965–29.995 N;
  central Cairo 30.036–30.050 N; Roda 30.010–30.030 N) — ODbL. Overpass was unreachable through the
  proxy; the main OSM API worked.
- Esri World Imagery zoom 17 and 19 at Luxor — measurement only, nothing kept.
- Nancy Jenkins, *The Boat Beneath the Pyramid: King Cheops' Royal Ship* (1980), PDF at
  gizapyramids.org/static/pdf library/jenkins_boat.pdf — the source for nearly every Khufu figure.
- Couser, Ward & Vosmer, "Hypothetical reconstruction of an ancient Egyptian sea-going vessel from
  the reign of Hatshepsut" (RINA Historic Ships 2012), PDF at ancientportsantiques.com.
- Metropolitan Museum of Art Open Access API, objects 544214, 544213, 577298, 544212, 544211, 544126.
- NOVA, *Building Pharaoh's Ship*, "Explore a Pharaoh's Boat" 7 of 12 (pbs.org).
- Wikipedia wikitext: *Khufu ship*, *Felucca*, *Dahabeah*, *Nile*, *Qasr El Nil Bridge*,
  *6th October Bridge*; Wikivoyage *Luxor/West Bank*.
- modelboats.co.uk, "Feluccas – Butterflies of the Nile" (measured sketches of a 20 ft felucca).
- Operator / listing pages: CruiseMapper (*Jaz Royale*, *Sonesta St George*); Slideshare fact
  sheets (*Crown Prince*, *Nile Empress*); Sailogy (*Dahabiya Dream*); Arcon Yachts (*Feddya*);
  Filovent dahabiya overview.
- Seen only as search-result summaries, not opened (site refused or reset our client — not worked
  round): Ahram Online (403), Egypt Today (403), journals.ekb.eg, brown.edu lecture PDF, Central
  Holidays *Nile Goddess* figures, Frommer's, Business Monthly, Wamda, CairoScene.

## Built so far (`tools/blender/boats.py`, `luxor_nile.py`; native build only)

- Boats at the sizes above: felucca 9.0 × 3.0 m (mast 8.1, yard 17), dahabiya 40 × 7.2 m, cruise ship 72 × 14 m with three cabin decks under a sun deck, national ferry 23.5 × 6.4 m, motor launch 10.5 × 2.7 m (white over red), the Khufu ship 43.4 × 5.9 m, a papyrus skiff. They are light models: correct size and outline, simplified detail (no rigging lines, plain windows, no name boards). The Khufu ship and the skiff are modelled but not yet placed anywhere (the Khufu ship belongs in the Grand Egyptian Museum, outside the map).
- The Luxor scene: channel 500 m, East Bank corniche (upper promenade 6.5 m, lower quay 2 m above the water) with steps, the ferry pontoon, cruise ships rafted 3–5 abreast at 14.2 m centres with bows upstream, feluccas, launches and two dahabiyas moored, others under way, the ferry crossing. **Luxor Temple** stands south of the landing as a schematic massing at general published sizes (pylon 65 × 24 m with two seated colossi and the one remaining obelisk on the east, court of Ramesses II with the mosque of Abu al-Haggag on its east side, the fourteen-column colonnade, sun court, hypostyle, inner rooms as one block, the start of the sphinx avenue) — not from a survey, no reliefs; the Winter Palace is an ochre three-storey block to its south. **Schematic:** the rest of the town front is plain blocks; the Museum is not built; the temple's distance from the landing is not the real one (the real ferry landing is ~1 km north, by the Museum); the ferry landing is drawn opposite a generic stretch of corniche; bank heights are the photo estimates; the dahabiya's tug is missing.
- Not built: the Nile at Cairo/Giza (8.1 km east of the Great Pyramid, outside the map), Punt and Meketre boats.
