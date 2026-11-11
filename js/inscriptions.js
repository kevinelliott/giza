// =====================================================================
//  Hieroglyphic inscriptions, drawn as textures from real Unicode signs
//  (Noto Sans Egyptian Hieroglyphs, SIL OFL — assets/fonts/).
//
//  Every inscription is written in Gardiner sign codes and carries a
//  `status` so we know how faithful it is — see research/README.md:
//    'attested'    — the sign sequence itself is a standard, published
//                    writing (royal names, stock formulae);
//    'composed'    — hieroglyphs composed from a published TRANSLATION of
//                    the real text; wording right, signs not yet checked
//                    one-by-one against a photograph of the stone;
//    'placeholder' — layout and style follow the photos, text does not.
// =====================================================================
import * as THREE from 'three';

const G = {"N5":"𓇳","W9":"𓎸","F34":"𓄣","N12":"𓇺","N11":"𓇹","F31":"𓄟","S29":"𓋴","G39":"𓅭","M23":"𓇓","X1":"𓏏","L2":"𓆤","D4":"𓁹","N35":"𓈖","I9":"𓆑","G17":"𓅓","Y5":"𓏠","W24":"𓏌","Z2":"𓏥","V28":"𓎛","Q3":"𓊪","E1":"𓃒","S34":"𓋹","X8":"𓏙","I10":"𓆓","N17":"𓇿","G43":"𓅱","V31":"𓎡","D58":"𓃀","Z4":"𓏭","V13":"𓍿","M17":"𓇋","Q1":"𓊨","Aa1":"𓐍","N37":"𓈙","M4":"𓆳","O50":"𓊗","Z1":"𓏤","M8":"𓆷","D21":"𓂋","U36":"𓍛","O4":"𓉔","G1":"𓄿","S43":"𓌃","R8":"𓊹","F35":"𓄤","N16":"𓇾","V30":"𓎟","N28":"𓈍","D28":"𓂓","R4":"𓊵","N14":"𓇼","O1":"𓉐","M12":"𓆼","D2":"𓁷","U33":"𓍘","G5":"𓅃","S38":"𓋾","N29":"𓈎","L1":"𓆣","G26":"𓅝","N27":"𓈌","E23":"𓃭","V20":"𓎆","D40":"𓂡","Aa20":"𓐢","U23":"𓍋","E10":"𓃝","A1":"𓀀","B1":"𓁐","G14":"𓅐","S42":"𓌂","M13":"𓇅","D46":"𓂧","A40":"𓀭","X2":"𓏐","W14":"𓎿","O29":"𓉻","G36":"𓅨","S3":"𓋔","N41":"𓈞","U6":"𓌸","F32":"𓄡"};
const g = codes => codes.trim().split(/\s+/).map(c => { if (!G[c]) throw new Error('unknown sign ' + c); return G[c]; }).join('');
const C = codes => ({ cartouche: g(codes) });          // a royal name in its ring

// Stock phrases (all standard writings)
const NSW_BITY = 'M23 X1 L2 X1';                        // "King of Upper and Lower Egypt"
const SA_RA = 'G39 N5';                                 // "Son of Ra"
const DI_ANKH_DJET = 'X8 S34 I10 X1 N17';               // "given life for ever"
const MADE_AS_MONUMENT = 'D4 N35 I9 G17 Y5 N35 W24 Z2 I9 N35';   // ir.n=f m mnw=f n "he made (it) as his monument for"
const LIVING_APIS = 'V28 Q3 E1 S34';                    // Hp ankh
const OSIRIS_APIS = 'Q1 D4 V28 Q3 E1';                  // Wsir-Hp

