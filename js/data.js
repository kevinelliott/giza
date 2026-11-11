// =====================================================================
//  Giza Plateau — authentic survey data
//  All distances in metres. World axes: +X = East, +Y = Up, +Z = South.
//  Positions come from mapped footprints (OpenStreetMap, traced from
//  aerial imagery) projected to a local metric grid with the centre of the
//  Great Pyramid at the origin; ground levels come from the Copernicus
//  elevation model with Y = 0 at the Great Pyramid's base. See geodata.js
//  and tools/geo/ for how they are produced.
// =====================================================================
import { SITES } from './geodata.js';

export const DEG = Math.PI / 180;
const C = k => ({ x: SITES[k].x, z: SITES[k].z });
// The three main pyramids use Petrie's 1880-82 triangulation (centre to centre
// from the Great Pyramid; 1 inch = 0.0254 m). The mapped footprints agree to
// within ~1.5 m, which is what positions everything else.
const IN = 0.0254;
const PETRIE = {
  khafre: { x: -13165.8 * IN, z: 13931.6 * IN },     // 334.4 m W, 353.9 m S
  menkaure: { x: -22616 * IN, z: 29102 * IN }        // 574.4 m W, 739.2 m S
};

// ---- The three main pyramids ----------------------------------------
// base       : side length of the square base (m)
// height     : original apex height (m)
// slopeDeg   : face inclination from horizontal
// center     : {x:east, z:south} of the base centre on the world grid
// casing     : visual hint for the surviving smooth limestone casing
export const PYRAMIDS = {
  khufu: {
    id: 'khufu',
    name: 'Great Pyramid of Khufu',
    base: 230.4,
    height: 146.6,
    slopeDeg: 51.84,        // 51 deg 50' 40"
    center: { x: 0, z: 0 },
    baseY: 0,
    align: '3′26″',         // sides off true north (W of N)
    casing: 'none',
    blurb: 'Built c. 2560 BC for Pharaoh Khufu. 2.3 million blocks, ' +
           'originally 146.6 m tall — the tallest human structure for ~3,800 years.'
  },
  khafre: {
    id: 'khafre',
    name: 'Pyramid of Khafre',
    base: 215.25,
    height: 143.5,
    slopeDeg: 53.13,        // 53 deg 10'
    // ~335 m west, 352 m south of Khufu, on bedrock ~9 m higher — which is
    // why it looks the taller of the two.
    center: PETRIE.khafre,
    baseY: SITES.khafre.y,
    align: '6′13″',
    casing: 'cap',          // retains casing near the apex
    blurb: 'Built c. 2570 BC for Khafre. Appears taller than Khufu\'s ' +
           'pyramid only because it stands on higher bedrock. Keeps its ' +
           'original Tura limestone casing near the summit.'
  },
  menkaure: {
    id: 'menkaure',
    name: 'Pyramid of Menkaure',
    base: 102.2,
    height: 65,
    slopeDeg: 51.34,
    // ~574 m west, 738 m south of Khufu.
    center: PETRIE.menkaure,
    baseY: SITES.menkaure.y,
    align: '14′03″',
    casing: 'lowerGranite', // lowest 16 courses were red Aswan granite
    blurb: 'Built c. 2510 BC for Menkaure, the smallest of the three. ' +
           'Its lowest courses were clad in red Aswan granite.'
  }
};

// ---- Subsidiary "queens'" pyramids ----------------------------------
// Khufu's three (G1-a/b/c) stand in a N–S row ~78 m east of his east face,
// south of his mortuary temple. Bases ~49.5 / 50 / 46.25 m.
const Q = (k, base, height) => ({ base, height, center: C(k), baseY: SITES[k].y });
export const QUEENS_KHUFU = [
  Q('g1a', 49.5, 30.25),   // G1-a (Hetepheres I)
  Q('g1b', 50.0, 30),      // G1-b (Meritites I)
  Q('g1c', 46.25, 28)      // G1-c (Henutsen)
];
// Menkaure's three (G3-a/b/c) sit in an E–W row south of his south face.
// G3-a (east) is the larger, once granite-cased; G3-b/c are smaller.
export const QUEENS_MENKAURE = [
  Q('g3a', 44, 28.4),
  Q('g3b', 31.2, 21),
  Q('g3c', 31.2, 21)
];

// ---- The Great Sphinx -----------------------------------------------
// Carved from a single limestone outcrop, faces due east (+X).
export const SPHINX = {
  name: 'The Great Sphinx',
  // ~326 m east, 431 m south of Khufu, down at the foot of the plateau —
  // its enclosure floor is ~42 m below the Great Pyramid's base.
  center: C('sphinx'),
  floorY: SITES.sphinx.floor,
  length: 73,
  height: 20,
  width: 19,
  facing: 'east',
  blurb: 'A 73 m limestone sphinx with the body of a lion and a royal ' +
         'human head, generally attributed to the reign of Khafre.'
};

