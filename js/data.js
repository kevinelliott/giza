// =====================================================================
//  Giza Plateau — authentic survey data
//  All distances in metres. World axes: +X = East, +Y = Up, +Z = South.
//  Positions are derived from the real GPS coordinates of each monument,
//  projected to a local metric grid with the Great Pyramid (Khufu) at
//  the origin (latitude ~29.9792 N, where 1 deg lat = 110940 m and
//  1 deg lon = 96360 m).
// =====================================================================

export const DEG = Math.PI / 180;

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
    // ~300 m west, 339 m south of Khufu — its SE corner sits on the famous
    // Giza diagonal that joins the SE corners of all three pyramids.
    center: { x: -300, z: 339 },
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
    // ~562 m west, 739 m south of Khufu (centre-to-centre diagonal ≈ 928.7 m).
    center: { x: -562, z: 739 },
    align: '14′03″',
    casing: 'lowerGranite', // lowest 16 courses were red Aswan granite
    blurb: 'Built c. 2510 BC for Menkaure, the smallest of the three. ' +
           'Its lowest courses were clad in red Aswan granite.'
  }
};

// ---- Subsidiary "queens'" pyramids ----------------------------------
// Khufu's three (G1-a/b/c) stand in a N–S row just east of his east face
// (face at x ≈ +115). Bases ~49.5 / 50 / 46.25 m; ~10 m gaps → centres
// ~60 / 52 m apart (G1-c offset slightly east). Positioned off the SE.
export const QUEENS_KHUFU = [
  { base: 49.5, height: 30.25, center: { x: 148, z: 48 } },   // G1-a (Hetepheres I)
  { base: 50.0, height: 30,    center: { x: 148, z: 108 } },  // G1-b (Meritites I)
  { base: 46.25, height: 28,   center: { x: 153, z: 162 } }   // G1-c (Henutsen)
];
// Menkaure's three (G3-a/b/c) sit in an E–W row just south of his south
// face (face at z ≈ 739 + 51 = 790). G3-a (east) is the larger granite-cased
// pyramid; G3-b/c are smaller, to the west; centres ~46 m apart.
export const QUEENS_MENKAURE = [
  { base: 44, height: 28.4, center: { x: -516, z: 806 } },    // G3-a (granite-cased)
  { base: 31.2, height: 21, center: { x: -562, z: 808 } },    // G3-b
  { base: 31.2, height: 21, center: { x: -608, z: 806 } }     // G3-c
];

// ---- The Great Sphinx -----------------------------------------------
// Carved from a single limestone outcrop, faces due east (+X).
export const SPHINX = {
  name: 'The Great Sphinx',
  // ~327 m east, 432 m south of Khufu, in front of Khafre's valley temple.
  center: { x: 327, z: 432 },
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
  center: { x: -40, z: 505 },
  base: 45, base2: 30, height1: 10, height2: 8,
  blurb: 'The "Fourth Pyramid of Giza" — the two-tiered rock-cut tomb of ' +
         'Queen Khentkaus I, at the head of the Central Field.'
};
// Heit el-Ghurab, the "Lost City of the Pyramids" — the workers' town south
// of the Wall of the Crow that housed and fed the building crews.
export const WORKERS_VILLAGE = {
  name: "Workers' Town (Heit el-Ghurab)",
  center: { x: 270, z: 835 },
  blurb: 'Heit el-Ghurab, the "Lost City of the Pyramids": barracks, bakeries ' +
         'and long galleries that housed the crews who built Giza.'
};
// The Wall of the Crow — a colossal stone wall with a monumental gateway,
// separating the pyramid plateau from the workers' town.
export const WALL_OF_CROW = {
  name: 'Wall of the Crow',
  a: { x: 150, z: 762 }, b: { x: 382, z: 772 },
  height: 10, thickness: 8, gate: 14,
  blurb: 'A massive limestone wall (~200 m long, ~10 m high) with a ' +
         'monumental gateway between the plateau and the workers\' town.'
};
// Khafre's granite valley temple, beside the Sphinx at the foot of his
// causeway (distinct from, and just south of, the Sphinx Temple).
export const KHAFRE_VALLEY = {
  name: 'Khafre Valley Temple',
  center: { x: 366, z: 482 },
  blurb: 'Khafre\'s granite-clad valley temple beside the Sphinx, at the foot ' +
         'of his causeway — its pillared hall held his great seated statues.'
};
// Menkaure's valley temple, at the foot (east end) of his causeway.
export const MENKAURE_VALLEY = {
  name: 'Menkaure Valley Temple',
  center: { x: -202, z: 859 },
  blurb: 'Menkaure\'s valley temple at the foot of his causeway — begun in ' +
         'stone and finished in mud brick after his death.'
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
  name: 'Khentkaus Town', center: { x: 30, z: 548 },
  blurb: 'A settlement of priests who served the cult of Queen Khentkaus I, ' +
         'built against her monument.'
};
// Tombs of the actual pyramid builders, on the escarpment above their town.
export const WORKERS_CEMETERY = {
  name: "Workers' Cemetery", center: { x: 120, z: 700 },
  blurb: 'Tombs of the pyramid builders on the slope above their town — small ' +
         'mud-brick and stone tombs, some with miniature vaulted superstructures.'
};