export const INSCRIPTIONS = {
  // Serapeum — lid of Amasis II's sarcophagus. Translation (Wikipedia, after
  // Gunn 1926): "[Titulary of King Amasis II] he dedicated his monument to
  // the Living Apis, a great sarcophagus of granite."
  amasis_lid: {
    status: 'composed', style: 'incised', ink: '#2f6b4a',          // "the symbols were coloured green"
    rows: [[g(NSW_BITY), C('N5 W9 F34'), g(SA_RA), C('N12 F31 S29'), g(MADE_AS_MONUMENT), g(LIVING_APIS), g(DI_ANKH_DJET)]]
  },
  // Serapeum — Amasis II's box: palace-facade panelling with a band of
  // text ("a spell of the pyramid texts") round the upper edge.
  amasis_end: { status: 'placeholder', style: 'incised', ink: '#2f6b4a', panelling: 5, rows: [[g('I10 S43'), g(OSIRIS_APIS), C('N5 W9 F34')]], band: true },
  amasis_side_a: { status: 'placeholder', style: 'incised', ink: '#2f6b4a', panelling: 9, rows: [[g('I10 S43'), g(OSIRIS_APIS), g(NSW_BITY), C('N5 W9 F34'), g(SA_RA), C('N12 F31 S29'), g(DI_ANKH_DJET)]], band: true },
  amasis_side_b: { status: 'placeholder', style: 'incised', ink: '#2f6b4a', panelling: 9, rows: [[g('I10 S43'), g(OSIRIS_APIS), g(NSW_BITY), C('N5 W9 F34'), g(SA_RA), C('N12 F31 S29'), g(DI_ANKH_DJET)]], band: true },
  // Serapeum — lid of Cambyses II's box. Translation (after Posener 1936):
  // "He made as his monument to his father Apis-Osiris a large granite
  // sarcophagus, dedicated by the king of Upper and Lower Egypt Mesutire,
  // son of Ra, Cambyses, endowed with all health..."
  cambyses_lid: {
    status: 'composed', style: 'incised', ink: '#d9d2c2',
    rows: [[g(NSW_BITY), C('N5 F31 S29 X1 G43'), g(SA_RA), C('V31 G17 D58 Z4 V13 X1')],
           [g(MADE_AS_MONUMENT), g('M17 X1 I9 I9'), g(OSIRIS_APIS), g(DI_ANKH_DJET)]]
  },
  // Serapeum — lid of Khabash's box, two short lines (photo): "Year 2,
  // month Athyr, under the Majesty of King Khabash..."
  khabash_lid: {
    status: 'composed', style: 'incised', ink: '#d9d2c2',
    rows: [[g('M4 X1 O50 Z1 Z1'), g('N11 Z1 Z1 Z1 M8 X1 N5'), g('Aa1 D21 U36 Z1 N35')],
           [g(NSW_BITY), C('Aa1 D58 D58 N37'), g(LIVING_APIS)]]
  },
  // Serapeum — the inscribed Ptolemaic box: decoration only scratched on.
  // Drawn sarcophagus with cornice and torus, panelling, three text lines
  // (pyramid-text spells: "O Apis-Osiris, someone shall stand behind
  // thee..."), and royal cartouches LEFT EMPTY.
  ptolemaic_end: { status: 'placeholder', style: 'scratched', ink: '#e6e2d6', panelling: 5, cornice: true, rows: [[g('O4 G1'), g(OSIRIS_APIS), { cartouche: '' }]], band: true },
  ptolemaic_side_a: { status: 'placeholder', style: 'scratched', ink: '#e6e2d6', panelling: 11, cornice: true, rows: [[g('O4 G1'), g(OSIRIS_APIS), { cartouche: '' }, { cartouche: '' }, g('O4 G1'), g(OSIRIS_APIS)]], band: true },
  ptolemaic_side_b: { status: 'placeholder', style: 'scratched', ink: '#e6e2d6', panelling: 11, cornice: true, rows: [[g('O4 G1'), g(OSIRIS_APIS), { cartouche: '' }, { cartouche: '' }, g('O4 G1'), g(OSIRIS_APIS)]], band: true }
};

Object.assign(INSCRIPTIONS, {
  // Great Pyramid — builders' graffiti in Campbell's Chamber (the topmost
  // relieving chamber), daubed in red ochre at the quarry, so often sideways
  // or upside-down. The cartouches are Khufu's two names.
  campbell_khufu: { status: 'attested', style: 'painted', ink: '#9c3a22', rows: [[C('Aa1 G43 I9 G43')]] },
  campbell_khnumkhuf: { status: 'attested', style: 'painted', ink: '#9c3a22', rows: [[C('W9 E10 Aa1 G43 I9 G43')]] },
  // a work-gang name: "The gang, Friends of Khufu" (aprw smrw Khufu)
  campbell_gang: { status: 'composed', style: 'painted', ink: '#9c3a22', rows: [[g('Aa20 D21 G43 A1 Z2'), g('S29 U23 D21 G43'), C('Aa1 G43 I9 G43')]] },
  // Menkaure — the panelled antechamber: palace-facade niches cut in the
  // rock and plastered, eleven on each long wall (Maragioglio & Rinaldi).
  menkaure_panel_long: { status: 'attested', style: 'incised', ink: '#3d2f22', panelling: 11, rows: [] },
  menkaure_panel_short: { status: 'placeholder', style: 'incised', ink: '#3d2f22', panelling: 5, rows: [] },
  // Meresankh III — architrave over the ten statues (north wall): her
  // titles. "King's daughter of his body, king's wife, Meresankh".
  meresankh_architrave: { status: 'composed', style: 'incised', ink: '#5a4030',
    rows: [[g('M23 X1 G39 X1 N35 F32 X1 I9'), g('M23 X1 N41 X1'), g('U6 D21 S29 S34 N35 Aa1')]] }
});