// ---- Great Pyramid interior passage network -------------------------
// Coordinates are LOCAL to the Khufu base centre (x East, y Up, z South).
// The whole system is offset ~7.0 m east of the pyramid's vertical axis,
// matching the real structure's eastward displacement.
const OFF = 7.0;                         // eastward offset of the passages
const DESC = 26.5 * DEG;                 // descending/ascending angle
// Unit direction of the descending passage (south + down):
const dDown = { y: -Math.sin(DESC), z: Math.cos(DESC) };
// Unit direction of the ascending passage (south + up):
const dUp = { y: Math.sin(DESC), z: Math.cos(DESC) };

// Original entrance: north face, ~17 m above the base. The face has
// receded inward by this height, so it sits at z = -(b/2)(1 - 17/h).
const ENT_Y = 17;
const bHalf = PYRAMIDS.khufu.base / 2;          // 115.2
const ENT_Z = -(bHalf * (1 - ENT_Y / PYRAMIDS.khufu.height)); // ~ -101.9

function along(p, dir, len) {
  return { x: p.x, y: p.y + dir.y * len, z: p.z + dir.z * len };
}

// Interior is defined as continuous corridors whose path points are the
// FLOOR centre-line the player walks on. Chambers are placed so their floors
// line up with the corridor arrival height (no lips, no steps).
const RAMP_BASE = { x: OFF, y: 0, z: ENT_Z - 40 };   // ground, north of the base
const DOOR = { x: OFF, y: 15.0, z: ENT_Z };          // floor at the doorway
const LVL = { x: OFF, y: 15.0, z: ENT_Z + 9 };       // level run just inside
const J1a = along(LVL, dDown, 26);                   // foot of the descent
const J1b = { x: OFF, y: J1a.y, z: J1a.z + 4 };     // short flat junction buffer
const J2 = along(J1b, dUp, 39);                      // foot of the Grand Gallery
const GTOP = along(J2, dUp, 46.7);                   // top of the Grand Gallery
const KINGC = { x: OFF, y: GTOP.y, z: GTOP.z + 8 };  // King's Chamber arrival (floor)
const SUBT = along(J1a, dDown, 70);                  // subterranean chamber floor
const QUEEN = { x: OFF + 18, y: J1b.y, z: J1b.z };   // queen's branch end (off to the east, clear of the gallery)

export const KHUFU_INTERIOR = {
  entrance: DOOR,
  corridors: [
    // Entrance ramp (floor-only, segment 0) → level → descent → ascent →
    // Grand Gallery → King's Chamber, as one continuous surface.
    {
      path: [RAMP_BASE, DOOR, LVL, J1a, J1b, J2, GTOP, KINGC],
      w: [5, 5, 2.8, 2.6, 2.6, 3.0, 3.0, 2.6],
      h: [3.4, 3.4, 3.2, 3.2, 3.2, 5.0, 5.0, 3.2],
      wallFrom: 1
    },
    // Branches are floor-only (wallFrom huge) so their walls can't seal off the
    // main route where they meet it at the junctions.
    { path: [J1a, SUBT], w: 2.6, h: 3.2, wallFrom: 99 },  // branch to subterranean
    { path: [J1b, QUEEN], w: 2.6, h: 3.2, wallFrom: 99 }  // branch (east) to queen's chamber
  ],
  chambers: [
    {
      id: 'king', name: "King's Chamber",
      center: { x: OFF, y: KINGC.y + 2.925, z: KINGC.z + 1.5 },
      sx: 10.47, sy: 5.85, sz: 5.23, sarcophagus: true, sarcOffsetX: 2.6,
      blurb: "King's Chamber — red Aswan granite, 10.47 x 5.23 m, " +
             '5.85 m high. Holds a lidless granite sarcophagus. Five ' +
             'stress-relieving chambers sit above the flat ceiling.'
    },
    {
      id: 'queen', name: "Queen's Chamber",
      center: { x: QUEEN.x + 1.4, y: QUEEN.y + 3.13, z: QUEEN.z },
      sx: 5.74, sy: 6.26, sz: 5.23, sarcophagus: false, gabled: true,
      blurb: "Queen's Chamber — limestone with a gabled roof, " +
             '5.23 x 5.74 m. A niche in the east wall and two narrow ' +
             '"air shafts" lead from it.'
    },
    {
      id: 'subterranean', name: 'Subterranean Chamber',
      center: { x: OFF, y: SUBT.y + 1.75, z: SUBT.z + 1.5 },
      sx: 8.0, sy: 3.5, sz: 14.0, sarcophagus: false, rough: true,
      blurb: 'Subterranean Chamber — cut roughly into the bedrock ~30 m ' +
             'below the base and left unfinished.'
    }
  ],
  doors: [
    { chamberId: 'king', face: 'north' },
    { chamberId: 'queen', face: 'west' },
    { chamberId: 'subterranean', face: 'north' }
  ]
};