// Satellite / cult pyramids beside the main pyramids.
export const SATELLITES = [
  { name: 'Khufu Satellite Pyramid (G1-d)', base: 21.75, height: 13.8, center: { x: 95, z: 130 } },
  { name: 'Khafre Satellite Pyramid (G II-a)', base: 20.1, height: 12.4, center: { x: -300, z: 462 } }
];
// Khufu's boat pits: two rectangular pits parallel to the south face (one held
// the reconstructed "Khufu Ship") and two parallel to the east face.
export const BOAT_PITS = [
  { x: -30, z: 156, ew: true, boat: true, name: "Khufu's Solar Boat (south pit)" },
  { x: 40, z: 156, ew: true, boat: false, name: 'South boat pit' },
  { x: 135, z: -34, ew: false, boat: false, name: 'East boat pit' },
  { x: 135, z: 34, ew: false, boat: false, name: 'East boat pit' }
];
// Khufu's valley temple, at the far east end of his (lost) causeway.
export const KHUFU_VALLEY = {
  name: 'Khufu Valley Temple',
  center: { x: 520, z: 50 },
  blurb: 'Khufu\'s valley temple at the east end of his causeway — its remains ' +
         'lie buried beneath the modern village of Nazlet el-Samman.'
};

// ---- Fast travel destinations (eye position, label) -----------------
export const TELEPORTS = [
  { label: 'Plateau Overlook (start)', pos: { x: 230, y: 6, z: -220 } },
  { label: 'Great Pyramid — base, north face', pos: { x: OFF, y: 2, z: ENT_Z - 25 } },
  { label: 'Great Pyramid — original entrance', pos: { x: OFF, y: DOOR.y + 0.3, z: ENT_Z - 4 } },
  { label: "Great Pyramid — King's Chamber", pos: { x: KINGC.x, y: KINGC.y + 0.3, z: KINGC.z } },
  { label: "Great Pyramid — Queen's Chamber", pos: { x: QUEEN.x, y: QUEEN.y + 0.3, z: QUEEN.z } },
  { label: 'Great Pyramid — Subterranean Chamber', pos: { x: SUBT.x, y: SUBT.y + 0.3, z: SUBT.z } },
  { label: 'Pyramid of Khafre — north base', pos: { x: -340, y: 2, z: 340 - 120 } },
  { label: 'Pyramid of Menkaure — north base', pos: { x: -581, y: 2, z: 740 - 58 } },
  { label: 'The Great Sphinx', pos: { x: 332, y: 4, z: 432 - 58 } },
  { label: 'Tomb of Khentkaus I', pos: { x: -40, y: 3, z: 505 - 40 } },
  { label: "Workers' Town", pos: { x: 270, y: 3, z: 835 - 70 } },
  { label: 'Menkaure Valley Temple', pos: { x: -202, y: 2, z: 859 - 30 } },
  { label: 'Khafre Valley Temple', pos: { x: 366, y: 2, z: 482 - 30 } },
  { label: 'Wall of the Crow (gate)', pos: { x: 266, y: 2, z: 767 - 14 } },
  { label: 'Khufu Valley Temple', pos: { x: 520, y: 2, z: 50 - 28 } },
  { label: 'Trial Passages', pos: { x: 160, y: 2, z: -42 - 12 } },
  { label: "Workers' Cemetery", pos: { x: 120, y: 2, z: 700 - 35 } }
];