let fontReady = null;
export function loadGlyphFont() {
  if (fontReady) return fontReady;
  if (typeof FontFace === 'undefined') return (fontReady = Promise.resolve(false));
  const ff = new FontFace('GizaGlyphs', 'url(assets/fonts/NotoSansEgyptianHieroglyphs.woff2)');
  fontReady = ff.load().then(f => { document.fonts.add(f); return true; }).catch(() => false);
  return fontReady;
}

// Draw one inscription onto a transparent canvas sized to its panel
// (metres), returning a texture. ~170 px per metre.
export function inscriptionTexture(key, wM, hM) {
  const spec = INSCRIPTIONS[key];
  if (!spec) return null;
  const ppm = Math.min(170, 2048 / Math.max(wM, hM));
  const W = Math.max(64, Math.round(wM * ppm)), H = Math.max(64, Math.round(hM * ppm));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const scratched = spec.style === 'scratched';
  const ink = spec.ink || '#222';
  c.strokeStyle = ink; c.fillStyle = ink; c.lineJoin = 'round';
  const lw = scratched ? Math.max(1, ppm * 0.006) : Math.max(1.5, ppm * 0.012);
  c.lineWidth = lw;
  const jitter = () => scratched ? (Math.random() - 0.5) * ppm * 0.01 : 0;
  const line = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0 + jitter(), y0 + jitter()); c.lineTo(x1 + jitter(), y1 + jitter()); c.stroke(); };

  // text band near the top edge (single- or multi-row panels use the whole height)
  const painted = spec.style === 'painted';
  const bandH = spec.band ? Math.min(H * 0.2, ppm * 0.42) : H / Math.max(1, spec.rows.length);
  const bandY = spec.band ? H * 0.1 : 0;
  if (spec.cornice) {                                    // drawn cavetto cornice + torus above the band
    line(W * 0.02, H * 0.035, W * 0.98, H * 0.035); line(W * 0.02, H * 0.075, W * 0.98, H * 0.075);
    for (let x = W * 0.03; x < W * 0.97; x += ppm * 0.09) line(x, H * 0.04, x, H * 0.07);
  }
  spec.rows.forEach((row, r) => {
    const y0 = bandY + r * bandH, size = bandH * 0.7, mid = y0 + bandH / 2;
    if (spec.band || spec.rows.length > 1) { line(W * 0.02, y0, W * 0.98, y0); line(W * 0.02, y0 + bandH, W * 0.98, y0 + bandH); }
    c.font = `${size}px "GizaGlyphs", "Noto Sans Egyptian Hieroglyphs", serif`;
    c.textBaseline = 'middle';
    // measure, then centre the row
    const gap = size * 0.35;
    const widths = row.map(it => typeof it === 'string' ? c.measureText(it).width : Math.max(size * 1.6, c.measureText(it.cartouche).width + size * 0.7));
    let x = Math.max(W * 0.03, (W - widths.reduce((a, b) => a + b + gap, -gap)) / 2);
    row.forEach((it, i) => {
      const w = widths[i];
      if (x + w > W * 0.98) return;
      if (typeof it === 'string') drawText(it, x, mid);
      else {
        const ch = size * 1.12, y = mid - ch / 2, rad = ch / 2;
        c.beginPath(); c.roundRect(x, y, w - lw * 2, ch, rad); c.stroke();
        line(x + w - lw, y - ch * 0.04, x + w - lw, y + ch * 1.04);           // the tied end of the ring
        if (it.cartouche) drawText(it.cartouche, x + size * 0.32, mid);
      }
      x += w + gap;
    });
  });
  function drawText(t, x, y) {
    if (scratched) { c.lineWidth = lw * 0.9; c.strokeText(t, x, y); c.lineWidth = lw; }
    else if (painted) { c.save(); c.globalAlpha = 0.82; c.fillText(t, x, y); c.restore(); }
    else {
      c.save(); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(t, x + lw * 0.9, y + lw * 0.9); c.restore();   // cut shadow
      c.fillText(t, x, y);
    }
  }
  // palace-facade panelling below the band: nested vertical recesses
  if (spec.panelling) {
    const top = (spec.rows.length ? bandY + bandH * spec.rows.length : 0) + H * 0.05, bot = H * 0.96, n = spec.panelling, pw = W * 0.94 / n;
    for (let i = 0; i < n; i++) {
      const x0 = W * 0.03 + i * pw;
      for (let k = 0; k < 3; k++) {
        const ins = pw * (0.1 + k * 0.13), t = top + k * H * 0.035;
        if (!scratched) { c.save(); c.fillStyle = 'rgba(15,9,4,0.16)'; c.fillRect(x0 + ins, t, pw - 2 * ins, bot - t); c.restore(); c.lineWidth = lw * 1.6; }
        c.strokeRect(x0 + ins, t, pw - 2 * ins, bot - t);
      }
    }
    line(W * 0.02, bot, W * 0.98, bot);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