// With the Blender-built upper chambers loaded (assets/models/khufu_upper.glb:
// Grand Gallery, antechamber, King's Chamber, Campbell's Chamber) the
// procedural interior stops at the foot of the gallery (J2) and the model
// takes over from there.
const TP_KING = { x: KINGC.x, y: KINGC.y + 0.3, z: KINGC.z };
export const KHUFU_UPPER = {
  origin: J2, tpKing: TP_KING, tpCampbell: { ...TP_KING },
  pois: [
    ['gallery', 'Grand Gallery',
      'Grand Gallery — 46.7 m long and 8.6 m high, its walls stepping inward in seven corbels to a roof only ~1 m wide. ' +
      'A 1 m channel runs between two ramps cut with 27 pairs of slots, whose purpose is still argued over.', 12],
    ['antechamber', 'Antechamber',
      'Antechamber — granite, with the "granite leaf" hanging across it and three slots that held portcullis slabs, ' +
      'lowered to seal the King\'s Chamber. The passages either side are true size, 1.05 × 1.11 m — crouch (C) to get through.', 3],
    ['king', "King's Chamber",
      "King's Chamber — 10.47 × 5.23 m and 5.85 m high, walled in 100 blocks of red Aswan granite, roofed by nine " +
      'granite beams of up to ~80 tonnes. Two narrow shafts rise from the north and south walls.', 6],
    ['sarcophagus', "Khufu's sarcophagus",
      'A lidless granite coffer, 2.28 × 0.98 × 1.05 m — slightly wider than the passage, so it was set in place as the ' +
      'chamber was built. One corner was broken away by early visitors.', 3],
    ['campbell', "Campbell's Chamber",
      'The topmost of five relieving chambers stacked above the King\'s Chamber, forced open with gunpowder by Howard ' +
      'Vyse in 1837. Its gabled blocks carry builders\' red-ochre graffiti — including the cartouche of Khufu.', 6]
  ]
};
export function khufuLowerInterior() {
  const c0 = KHUFU_INTERIOR.corridors[0];
  return {
    ...KHUFU_INTERIOR,
    corridors: [{ path: c0.path.slice(0, 6), w: [5, 5, 2.8, 2.6, 2.6, 1.6], h: [3.4, 3.4, 3.2, 3.2, 3.2, 2.4], wallFrom: 1 },
      ...KHUFU_INTERIOR.corridors.slice(1)],
    chambers: KHUFU_INTERIOR.chambers.filter(c => c.id !== 'king'),
    doors: KHUFU_INTERIOR.doors.filter(d => d.chamberId !== 'king')
  };
}

// ---- Menkaure's substructure -------------------------------------------
// After Vyse & Perring and Maragioglio & Rinaldi (research/sites/menkaure.md):
// entrance 4 m up the north face; a 31.7 m passage descending at 26 deg to
// the PANELLED CHAMBER (3.63 x 3.16 m, palace-facade niches — the first
// decoration inside any pyramid); a 12.6 m horizontal passage with three
// portcullis slots; the large upper chamber (14.2 x 3.84 x 4.87 m, E-W);
// and a ramp down west to the granite burial chamber (6.59 x 2.62 x 3.43 m).
// Schematic: the ramp really starts in the middle of the upper chamber's
// floor; the six-niche "cellar" is not built; passages are enlarged.
const MK_HALF = 102.2 / 2, MK_H = 65;
const mkDoor = { x: 0, y: 4, z: -(MK_HALF * (1 - 4 / MK_H)) };
const mkA = { x: 0, y: 4 - 31.7 * Math.sin(26 * DEG), z: mkDoor.z + 31.7 * Math.cos(26 * DEG) };
const mkU0 = mkA.z + 3.63 + 12.6, mkUc = mkU0 + 1.92;
export const MENKAURE_INTERIOR = {
  entrance: mkDoor,
  rampBase: { x: 0, y: 0, z: -MK_HALF - 9 },
  corridors: [
    { path: [{ x: 0, y: 0, z: -MK_HALF - 9 }, mkDoor, mkA], w: [3, 2.2, 2.2], h: [3, 2.6, 2.6], wallFrom: 1 },
    { path: [{ x: 0, y: mkA.y, z: mkA.z + 3.63 }, { x: 0, y: mkA.y, z: mkU0 }], w: 2.2, h: 2.6 },
    { path: [{ x: -7.1, y: mkA.y, z: mkUc }, { x: -13.6, y: mkA.y - 3.4, z: mkUc }], w: 2.2, h: 2.6 }
  ],
  chambers: [
    { id: 'menkaure-panelled', name: 'Menkaure — Panelled Chamber',
      center: { x: 0, y: mkA.y + 1.3, z: mkA.z + 1.815 }, sx: 3.16, sy: 2.6, sz: 3.63, panelled: true,
      blurb: 'Panelled Chamber — its rock walls are carved and plastered as a palace façade, eleven niches on each long ' +
             'wall: the first decoration inside any pyramid since Djoser.' },
    { id: 'menkaure-upper', name: 'Menkaure — Upper Chamber',
      center: { x: 0, y: mkA.y + 2.435, z: mkUc }, sx: 14.2, sy: 4.87, sz: 3.84,
      blurb: 'Upper Chamber — 14.2 × 3.84 m, the burial room of the first design. A ramp cut in its floor leads down ' +
             'to the final burial chamber.' },
    { id: 'menkaure-burial', name: 'Menkaure — Burial Chamber', granite: true,
      center: { x: -14.91, y: mkA.y - 3.4 + 1.715, z: mkUc }, sx: 2.62, sy: 3.43, sz: 6.59,
      blurb: 'Burial Chamber — lined with red granite under a roof of granite beams recut into a vault. The basalt ' +
             'sarcophagus Vyse found here in 1837 was lost at sea in 1838 when the Beatrice sank off Spain.' }
  ],
  doors: [
    { chamberId: 'menkaure-panelled', face: 'north' }, { chamberId: 'menkaure-panelled', face: 'south' },
    { chamberId: 'menkaure-upper', face: 'north' }, { chamberId: 'menkaure-upper', face: 'west' },
    { chamberId: 'menkaure-burial', face: 'east' }
  ]
};

