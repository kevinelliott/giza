# Giza town, roads, vehicles and visitor access (modern)

Researched 2026-11-11 for road traffic and a more realistic town. Facts first, each with
its source; anything not confirmed is marked **UNVERIFIED**. Nothing here is built yet.

Game coordinates: `x = (lon − 31.1342125) × 96426.2`, `z = −(lat − 29.9791687) × 110852.0`
(+X east, +Z south, metres). Map: x −1500…1100, z −700…1500. "OUT" = outside the map.

Source keys used in the tables:

| Key | Source |
| --- | --- |
| OSM | OpenStreetMap, live extract of the map box from the OSM API `/api/0.6/map` (bbox 31.11866,29.96564,31.14562,29.98548) and relation 16783121, fetched 2026-11-11. © OpenStreetMap contributors, ODbL. (Overpass was unreachable from here; the main API gave the same data.) |
| OVP | Overture Maps release 2026-10-21, *places* theme (Meta / Microsoft / Foursquare points) for the same box — point positions only, ±20 m, names as crowd-entered. |
| SAT | Esri World Imagery, zoom 19 (0.259 m/px), **measured by eye, not redistributed** (same rule as `tools/geo/sat_view.py`). Imagery date unknown. Lengths ±10 %. |
| WV | German Wikivoyage, *Pyramidenkomplex von Gīza* (wikitext fetched 2026-11-11; the only source found that names the bus lines and station numbers). |
| SM | Smithsonian Magazine, 22 Aug 2025, "Sweeping transformation is underway…". |
| ES | Egyptian Streets, 11 Apr 2025, "New Giza Pyramids entrance system sparks controversy". |
| NAT | The National, 28 Apr 2025, "Pyramids of Giza revamp… $51 million project". |
| AWR | anywhereweroam.com, "Egyptian pyramids" visitor guide, last updated 18 Sep 2026 (first-hand; reader comments to Aug 2026). |
| PNT | pureniletours.com, "Pyramids of Giza revamp tourism: what's new… 2026" (tour-operator page). |
| C360 | Cairo 360, 16 Dec 2018, "Everything you need to know about Orascom's management of the Pyramids". |
| EI | Egypt Independent, "Photos: electric bus system, 7 integrated service stations begin operating at Pyramids" — page refused automated access (403); used only through the search-engine summary. |
| WP | English Wikipedia wikitext (*Grand Egyptian Museum*, *Transport in Cairo*), fetched 2026-11-11. |
| BP | bus-planet.com, "EGY – Cairo Transport Authority (CTA)" (enthusiast site; livery history). |
| PH | A photograph in `research/photos/giza-town/` (see its `CREDITS.md`) — what the photo itself shows. |
| GK | General knowledge, not re-checked against a source this session → treat as **UNVERIFIED**. |

