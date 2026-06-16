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
    center: { x: -340, z: 340 },
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
    center: { x: -581, z: 740 },
    casing: 'lowerGranite', // lowest 16 courses were red Aswan granite
    blurb: 'Built c. 2510 BC for Menkaure, the smallest of the three. ' +
           'Its lowest courses were clad in red Aswan granite.'
  }
};

// ---- Subsidiary "queens'" pyramids ----------------------------------
// Khufu's three (G1-a/b/c) stand in a row on the east side.
export const QUEENS_KHUFU = [
  { base: 49.5, height: 30.25, center: { x: 132, z: -38 } },
  { base: 49.0, height: 30,    center: { x: 132, z: 12 } },
  { base: 46.25, height: 28,   center: { x: 132, z: 62 } }
];
// Menkaure's three (G3-a/b/c) stand in a row on the south side.
export const QUEENS_MENKAURE = [
  { base: 44, height: 28, center: { x: -628, z: 815 } },
  { base: 31, height: 21, center: { x: -588, z: 818 } },
  { base: 31, height: 21, center: { x: -548, z: 818 } }
];

// ---- The Great Sphinx -----------------------------------------------
// Carved from a single limestone outcrop, faces due east (+X).
export const SPHINX = {
  name: 'The Great Sphinx',
  center: { x: 332, z: 432 },
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

const ENTRANCE = { x: OFF, y: ENT_Y, z: ENT_Z };
// A short LEVEL corridor just inside the doorway so you can walk straight in
// off the entrance ramp before the passage starts to descend.
const ENTRY_IN = { x: OFF, y: ENT_Y, z: ENT_Z + 9 };
const J1 = along(ENTRY_IN, dDown, 26);          // descending/ascending junction
const SUBT = along(J1, dDown, 78);              // subterranean chamber mouth
const J2 = along(J1, dUp, 39);                  // foot of the Grand Gallery
const QUEEN = { x: OFF, y: J2.y - 1.2, z: J2.z + 20.5 }; // horizontal run south
const GALLERY_TOP = along(J2, dUp, 46.7);       // top of the Grand Gallery
const KING = { x: OFF, y: GALLERY_TOP.y, z: GALLERY_TOP.z + 9.5 }; // via antechamber

export const KHUFU_INTERIOR = {
  entrance: ENTRANCE,
  // Passages: list of {a,b,w,h,kind}
  passages: [
    { a: ENTRANCE, b: ENTRY_IN, w: 1.8, h: 3.0, kind: 'entry' },
    { a: ENTRY_IN, b: J1,   w: 1.8, h: 3.0, kind: 'descending' },
    { a: J1,       b: SUBT, w: 1.8, h: 2.8, kind: 'descending' },
    { a: J1,       b: J2,   w: 1.8, h: 2.8, kind: 'ascending' },
    { a: J2,       b: { x: QUEEN.x, y: QUEEN.y, z: QUEEN.z - 2.0 }, w: 1.8, h: 2.6, kind: 'queenPassage' },
    { a: J2,       b: GALLERY_TOP, w: 2.1, h: 6.0, kind: 'grandGallery' },
    { a: GALLERY_TOP, b: { x: KING.x, y: KING.y, z: KING.z - 2.0 }, w: 1.8, h: 2.6, kind: 'antechamber' }
  ],
  chambers: [
    {
      id: 'king', name: "King's Chamber", center: KING,
      sx: 10.47, sy: 5.85, sz: 5.23, sarcophagus: true,
      blurb: "King's Chamber — red Aswan granite, 10.47 x 5.23 m, " +
             '5.85 m high. Holds a lidless granite sarcophagus. Five ' +
             'stress-relieving chambers sit above the flat ceiling.'
    },
    {
      id: 'queen', name: "Queen's Chamber", center: QUEEN,
      sx: 5.74, sy: 6.26, sz: 5.23, sarcophagus: false, gabled: true,
      blurb: "Queen's Chamber — limestone with a gabled roof, " +
             '5.23 x 5.74 m. A niche in the east wall and two narrow ' +
             '"air shafts" lead from it.'
    },
    {
      id: 'subterranean', name: 'Subterranean Chamber', center: SUBT2(SUBT),
      sx: 8.0, sy: 3.5, sz: 14.0, sarcophagus: false, rough: true,
      blurb: 'Subterranean Chamber — cut roughly into the bedrock ~30 m ' +
             'below the base and left unfinished.'
    }
  ],
  // Door openings to cut where a passage meets a chamber wall.
  // {chamber, face, w, h}
  doors: [
    { chamberId: 'king',  face: 'north', w: 1.8, h: 2.2 },
    { chamberId: 'queen', face: 'north', w: 1.8, h: 2.2 },
    { chamberId: 'subterranean', face: 'north', w: 1.8, h: 2.2 }
  ]
};

// Place the subterranean chamber so its north wall meets the passage mouth.
function SUBT2(mouth) {
  return { x: mouth.x, y: mouth.y - 3.5 / 2 + 0.2, z: mouth.z + 14.0 / 2 - 0.4 };
}

// ---- Simple interiors for Khafre & Menkaure -------------------------
// A descending passage from the north base down to a burial chamber that
// stays at/above the base level (so it never clips the terrain surface).
export function simpleInterior(p) {
  const half = p.base / 2;
  const mouth = { x: 0, y: 1.4, z: -half + 0.5 };          // north face, near base
  // Descend gently south to a chamber roughly under the centre.
  const angle = 22 * DEG;
  const dir = { y: -Math.sin(angle), z: Math.cos(angle) };
  const end = along(mouth, dir, (half - 12) / Math.cos(angle));
  const chamber = {
    id: p.id + '-burial',
    name: p.name + ' — Burial Chamber',
    center: { x: 0, y: end.y - 1.6, z: end.z + 5 },
    sx: 7, sy: 4, sz: 9, sarcophagus: true,
    blurb: p.name + ': descending passage to a granite-lined burial ' +
           'chamber containing the royal sarcophagus.'
  };
  return {
    entrance: mouth,
    passages: [{ a: mouth, b: end, w: 1.7, h: 2.2, kind: 'descending' }],
    chambers: [chamber],
    doors: [{ chamberId: chamber.id, face: 'north', w: 1.8, h: 2.2 }]
  };
}

// ---- Fast travel destinations (eye position, label) -----------------
export const TELEPORTS = [
  { label: 'Plateau Overlook (start)', pos: { x: 230, y: 6, z: -220 } },
  { label: 'Great Pyramid — base, north face', pos: { x: OFF, y: 2, z: ENT_Z - 25 } },
  { label: 'Great Pyramid — original entrance', pos: { x: OFF, y: ENT_Y + 1.2, z: ENT_Z - 3 } },
  { label: "Great Pyramid — King's Chamber", pos: { x: KING.x - 3.2, y: KING.y - 2.5, z: KING.z } },
  { label: "Great Pyramid — Queen's Chamber", pos: { x: QUEEN.x, y: QUEEN.y - 1.8, z: QUEEN.z } },
  { label: 'Great Pyramid — Subterranean Chamber', pos: { x: SUBT.x, y: SUBT2(SUBT).y - 1.4, z: SUBT2(SUBT).z } },
  { label: 'Pyramid of Khafre — north base', pos: { x: -340, y: 2, z: 340 - 120 } },
  { label: 'Pyramid of Menkaure — north base', pos: { x: -581, y: 2, z: 740 - 58 } },
  { label: 'The Great Sphinx', pos: { x: 332, y: 4, z: 432 - 58 } }
];