// With the Blender-built substructure loaded (assets/models/menkaure.glb) only
// the timber stair up to the entrance is procedural.
export const MENKAURE_ENTRY = {
  entrance: mkDoor, rampBase: MENKAURE_INTERIOR.rampBase,
  corridors: [{ path: [MENKAURE_INTERIOR.rampBase, mkDoor], w: [3, 2.2], h: [3, 2.6], wallFrom: 99 }],
  chambers: [], doors: []
};
export const MENKAURE_SUB = {
  tp: { x: 0, y: 0, z: 0 },
  pois: [
    ['panelled', 'Menkaure — Panelled Chamber',
      'Panelled Chamber — its rock walls are carved and plastered as a palace façade, eleven niches on each long ' +
      'wall: the first decoration inside any pyramid since Djoser.', 3],
    ['upper', 'Menkaure — Large Chamber',
      'The large chamber, 14.2 × 3.84 m and 4.87 m high — the burial room of the first design. High in the north wall ' +
      'opens the abandoned passage of that design; in the floor, a ramp leads down to the final burial chamber.', 6],
    ['burial', 'Menkaure — Burial Chamber',
      'Burial Chamber — lined with red granite under granite beams recut into a vault. The basalt sarcophagus Vyse ' +
      'found here in 1837, carved as a palace façade, was lost at sea in 1838 when the Beatrice sank off Spain.', 4],
    ['niches', 'Menkaure — Room of the six niches',
      'Down a short stair: a rock-cut room with six deep niches, four in the east wall and two in the north — perhaps ' +
      'for the canopic chests and the crowns of Upper and Lower Egypt.', 3]
  ]
};

// ---- Tomb of Meresankh III (G 7530-sub), Eastern Cemetery ------------------
// Blender model (tools/blender/meresankh.py) placed below its mastaba.
export const MERESANKH = {
  name: 'Tomb of Meresankh III', center: { x: 341.4, z: 156.1 },
  tp: { x: 341.4, y: 1, z: 156.1, ground: true },
  pois: [
    ['chapel', 'Tomb of Meresankh III',
      'The rock-cut chapel of Queen Meresankh III, granddaughter of Khufu and wife of Khafre, found by Reisner in 1927 ' +
      'with its paint still bright. Her mother Hetepheres II gave her this tomb.', 5],
    ['statues', 'The ten women',
      'Ten women carved from the living rock along the north wall — Meresankh, her mother Hetepheres II and her ' +
      'daughters — under an architrave naming the queen. Nothing quite like it survives in any other tomb.', 4],
    ['offering', 'Offering room',
      'The west room: statue niches, a false door, and the shaft down to the burial chamber where her black granite ' +
      'sarcophagus (now in Cairo) was found.', 4]
  ]
};

// ---- Simple interiors for Khafre & Menkaure -------------------------
// A descending passage from the north base down to a burial chamber that
// stays at/above the base level (so it never clips the terrain surface).
export function simpleInterior(p) {
  const half = p.base / 2;
  const door = { x: 0, y: 0.6, z: -half + 1 };             // floor at the north base
  const angle = 20 * DEG;
  const dir = { y: -Math.sin(angle), z: Math.cos(angle) };
  const end = along(door, dir, (half - 16) / Math.cos(angle)); // descend to chamber
  const chamber = {
    id: p.id + '-burial',
    name: p.name + ' — Burial Chamber',
    center: { x: 0, y: end.y + 2, z: end.z + 2.5 },
    sx: 7, sy: 4, sz: 9, sarcophagus: true,
    blurb: p.name + ': descending passage to a granite-lined burial ' +
           'chamber containing the royal sarcophagus.'
  };
  return {
    entrance: door,
    corridors: [{ path: [door, end], w: 2.4, h: 3.0 }],
    chambers: [chamber],
    doors: [{ chamberId: chamber.id, face: 'north' }]
  };
}