Refused automated access (HTTP 403, not circumvented): english.ahram.org.eg, egyptindependent.com,
akhbarelyom.com, eg.hatla2ee.com, esmap.org. Ahram Online has the primary reports on the 2025
rules (News/544317 "New entry and transport rules… meets backlash", News/544666 "Pilot operations
start on the Giza Plateau") — worth reading by hand.

---

## 1. Vehicle access rules on the plateau (as of 2025–26)

| Item | Fact | Source |
| --- | --- | --- |
| Operator | Orascom Pyramids Entertainment (OPE; Naguib Sawiris) runs visitor services under a 2018 agreement with the Supreme Council of Antiquities; the SCA still manages the site and keeps ticket revenue | C360, SM, ES |
| Start of new system | Pilot operation began **8 April 2025**; old entrance closed the same day. (ES, dated Fri 11 Apr, calls Thu 10 Apr the minister's "third consecutive day" on site — consistent with 8 Apr.) | WV, ES |
| Entrance now | **The Great Gate** on the Cairo–Fayoum Desert Road, SW of the monuments: 29.96623, 31.10933 → x −2399, z 1434 (**OUT**, 900 m west of the map edge) | WV (position), SM, PNT |
| Visitor centre | Behind the Great Gate: 29.96554, 31.11329 → x −2017, z 1511 (**OUT**, just off the SW corner). Planned contents: gift shops, cafés, a cinema | WV (position), C360 (contents, 2018 plan) |
| Old Mena House gate | North of Khufu, 29.98307, 31.13234 → x −181, z −432. "Informal main entrance from the late 1800s until April 2025"; **closed 8 April 2025** | WV, SM |
| Sphinx / Nazlet el-Semman gate | 29.97544, 31.14087 → x 642, z 413. **Sources disagree.** WV (2025): "apparently can still be used, with ticket sales". AWR (Sept 2026): the bus stop there is "Sphinx Exit"; ticket is single-entry and leaving here means buying a new ticket to return — i.e. it works as an **exit**. Trust AWR for 2026 (newer, first-hand): model it as exit-only; entry there is **UNVERIFIED** | WV, AWR |
| Private cars, taxis | **Not allowed inside.** "Private vehicles and tour buses are prohibited from entering the plateau"; "no longer possible to drive onto the site by bus or own taxi". Taxis/Uber drop at the Great Gate car park. Exception reported by a guide: private cars are let up to the pyramids for night-time concerts | ES, WV, AWR, SM |
| Tour coaches | **Not allowed inside**; they park at the Great Gate. Car park beside the gate: "over 1,200 private cars and 200 tourist buses". (SM says coaches "use designated slots in a large lot at the GEM" — that is the museum's own lot, a separate place.) | ES, SM, PNT (capacity; originally an Ahram figure), C360 |
| Visitor transport | Hop-on hop-off **electric, air-conditioned buses**, free with the site ticket, from the visitor centre "every five minutes"; "they do not wait" | SM, AWR, PNT |
| Fleet size | "Over 45 electric buses" (Apr 2025). The 2018 contract promised 30 buses + 20 other electric vehicles. First trial of an electric bus route: Oct 2020 (six stations then). A report of July 2026 speaks of 30 more buses — seen only as a search summary, **UNVERIFIED** | ES, NAT, C360, Enterprise 22 Oct 2020 |
| Bus make / size / colour | **UNVERIFIED — no source found names the make, length, seat count or livery of the main fleet, and Commons has no photo of one.** Only confirmed vehicle: a "Nasr EV" bus by El Nasr Automotive entered *trial* service in the OPE fleet in January 2026 (Al Mal News, 22 Jan 2026; no dimensions given). Placeholder for modelling: an 8–9 m midibus, white — **guess, replace when a photo is found** | almalnews.com |
| Stations | **Seven** numbered stations (I–VII) | WV, EI, PNT |
| Routes (WV, 2025) | Five colour-coded lines, the first four starting at station I (Great Gate / visitor centre): **Red** (main): I → II Panorama → III Menkaure & Khafre pyramids → V Khafre causeway → VI Sphinx. **Black**: I → II → III → Khufu's restaurant. **Blue**: IV Khufu ↔ V Khafre. **Green**: I → 9 Pyramids Lounge. **Yellow**: I → VII "Exercise area" (south edge) | WV |
| Routes (AWR, 2026) | "Four routes"; main red route in order: Visitors' Centre → **Panorama Viewpoint → King Menkaure → King Khafre → Sphinx Exit → Sphinx Access**; a separate, less frequent bus serves 9 Pyramids Lounge. Buses start 08:00 (site opens 07:00) | AWR |
| Routes (EI, trial under minister Ahmed Issa, so before July 2024) | Visitor Center → Panorama 1 → Menkaure → Khafre → Khufu → Sphinx → Panorama 4 → Visitor Center | EI (summary only) |
| Which to trust | AWR for the red line as it runs now; WV for the existence of the Khufu shuttle (blue) and the animal zone (yellow). The Khufu stop is **not** on the red loop in either 2025–26 source | — |
| Stop positions (OSM names) | Panorama −1407, 684 (29.973001, 31.119626) · King Menkaure −856, 329 (29.976201, 31.125337) · King Khafre −129, 259 (29.976835, 31.132877) · King Khufu 67, −214 (29.981099, 31.134910) · Sphinx 579, 409 (29.975483, 31.140213). Positions of "Sphinx Access" vs "Sphinx Exit", of station VII and of the lounge stop: **UNVERIFIED** | OSM |
| Horses, camels, carriages | Removed from among the monuments. Owners "relocated to new parking zones", restricted to an "exercise and panoramic viewing area"; fines of EGP 5,000 or more; they blocked the buses in protest on the first day. Yellow line goes to that "Exercise area" (station VII) at the south edge. In 2026 camel rides (EGP 1,000 / 30 min) and horse carts (EGP 400) start beside the café at the **Panorama Viewpoint** and cross the dunes ~15 min to a viewpoint near 9 Pyramids Lounge. So: animals only in the desert south-west of Menkaure (roughly x −1400…−200, z 700…1450), none at Khufu/Khafre/Sphinx. Exact boundary **UNVERIFIED** | ES, SM, WV, AWR |
| Walkway to the GEM | Pedestrian bridge "a good 1 km" long between plateau and museum, walkable or by electric vehicle; a point on it: 29.98725, 31.12879 → x −523, z −896 (OUT) | WV, SM |
| Hours / tickets | 07:00, last entry 16:00, closes 17:00 (08:00 in Ramadan); site ticket EGP 700 (2026) | PNT, AWR, WV |

### Before April 2025 (for a "historic" traffic mode)

| Item | Fact | Source |
| --- | --- | --- |
| Entry | Mena House gate (north) and Sphinx gate (east); a car fee was charged ("Mitnahme PKW: LE 25") | WV (old price list), SM |
| Coaches and cars on site | Drove up from the Mena House gate and parked beside the pyramids. Photos of 19 Apr 2014 show the **car park north-east of Khufu** full of coaches, minibuses and cars, and a coach, six white HiAce minibuses, a car, camels and horses on the sand between Khufu and Khafre | PH `khufu-north-car-park-panorama-pre2025.jpg`, `plateau-coaches-minibuses-by-khufu-pre2025.jpg` |
| Car parks (OSM polygons, still mapped) | NE of Khufu 157×101 m at 42, −217 · N of Khufu 113×33 m at −238, −339 and 100×76 m at −287, −418 · Khafre 78×47 m at −111, 260 · Menkaure 67×55 m at −658, 518 · by Khufu's restaurant 183×60 m at −957, 158 · Sphinx/Sound-and-Light coach park 134×147 m at 566, 648 | OSM |
| Panorama | Coaches drove on to the Panorama viewpoint SW of Menkaure (OSM viewpoints at −1279, 759 and −607, 1408) | GK + OSM positions |
| Sphinx side | Coaches set down in Nazlet el-Semman at the Sphinx gate; a 2008 photo shows a white coach inside the fence there | PH `nazlet-el-samman-khafre.jpg` |

---

## 2. Vehicle fleet on Giza / Cairo streets

Egypt drives on the **right** (left-hand-drive vehicles). Plates: white with a coloured band along
the top, Arabic numerals and letters; the band is **orange on taxis and hire microbuses**, light
blue on private cars (PH `cairo-white-taxi.jpg`, `cairo-microbus-hiace-motorcycle-2011.jpg`; the
colour code itself is GK).

Dimensions are L × W × H in metres. Unless a source is given they are manufacturer figures quoted
from memory (GK) — good to ±5 cm, not re-checked.

| Vehicle | What distinguishes it | Typical dimensions | Source |
| --- | --- | --- | --- |
| **White taxi** (since 2009) | White saloon with a **black-and-white chequer band** along the waistline from front wing to rear wing (2 rows of squares); yellow roof sign with "TAXI"/تاكسي; black tubular **roof rack**; orange-band plate; meter. Old-taxi replacement scheme started 2009 for cabs 20+ years old; new cars assembled in Egypt from GM, Hyundai and Chery (Speranza) kits; ~35,000 replaced. The photographed one is a **Chevrolet Lanos**. Hyundai Verna, Chevrolet Aveo, Speranza A516, Lada, Peugeot 301/Pars: GK, **UNVERIFIED**. A Speranza (Chery A5) taxi photo exists on Commons | Lanos saloon 4.24 × 1.68 × 1.43; Verna 4.28 × 1.70 × 1.47; Aveo 4.31 × 1.71 × 1.51 | PH `cairo-white-taxi.jpg`; Gulf News / Daily News Egypt / Reuters (via search summaries) |
| **Old black-and-white taxi** | **Black body with white front and rear wings** (Cairo); boxy 1970s–80s saloons — Tofaş Şahin, Lada 2105/2107, Fiat Regata, Fiat 128, Peugeot 504 estate; chrome roof rack; orange plate. Still about in small numbers. (Giza-registered old taxis used the same black/white: GK, **UNVERIFIED**) | Şahin 4.24 × 1.62 × 1.41; Lada 2107 4.15 × 1.62 × 1.44 | PH `cairo-old-bw-taxi.jpg`, `cairo-bw-taxis-2007.jpg` |
| Yellow "city cab" | 2006 radio-taxi scheme, yellow saloons; rare now | as above | Commons `CairoYellowTaxi.jpg`; Daily News Egypt (title only) |
| Ride-hail cars | Ordinary private saloons (Uber etc.); "the main option instead of taxis" | — | WP *Transport in Cairo* |
| **Microbus** | **White Toyota HiAce** van, 14 seats; older H100 (rounded, 1989–2004) and newer H200 (boxy, 2005→); sliding door on the right; roof rack on older ones; dents, coloured stripe decals along the side; orange plate; route painted or stuck on in Arabic. Other makes (Chinese Jinbei/King Long "H1-type" vans, Suzuki/Chevrolet N300 7-seat vans on feeder routes): GK. **How Giza's are marked** (governorate colour band / numbered route sticker): **UNVERIFIED — no source found.** | HiAce H100 4.62 × 1.69 × 1.94; H200 standard 4.70 × 1.70 × 1.98, long high-roof 5.38 × 1.88 × 2.29 | PH `cairo-microbus-hiace-motorcycle-2011.jpg`, `microbus-alexandria-2018.jpg` (Alexandria), `plateau-coaches-minibuses-by-khufu-pre2025.jpg` |
| **Tuk-tuk** | **Bajaj RE** three-wheeler: **black body and black vinyl hood, yellow nose/front panel**, one headlamp, driver central, bench for 2–3 behind, open sides; owners add stickers, chrome studs, LED strips. Mostly unlicensed (≈220,000 licensed of 2.5–5.4 million nationally). **Where**: side streets and informal areas — Nazlet el-Semman, Kafr el-Gabal, Nazlet el-Batran; one photographed on the Sphinx road itself in Aug 2026. **Banned from main streets** in Giza (2016 decision: stops on secondary streets only) — so none on Al-Ahram Road or the Fayoum/Alexandria desert roads; banned in Hadayek al-Ahram (strict ban tried for two years) and in new cities; never on the plateau. Giza began replacing them with licensed dual-fuel minivans in Nov 2025 (pilot includes Al-Haram), one colour per district | 2.63 × 1.30 × 1.71 | PH `giza-tuktuk-bajaj.jpg`; marsadomran.info policy brief Oct 2024; Ahram Online 2016 and Egypt Independent Nov 2025 (titles/summaries only) |
| **CTA city bus** | Cairo Transport Authority, 12 m single-deckers, front engine or low-entry, 2–3 doors on the right. **Liveries by period**: red with white (early); white with red/blue stripes (1990s); greens (2002); **red with dark-grey skirt** (2009→, MCV C120 on Mercedes-Benz chassis — photographed); **blue** (2014→, Scania-Nasr, MCV C120LE; "blue" buses cost 2 EGP vs 1 EGP for old red); **green** new buses (2025, Giza and Heliopolis routes); electric 12 m low-floor buses in full advertising wrap with green nose (2025 photo). Lines to the pyramids: 355, 357 and the air-conditioned **M7** from Abdel Moneim Riad; terminus by the Mena House (OSM stop "Giza to Cairo bus stop" at 110, −604; "Mena House" stop at 138, −597) | 12.0 × 2.50 × 3.1 | BP; PH `cairo-public-bus-2012.jpg`, `cairo-electric-bus-2025.jpg`; WV; OSM |
| Private minibuses / "smart" buses | 7–9 m midibuses of private operators (e.g. Mwasalat Misr, a 2018 CTA–UAE venture); "smart minibuses are blue" | ≈7.5–8.5 × 2.3 × 3.0 | BP; WP |
| **Tour coach** | 12 m, 2-axle, high-deck touring coach, **white with the operator's logo and a coloured swoosh** (e.g. "ISIS Travel" green/orange, "Blue Sky" blue/yellow in the photos), tinted windows, curtains. Makes common in Egypt — MCV (Mercedes-Benz chassis, built in Egypt), Yutong, King Long, Golden Dragon: GK, **UNVERIFIED**. Coaches seen from above on the Sphinx road measure ≈11.5–12 m | 12.0 × 2.55 × 3.6–3.8 | PH `nazlet-el-samman-khafre.jpg`, `plateau-coaches-minibuses-by-khufu-pre2025.jpg`; SAT |
| Tourist minibus | White Toyota HiAce / Coaster with tinted glass and a small operator decal, private (blue) or tourism plates | Coaster 6.99 × 2.08 × 2.64 | PH `plateau-coaches-minibuses-by-khufu-pre2025.jpg` |
| Pickup trucks | Single-cab 1-tonne pickups — Chevrolet/Isuzu T-series ("Dababa") and D-Max, Toyota Hilux, older Mazda/Nissan; white, light blue or red; steel cage sides for produce, often overloaded; quarter-ton Suzuki/Chevrolet micro-pickups | 5.0–5.3 × 1.7–1.8 × 1.7; micro 3.2–3.8 × 1.4–1.5 × 1.8 | GK (**UNVERIFIED**) |
| Motorcycles | Chinese 150 cc commuter bikes (a **Dayun** in the photo; also Haojue, Halawa), chrome crash bars, 2–3 riders, no helmets; delivery bikes with a box; Vespa-type scooters | 2.0 × 0.75 × 1.1 | PH `cairo-microbus-hiace-motorcycle-2011.jpg` |
| Donkey / horse carts | Flat wooden cart ("karro") on two car wheels, one donkey or horse, carrying fodder (green berseem), gas cylinders, fruit; in Nazlet el-Semman also tourist **horse carriages** ("hantour", black, folding hood, 4 wheels, 1 horse) | cart ≈3.0 × 1.5 (bed 2.0 × 1.4) + animal; hantour ≈3.2 × 1.6 × 2.3 | GK (**UNVERIFIED**); camels/horses PH `plateau-coaches-minibuses-by-khufu-pre2025.jpg` |
| Private cars | Mostly small saloons, silver/white/black/grey; a silver Mitsubishi Lancer and older Fiat/Peugeot types in the photos | 4.3–4.6 × 1.7 × 1.45 | PH `giza-tuktuk-bajaj.jpg` |

---

## 3. Roads inside the map

**OSM tagging here is thin**: in the whole map box only three ways carry `lanes` (all on the Fayoum
trunk road), and no way at all carries `maxspeed` or `lit`; nothing of the kind in the town. Class, name, one-way and surface
below are OSM tags; lane counts and widths are **SAT** measurements by eye (±10 %); lighting and
kerbs are from the photos where one exists, otherwise **UNVERIFIED**. No speed limits are tagged:
"typical speed" is an estimate for the traffic sim, not a posted limit.

| Road (OSM name → usual name) | In-map course (x, z) | OSM class / tags | Carriageway (SAT) | Median, kerbs, lighting | Typical speed (estimate) |
| --- | --- | --- | --- | --- | --- |
| **Al-Ahram Street** شارع الاهرام → Pyramids Road / Sharia al-Haram | Enters at the north edge near 383, −698 and runs WSW to the Mena House roundabout at **≈146, −616**. Only ~300 m of it is in the map | `primary`, `oneway=yes`, paved | At x≈320: one asphalt carriageway ≈9–12 m beside a ≈10 m strip of works (Metro Line 4 construction is plausible — **UNVERIFIED**). Further east (outside the map) it is a divided road, 3–4 lanes each way, with an underpass (2012 photo) | East of the map: raised median with black-and-white painted kerb, concrete parapets at the underpass; tall single-arm lamp columns. Inside the map: **UNVERIFIED** | 40–50 km/h, often congested |
| **Mena House roundabout** (end of Al-Ahram Rd) | Oval planted island ≈25 × 13 m centred ≈146, −616; arms: Al-Ahram Rd (east), Alexandria Desert Road (north-north-west), the old plateau approach (south-west) | junction of `primary` ways | — | Painted star marking beside the island; hotel car park and forecourt roundabout to the west at ≈ −32, −588 | 15–25 km/h |
| **Cairo–Alexandria Desert Road** (ref 27) | Leaves the roundabout north-north-west; in the map only from ≈144, −643 to the edge at ≈101, −674 | `primary`, `oneway=yes`, paved | ≈30 m of asphalt with ≈8 marked lanes just north of the roundabout, no median there | **UNVERIFIED** | 50–60 km/h |
| **Old plateau approach** (OSM still "Al-Ahram Street") | From the roundabout along the golf-course wall: 138, −597 → −71, −518, then up to the old gate (−125, −326; `access=permit` section at −136, −447) | `unclassified`, two `oneway=yes` ways; one `sidewalk=right` | Two carriageways ≈7 m each (2 lanes) with a narrow planted median; closed to the public since 8 Apr 2025 (WV) — only permit vehicles | Wall of the golf course on the south side; lamp columns **UNVERIFIED** | 30 km/h; now almost empty |
| **Abu al-Hol al-Siyahi Street** شارع أبو الهول السياحى ("Sphinx Tourist Street") → the dual road along the filled-in canal on the east side of Nazlet el-Semman | North–south across the east of the map: 824, −554 → 899, −191 → 963, 116 → 1013, 365 → 1049, 540 → 1088, 730, then leaves the east edge (x > 1100) near z≈780. 3.5 km long in OSM; reaches Al-Ahram Rd by the **Mashaal Bridge** flyover (776, −608, `bridge`, `foot=no`) | `secondary`, two parallel `oneway=yes` ways 25–45 m apart | Each carriageway ≈8–12 m, **no lane markings** (≈2 moving lanes + parked cars); between them an **unpaved strip 12–25 m wide** with kiosks, sheds, parked microbuses and rubble | No kerbed median as such — the central strip is the old canal bed. Lighting **UNVERIFIED** | 30–40 km/h, microbuses stopping anywhere |
| ↳ naming caveat | OSM gives the name *Abu al-Hol al-Siyahi* to this dual road. The request's "Mansouriya canal road" is, on a 2019 Commons photo caption, "El Mansouria Road" with the same view of the pyramids from the east; no OSM way in the map is named Mansouriya, and Overture has none either. **Treat the two names as the same corridor — UNVERIFIED**; zawia3.com mentions the "Mansouriya Canal" as the eastern limit of the area | OSM, PH `pyramids-from-mansouria-road.jpg`, zawia3.com | | | |
| **Abu al-Hol al-Siyahi Western Street** شارع ابو الهول السياحي الغربى → the street to the Sphinx gate | From the dual road at ≈912, 160 south-west: 850, 183 → 785, 240 → 750, 280 → 678, 363 → 654, 397 (Sphinx gate plaza), then south past the hotels 650, 439 → 649, 542 → 651, 586 | `residential`; short `oneway=yes` splits near the east end | ≈10 m asphalt, two-way, undivided, no markings; coaches (≈12 m) parked nose-to-tail along the NE stretch; paved plaza ≈40 × 50 m in front of the gate at ≈610, 425 | 2026 photo: asphalt; a low block-paved island/median with **kerbs painted alternately yellow and black**; **yellow-and-black striped bollards** in rows; one tall steel lamp column with two curved arms (≈9–10 m); street trees (ficus) in the pavement | 15–25 km/h (pedestrians, horses, tuk-tuks) |
| **Zaghloul Street** شارع زغلول | NE corner: 1072, −542 → 1035, −589 → 996, −642 → 972, −674 (435 m way, mostly in the map); short one-way slips at 1072–1093, −504…−538 | `tertiary`, no other tags | ≈8–10 m between building fronts, two-way, undivided, cars parked both sides, no markings | No median; kerbs/lighting **UNVERIFIED** | 20–30 km/h |
| **Farouq Ahmed Khattab Street** | 840, −447 → 1091, −535 (links the dual road to Zaghloul St) | `secondary`, two `oneway=yes` ways, one tagged asphalt | not measured | **UNVERIFIED** | 30 km/h |
| **Teraat al-Helw Street** (canal street) | East edge: 1013, 365 → 1039, 357 and on eastwards out of the map | `tertiary`, two `oneway=yes` ways | not measured | **UNVERIFIED** | 30 km/h |
| **Al-Remaya Street** شارع الرمايه | NW corner: −1101, −667 → −1061, −605 → −1075, −527 | `tertiary`, `oneway=yes` pair, `sidewalk=right` | not measured | **UNVERIFIED** | 40 km/h |
| **Cairo–Fayoum Desert Road** (ref 29) | **Just outside**: runs N–S at x ≈ −1600…−1660 (100–150 m west of the map edge), and −826, −762 north of it | `trunk`, `oneway=yes`, **`lanes=6` (one way) and `lanes=4` (two ways)** per carriageway, asphalt; no `maxspeed` tag | — | divided highway | 80–90 km/h (estimate) |
| **Ring Road** | **Not in the map.** No `highway=motorway` way lies inside the box (OSM); the nearest Ring Road bridges are in the wider Overture cache only | OSM | — | — | — |
| Village lanes | 4,660 `residential` segments in the Overture cache; in the OSM extract ~60 unnamed residential ways (5.4 km) carry no tags at all | `residential` | **3–6 m** between walls, no pavement, unmarked; many are dead ends | none | walking pace–15 km/h |
| Plateau service roads | Bus roads between the stations (OSM `unclassified`, some `oneway=yes`; 10 ways, 4.8 km) | `unclassified` | not measured | no kerbs; stone-block edging and chain-and-post barriers near monuments (2014 photos) | 20–30 km/h (buses only) |

Other things on the ground worth modelling: a large **cleared area** (demolitions of 2021 onward)
between the plateau wall and the remaining houses, roughly x 460–590, z −20…190 (SAT; zawia3.com
describes the San al-Agouz clearances, though it does not say this is that spot); the plateau boundary
**wall** (built 2002, "18 km", zawia3) running N–S at x≈455–500 there.

---

## 4. Hotels and named buildings

Position sources as marked; storeys/façade from photos or listings where found.

| Building | lat, lon | game x, z | Size / storeys | Façade and one-line description | Source |
| --- | --- | --- | --- | --- | --- |
| **Marriott Mena House — historic palace wing** | 29.98506, 31.13330 (OVP "Mena House Oberoi Hotel"); pool terrace seen at ≈29.98541, 31.13397 | **−88, −653** (pool −23, −687) — on the north edge; most of the hotel is OUT | OSM draws the whole old complex as one polygon 209 × 278 m centred −197, −648. 1960 photo: **3 storeys + roof terrace** | Beige/buff stucco with stone quoins; **dark-stained timber mashrabiya bay balconies** with scalloped valances, timber balustrades, palms against the walls. Began as Khedive Ismail's hunting lodge (1869); hotel since 1886 (sources dispute 1869 vs 1886) | OVP, OSM, SAT, PH `mena-house-south-facade-1960.jpg`; famoushotels.org / Arab News via search summary |
| Mena House — garden wing | 29.98620, 31.13273 (OSM building 171 × 129 m) | −143, −779 (**OUT**, 80 m north of the edge) | Low-rise blocks; storeys **UNVERIFIED** (3–4, GK). Garden wings built 1950–78 | Balconied rooms facing lawns and palms towards Khufu (2008 view: timber balcony rail with horseshoe-arch cut-outs) | OSM, PH `mena-house-view-2008.jpg` |
| Mena House forecourt and car park | ≈29.98447, 31.13388 | −32, −588 | Car park ≈130 × 115 m (OSM parking 128 × 116 m at 26, −607); small roundabout in the forecourt | Asphalt, marked bays | SAT, OSM |
| Mena House **golf course** | 29.98275, 31.13712 (centroid) | 280, −397 (inside) | OSM polygon 554 × 483 m, **16.3 ha**, between the hotel and Nazlet el-Semman; bunkers visible | Green fairways, sand bunkers, tree belt; walled along the roads. Whether it is still played: **UNVERIFIED** | OSM, SAT |
| **Pyramids View Inn** | 29.97486, 31.14117 (OSM building; OSM `name`="Great Pyramids Inn", `name:en`="Pyramids View Inn") · OVP point 29.97490, 31.14103 | **671, 478** | Footprint 24 × 20 m (374 m²); storeys **UNVERIFIED** (4–5, GK) | Rooftop terrace facing the Sphinx and Sound-and-Light theatre | OSM, OVP |
| **Great Pyramid Inn** | 29.97470, 31.14099 (OVP, conf. 0.99) | **654, 495** | Storeys **UNVERIFIED** (≈5–6, GK); next door to the above — OSM merges the two names on one building, so which footprint is which is **UNVERIFIED** | Rooftop restaurant/terrace | OVP |
| **Guardian Guest House** | 29.97495, 31.14102 (OVP, conf. 0.93) | **656, 468** | **4 floors, 10 rooms, no lift**, rooftop terrace | "Directly across from the Sphinx entrance"; address 1 Abou al-Hool St | OVP; Expedia / Hotels.com listing |
| **Panorama Pyramids Inn** | 29.974484, 31.141127 (OSM node) | **667, 519** | Storeys **UNVERIFIED** | Rooftop café ("Panorama Pyramids Cafe", OVP 652, 534) | OSM, OVP |
| Tutankhamun Hotel Pyramids View | 29.97355, 31.14079 | 635, 623 | 23 × 22 m, **4 levels** (OSM) | — | OSM |
| Other inns on the same frontage (for density) | — | Marvel Stone 704, 473 · Royal Pyramids Inn 699, 569 · Anubis Kingdom 641, 591 · Horus Guest House 769, 549 · Best View 757, 630 · Hayat 687, 425 · Cheops Pyramid Inn 683, 363 · Mamlouk 745, 346 (21 × 21 m) · Atlantis 575, 358 · Pyramids Overlook 591, 375 | 62 hotels + 16 lodgings in OVP for the box | — | OSM, OVP |
| **KFC / Pizza Hut opposite the Sphinx** | KFC 29.97545, 31.14110 (OVP, conf. 1.00); Pizza Hut 29.975400, 31.141133 (OSM) | **664, 412** / 667, 418 | One building, 25 m east of the ticket checkpoint. Storeys **UNVERIFIED** (KFC at street level with Pizza Hut above, 3 storeys: GK) | Red-and-white fascia signs; upstairs windows look straight at the Sphinx | OVP, OSM |
| **Sphinx gate ticket office** ("Giza Pyramids Ticket Checkpoint") | 29.97545, 31.14084 | **639, 412** | 8 × 11 m, **1 storey** (OSM `building:levels=1`) | Small kiosk building at the west side of the plaza; steel fence and turnstile gates either side | OSM |
| **Sound and Light theatre** | 29.97452, 31.13981 (OSM area "Sound & Light Show") | **540, 516** | Area 77 × 87 m (5,940 m²); buildings inside 23 × 23 m (541, 493) and 23 × 38 m (542, 529) | Open-air **seating terrace** (pale paved tiers, rows of chairs) on the east, facing west to the Sphinx ≈220 m away; low stone-clad service buildings. Seat count **UNVERIFIED** | OSM, SAT |
| Sphinx gate coach park | 29.97332, 31.14008 | 566, 648 | 134 × 147 m | Asphalt/sand lot south of the theatre | OSM |
| **Stables, Nazlet el-Semman** (in the village) | Elgabry horse club 29.973723, 31.142124 · A M G Stable 29.97358, 31.14207 · G.M Horse Stable 29.97509, 31.14242 · Hamama stable 29.97536, 31.14244 | 763, 604 · 757, 620 · 792, 452 · 793, 422 | Yards behind houses, 1-storey sheds | Concentrated on the lanes 100–150 m east of the Sphinx road | OSM, OVP |
| **Stables, south** (Kafr el-Gabal side) | FB Stables 29.96747, 31.14318 · NB stables 29.96780, 31.14318 · Abu Basha 29.96789, 31.14300 · Omar Stable 29.96818, 31.14312 | 864, 1297 · 865, 1260 · 847, 1250 · 859, 1218 | Cluster ≈80 m across | Riding stables at the desert edge — where desert rides start | OVP |
| **9 Pyramids Lounge** | 29.96777, 31.13189 (OSM building) | **−224, 1264** | 22 × 18 m footprint (333 m²), single storey; opened Oct 2020 (Ahram / Yahoo titles) | Open-air restaurant on the southern ridge, 1.28 km from Khufu at bearing 190°, looking north at all the pyramids; reached by its own (green) bus. Timber decks and pergolas: GK, **UNVERIFIED** | OSM, WV, AWR |
| **Khufu's restaurant** | 29.978255, 31.124269 (OSM node; OVP 29.97838, 31.12440) | **−959, 101** | Inside "The King Khufu Center" (OSM polygon 129 × 57 m at −998, 90) with a Ladurée café (124 × 96 m area at −917, 69) and a car park 183 × 60 m | Fine-dining restaurant with a **raised terrace**, at shuttle stop 2; storeys **UNVERIFIED** | OSM, OVP, AWR |
| Panorama stop cafés | Coffee Island 29.972465, 31.119779 · Abdel Rahim Koueider 29.972378, 31.120065 | −1392, 743 · −1364, 753 | kiosks | Each station "has a café or snack point" (PNT) | OSM |
| **New visitor centre** | 29.96554, 31.11329 | −2017, 1511 (**OUT**) | Size **UNVERIFIED** | see §1 | WV |
| **Great Gate** | 29.96623, 31.10933 | −2399, 1434 (**OUT**) | — | see §1 | WV |
| Old ticket office / information building (Mena House gate) | 29.98170, 31.13266 | −150, −281 | 45 × 28 m | Now disused by the public | OSM |
| King Farouk's rest house | 29.980239, 31.135980 | 170, −119 | — | On the plateau edge NE of Khufu | OSM |
| Al-Ahram police station | 29.983933, 31.133741 | −45, −528 | — | Beside the old approach road | OSM |
| St George's church, Nazlet el-Semman (كنيسة مارجرجس) | 29.98294, 31.14131 | 684, −418 | — | Only place of worship in the map that any dataset locates | OVP (conf. 0.97) |
| **Grand Egyptian Museum** | 29.9950, 31.1193 (WP infobox); OSM building outline, mean of its vertices 29.99447, 31.11919 | −1438, −1755 (WP) / **−1449, −1696** (OSM) — **OUT** (1 km north of the edge) | OSM building outline: **≈445 m E–W × 557 m N–S, 64,500 m² footprint, longest diagonal 657 m**; `height=46`; chamfered-triangle plan. Site 500,000 m² (WP); 100,000 m² museum + conference centre (architect's data). Grand staircase "six storeys, ≈50 m" (WP) | Beige stone and translucent alabaster/glass front with triangular (Sierpinski) panels; north and south walls aligned on Khufu and Menkaure. **Distance from the Great Pyramid's centre to the building centroid: 2.23 km at bearing 320° (NW)** (computed from OSM); "about 2 km" (WP). **Opening**: trial opening Oct 2024; inaugurated **1 November 2025** (WP; OSM `start_date=2025-11-01`; Euronews 1 Nov 2025). Open to the general public from 4 Nov 2025: seen only in a search summary, **UNVERIFIED** | OSM, WP |

---

## 5. What the town looks like at street level

Nazlet el-Semman (east of the Sphinx, x 480–1100, z −300…800), Kafr el-Gabal (south of it) and
the Haram district (north-east). What the photos and data show:

| Feature | Fact for the modeller | Source |
| --- | --- | --- |
| Building heights — Sphinx road frontage | **2–4 storeys** (ground floor ≈4 m with shops, upper floors ≈3 m): a 2-storey classical-fronted shop building, a 3-storey block with roof terrace, a 3-storey ochre block with deep cantilevered balconies | PH `giza-tuktuk-bajaj.jpg`, `nazlet-el-samman-khafre.jpg` |
| Building heights — hotel row and interior | 4–6 storeys; OSM levels tagged on only 8 buildings in the town (1, 1, 2, 2, 4, 5, 5, 6); Guardian Guest House 4 floors | OSM, Expedia |
| Building heights — Haram / main roads | 6-storey unfinished frames near the Mansouria road; **10–12 storeys** continuous on Al-Haram Road | PH `pyramids-from-mansouria-road.jpg`, `al-haram-street-2012.jpg` |
| Footprints | OSM town buildings (173 mapped east of x=450): median **155 m²**, 10th–90th percentile 26–430 m²; plots tightly packed, shared party walls, lanes 3–6 m. Houses described as "at least 300 m²" family compounds of several flats | OSM, SAT, zawia3.com |
| Structure | **Reinforced-concrete frame** (an expert inspection in the San al-Agouz court case found the houses were reinforced concrete). **Red-brick infill panels left unplastered** on side and rear walls, plastered and painted only on the street front; exposed grey frame and floor slabs; **top floor unfinished** — columns with starter bars standing above the roof for a future storey: seen on the grey 6-storey frame in the Mansouria photo (bare concrete, some bays glazed with arched windows, some empty). Red-brick detail: GK for this exact village, photo-confirmed only in part → brick colour/bond **UNVERIFIED** | zawia3.com; PH `pyramids-from-mansouria-road.jpg`, `al-haram-street-2012.jpg` |
| Wall colours | Street fronts: **beige, sand, ochre-yellow, cream** stucco; dust-grey on the tall Haram blocks; a few white rooftop additions | PH (all town photos) |
| Balconies | (a) Deep **cantilevered concrete slab balconies** wrapping a corner, with solid upstand faced in brown and a **pierced-block or wrought-iron balustrade**; (b) **turned-baluster (classical) balustrades** in cast concrete on parapets and first-floor terraces; (c) on tall blocks, stacked shallow balconies with laundry, AC units and awnings | PH `nazlet-el-samman-khafre.jpg`, `giza-tuktuk-bajaj.jpg`, `al-haram-street-2012.jpg` |
| Roofs | Flat. **Roof terraces fitted out as cafés** (steel-frame pergolas with fabric or reed shading, "Cafe-Restaurant-Roof" signs), **satellite dishes** (several per roof, pointing south-ish), split-AC condensers, water tanks, telecom masts on the tall blocks, a raised concrete **water tower** at the plateau edge. Cylindrical/cubic rooftop water tanks in this village: GK, not clear in the photos → **UNVERIFIED** | PH `giza-tuktuk-bajaj.jpg`, `al-haram-street-2012.jpg`; Commons panoramio (9), viewed |
| Ground-floor shop fronts | One bay per shop, ≈3–4 m wide: **steel roller shutters painted green** (closed ones in the 2026 photo) under a striped/fringed pelmet; **red Coca-Cola fabric awnings** and fascia over kiosks; drinks fridges and racks on the pavement; souvenir/papyrus/perfume shops | PH `giza-tuktuk-bajaj.jpg` |
| Signboards | **Bilingual, English first for tourist trade**: "MAKTUB PYRAMIDS HOTEL", "Maktub CAFE-RESTAURANT-ROOF" (white on black fascia with a pyramid logo), "New Bes Papyrus" + Arabic, "FAYED BAZAAR" (2008); A-frame menu boards; a decorated arcade frieze of pointed-arch/mashrabiya pattern over one shopfront | PH `giza-tuktuk-bajaj.jpg`, `nazlet-el-samman-khafre.jpg` |
| Street furniture | Yellow/black kerbs and bollards, double-arm steel lamp column (§3); steel pedestrian fencing; boundary walls of **grey concrete block** and of **rubble limestone** (≈2.5 m, with sheet-steel gates) | PH `giza-tuktuk-bajaj.jpg`, `nazlet-el-samman-khafre.jpg`, `pyramids-from-mansouria-road.jpg` |
| Street trees | Dense dark-green **ficus (Indian laurel type)** in pavements, clipped or as full crowns 8–10 m; eucalyptus and casuarina along walls and the canal road; date and fan palms in the Mena House gardens. Species names by eye → **UNVERIFIED** | PH `giza-tuktuk-bajaj.jpg`, `pyramids-from-mansouria-road.jpg`, `mena-house-view-2008.jpg` |
| Overhead wires | Sagging bundles of power and TV cables strung building to building and across lanes; light cables to rooftop frames; no tram/trolley wires | PH `giza-tuktuk-bajaj.jpg` (left side), `cairo-electric-bus-2025.jpg` (Cairo) |
| Lane widths | Lanes 3–6 m; Zaghloul St 8–10 m; Sphinx road ≈10 m; dual canal road 2 × 8–12 m (§3) | SAT |
| Minaret style | The one minaret photographed nearby (Al-Haram Road, east of the map, 2012): a slim **neo-Mamluk "pencil" minaret** — square base, octagonal shaft, two balconies on muqarnas corbels, small bulbous finial with crescent; cream stone/render; about the height of the adjoining 10–12-storey blocks (≈35–40 m). Village mosques are usually smaller versions on a 2–4-storey prayer hall, often with green neon and loudspeakers: GK, **UNVERIFIED** | PH `al-haram-street-2012.jpg` |
| **Mosques inside the map** | **UNVERIFIED — none could be located.** Neither OSM (no `amenity=place_of_worship` with `religion=muslim` in the town; the only one mapped is an unnamed building at −1231, −149 in Hadayek al-Ahram: 29.980516, 31.121445) nor Overture places lists a mosque here. Clues only: (1) OSM street "**شارع مسجد الجابرى** / Al-Gabry Mosque Street" at ≈558, 192 (29.97744, 31.14000) → a mosque of the al-Gabry family stands on or beside it; (2) the shrine-mosque of **Sidi Hamad al-Semman**, the village's namesake, at "Sidi Hamad al-Semman square" where the annual mawlid is held (Masrawy, Apr 2024) — streets named for him at 670, 77 and 574, −430, exact spot unknown; (3) a Muslim **cemetery** (OSM) at 342, 811 (29.971857, 31.137760). Names and positions of 3–5 mosques still to be found | OSM, OVP, masrawy.com |
| Population / scale | Area population "over 200,000"; "more than 9,000 hotel rooms"; 4,800 families (≈53,400 people) face eviction under the redevelopment; 215 plots already demolished; plan to turn shops into bazaars; PM said in 2026 the area will be a "heritage zone" developed with residents | zawia3.com (24 Oct 2025); Amwal al-Ghad (23 May 2026, summary) |

---

## 6. Reference images

Fifteen files in `research/photos/giza-town/`, all Wikimedia Commons, CC BY / CC BY-SA / CC0;
authors, licences and page URLs in `research/photos/giza-town/CREDITS.md`.

| Wanted | Got |
| --- | --- |
| Cairo white taxi | `cairo-white-taxi.jpg` (+ old black-and-white: `cairo-old-bw-taxi.jpg`, `cairo-bw-taxis-2007.jpg`) |
| Microbus | `cairo-microbus-hiace-motorcycle-2011.jpg` (H100, Cairo), `microbus-alexandria-2018.jpg` (H200, Alexandria — no Giza microbus photo found) |
| Tuk-tuk | `giza-tuktuk-bajaj.jpg` (in Nazlet el-Semman, Aug 2026 — also the best street-scene reference) |
| CTA bus | `cairo-public-bus-2012.jpg`, `cairo-electric-bus-2025.jpg` |
| Giza electric visitor bus | **none exists on Commons** (searched "electric bus Giza pyramids", "Giza pyramids electric bus 2025") |
| Mena House | `mena-house-south-facade-1960.jpg`, `mena-house-view-2008.jpg` (no recent exterior found) |
| Nazlet el-Semman streets / rooftops with pyramids | `nazlet-el-samman-khafre.jpg`, `giza-tuktuk-bajaj.jpg`, `pyramids-from-mansouria-road.jpg`; **no rooftop view found** |
| Al-Ahram Road | `al-haram-street-2012.jpg` (east of the map) |
| Bonus: pre-2025 vehicles on the plateau | `plateau-coaches-minibuses-by-khufu-pre2025.jpg`, `khufu-north-car-park-panorama-pre2025.jpg` |

---

## Todo / approximate

- **Visitor bus**: make, length, seats, livery — unknown. Find a photo (OPE's own channels, news video) before modelling; the 8–9 m white midibus is a guess.
- **Stops**: OSM gives five stop positions; "Sphinx Access" vs "Sphinx Exit", station VII ("Exercise area") and the 9 Pyramids Lounge stop are not located. Line colours/numbering come from one source (Wikivoyage) and the 2026 guide counts four routes, not five.
- **Sphinx gate**: exit-only (AWR 2026) vs still an entrance (WV 2025) — unresolved.
- **Animal zone boundary**: only described in words.
- **Road lane counts** are from undated imagery by eye; no OSM lane tags in the town. Al-Ahram Road inside the map appears to be under works. Lighting and kerbs verified only on the Sphinx road. No posted speed limits found.
- **"Mansouriya canal road" = OSM "Abu al-Hol al-Siyahi Street"?** Assumed, not proven.
- **Mosques**: none located — the biggest gap for the town model. Next step: walk the imagery with `tools/geo/sat_view.py` around 558, 192 and the Sidi Hamad square, or find a local map.
- **Hotel storeys and façades**: only Guardian Guest House (4) and Tutankhamun Hotel (4) have a source; Pyramids View Inn / Great Pyramid Inn footprints are not told apart; KFC/Pizza Hut building height unverified.
- **Microbus markings in Giza, taxi model list, pickup/cart details, plate colour code**: general knowledge only.
- **Vehicle dimensions**: manufacturer figures from memory, not re-checked.
- **Red-brick infill / rooftop water tanks**: typical of Giza informal building but not clearly visible in the photos collected; find a rooftop photo.
- **GEM**: façade height 46 m is an OSM tag; public opening date 4 Nov 2025 unverified (inauguration 1 Nov 2025 is solid).
- **Mena House**: recent exterior, wing-by-wing storeys, and whether the golf course is in use — not found.
- Primary Ahram Online reports (403 to automated access) should be read by hand to confirm car-park capacity, stop names and the animal-zone rules.

## Built so far (native build)

- Road graph from the OSM segments (`tools/geo/build_roadnet.py`): 37 km of public streets, 12 km of paved site roads. Vehicles from `tools/blender/vehicles.py` at generic sizes: saloon, white taxi with chequer band and roof sign, white microbus, black-and-yellow tuk-tuk (side streets only), pickup, city bus, visitor shuttle. Only the shuttle runs inside the fence. **Approximate:** the shuttle's make, size and colours (unverified in the research), the city bus livery (white with a red band; real CTA buses are red, blue or green by year), lane counts (one lane each way everywhere), speeds; vehicles do not stop at the mapped bus stops; tour coaches now drive the main public streets only (the parked ones remain in the old coach parks, which is the pre-2025 state).
- Town: packed-earth ground in the built-up area, balconies, air-conditioners, shop signs and awnings in the façade shader, satellite dishes; parked cars, street lamps and townspeople along the streets. Named places from section 4 appear as captions (Mena House, the inns, KFC/Pizza Hut, Sound and Light theatre, stables, church, 9 Pyramids Lounge, Khufu's restaurant, the five visitor bus stops) — the buildings themselves are still the generic footprints, not modelled individually. No mosques (none located). Carriages and led camels keep to the site roads on the south side and west of the Panorama, and the camels for hire wait at the Panorama, below the 9 Pyramids ridge and at the southern viewpoint (the zone boundary is only described in words in the sources, so this is an interpretation). The Grand Egyptian Museum appears on the skyline as a plain massing of its OSM outline (445 × 557 m, 46 m front), on a drawn desert apron beyond the map edge: not walkable, no detail.

## Follow-up, 13 Nov 2026

- **Mosques.** OSM and the Overture buildings and places layers still list none in the village (the only "mosque" place in the box is a mis-located entry for Muscat). A web search found two names: *Masjid Naser* (a directory listing gives 29.97337 N, 31.14233 E → game 783, 643, on Naser Street; the listing page itself rate-limited, so the coordinates are from the search summary only) and *Masjed El Salhen, Nazlet El-Semman* (a Wikimedia Commons category with four files; position unknown, Commons unreachable). Masjid Naser is now built at that point as a generic modern mosque with dome and minaret — **low confidence in the position, none in the form**. Overpass was unreachable again.
- **Visitor buses.** Smithsonian Magazine (22 Aug 2025) and Egyptian Streets (11 Apr 2025) confirm air-conditioned electric hop-on hop-off shuttles, "over 45" of them at five-minute intervals, serving Khufu, Khafre, Menkaure and the Sphinx; neither describes their make, size or colour. One report says Orascom was *exploring* buying from El Nasr Automotive (unconfirmed). The model stays a generic 7.6 m white bus with a green band: **make and livery UNVERIFIED**; a photograph is needed.
- **Web build.** Traffic, parked cars, street lamps, the far places and KV62 are now in the web build too (`js/traffic.js`, `placeOutdoor` in `js/models.js`).

## Follow-up, 13 Nov 2026 — mosques and the bus

- **Masjed El Salhen** (مسجد الصالحين) is now built (`buildSalhen` in `js/world.js`) from two Commons photographs (EliziR 2014; Sara Adel Sayed 2019 — `research/photos/giza-town/`). From the photographs (*firm*): two storeys of tan stone, round-arched upper windows (a group of three narrow lights and three wide ones), a pointed-arch door beside the minaret, stepped-merlon parapet, small ribbed dome with crescent finial, square minaret on a square base with a tiled skirt, paired arched openings, two balconies (loudspeakers on the lower), a narrower top stage and a pointed cap; a small square with lamp standards and benches in front. *Inferred*: its position — the mapped 10 × 27 m footprint at game (780, −513), 15–40 m from the two files' geotags (29.98354 N 31.14253 E; 29.98414 N 31.14230 E), chosen because its long side matches the photographed front; that the front faces east; and all heights (hall ≈ 9 m, minaret ≈ 37 m), scaled from the photographs against the storey height.
- **Masjid Naser** is unchanged: position from a web directory only, generic form, and labelled so in the game. No photograph found.
- **Visitor bus**: searched again (Commons, Openverse, Smithsonian, Egyptian Streets, Lonely Planet, Moris Insider). No photograph, make or livery found — only "air-conditioned electric", "over 45", five-minute intervals. *Unverified*; the generic white bus with a green band stays.

## Follow-up, 13 Nov 2026 (second pass) — supersedes the entry above

- **Masjed El Salhen moved** from game (780, −513) to **(767, −577), front facing NNW**. Evidence: the Commons pages carry separate *object* locations — 2014 and 2019 (file 6) agree on 29.98412 N 31.14231 E = game (781, −549). Esri World Imagery (looked at, not stored; `tools/geo/sat_view.py 29.98405 31.14235 19`) shows 25–35 m north-west of that point exactly the sequence in the 2014 photograph, read north to south: a sandy square, a lane with parked cars, a belt of trees, then a flat roof ≈ 30 × 22 m. That roof is the northern lobe of an Overture footprint whose height attribute is 9.3 m — two storeys, as photographed — and the lobe measures 26 m along the front, against 27 m scaled from the photograph. The longer wing of the same block runs west, as the ornate stone wing does on the right of the 2014 photograph. Status: *probable* (three independent agreements), not surveyed. The minaret (east end of the front) is not separately visible in the imagery.
- **Masjid Naser rebuilt** at **(796, 709)**. Still no photograph and no map entry. But 68 m from the directory's point the imagery shows the only domed roof in the neighbourhood: a flat-roofed block (Overture footprint ≈ 38 × 28 m) with a small dome in a square roof lantern ≈ 6 m across, north-east of centre; no minaret or minaret shadow can be made out. The generic domed-and-minareted mosque is gone; what is built is that block, lantern and dome as seen from above (walls, colour, openings and the 7 m height are generic). Status: identification *probable at best*; form from above *observed*.
- **Visitor bus resolved as to livery.** A press photograph of the fleet at the September 2022 launch (source and description in `research/photos/giza-town/CREDITS.md`; not free, not stored) shows full-size two-axle low-floor buses in amber-gold with a black front mask and window band, amber mirrors on hooked arms, a red LED sign "Pyramids" and ORASCOM Pyramids Entertainment lettering. `tools/blender/vehicles.py` `shuttle()` now builds that (10.5 × 2.5 × 3.15 m — length judged from the photograph; two kerb-side doors assumed, that side not being shown; lettering not drawn). The **maker and model remain unknown** (badge illegible; no source names a supplier). Euronews (24 Apr 2025) gives the fleet as 45 buses at five-minute intervals.