// ---- Other monuments -------------------------------------------------
// Khentkaus I — the "Fourth Pyramid": a two-tiered rock-cut tomb at the head
// of the Central Field, between the Khafre and Menkaure complexes.
export const KHENTKAUS = {
  name: 'Tomb of Khentkaus I',
  center: C('khentkaus'), baseY: SITES.khentkaus.y,
  base: 45, base2: 30, height1: 10, height2: 8,
  blurb: 'The "Fourth Pyramid of Giza" — the two-tiered rock-cut tomb of ' +
         'Queen Khentkaus I, at the head of the Central Field.'
};
// Heit el-Ghurab, the "Lost City of the Pyramids" — the workers' town south
// of the Wall of the Crow that housed and fed the building crews.
export const WORKERS_VILLAGE = {
  name: "Workers' Town (Heit el-Ghurab)",
  center: { x: 585, z: 905 },
  blurb: 'Heit el-Ghurab, the "Lost City of the Pyramids": barracks, bakeries ' +
         'and long galleries that housed the crews who built Giza.'
};
// The Wall of the Crow — a colossal stone wall with a monumental gateway,
// separating the pyramid plateau from the workers' town.
export const WALL_OF_CROW = {
  name: 'Wall of the Crow',
  a: { x: SITES.wallOfCrow.a[0], z: SITES.wallOfCrow.a[1] },
  b: { x: SITES.wallOfCrow.b[0], z: SITES.wallOfCrow.b[1] },
  height: 10, thickness: 8, gate: 14,
  blurb: 'A massive limestone wall (~200 m long, ~10 m high) with a ' +
         'monumental gateway between the plateau and the workers\' town.'
};
// Khafre's granite valley temple, beside the Sphinx at the foot of his
// causeway (distinct from, and just south of, the Sphinx Temple).
export const KHAFRE_VALLEY = {
  name: 'Khafre Valley Temple',
  center: C('khafreValley'), baseY: SITES.khafreValley.y,
  blurb: 'Khafre\'s granite-clad valley temple beside the Sphinx, at the foot ' +
         'of his causeway — its pillared hall held his great seated statues.'
};
// Menkaure's valley temple, at the foot (east end) of his causeway.
export const MENKAURE_VALLEY = {
  name: 'Menkaure Valley Temple',
  center: C('menkaureValley'), baseY: SITES.menkaureValley.y,
  blurb: 'Menkaure\'s valley temple at the foot of his causeway — begun in ' +
         'stone and finished in mud brick after his death.'
};

// The Sphinx Temple, directly in front of the Sphinx (same quarried level).
export const SPHINX_TEMPLE = {
  name: 'Sphinx Temple',
  center: C('sphinxTemple'), baseY: SITES.sphinxTemple.y,
  blurb: 'Built of blocks quarried from around the Sphinx itself — an open court ' +
         'ringed by granite-cased pillars, aligned with the equinox sunrise.'
};
// Amenhotep II's New Kingdom temple, on the slope north-east of the Sphinx.
export const AMENHOTEP_TEMPLE = {
  name: 'Temple of Amenhotep II',
  center: C('amenhotepTemple'), baseY: SITES.amenhotepTemple.y,
  blurb: 'A mud-brick chapel built ~1,100 years after the pyramids by Amenhotep II, ' +
         'who worshipped the Sphinx as Horemakhet, "Horus in the Horizon".'
};
// Khafre's mortuary temple, against his pyramid's east face (footprint from
// the mapped outline in geodata.TEMPLES).
export const KHAFRE_MORTUARY = {
  name: 'Khafre Mortuary Temple', center: C('khafreMortuary'),
  blurb: 'The most complete Old Kingdom mortuary temple: entrance hall, pillared ' +
         'court and five statue niches, built of colossal local limestone blocks.'
};
// The quarry south-east of Menkaure, where his core blocks were cut.
export const MENKAURE_QUARRY = {
  name: 'Menkaure Quarry', center: C('menkaureQuarry'),
  blurb: 'Quarry faces and channels south-east of Menkaure — the source of his core ' +
         'blocks, still showing the trenches where stones were levered free.'
};

// The "GIS" central-field quarry south of the Great Pyramid, where much of
// the core stone was cut.
export const GIS_QUARRY = {
  name: 'Central Field Quarry (GIS)', center: { x: -40, z: 590 },
  blurb: 'The main quarry south of the Great Pyramid, where workers cut the ' +
         'core limestone blocks — leaving stepped benches in the bedrock.'
};

// The Trial Passages — rock-cut corridors east of the Great Pyramid that
// reproduce its internal passage system at near-full scale.
export const TRIAL_PASSAGES = {
  name: 'Trial Passages', center: { x: 160, z: -42 },
  blurb: 'Rock-cut passages east of the Great Pyramid that reproduce its ' +
         'internal corridors at near-full scale — likely a builders\' mock-up.'
};
// A priests'/officials' settlement beside the Khentkaus monument.
export const KHENTKAUS_TOWN = {
  name: 'Khentkaus Town', center: { x: 178, z: 662 },
  blurb: 'A settlement of priests who served the cult of Queen Khentkaus I, ' +
         'built against her monument.'
};
// Tombs of the actual pyramid builders, on the escarpment above their town.
export const WORKERS_CEMETERY = {
  name: "Workers' Cemetery", center: { x: 395, z: 905 },
  blurb: 'Tombs of the pyramid builders on the slope above their town — small ' +
         'mud-brick and stone tombs, some with miniature vaulted superstructures.'
};

// Satellite / cult pyramids beside the main pyramids.
export const SATELLITES = [
  { name: 'Khufu Satellite Pyramid (G1-d)', base: 21.75, height: 13.8, center: { x: 95, z: 130 }, baseY: 0 },
  { name: 'Khafre Satellite Pyramid (G II-a)', base: 20.1, height: 12.4, center: C('khafreSat'), baseY: SITES.khafreSat.y }
];
// Khufu's boat pits: two rectangular pits parallel to the south face (one held
// the reconstructed "Khufu Ship"), and — mapped from their real outlines —
// the two boat-shaped pits flanking his mortuary temple plus the one
// beside the causeway. len/wid in metres, rot = long-axis angle (deg).
const [bpN, bpS, bpC] = SITES.boatPits;
const pitOf = ([x, z, len, wid, rot], name) => ({ x, z, len, wid, rot, name });
export const BOAT_PITS = [
  { x: -30, z: 140, len: 32, wid: 6, rot: 0, boat: true, name: "Khufu's Solar Boat (south pit)" },
  { x: 32, z: 140, len: 32, wid: 6, rot: 0, name: 'South boat pit' },
  pitOf(bpN, 'North-east boat pit'), pitOf(bpS, 'South-east boat pit'), pitOf(bpC, 'Causeway boat pit')
];
// Khufu's mortuary temple (basalt-floored court) against the east face:
// 40 m deep (E–W) by 52.5 m wide (N–S), between the two boat pits.
export const KHUFU_MORTUARY = { center: { x: 115.2 + 20, z: 0 }, sx: 40, sz: 52.5 };
// Khufu's causeway leaves the temple ~13° north of east (the mapped boat pit
// beside it gives the bearing) and drops off the escarpment to his valley
// temple, whose remains lie beneath the village of Nazlet el-Samman.
const CW = (bpC[4]) * DEG;
export const KHUFU_CAUSEWAY = { a: { x: 155.2, z: 0 }, dir: { x: Math.cos(CW), z: Math.sin(CW) }, len: 740 };
export const KHUFU_VALLEY = {
  name: 'Khufu Valley Temple',
  center: { x: 155.2 + Math.cos(CW) * 740, z: Math.sin(CW) * 740 },
  blurb: 'Khufu\'s valley temple at the east end of his causeway — its remains ' +
         'lie buried beneath the modern village of Nazlet el-Samman.'
};

// ---- The Serapeum of Saqqara ------------------------------------------
// Not on the Giza plateau: the Apis-bull catacombs lie at Saqqara, ~13.6 km
// to the south-south-east (29.876 N, 31.210 E). The model (built in Blender,
// tools/blender/serapeum.py) sits at that real offset, underground.
export const SERAPEUM = {
  name: 'Serapeum of Saqqara',
  origin: { x: 7311, y: -80, z: 11440 },
  spawn: { x: 7311 + 1.6, y: -80 + 0.3, z: 11440 - 49 },
  // [empty name in the model, landmark name, blurb, radius]
  pois: [
    ['entrance', 'Serapeum of Saqqara — Greater Vaults',
      'The catacombs of the sacred Apis bulls, begun under Psamtik I (664–610 BC) and extended by the Ptolemies to ~350 m. ' +
      'Twenty-four colossal stone sarcophagi stand in vaulted side chambers. Rediscovered by Auguste Mariette in 1850.', 14],
    ['amasis_lid', 'Lid of Amasis II\'s sarcophagus',
      'The lid of the oldest hard-stone sarcophagus (c. 550 BC), moved to the entrance. Its inscription: "…he dedicated his ' +
      'monument to the Living Apis, a great sarcophagus of granite."', 5],
    ['amasis', 'Sarcophagus of Amasis II',
      'Red granite, finely worked with palace-facade panelling and a band of Pyramid Texts round the top; the signs were ' +
      'painted green. For the Apis that died in year 23 of Amasis II.', 6],
    ['cambyses', 'Sarcophagus of Cambyses II',
      'Grey granite, dedicated c. 524 BC by the first Persian ruler of Egypt — "to his father Apis-Osiris". Only the lid is ' +
      'inscribed. It stands where it blocks the original entrance.', 7],
    ['khabash', 'Sarcophagus of Khabash',
      'A smaller box in an unused tunnel, dated to year 2 of the rebel king Khabash (c. 336 BC). Its lid was found on the ' +
      'floor nearby — the two may never have closed over a bull.', 7],
    ['ptolemaic', 'The inscribed Ptolemaic sarcophagus',
      'Polished black stone with decoration merely scratched on: panelling, Pyramid Text spells — and royal cartouches left ' +
      'EMPTY, as nobody knew under which ruler this Apis would die.', 7],
    ['typical', 'An Apis sarcophagus',
      'A typical box: 3.85 × 2.32 × 2.32 m with a 0.98 m lid — about 62 tonnes with its lid — let into a pit in a chamber whose ' +
      'floor is 2–3 m below the gallery. It took 28 working days to move one in (stela of year 37 of Ptolemy II).', 6]
  ],
  blurb: 'The burial place of the sacred Apis bulls at Saqqara.'
};

// ---- Fast travel destinations (eye position, label) -----------------
// Outdoor entries are flagged `ground`: their y is a drop height above the
// terrain, resolved against the real topography when the terrain loads.
const G = (x, z, y = 1) => ({ x, y, z, ground: true });
const P = PYRAMIDS, crowMid = { x: (WALL_OF_CROW.a.x + WALL_OF_CROW.b.x) / 2, z: (WALL_OF_CROW.a.z + WALL_OF_CROW.b.z) / 2 };
export const TELEPORTS = [
  { label: 'Plateau Overlook (start)', pos: G(-120, -215) },
  { label: 'Great Pyramid — base, north face', pos: G(OFF, ENT_Z - 25) },
  { label: 'Great Pyramid — original entrance', pos: { x: OFF, y: DOOR.y + 0.3, z: ENT_Z - 4 } },
  { label: "Great Pyramid — King's Chamber", pos: TP_KING },
  { label: "Great Pyramid — Campbell's Chamber (relieving)", pos: KHUFU_UPPER.tpCampbell },
  { label: "Great Pyramid — Queen's Chamber", pos: { x: QUEEN.x, y: QUEEN.y + 0.3, z: QUEEN.z } },
  { label: 'Great Pyramid — Subterranean Chamber', pos: { x: SUBT.x, y: SUBT.y + 0.3, z: SUBT.z } },
  { label: 'Pyramid of Khafre — north base', pos: G(P.khafre.center.x - 5, P.khafre.center.z - 122) },
  { label: 'Pyramid of Menkaure — north base', pos: G(P.menkaure.center.x - 7, P.menkaure.center.z - 60) },
  { label: 'The Great Sphinx', pos: G(SPHINX.center.x + 40.5, SPHINX.center.z, 0.5) },
  { label: 'Tomb of Khentkaus I', pos: G(KHENTKAUS.center.x, KHENTKAUS.center.z - 38) },
  { label: "Workers' Town", pos: G(WORKERS_VILLAGE.center.x - 30, WORKERS_VILLAGE.center.z - 62) },
  { label: 'Menkaure Valley Temple', pos: G(MENKAURE_VALLEY.center.x, MENKAURE_VALLEY.center.z - 34) },
  { label: 'Khafre Valley Temple', pos: G(KHAFRE_VALLEY.center.x - 32, KHAFRE_VALLEY.center.z + 6) },
  { label: 'Wall of the Crow (gate)', pos: G(crowMid.x, crowMid.z - 16) },
  { label: 'Khufu Valley Temple', pos: G(KHUFU_VALLEY.center.x - 24, KHUFU_VALLEY.center.z + 6) },
  { label: 'Trial Passages', pos: G(160, -54) },
  { label: "Workers' Cemetery", pos: G(WORKERS_CEMETERY.center.x, WORKERS_CEMETERY.center.z - 30) },
  { label: 'Central Field Quarry', pos: G(GIS_QUARRY.center.x, GIS_QUARRY.center.z - 56) },
  { label: 'Temple of Amenhotep II', pos: G(AMENHOTEP_TEMPLE.center.x - 6, AMENHOTEP_TEMPLE.center.z - 22) },
  { label: 'Menkaure Quarry', pos: G(MENKAURE_QUARRY.center.x, MENKAURE_QUARRY.center.z - 82) },
  { label: 'Panorama Viewpoint (south-west)', pos: G(-737, 1149) },
  { label: 'Tomb of Meresankh III', pos: MERESANKH.tp },
  { label: 'Pyramid of Menkaure — Panelled Chamber', pos: Object.assign(MENKAURE_SUB.tp, { x: P.menkaure.center.x, y: P.menkaure.baseY + MENKAURE_INTERIOR.chambers[0].center.y - 1.0, z: P.menkaure.center.z + MENKAURE_INTERIOR.chambers[0].center.z }) },
  { label: 'Serapeum of Saqqara (13.6 km south)', pos: SERAPEUM.spawn }
];

// ---------------------------------------------------------------------
//  Collectible artifacts — a scavenger hunt across the plateau. Each is a
//  real class of object found at (or associated with) that spot.
// ---------------------------------------------------------------------
const tpPos = label => TELEPORTS.find(t => t.label.includes(label)).pos;
const at = (p, dx, dy, dz) => ({ ...p, x: p.x + dx, y: p.y + dy, z: p.z + dz });
export const ARTIFACTS = [
  { id: 'lid', type: 'fragment', name: 'Sarcophagus lid fragment',
    blurb: "A corner of the red-granite lid that was already gone when Caliph al-Ma'mun's men forced their way in (AD 820).",
    pos: at(tpPos("King's Chamber"), -3.0, 0.35, 2.0) },
  { id: 'copper', type: 'tool', name: 'Copper fitting from the shaft',
    blurb: "Like the copper 'handles' found on the door-slab at the top of the Queen's Chamber shaft by the Upuaut robot in 1993.",
    pos: at(tpPos("Queen's Chamber"), 1.6, 0.35, -0.8) },
  { id: 'lamp', type: 'jar', name: "Tomb robber's oil lamp",
    blurb: 'A pottery saucer lamp of the kind carried by the medieval explorers who scrambled down to the unfinished Subterranean Chamber.',
    pos: at(tpPos('Subterranean'), 1.2, 0.35, 1.2) },
  { id: 'chisel', type: 'tool', name: "Quarryman's copper chisel",
    blurb: 'Copper chisels and dolerite pounders were the only metal tools available; they were resharpened constantly.',
    pos: at(tpPos('original entrance'), 0.5, 0.3, 3.0) },
  { id: 'ushabti', type: 'ushabti', name: 'Ushabti of Thutmose IV',
    blurb: 'Thutmose IV cleared the Sphinx of sand around 1400 BC after a dream, and raised the Dream Stele between its paws.',
    pos: G(SPHINX.center.x + 30, SPHINX.center.z + 1.5, 0.45) },
  { id: 'diorite', type: 'scarab', name: 'Diorite chip from a Khafre statue',
    blurb: "Khafre's famous seated statue (Cairo Museum) was found buried in a pit in this valley temple in 1860.",
    pos: at(tpPos('Khafre Valley'), 4, 0.35, 2) },
  { id: 'triad', type: 'fragment', name: 'Greywacke triad fragment',
    blurb: "Reisner found Menkaure's triad statues — the king with Hathor and a nome goddess — here in 1908.",
    pos: at(tpPos('Menkaure Valley'), 3, 0.35, -2) },
  { id: 'bedja', type: 'jar', name: 'Bread mould (bedja)',
    blurb: 'Thousands of these conical bread pots were found in the bakeries of the workers\' town beyond the Wall of the Crow.',
    pos: at(tpPos('Wall of the Crow'), 3, 0.35, 4) },
  { id: 'beer', type: 'jar', name: 'Beer jar',
    blurb: "Workers were paid in bread and beer — roughly ten loaves and a jug or two a day.",
    pos: at(tpPos("Workers' Town"), 4, 0.35, 3) },
  { id: 'amulet', type: 'amulet', name: 'Faience amulet',
    blurb: "Blue-green faience amulets were buried with the priests who served Queen Khentkaus' cult.",
    pos: at(tpPos('Khentkaus'), 3, 0.35, 5) },
  { id: 'square', type: 'tool', name: 'Wooden set-square',
    blurb: "The Trial Passages were the builders' full-size mock-up; set-squares and plumb lines kept the angles true.",
    pos: at(tpPos('Trial Passages'), 2, 0.35, 3) },
  { id: 'basalt', type: 'fragment', name: 'Basalt paving block',
    blurb: 'Black basalt from the Fayum paved the floors of Khufu\'s temples — the same stone as the causeway pavement.',
    pos: at(tpPos('Khufu Valley'), -4, 0.35, 3) },
  { id: 'pounder', type: 'scarab', name: 'Dolerite pounder',
    blurb: 'Hard dolerite balls were used to bash out the limestone blocks in the Central Field quarry.',
    pos: at(tpPos('Central Field Quarry'), 5, 0.35, -4) },
  { id: 'door', type: 'stele', name: 'Painted false-door fragment',
    blurb: 'The workers\' tombs had tiny false doors so the dead could receive offerings — same idea as the nobles\' mastabas.',
    pos: at(tpPos("Workers' Cemetery"), 3, 0.35, 2) },
  { id: 'casing', type: 'fragment', name: 'Tura casing chip',
    blurb: 'Khafre still keeps its fine white Tura limestone casing near the summit; the rest was stripped for medieval Cairo.',
    pos: at(tpPos('Khafre — north'), 2, 0.35, -4) },
  { id: 'granite', type: 'fragment', name: 'Aswan granite spall',
    blurb: "Menkaure's lower sixteen courses were cased in red granite shipped 900 km down the Nile from Aswan.",
    pos: at(tpPos('Menkaure — north'), -3, 0.35, -4) },
  { id: 'pyramidion', type: 'amulet', name: 'Pyramidion fragment',
    blurb: 'The Great Pyramid lost its capstone long ago; today the summit is a flat platform ~8 m below the original apex.',
    pos: { x: 0, y: 139.3, z: 0 } }
];
