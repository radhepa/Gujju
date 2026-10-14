// Kesar's rig: vector parts, the joints they turn on, and the clips that move
// them. Plain data with no React, so the app (Kesar.tsx) and the preview
// renderer (scripts/render-kesar.mjs) draw from exactly the same source.
//
// He's drawn in the same style as Pip, the panda in FitPip: no outlines,
// soft gradient shapes with a darker second colour for ears, paws and feet,
// bead eyes with two highlights, brows that act, a band with fluttering ties,
// and the same idle timing. His face is his own. A few body shapes borrowed
// from Pip are kept in Pip's coordinates and shifted into place with `pip()`.
//
// Coordinates are a 260 x 260 design box; the ground line is y = 234.

export const VIEW = 260;
// The drawing box, with headroom above the crest for jumps.
export const BOX = { x: -10, y: -26, w: 280, h: 280 };

type P = [number, number];

// Palette ----------------------------------------------------------------------

const EYE = '#2A1407';
const BROW = '#8A4410';
const MOUTH = '#5A2A0E';
const BLUSH = '#E89BBD';
const GOLD = '#FFD36E';
const GOLD_DEEP = '#E2A532';
const BAND = '#FFE7A6';

const GRADIENTS: Record<string, string> = {
  'k-coat': `<linearGradient id="k-coat" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#FFDB7C"/><stop offset=".45" stop-color="#F6B443"/><stop offset="1" stop-color="#DB8A22"/></linearGradient>`,
  'k-dark': `<linearGradient id="k-dark" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#AE5A1C"/><stop offset="1" stop-color="#5E2A0A"/></linearGradient>`,
  'k-cream': `<linearGradient id="k-cream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFFAEE"/><stop offset="1" stop-color="#F6DCAE"/></linearGradient>`,
  'k-mane-back': `<linearGradient id="k-mane-back" gradientUnits="userSpaceOnUse" x1="0" y1="62" x2="0" y2="188"><stop stop-color="#AE5E1E"/><stop offset="1" stop-color="#66300E"/></linearGradient>`,
  'k-mane': `<linearGradient id="k-mane" gradientUnits="userSpaceOnUse" x1="0" y1="74" x2="0" y2="182"><stop stop-color="#D88D38"/><stop offset="1" stop-color="#9C531B"/></linearGradient>`,
  'k-kurta': `<linearGradient id="k-kurta" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#EE5C1E"/><stop offset="1" stop-color="#B2370C"/></linearGradient>`,
  'k-panel': `<linearGradient id="k-panel" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#FFA556"/><stop offset=".5" stop-color="#FB7E33"/><stop offset="1" stop-color="#E55F1E"/></linearGradient>`,
  'k-sleeve': `<linearGradient id="k-sleeve" gradientUnits="userSpaceOnUse" x1="78" y1="160" x2="104" y2="200"><stop stop-color="#FFA556"/><stop offset=".55" stop-color="#F7782C"/><stop offset="1" stop-color="#DC5A1A"/></linearGradient>`,
  'k-paw': `<linearGradient id="k-paw" gradientUnits="userSpaceOnUse" x1="75" y1="195" x2="91" y2="214"><stop stop-color="#AE5A1C"/><stop offset="1" stop-color="#5E2A0A"/></linearGradient>`,
  'k-turban': `<linearGradient id="k-turban" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#FF8A3E"/><stop offset=".55" stop-color="#F0601F"/><stop offset="1" stop-color="#C63E0E"/></linearGradient>`,
  'k-band': `<linearGradient id="k-band" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFF4D2"/><stop offset="1" stop-color="#F8D78E"/></linearGradient>`,
  'k-plume': `<linearGradient id="k-plume" x1="0" y1="1" x2=".35" y2="0"><stop stop-color="#FFF8E8"/><stop offset=".42" stop-color="#FFEFC8"/><stop offset=".72" stop-color="#FFD27A"/><stop offset="1" stop-color="#F7A93E"/></linearGradient>`,
  'k-gold': `<linearGradient id="k-gold" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#FFF1B0"/><stop offset=".5" stop-color="#FFD36E"/><stop offset="1" stop-color="#D9971F"/></linearGradient>`,
  'k-iris': `<linearGradient id="k-iris" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4A230C"/><stop offset=".55" stop-color="#A3601F"/><stop offset="1" stop-color="#E5A03E"/></linearGradient>`,
  'k-aura': `<radialGradient id="k-aura"><stop stop-color="#FFB347" stop-opacity=".26"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>`,
  'k-glow': `<radialGradient id="k-glow"><stop stop-color="#FFF3B0" stop-opacity=".85"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient>`,
  'k-page': `<linearGradient id="k-page" gradientUnits="userSpaceOnUse" x1="131" y1="0" x2="161" y2="0"><stop stop-color="#E6CB98"/><stop offset=".45" stop-color="#FAEDCF"/><stop offset="1" stop-color="#FFFBF0"/></linearGradient>`,
};

const DOME = 'M67 84C57 58 88 36 130 36C172 36 203 58 193 84Q130 56 67 84Z';
const PANEL = 'M107 156c-9 12-11 34-3 45 7 10 41 10 49 0 7-11 5-33-4-45Z';
const CLIP_DEFS: Record<string, string> = {
  'k-dome': `<clipPath id="k-dome"><path d="${DOME}"/></clipPath>`,
  'k-panel-clip': `<clipPath id="k-panel-clip"><path d="${PANEL}"/></clipPath>`,
};

// Wrap a part's markup with just the gradients and clip paths it refers to.
export function withDefs(svg: string): string {
  const ids = [...new Set([...svg.matchAll(/url\(#(k-[\w-]+)\)/g)].map((m) => m[1]))];
  const defs = ids.map((id) => GRADIENTS[id] ?? CLIP_DEFS[id] ?? '').join('');
  return defs ? `<defs>${defs}</defs>${svg}` : svg;
}

// Geometry helpers -----------------------------------------------------------------

const f = (n: number) => +n.toFixed(2);
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`;
const mirrorX = (x: number) => 260 - x;
const mirror = (svg: string) => `<g transform="translate(260 0) scale(-1 1)">${svg}</g>`;
// Shapes shared with Pip, drawn in his coordinates (he stands at x = 135).
const pip = (svg: string) => `<g transform="translate(-5 0)">${svg}</g>`;

// A capsule that tapers from radius ra at a to rb at b.
function limb(a: P, ra: number, b: P, rb: number): string {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const phi = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
  const on = (c: P, r: number, ang: number): P => [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)];
  const a1 = on(a, ra, th + phi);
  const b1 = on(b, rb, th + phi);
  const b2 = on(b, rb, th - phi);
  const a2 = on(a, ra, th - phi);
  const bigB = phi > Math.PI / 2 ? 1 : 0;
  const bigA = phi < Math.PI / 2 ? 1 : 0;
  return `M${pt(a1)}L${pt(b1)}A${rb} ${rb} 0 ${bigB} 0 ${pt(b2)}L${pt(a2)}A${ra} ${ra} 0 ${bigA} 0 ${pt(a1)}Z`;
}

// A filled stroke along a cubic curve whose width tapers from w0 to w1.
function taper(p0: P, p1: P, p2: P, p3: P, w0: number, w1: number, n = 24): string {
  const bez = (t: number): P => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = bez(Math.max(0, t - 0.01));
    const b = bez(Math.min(1, t + 0.01));
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const w = (w0 + (w1 - w0) * t) / 2;
    const c = bez(t);
    left.push([c[0] + nx * w, c[1] + ny * w]);
    right.push([c[0] - nx * w, c[1] - ny * w]);
  }
  return (
    `M${pt(left[0])}` +
    left.slice(1).map((p) => `L${pt(p)}`).join('') +
    `A${f(w1 / 2)} ${f(w1 / 2)} 0 0 1 ${pt(right[n])}` +
    right.slice(0, -1).reverse().map((p) => `L${pt(p)}`).join('') +
    `A${f(w0 / 2)} ${f(w0 / 2)} 0 0 1 ${pt(left[0])}Z`
  );
}

// Soft mane locks round an ellipse: each one swells out on its upper side
// and sweeps down to a rounded point. Built down the right side from the top
// and mirrored, so both sides of the mane fall the same way.
function tufts(c: P, inner: P, outer: P, n: number, lean: number, swell = 0.62): string {
  const on = (r: P, ang: number): P => [c[0] + r[0] * Math.cos(ang), c[1] + r[1] * Math.sin(ang)];
  const mid = (k: number): P => [inner[0] + (outer[0] - inner[0]) * k, inner[1] + (outer[1] - inner[1]) * k];
  const m = (p: P): P => [2 * c[0] - p[0], p[1]];
  const step = Math.PI / n;
  const lobes: P[][] = [];
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * step;
    const a1 = a0 + step;
    lobes.push([
      on(mid(swell + 0.12), a0 + lean * 0.35),
      on(outer, a0 + step / 2 + lean),
      on(mid(swell - 0.12), a1 + lean * 0.75),
      on(inner, a1),
    ]);
  }
  let d = `M${pt(on(inner, -Math.PI / 2))}`;
  for (const [c1, tip, c2, end] of lobes) d += `Q${pt(c1)} ${pt(tip)}Q${pt(c2)} ${pt(end)}`;
  for (let i = n - 1; i >= 0; i--) {
    const [c1, tip, c2] = lobes[i];
    const start = i ? lobes[i - 1][3] : on(inner, -Math.PI / 2);
    d += `Q${pt(m(c2))} ${pt(m(tip))}Q${pt(m(c1))} ${pt(m(start))}`;
  }
  return d + 'Z';
}

function quadPts(a: P, c: P, b: P, n: number, inset = 0.5): P[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + inset) / n;
    return [
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1],
    ];
  });
}

const dots = (pts: P[], r: number, fill: string, extra = '') =>
  pts.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}" ${extra}/>`).join('');

const stroke = (d: string, color: string, w: number, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// Parts ---------------------------------------------------------------------------

export type Eyes = 'open' | 'happy' | 'closed';
export type Mouth = 'smile' | 'open' | 'o' | 'wavy';
export type Prop = 'book' | 'plate' | 'heart';
export type Effect = 'sparkles' | 'hearts' | 'zzz' | 'thoughts' | 'sweat' | 'notes';

export interface Face {
  eyes: Eyes;
  mouth: Mouth;
  // Where the eyes rest, in units; they still follow your pointer on top.
  look?: P;
}

export interface RigNode {
  id: string;
  pivot?: P;
  svg?: string;
  children?: RigNode[];
  // Only drawn in some expressions / clips. `front`: only while that part
  // is pulled in front of the head.
  when?: { eyes?: Eyes[]; mouth?: Mouth[]; prop?: Prop; effect?: Effect; front?: string };
  // Move exactly like another node (same pivot and track).
  follow?: string;
  // Resting opacity when a clip doesn't animate it (0 = hidden until a clip fades it in).
  opacity?: number;
}

// How far a part slides with his gaze, which reads as the head turning.
export const PARALLAX: Record<string, P> = {
  gaze: [1, 0.9],
  features: [0.4, 0.28],
  turban: [0.2, 0.1],
  crest: [0.24, 0.1],
  maneBack: [-0.2, -0.1],
};

const ground = `
  <ellipse cx="128" cy="232" rx="79" ry="17" fill="url(#k-aura)"/>
  <ellipse cx="130" cy="234" rx="48" ry="8" fill="#3A1A06" opacity=".2"/>`;

const TAIL_CURVE: [P, P, P, P] = [[110, 205], [80, 218], [48, 206], [52, 174]];
const tail = `
  <path d="${taper(...TAIL_CURVE, 12, 8.5)}" fill="#9C4E12"/>
  <path d="${taper(...TAIL_CURVE, 8.5, 5)}" fill="url(#k-coat)"/>
  ${stroke('M96 214C80 218 64 214 58 202', '#FFE8A8', 1.8, 'opacity=".6"')}`;
const tuft = `
  <path d="M52 182C40 182 34 172 38 162C40 168 44 168 46 166C42 158 46 148 54 146C52 154 56 156 58 156C58 150 64 146 70 148C64 154 68 162 66 170C64 178 58 182 52 182Z" fill="url(#k-dark)"/>
  ${stroke('M52 177C50 170 50 162 54 155M57 177C59 170 61 164 64 158', '#D58A44', 1.4, 'opacity=".6"')}`;

// Pip's feet, in the darker colour.
const footL = pip(`<path d="M100 217c-12 1-19 9-17 17 7 6 25 7 38 1l-1-15Z" fill="url(#k-dark)"/>`) +
  stroke('M87 231l5 1M95 230l5 1', '#E6A15A', 2.4);
const footR = mirror(footL);

// Body: Pip's silhouette as a kurta, a lighter bandhani front panel (tie-dye
// dots, the most Gujarati of textiles) and his chest chevron as the neckline.
function bandhani(): string {
  const out: string[] = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 104 + col * 9.5 + (row % 2) * 4.75;
      const y = 162 + row * 8;
      out.push(dots([[x, y - 1.3], [x - 1.3, y + 0.9], [x + 1.3, y + 0.9]], 0.85, '#FFE6BC'));
    }
  }
  return `<g clip-path="url(#k-panel-clip)" opacity=".8">${out.join('')}</g>`;
}

const body = `
  ${pip(`<path d="M103 150c-16 17-19 47-11 67 6 14 25 17 44 17s39-3 44-17c8-22 3-49-14-67Z" fill="url(#k-kurta)"/>`)}
  <path d="${PANEL}" fill="url(#k-panel)"/>
  ${bandhani()}
  ${pip(`<path d="m123 166 11 7 12-7-4 17h-14Z" fill="${BAND}" opacity=".95"/>`)}
  ${dots([[130, 190], [130, 199]], 1.8, 'url(#k-gold)')}
  ${pip(stroke('M102 213q33 9 67 0', GOLD, 2, 'stroke-dasharray=".1 5" opacity=".9"'))}`;

// Arms: puffy sleeves on a shoulder and an elbow, Pip's dark paws. The
// shoulder sits under the mane's edge, so the joint never shows; the arm is
// long enough (like Pip's) that a raised paw clears the mane.
export const SHOULDER: P = [97, 166];
export const ELBOW: P = [87, 185];
export const PAW: P = [83.5, 204];
const along = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// Unit vectors down the upper arm and across it (pointing away from the body).
const UP_LEN = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
const UP_DIR: P = [(ELBOW[0] - SHOULDER[0]) / UP_LEN, (ELBOW[1] - SHOULDER[1]) / UP_LEN];
const UP_OUT: P = [-UP_DIR[1], UP_DIR[0]];
const off = (p: P, n: P, d: number): P => [p[0] + n[0] * d, p[1] + n[1] * d];
const upperArm = `
  <path d="${limb(SHOULDER, 8.4, ELBOW, 9.2)}" fill="url(#k-sleeve)"/>
  ${stroke(`M${pt(off(along(SHOULDER, ELBOW, 0.3), UP_OUT, 3.4))}Q${pt(off(along(SHOULDER, ELBOW, 0.6), UP_OUT, 5))} ${pt(off(along(SHOULDER, ELBOW, 0.9), UP_OUT, 4.6))}`, '#FFC98C', 1.8, 'opacity=".7"')}`;
// A band across a limb from a to b, its edges bowed toward b like the rim
// of a cylinder seen from a little above.
function band(a: P, b: P, ra: number, rb: number, sag: number): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d: P = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const n: P = [-d[1], d[0]];
  const edge = (c: P, r: number) => `${pt(off(c, n, r))}Q${pt(off(c, d, sag * 2))} ${pt(off(c, n, -r))}`;
  return `M${edge(a, ra)}L${edge(b, -rb)}Z`;
}
// The forearm ends in a cream cuff with a gold seam; the paw, a soft mitten
// with a thumb on the body side, three toe lines and a lighter pad, comes out
// from inside the cuff.
const FORE_LEN = Math.hypot(PAW[0] - ELBOW[0], PAW[1] - ELBOW[1]);
const FORE_DIR: P = [(PAW[0] - ELBOW[0]) / FORE_LEN, (PAW[1] - ELBOW[1]) / FORE_LEN];
const CUFF_A = along(ELBOW, PAW, 0.36);
const CUFF_B = along(ELBOW, PAW, 0.54);
const forearm = `
  <path d="${limb(ELBOW, 9.2, along(ELBOW, PAW, 0.4), 8.6)}" fill="url(#k-sleeve)"/>
  <g transform="rotate(10 ${PAW[0]} ${PAW[1]})">
    <ellipse cx="${PAW[0] + 6.2}" cy="${PAW[1] - 1.8}" rx="3.6" ry="4.6" fill="url(#k-paw)"/>
    <ellipse cx="${PAW[0]}" cy="${PAW[1]}" rx="8.2" ry="9" fill="url(#k-paw)"/>
    ${stroke(`M${PAW[0] - 4.2} ${PAW[1] + 4.4}l.3 2.8M${PAW[0] - 0.3} ${PAW[1] + 5.6}v3M${PAW[0] + 3.6} ${PAW[1] + 4.6}l-.3 2.8`, '#E6A15A', 1.5)}
    <ellipse cx="${PAW[0] - 2.4}" cy="${PAW[1] - 2.6}" rx="2.8" ry="1.8" fill="#D9874A" opacity=".55"/>
  </g>
  <path d="${band(CUFF_A, CUFF_B, 8.9, 8.4, 1.6)}" fill="${BAND}"/>
  ${stroke(`M${pt(off(CUFF_A, [-FORE_DIR[1], FORE_DIR[0]], 8))}Q${pt(off(CUFF_A, FORE_DIR, 3.2))} ${pt(off(CUFF_A, [-FORE_DIR[1], FORE_DIR[0]], -8))}`, GOLD_DEEP, 1.3, 'stroke-dasharray=".1 3.2" opacity=".9"')}`;

// Head: a two-layer mane of soft locks behind Pip's face shape, round Gir
// lion ears peeking out from under the pagdi.
const maneBack = `<path d="${tufts([130, 118], [60, 53], [83, 67], 9, 0.24, 0.56)}" fill="url(#k-mane-back)"/>`;
const maneFront = `<path d="${tufts([130, 121], [56, 47], [71, 58], 10, 0.28, 0.56)}" fill="url(#k-mane)"/>`;

const ear = `<g transform="translate(62 97) rotate(-24)">
  <ellipse rx="12.5" ry="14" fill="url(#k-dark)"/>
  <ellipse cx="1.8" cy="1.8" rx="6.6" ry="8.2" fill="#F4C08A"/>
  <ellipse cx="-4.6" cy="-6.4" rx="2.6" ry="1.7" fill="#FFE3B0" opacity=".7"/></g>`;

// His own face, drawn in Pip's manner: a broad lion head with a soft tuft
// of cheek fluff each side, round amber bead eyes, tufted brows, a muzzle.
const FACE = 'M72 92C72 62 98 46 130 46C162 46 188 62 188 92C189 104 194 112 199 120C195 121 192.5 123 191 125C194 130 196 135 195 139C191 139 187.5 140 184.5 141C176 160 156 170 130 170C104 170 84 160 75.5 141C72.5 140 69 139 65 139C64 135 66 130 69 125C67.5 123 65 121 61 120C66 112 71 104 72 92Z';
const faceCoat = `<g transform="translate(130 118) scale(.92 .96) translate(-130 -118)">
  <path d="${FACE}" fill="url(#k-coat)"/>
</g>`;

// The puffy whisker pads.
const patches = `
  <g transform="translate(130 145) scale(.9) translate(-130 -145)">
    <path d="M130 132C124 128 108 130 106 141C104 151 114 157 123 154C126 158 134 158 137 154C146 157 156 151 154 141C152 130 136 128 130 132Z" fill="url(#k-cream)"/>
    ${dots([[114, 142], [117, 146.5], [112, 147.5], [146, 142], [143, 146.5], [148, 147.5]], 1, '#D39552')}
  </g>`;

const blush = `<g fill="#F09BB0" opacity=".55"><circle cx="90" cy="136" r="6.5"/><circle cx="170" cy="136" r="6.5"/></g>`;
const blushHot = `<g fill="#F09BB0" opacity=".5"><circle cx="90" cy="136" r="8.5"/><circle cx="170" cy="136" r="8.5"/></g>`;

// Tufted brows: thick at the inner end, tapering out, sitting level so he looks
// friendly at rest; the clips tilt them for every other mood.
const browL = `<path d="M94.2 91.7C98.5 88.7 105.5 87.7 110.8 91.2A3.4 3.4 0 0 1 110.8 98C106 95.1 99.5 95.9 94.2 91.7Z" fill="${BROW}" transform="rotate(-9 102.5 93)"/>`;
const browR = mirror(browL);

// Bead eyes: a dark rim, an amber iris that warms toward the bottom, a dark
// pupil, two highlights, and an upper lid that thickens toward the outer corner.
const LID = taper([-8.6, -6.4], [-4.2, -12.9], [5, -12.9], [11.6, -6.6], 2, 3.4);
const EYE_Y = 116;
const bead = (x: number, outer: number) => `
  <g transform="translate(${x} ${EYE_Y}) scale(1.25)">
    <ellipse rx="10" ry="11.5" fill="${EYE}"/>
    <ellipse cy="1.6" rx="7.4" ry="8.6" fill="url(#k-iris)"/>
    <ellipse cy="1.4" rx="4" ry="5" fill="#1A0C04"/>
    <circle cx="3.4" cy="-4.4" r="3.6" fill="#fff"/>
    <circle cx="-3.4" cy="5.2" r="1.6" fill="#FFE6B8"/>
    <path d="${LID}" fill="${EYE}" transform="scale(${outer} 1)"/>
  </g>`;

const happyEyes =
  stroke('M92 120Q105 103 118 120M142 120Q155 103 168 120', EYE, 5) + stroke('M92 120l-3.6-2.4M168 120l3.6-2.4', EYE, 2.4);
const closedEyes =
  stroke('M93 116Q105 125 117 116M143 116Q155 125 167 116', EYE, 4.6) + stroke('M93 116l-3.4 1.6M167 116l3.4 1.6', EYE, 2.2);
// Squeezed shut with glee: > <
const squeezeEyes = stroke('M98 107.5L113 116L98 124.5M162 107.5L147 116L162 124.5', EYE, 5);
// A happy arc for the winking eye.
const winkR = stroke('M143 119Q155 105 167 119', EYE, 5) + stroke('M167 119l3.6-2.4', EYE, 2.4);

// A broad, rosy lion nose and a Y-shaped mouth; the grin shows two little fangs.
const nose = `
  <path d="M121 133C121 129 139 129 139 133C139 137 134 141 130 142C126 141 121 137 121 133Z" fill="#9A4A3C"/>
  <path d="M123 133C123 130.5 137 130.5 137 133C135 134 125 134 123 133Z" fill="#C46B5C"/>
  <ellipse cx="126.5" cy="132.4" rx="2.6" ry="1.2" fill="#fff" opacity=".55"/>
  ${stroke('M130 142V146', MOUTH, 2.2)}`;
const mouthSmile = stroke('M130 146Q125 151.5 119 148.5M130 146Q135 151.5 141 148.5', MOUTH, 2.4);
const mouthOpen = `
  <path d="M118 147Q130 151 142 147Q140 163 130 163Q120 163 118 147Z" fill="#2E1206"/>
  <path d="M123.5 157.5Q130 153 136.5 157.5Q134.5 162.5 130 162.5Q125.5 162.5 123.5 157.5Z" fill="#F1A8BD"/>
  <path d="M121.4 148.2L125.6 149L123.6 153.2ZM138.6 148.2L134.4 149L136.4 153.2Z" fill="#FFFBF2"/>`;
const mouthO = `<ellipse cx="130" cy="151" rx="4" ry="4.6" fill="#4A200A"/>`;
const mouthWavy = stroke('M119 151q2.75-3 5.5 0t5.5 0t5.5 0t5.5 0', MOUTH, 2.4);

// The pagdi: a low wrapped dome above Pip's band. The cloth crosses at the
// front in nested folds, each with a lit rolled edge and a soft shadow under
// it; the sarpech jewel pins the crossing.
function folds(): string {
  // Wraps run diagonally up to the right, bowing round the dome. Each one is
  // a lit rolled edge with the soft shadow of the next layer just under it.
  const wraps = [
    'M56 80Q120 82 204 46',
    'M58 64Q112 64 188 33',
    'M68 49Q106 46 158 30',
  ]
    .map((d) => stroke(d, '#B4370B', 3.4, 'transform="translate(0 2.8)" opacity=".3"') + stroke(d, '#FFB57E', 2.4, 'opacity=".9"'))
    .join('');
  return `<g clip-path="url(#k-dome)">${wraps}</g>`;
}

const turban = `
  <path d="${DOME}" fill="url(#k-turban)"/>
  ${folds()}
  <path d="M68 81q62-25 124 0l1 13q-63-23-126 0Z" fill="url(#k-band)"/>
  ${stroke('M69 83q61-24 122 0', '#FFFBEA', 1.8)}
  ${dots(quadPts([68.5, 88], [130, 64], [191.5, 88], 15), 1.1, GOLD_DEEP)}
  <path d="M130 65.5l8 9.75-8 9.75-8-9.75Z" fill="url(#k-gold)"/>
  <path d="M130 70.5l4.1 4.75-4.1 4.75-4.1-4.75Z" fill="#D7263D"/>
  <path d="M128.7 72.4l1.8-2.2" stroke="#FF9AAE" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M130 87.5C128.4 89.6 128.4 91.4 130 92.4C131.6 91.4 131.6 89.6 130 87.5Z" fill="#FFFBEF"/>`;

// The kalgi: a cream plume pinned to the sarpech, curling over the top.
const crest = `
  <path d="M130 66C121 55 119.5 37 132 25Q139 19.5 147 21Q141.5 24 140.5 30C139.5 44 136 56 130 66Z" fill="url(#k-plume)"/>
  ${stroke('M130 64C127.5 51 129 37 140 26', '#E8B65E', 1.3)}
  <circle cx="130" cy="66" r="3.2" fill="url(#k-gold)"/>`;

// A cloth tail along a cubic, tapering from w0 to w1, with a swallowtail
// notch cut into the end; the last fifth is the gold zari border.
function ribbon(p: [P, P, P, P], w0: number, w1: number, fill: string): string {
  const [a, b, c, d] = p;
  const bez = (t: number): P => {
    const u = 1 - t;
    return [
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ];
  };
  const shape = (t0: number, t1: number, n = 12) => {
    const L: P[] = [];
    const R: P[] = [];
    let tan: P = [1, 0];
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      const q0 = bez(Math.max(0, t - 0.01));
      const q1 = bez(Math.min(1, t + 0.01));
      const len = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
      tan = [(q1[0] - q0[0]) / len, (q1[1] - q0[1]) / len];
      const w = (w0 + (w1 - w0) * t) / 2;
      const m = bez(t);
      L.push([m[0] - tan[1] * w, m[1] + tan[0] * w]);
      R.push([m[0] + tan[1] * w, m[1] - tan[0] * w]);
    }
    const e = bez(t1);
    const notch: P = [e[0] - tan[0] * w1 * 0.55, e[1] - tan[1] * w1 * 0.55];
    const pts = [...L, ...(t1 === 1 ? [notch] : []), ...R.reverse()];
    return `M${pts.map(pt).join('L')}Z`;
  };
  return `<path d="${shape(0, 1, 20)}" fill="${fill}" stroke-linejoin="round"/><path d="${shape(0.8, 1)}" fill="${GOLD}"/>`;
}

// Pip's band ties, as the loose ends of the pagdi: two soft cloth tails.
const TIE_A: [P, P, P, P] = [[186, 77], [200, 70], [214, 72], [223, 83]];
const TIE_B: [P, P, P, P] = [[186, 81], [200, 80], [210, 87], [214, 99]];
const ties = ribbon(TIE_A, 9, 6.5, '#E8561A') + ribbon(TIE_B, 8.5, 6, '#FF9A4A');

// The book is held open low in front of his tummy, clear of the mane, so
// the pages (and the page he turns) can be seen.
const BOOK_Y = -4;
const book = `<g transform="translate(0 ${BOOK_Y})">
  <path d="M95 183.5L130 190.5L165 183.5V214.5L130 221.5L95 214.5Z" fill="#8B3E1E"/>
  <path d="M95 214.5L130 221.5L165 214.5V216.5L130 223.5L95 216.5Z" fill="#6A2C12"/>
  <path d="M99.5 186L130 192V217.5L99.5 211.5ZM160.5 186L130 192V217.5L160.5 211.5Z" fill="#FFF6E0"/>
  ${stroke('M105 195l20 4M105 200.5l20 4M105 206l14 2.8', '#D9B98A', 1.3)}
  <path d="M129 192h2V217.5h-2Z" fill="#E4C79A"/></g>`;
// The right-hand page, hinged on the spine. It's a copy of what it covers,
// and flipped over it matches the left page, so it can loop without a pop.
const PAGE_PIVOT: P = [130, 199 + BOOK_Y];
const page = `<g transform="translate(0 ${BOOK_Y})"><path d="M131 191.8L160.5 186V211.5L131 217.3Z" fill="url(#k-page)"/>
  ${stroke('M155 195l-20 4M155 200.5l-20 4M155 206l-14 2.8', '#D9B98A', 1.3)}</g>`;

const dhokla = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-6.5 -2L-1 -5.5L6.5 -3L1 0.5Z" fill="#FFEB8A"/>
    <path d="M-6.5 -2L1 0.5V6L-6.5 3.5Z" fill="#F2C536"/>
    <path d="M1 0.5L6.5 -3V2.5L1 6Z" fill="#DCA61E"/>
    ${dots([[-2, -3], [1.5, -2], [3.5, -3.5]], 0.75, '#2E1A0A')}
    <path d="M-3 -2.6l2.4 -1.2" stroke="#3E9B4F" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;

// A steel thali of dhokla held in his right paw in front of his tummy; his
// left paw takes the near piece.
const PLATE: P = [139, 202];
const plate = `
  <ellipse cx="${PLATE[0]}" cy="${PLATE[1] + 2}" rx="20" ry="6" fill="#CFC3B2"/>
  <ellipse cx="${PLATE[0]}" cy="${PLATE[1]}" rx="20" ry="6.6" fill="#FFFFFF"/>
  <ellipse cx="${PLATE[0]}" cy="${PLATE[1] + 0.6}" rx="14.5" ry="4.2" fill="#EFE7DA"/>
  ${dhokla(PLATE[0] + 1, PLATE[1] - 5.5)}${dhokla(PLATE[0] + 10, PLATE[1] - 2.5)}`;
const PLATE_TOP: P = [PLATE[0] - 8, PLATE[1] - 2];
const plateTop = dhokla(PLATE_TOP[0], PLATE_TOP[1]);

// A big soft heart he hugs to his chest.
const hug = `<g transform="translate(130 198) scale(1.18)">
  <path d="M0 15C-27-1-18-23 0-12C18-23 27-1 0 15Z" fill="#FF8DB3"/>
  <path d="M0 12.5C-23-1.5-15.5-20 0-10C15.5-20 23-1.5 0 12.5Z" fill="#FFA6C6"/>
  <ellipse cx="-9" cy="-9" rx="4.2" ry="2.6" transform="rotate(-30 -9 -9)" fill="#FFE0EC" opacity=".85"/></g>`;

// Pip's particles: the same star, heart, dream squiggle and music notes.
const star = (fill: string) =>
  `<circle r="11" fill="url(#k-glow)"/><path d="m0-9 2.6 6.4L9 0 2.6 2.6 0 9-2.6 2.6-9 0l6.4-2.6Z" fill="${fill}"/>`;
const heart = `<path d="M0 5C-20-7-7-18 0-9 7-18 20-7 0 5Z" fill="#FF98BA"/>`;
const dream = stroke('M-5.5 -6h11L-5.5 6h11', '#C9A27A', 3);
const thought = (r: number) => `<circle r="${r}" fill="#EFD3A8"/>`;
const note = `<path d="M0 0v-19l13-3v17h-3v-12L3-15V0Z" fill="#C9A27A"/><ellipse cx="-2" rx="5" ry="3.5" fill="#C9A27A"/><ellipse cx="8" cy="-5" rx="5" ry="3.5" fill="#C9A27A"/>`;
const sweat = `<path d="M0-9C4.5-2 6.5 2 6.5 5.5A6.5 6.5 0 0 1-6.5 5.5C-6.5 2-4.5-2 0-9Z" fill="#A6DEF8"/><ellipse cx="-2" cy="3" rx="1.6" ry="2.6" fill="#fff" opacity=".8"/>`;
const at = (x: number, y: number, svg: string) => `<g transform="translate(${x} ${y})">${svg}</g>`;

const fx = (effect: Effect, items: [string, number, number, string][]): RigNode[] =>
  items.map(([id, x, y, svg]) => ({ id, pivot: [x, y], svg: at(x, y, svg), when: { effect } }));

// The dhokla he's about to eat, pinched at the tips of his left paw.
const SNACK = dhokla(PAW[0] + 3, PAW[1] + 7.5, 0.95);

const arm = (side: 'L' | 'R'): RigNode => {
  const m = (svg: string) => (side === 'R' ? mirror(svg) : svg);
  const px = (p: P): P => (side === 'R' ? [mirrorX(p[0]), p[1]] : p);
  return {
    id: `arm${side}`,
    pivot: px(SHOULDER),
    svg: m(upperArm),
    children: [
      {
        id: `fore${side}`,
        pivot: px(ELBOW),
        svg: m(forearm),
        children: side === 'L' ? [{ id: 'snack', svg: SNACK, when: { prop: 'plate' } }] : [],
      },
    ],
  };
};

// The same forearm again, drawn in front of the head while the upper arm
// stays tucked under the mane: a paw can come up to the face without the
// shoulder ever showing over it. A clip asks for it with front: ['armLTop'].
const armTop = (side: 'L' | 'R'): RigNode => ({
  id: `arm${side}Top`,
  follow: `arm${side}`,
  when: { front: `arm${side}Top` },
  children: [
    {
      id: `fore${side}Top`,
      follow: `fore${side}`,
      svg: side === 'R' ? mirror(forearm) : forearm,
      children: side === 'L' ? [{ id: 'snackTop', follow: 'snack', svg: SNACK, when: { prop: 'plate' } }] : [],
    },
  ],
});

export const RIG: RigNode = {
  id: 'root',
  pivot: [130, 234],
  children: [
    { id: 'shadow', pivot: [130, 234], svg: ground },
    {
      id: 'breath',
      pivot: [130, 234],
      children: [
        { id: 'tail', pivot: [110, 205], svg: tail, children: [{ id: 'tuft', pivot: [54, 176], svg: tuft }] },
        { id: 'legL', pivot: [108, 224], svg: footL },
        { id: 'legR', pivot: [152, 224], svg: footR },
        { id: 'body', pivot: [130, 222], svg: body },
        { id: 'book', svg: book, when: { prop: 'book' }, children: [{ id: 'page', pivot: PAGE_PIVOT, svg: page }] },
        { id: 'plate', svg: plate, when: { prop: 'plate' }, children: [{ id: 'plateTop', pivot: PLATE_TOP, svg: plateTop }] },
        { id: 'hug', pivot: [130, 200], svg: hug, when: { prop: 'heart' } },
        arm('L'),
        arm('R'),
        {
          id: 'head',
          pivot: [130, 153],
          children: [
            { id: 'maneBack', svg: maneBack },
            { id: 'mane', svg: maneFront },
            { id: 'ties', pivot: [188, 78], svg: ties },
            { id: 'earL', pivot: [72, 100], svg: ear },
            { id: 'earR', pivot: [188, 100], svg: mirror(ear) },
            { id: 'face', svg: faceCoat },
            {
              id: 'features',
              children: [
                { id: 'patches', svg: patches },
                { id: 'blush', svg: blush },
                { id: 'blushHot', svg: blushHot, opacity: 0 },
                { id: 'browL', pivot: [104, 93], svg: browL },
                { id: 'browR', pivot: [156, 93], svg: browR },
                {
                  id: 'gaze',
                  when: { eyes: ['open'] },
                  children: [
                    { id: 'eyeL', pivot: [105, 116], svg: bead(105, -1) },
                    { id: 'eyeR', pivot: [155, 116], svg: bead(155, 1) },
                    { id: 'winkR', pivot: [155, 116], svg: winkR, opacity: 0 },
                  ],
                },
                { id: 'eyesHappy', svg: happyEyes, when: { eyes: ['happy'] } },
                { id: 'eyesSqueeze', svg: squeezeEyes, when: { eyes: ['happy'] }, opacity: 0 },
                { id: 'eyesClosed', svg: closedEyes, when: { eyes: ['closed'] } },
                { id: 'nose', svg: nose },
                { id: 'mouthSmile', svg: mouthSmile, when: { mouth: ['smile'] } },
                { id: 'mouthOpen', pivot: [130, 148], svg: mouthOpen, when: { mouth: ['open'] } },
                { id: 'mouthO', pivot: [130, 151], svg: mouthO, when: { mouth: ['o'] } },
                { id: 'mouthWavy', svg: mouthWavy, when: { mouth: ['wavy'] } },
              ],
            },
            { id: 'turban', pivot: [130, 84], svg: turban },
            { id: 'crest', pivot: [130, 66], svg: crest },
          ],
        },
        armTop('L'),
        armTop('R'),
      ],
    },
    ...fx('sparkles', [
      ['fx1', 49, 104, star('#FFE5A0')],
      ['fx2', 218, 126, star('#FFC98C')],
      ['fx3', 76, 53, star('#FFC98C')],
      ['fx4', 192, 48, star('#FFE5A0')],
    ]),
    ...fx('hearts', [
      ['fx1', 49, 104, heart],
      ['fx2', 219, 128, heart],
      ['fx3', 76, 53, heart],
    ]),
    ...fx('zzz', [
      ['fx1', 198, 94, dream],
      ['fx2', 212, 74, dream],
      ['fx3', 226, 54, dream],
    ]),
    ...fx('thoughts', [
      ['fx1', 210, 70, thought(3)],
      ['fx2', 220, 55, thought(4.2)],
      ['fx3', 231, 38, thought(5.4)],
    ]),
    ...fx('sweat', [['fx1', 196, 104, sweat]]),
    ...fx('notes', [
      ['fx1', 39, 64, note],
      ['fx2', 213, 96, note],
    ]),
  ],
};

// Clips ------------------------------------------------------------------------------

// Keyframe values per channel. `at` gives each keyframe's time (0..1); without
// it they're evenly spaced. One value means "hold". Every channel on a node
// shares that node's `at`.
export interface Track {
  at?: number[];
  x?: number[];
  y?: number[];
  rotate?: number[];
  sx?: number[];
  sy?: number[];
  opacity?: number[];
}

export interface Clip {
  ms: number;
  loop: boolean;
  face: Face;
  tracks: Record<string, Track>;
  prop?: Prop;
  effect?: Effect;
  bubble?: string;
  // Parts pulled in front of the head for this clip (a paw at the mouth).
  front?: string[];
}

export type Pose = 'idle' | 'wave' | 'cheer' | 'read' | 'eat' | 'think' | 'oops' | 'nod' | 'sleep' | 'dance' | 'love';

// Arm posing by target: say where the paw should be and the shoulder and
// elbow angles are solved (two-bone IK), always bending the elbow outward.
const ARM_L1 = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
const ARM_L2 = Math.hypot(PAW[0] - ELBOW[0], PAW[1] - ELBOW[1]);
const DEF_UPPER = Math.atan2(ELBOW[1] - SHOULDER[1], ELBOW[0] - SHOULDER[0]);
const DEF_FORE = Math.atan2(PAW[1] - ELBOW[1], PAW[0] - ELBOW[0]);
const toDeg = (r: number) => (r * 180) / Math.PI;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

// A paw just out of reach stretches the arm a little (Pip's arms stretch
// too): the forearm slides down the upper arm, up to this far.
const MAX_STRETCH = 7;

// A paw target, optionally with a minimum stretch (to hold an elbow still
// while the forearm swings, as in a wave).
type Target = P | [number, number, number];

function solveArm(side: 'L' | 'R', target: Target): [number, number, number] {
  const S: P = side === 'L' ? SHOULDER : [mirrorX(SHOULDER[0]), SHOULDER[1]];
  const defU = side === 'L' ? DEF_UPPER : Math.PI - DEF_UPPER;
  const defF = side === 'L' ? DEF_FORE : Math.PI - DEF_FORE;
  const dx = target[0] - S[0];
  const dy = target[1] - S[1];
  const auto = Math.hypot(dx, dy) - (ARM_L1 + ARM_L2) + 0.5;
  const stretch = Math.max(0, Math.min(MAX_STRETCH, Math.max(auto, (target as number[])[2] ?? 0)));
  const l1 = ARM_L1 + stretch;
  const d = Math.max(Math.abs(l1 - ARM_L2) + 0.01, Math.min(l1 + ARM_L2 - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const bend = Math.acos((l1 ** 2 + d ** 2 - ARM_L2 ** 2) / (2 * l1 * d));
  const options = [base + bend, base - bend].map((u) => {
    const e: P = [S[0] + l1 * Math.cos(u), S[1] + l1 * Math.sin(u)];
    return { u, e };
  });
  // Of the two ways to bend, take the one with the elbow further out to the
  // side, unless that puts it over his face.
  const onFace = (e: P) => ((e[0] - 130) / 62) ** 2 + ((e[1] - 118) / 56) ** 2 < 1;
  const score = (e: P) => Math.abs(e[0] - 130) - (onFace(e) ? 1000 : 0);
  options.sort((a, b) => score(b.e) - score(a.e));
  const { u, e } = options[0];
  const fa = Math.atan2(target[1] - e[1], target[0] - e[0]);
  const upper = wrap(toDeg(u - defU));
  return [upper, wrap(toDeg(fa - defF) - upper), stretch];
}

// Tracks for one arm through a list of paw targets (optionally timed).
function reach(side: 'L' | 'R', targets: Target[], at?: number[]): Record<string, Track> {
  const upper: number[] = [];
  const fore: number[] = [];
  const ext: number[] = [];
  for (const t of targets) {
    let [u, fo, s] = solveArm(side, t);
    if (upper.length) {
      while (u - upper[upper.length - 1] > 180) u -= 360;
      while (u - upper[upper.length - 1] < -180) u += 360;
      while (fo - fore[fore.length - 1] > 180) fo -= 360;
      while (fo - fore[fore.length - 1] < -180) fo += 360;
    }
    upper.push(+u.toFixed(2));
    fore.push(+fo.toFixed(2));
    ext.push(s);
  }
  const fore$: Track = { at, rotate: fore };
  if (ext.some((s) => s > 0)) {
    // Slide along the upper arm in its own (unrotated) frame.
    const sx = side === 'L' ? UP_DIR[0] : -UP_DIR[0];
    fore$.x = ext.map((s) => +(s * sx).toFixed(2));
    fore$.y = ext.map((s) => +(s * UP_DIR[1]).toFixed(2));
  }
  return { [`arm${side}`]: { at, rotate: upper }, [`fore${side}`]: fore$ };
}

const RIG_PIVOT: P = [130, 234];
// At rest the elbows bow out a touch, so the arms hang soft rather than stiff.
const REST_L: P = [85, 202.6];
const nudge = (p: P, dx: number, dy: number): P => [p[0] + dx, p[1] + dy];
const REST_R: P = [mirrorX(REST_L[0]), REST_L[1]];
const mx = (p: P): P => [mirrorX(p[0]), p[1]];

// Keep a part on the ground (a foot, the shadow) while the root sways, leans
// or hops: undo the root's move and turn at that part's pivot. `add` layers
// the part's own motion on top (same keyframe times as the root).
function plant(root: Track, pivot: P, add: Track = {}): Track {
  const R0 = RIG_PIVOT;
  const n = Math.max(root.x?.length ?? 0, root.y?.length ?? 0, root.rotate?.length ?? 0, 1);
  const val = (v: number[] | undefined, i: number) => (v ? v[Math.min(i, v.length - 1)] : 0);
  const out: Track = { ...add, at: root.at, x: [], y: [], rotate: [] };
  for (let i = 0; i < n; i++) {
    const r = (val(root.rotate, i) * Math.PI) / 180;
    const v: P = [pivot[0] - R0[0] - val(root.x, i), pivot[1] - R0[1] - val(root.y, i)];
    const back: P = [v[0] * Math.cos(r) + v[1] * Math.sin(r), -v[0] * Math.sin(r) + v[1] * Math.cos(r)];
    out.x!.push(+(back[0] - (pivot[0] - R0[0]) + val(add.x, i)).toFixed(2));
    out.y!.push(+(back[1] - (pivot[1] - R0[1]) + val(add.y, i)).toFixed(2));
    out.rotate!.push(+(-val(root.rotate, i) + val(add.rotate, i)).toFixed(2));
  }
  return out;
}
const FOOT_L: P = [108, 224];
const FOOT_R: P = [152, 224];
const feet = (root: Track, addL: Track = {}, addR: Track = {}) => ({
  legL: plant(root, FOOT_L, addL),
  legR: plant(root, FOOT_R, addR),
});

// Particle helpers, offset so they don't move in lockstep.
const shift = <T,>(values: T[], by: number): T[] => {
  const core = values.slice(0, -1);
  const k = ((by % core.length) + core.length) % core.length;
  const out = [...core.slice(k), ...core.slice(0, k)];
  return [...out, out[0]];
};
// Pip's sparkle: pops in, drifts up, fades.
const sparkle = (i: number): Track => ({
  y: shift([8, 8, -4, -4, -23, -23], i),
  sx: shift([0.3, 0.3, 1, 1, 0.5, 0.5], i),
  sy: shift([0.3, 0.3, 1, 1, 0.5, 0.5], i),
  opacity: shift([0, 0, 0.9, 0.9, 0, 0], i),
  rotate: shift([-15, -15, 0, 0, 35, 35], i),
});
const rise = (i: number, dist = 26, drift = 6): Track => ({
  y: shift([0, -dist / 3, -(2 * dist) / 3, -dist, 0, 0], i * 2),
  x: shift([0, drift / 2, drift, drift, 0, 0], i * 2),
  opacity: shift([0, 0.95, 0.8, 0, 0, 0], i * 2),
  sx: shift([0.4, 1, 1, 0.75, 0.4, 0.4], i * 2),
  sy: shift([0.4, 1, 1, 0.75, 0.4, 0.4], i * 2),
});

const CHEER_AT = [0, 0.08, 0.15, 0.28, 0.39, 0.49, 0.59, 0.66, 1];
const CHEER_ROOT: Track = {
  at: CHEER_AT,
  y: [0, 0, 3, -19, 2, -12, 1, 0, 0],
  sx: [1, 1, 1.09, 0.97, 1.07, 0.98, 1.04, 1, 1],
  sy: [1, 1, 0.9, 1.025, 0.93, 1.03, 0.96, 1, 1],
  rotate: [0, 0, 0, -4, 0, 3, 0, 0, 0],
};
const CHEER_PAWS: P[] = [REST_L, REST_L, [80, 211], [57, 139], [67, 163], [58, 142], [78, 192], REST_L, REST_L];

// Hold a value and cut straight to the next one at each switch time, no fade.
function cut(first: number, switches: [number, number][]): { at: number[]; opacity: number[] } {
  const at = [0];
  const opacity = [first];
  let cur = first;
  for (const [t, v] of switches) {
    at.push(t - 0.004, t);
    opacity.push(cur, v);
    cur = v;
  }
  at.push(1);
  opacity.push(cur);
  return { at, opacity };
}
const SQUEEZE: [number, number][] = [[0.11, 1], [0.21, 0], [0.36, 1], [0.45, 0], [0.55, 1], [0.63, 0]];
const flip = (sw: [number, number][]): [number, number][] => sw.map(([t, v]) => [t, 1 - v]);

// Pip's idle: a curious head tilt that holds, a glance, a weight shift.
const IDLE_AT = [0, 0.2, 0.29, 0.39, 0.48, 0.57, 0.66, 0.76, 1];
// Wave: the elbow parked out by his side (a little stretched so the paw
// clears the mane), the paw on a circle round it.
const WAVE_ELBOW: P = [188.5, 155.7];
const WAVE = (deg: number): Target => [
  WAVE_ELBOW[0] + ARM_L2 * Math.cos((deg * Math.PI) / 180),
  WAVE_ELBOW[1] + ARM_L2 * Math.sin((deg * Math.PI) / 180),
  Math.hypot(WAVE_ELBOW[0] - mirrorX(SHOULDER[0]), WAVE_ELBOW[1] - SHOULDER[1]) - ARM_L1,
];
const WAVE_ROOT: Track = { at: [0, 0.07, 0.18, 0.78, 0.88, 1], y: [0, 1, -3, -3, 1, 0], rotate: [0, 0.5, -3, -3, 1, 0] };
const THINK_CHIN: P = [148, 163];
// Each paw rolls round a loop twice per bar: up and out, down across his
// chest, low by his side, back up the outside. The paws are half a loop apart.
const DANCE_AT = [0, 0.25, 0.5, 0.75, 1];
const DANCE_PAWS: P[] = [[61, 139], [108, 202], [61, 139], [108, 202], [61, 139]];
const DANCE_ROOT: Track = { x: [-4, 0, 4, 0, -4], rotate: [-5, 0, 5, 0, -5], y: [0, -4, 0, -4, 0] };
const LOVE_ROOT: Track = { at: [0, 0.22, 0.4, 0.7, 1], y: [0, -3, -4.5, -3, 0], sx: [1, 1.02, 1.035, 1.02, 1], sy: [1, 1.025, 1.04, 1.025, 1] };
const OOPS_ROOT: Track = { at: [0, 0.1, 0.3, 1], y: [0, 3, 0, 0], sx: [1, 1.05, 1, 1], sy: [1, 0.94, 1, 1] };
const EAT_PICK: P = [127, 192];
const EAT_MOUTH: P = [127, 161];
const IDLE_ROOT: Track = { at: [0, 0.22, 0.3, 0.4, 0.49, 0.58, 0.66, 0.76, 1], x: [0, 0, 2, 2, 0, -1, -1, 0, 0], rotate: [0, 0, 1.8, 1.8, 0, -1, -1, 0, 0] };

export const CLIPS: Record<Pose, Clip> = {
  idle: {
    ms: 12000,
    loop: true,
    face: { eyes: 'open', mouth: 'smile' },
    tracks: {
      // Paws drift with the weight shift and settle a beat after it.
      ...reach('L', [REST_L, REST_L, nudge(REST_L, 1.1, -0.6), nudge(REST_L, 0.9, -0.4), REST_L, nudge(REST_L, -0.7, 0.6), nudge(REST_L, -0.5, 0.4), REST_L, REST_L], [0, 0.24, 0.33, 0.42, 0.52, 0.61, 0.69, 0.79, 1]),
      ...reach('R', [REST_R, REST_R, nudge(REST_R, 1.1, 0.6), nudge(REST_R, 0.9, 0.4), REST_R, nudge(REST_R, -0.7, -0.6), nudge(REST_R, -0.5, -0.4), REST_R, REST_R], [0, 0.24, 0.33, 0.42, 0.52, 0.61, 0.69, 0.79, 1]),
      root: IDLE_ROOT,
      // He leans; his feet stay put, and so does his shadow.
      ...feet(IDLE_ROOT),
      shadow: plant(IDLE_ROOT, RIG_PIVOT),
      head: { at: IDLE_AT, rotate: [0, 0, -7, -7, 0, 4, 4, 0, 0], y: [0, 0, 1, 1, 0, -2, -2, 0, 0] },
      gaze: { at: [0, 0.22, 0.28, 0.4, 0.47, 0.57, 0.67, 0.75, 1], x: [0, 0, -3, -3, 0, 2, 2, 0, 0], y: [0, 0, 1, 1, 0, -2, -2, 0, 0] },
      browL: { at: IDLE_AT, y: [0, 0, 0, 0, 0, -2, -2, 0, 0] },
      browR: { at: IDLE_AT, y: [0, 0, -1.5, -1.5, 0, -2, -2, 0, 0] },
      tail: { at: [0, 0.21, 0.35, 0.5, 0.71, 0.85, 1], rotate: [-5, 8, -2, -5, 8, -2, -5] },
      tuft: { at: [0, 0.26, 0.4, 0.55, 0.76, 0.9, 1], rotate: [6, -8, 2, 6, -8, 2, 6] },
      ties: { rotate: [-6, 8, -6, 8, -6, 8, -6], sx: [1, 0.94, 1, 0.94, 1, 0.94, 1] },
      crest: { at: IDLE_AT, rotate: [0, 0, 4, 3, 0, -3, -2, 0, 0] },
      earL: { at: [0, 0.62, 0.65, 0.68, 0.71, 1], rotate: [0, 0, -14, 5, 0, 0] },
      earR: { at: [0, 0.65, 0.68, 0.71, 0.74, 1], rotate: [0, 0, 11, -4, 0, 0] },
    },
  },
  // Pip's hello: arm up, wave three times, a wink in the middle.
  wave: {
    ms: 2800,
    loop: true,
    face: { eyes: 'open', mouth: 'open' },
    bubble: 'કેમ છો!',
    front: ['armRTop'],
    tracks: {
      // A small dip, then up; the elbow holds still out at his side while
      // the forearm swings from it, and the paw drops back in an arc.
      ...reach(
        'R',
        [REST_R, [180, 210], WAVE(-80), WAVE(-44), WAVE(-92), WAVE(-46), WAVE(-92), WAVE(-46), WAVE(-86), REST_R],
        [0, 0.07, 0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71, 1],
      ),
      ...reach('L', [REST_L, REST_L, nudge(REST_L, -1.2, 0.4), nudge(REST_L, -1, 0.4), REST_L], [0, 0.1, 0.24, 0.8, 0.94]),
      root: WAVE_ROOT,
      ...feet(WAVE_ROOT),
      shadow: plant(WAVE_ROOT, RIG_PIVOT),
      head: { at: [0, 0.07, 0.24, 0.76, 1], rotate: [0, 1, -9, -9, 0] },
      eyeR: cut(1, [[0.31, 0], [0.49, 1]]),
      winkR: cut(0, [[0.31, 1], [0.49, 0]]),
      browR: { at: [0, 0.28, 0.34, 0.46, 0.52, 1], y: [0, 0, 2.5, 2.5, 0, 0], rotate: [0, 0, 6, 6, 0, 0] },
      browL: { at: [0, 0.2, 0.8, 1], y: [0, -2.5, -2.5, 0] },
      tail: { rotate: [-8, 12, -8, 12, -8, 12, -8] },
      tuft: { rotate: [8, -10, 8, -10, 8, -10, 8] },
      ties: { rotate: [-6, 10, -6, 10, -6] },
      earR: { at: [0, 0.24, 0.32, 1], rotate: [0, 0, 10, 0] },
    },
  },
  // Pip's cheer: crouch, launch, hang, land, a smaller rebound.
  cheer: {
    ms: 3600,
    loop: true,
    face: { eyes: 'happy', mouth: 'open' },
    effect: 'sparkles',
    front: ['armLTop', 'armRTop'],
    tracks: {
      // Paws swing down on the crouch, fling up and out past the mane on the
      // launch, sag on the landing, up again, and drop back to his sides.
      ...reach('L', CHEER_PAWS, CHEER_AT),
      ...reach('R', CHEER_PAWS.map(mx), CHEER_AT),
      root: CHEER_ROOT,
      // The shadow stays on the ground, shrinking while he's up.
      shadow: plant(CHEER_ROOT, RIG_PIVOT, { sx: [1, 1, 1.15, 0.66, 1.15, 0.8, 1.15, 1, 1], opacity: [1, 1, 1, 0.5, 1, 0.7, 1, 1, 1] }),
      head: { at: [0, 0.12, 0.28, 0.39, 0.49, 0.59, 0.7, 1], rotate: [0, 0, 6, -4, -6, 0, 0, 0], y: [0, 0, -2, 3, 0, 2, 0, 0] },
      // Feet stay on the floor through the crouch and landings (the body
      // squashes onto them), kick out at the top of the jump.
      legL: { at: CHEER_AT, rotate: [0, 0, 0, 16, 0, 10, 0, 0, 0], y: [0, 0, -3, -4, -2, -2, -1, 0, 0] },
      legR: { at: CHEER_AT, rotate: [0, 0, 0, -16, 0, -10, 0, 0, 0], y: [0, 0, -3, -4, -2, -2, -1, 0, 0] },
      // The face acts the jump: squeezed shut on the crouch and each landing,
      // eyes and grin wide open at the top, brows up, cheeks flushing.
      eyesHappy: cut(1, flip(SQUEEZE)),
      eyesSqueeze: cut(0, SQUEEZE),
      mouthOpen: { at: CHEER_AT, sx: [1, 1, 0.8, 1.16, 0.9, 1.12, 0.9, 1, 1], sy: [1, 1, 0.55, 1.5, 0.8, 1.38, 0.8, 1, 1] },
      blushHot: { at: CHEER_AT, opacity: [0, 0, 0.5, 1, 0.7, 1, 0.7, 0.3, 0] },
      browL: { at: CHEER_AT, y: [0, 0, 1.5, -3.5, -0.5, -3, 0, 0, 0], rotate: [0, 0, 5, -6, 0, -5, 0, 0, 0] },
      browR: { at: CHEER_AT, y: [0, 0, 1.5, -3.5, -0.5, -3, 0, 0, 0], rotate: [0, 0, -5, 6, 0, 5, 0, 0, 0] },
      // The tail drags down as he goes up and flicks up as he lands, the tuft a beat behind.
      tail: { at: CHEER_AT, rotate: [0, 2, 8, -14, 10, -12, 8, -3, 0] },
      tuft: { at: [0, 0.1, 0.2, 0.33, 0.44, 0.54, 0.64, 0.74, 1], rotate: [0, 0, -6, 12, -10, 10, -8, 4, 0] },
      ties: { rotate: [-6, 8, -6, 8, -6, 8, -6, 8, -6, 8, -6] },
      crest: { at: [0, 0.18, 0.32, 0.43, 0.53, 0.64, 1], rotate: [0, 6, -10, 8, -6, 3, 0] },
      earL: { at: [0, 0.18, 0.32, 0.43, 0.53, 1], rotate: [0, 6, -14, 6, -8, 0] },
      earR: { at: [0, 0.18, 0.32, 0.43, 0.53, 1], rotate: [0, -6, 14, -6, 8, 0] },
      fx1: sparkle(0),
      fx2: sparkle(1),
      fx3: sparkle(2),
      fx4: sparkle(3),
    },
  },
  // Reading, nodding along, turning a page; brows lift at the good bits.
  read: {
    ms: 4600,
    loop: true,
    face: { eyes: 'open', mouth: 'smile', look: [0, 3.5] },
    prop: 'book',
    tracks: {
      // Paws hold the covers by their outer edges. To turn the page the
      // right paw lifts its corner, flicks it over and goes back.
      ...reach('L', [[98.5, 198], [98.5, 198], [98, 199], [98.5, 198]], [0, 0.6, 0.72, 1]),
      ...reach('R', [[161.5, 198], [161.5, 198], [159, 199], [150, 190], [140, 189], [161.5, 198], [161.5, 198]], [0, 0.5, 0.56, 0.62, 0.68, 0.84, 1]),
      page: { at: [0, 0.57, 0.6, 0.69, 0.78, 0.83, 1], sx: [1, 1, 1, 0, -1, -1, -1], y: [0, 0, 0, -3, 0, 0, 0], opacity: [0, 0, 1, 1, 1, 0, 0] },
      head: { at: [0, 0.25, 0.5, 0.62, 0.8, 1], rotate: [1, 2.5, 1, -2, 1, 1], y: [3, 4, 3, 2, 3, 3] },
      gaze: { at: [0, 0.3, 0.45, 0.6, 1], x: [-2, 1, 2, -2, -2] },
      browL: { at: [0, 0.3, 0.38, 0.5, 1], y: [0, 0, -3, 0, 0] },
      browR: { at: [0, 0.3, 0.38, 0.5, 1], y: [0, 0, -3, 0, 0] },
      tail: { rotate: [0, 5, 0, -4, 0] },
      tuft: { rotate: [4, -3, -6, 3, 4] },
      ties: { rotate: [-4, 6, -4, 6, -4] },
    },
  },
  // Holding a plate of dhokla, popping a piece in, chewing happily.
  eat: {
    ms: 2600,
    loop: true,
    face: { eyes: 'open', mouth: 'o' },
    prop: 'plate',
    front: ['plate', 'armLTop'],
    tracks: {
      // Right paw holds the thali from below; the left dips in, picks up the
      // near piece, brings it up and pops it in, then drops back to his side.
      ...reach('R', [[156, 208]]),
      ...reach('L', [REST_L, [81, 207], EAT_PICK, [123, 184], EAT_MOUTH, EAT_MOUTH, [110, 182], REST_L, REST_L], [0, 0.07, 0.19, 0.25, 0.34, 0.42, 0.52, 0.66, 1]),
      snack: cut(0, [[0.19, 1], [0.405, 0]]),
      plateTop: { at: [0, 0.186, 0.19, 0.9, 0.96, 1], opacity: [1, 1, 0, 0, 1, 1], sx: [1, 1, 0.3, 0.3, 1, 1], sy: [1, 1, 0.3, 0.3, 1, 1] },
      mouthO: {
        at: [0, 0.34, 0.42, 0.52, 0.62, 0.72, 0.82, 1],
        sy: [1, 1.4, 0.4, 0.9, 0.4, 0.9, 0.4, 1],
        sx: [1, 1.1, 1.3, 1, 1.3, 1, 1.3, 1],
      },
      head: { at: [0, 0.34, 0.42, 0.52, 0.62, 0.72, 1], rotate: [0, -6, -2, -1, 1, -1, 0], y: [0, 3, 2, 0, 1, 0, 0] },
      gaze: { at: [0, 0.2, 0.34, 0.46, 1], x: [2, -2, 0, 0, 2], y: [2, 3, 1, 0, 2] },
      browL: { at: [0, 0.42, 0.52, 0.62, 0.72, 1], y: [0, -2.5, 0, -2.5, 0, 0] },
      browR: { at: [0, 0.42, 0.52, 0.62, 0.72, 1], y: [0, -2.5, 0, -2.5, 0, 0] },
      tail: { rotate: [0, 9, 0, 9, 0] },
      tuft: { rotate: [0, -8, 4, -8, 0] },
      ties: { rotate: [-4, 6, -4, 6, -4] },
    },
  },
  // Pip's ponder: paw to cheek, head tilted, one brow up, eyes searching.
  think: {
    ms: 5600,
    loop: true,
    face: { eyes: 'open', mouth: 'smile', look: [0, -2] },
    effect: 'thoughts',
    front: ['armRTop'],
    tracks: {
      // Paw under his chin, elbow out, tapping twice while he ponders.
      ...reach('R', [THINK_CHIN, THINK_CHIN, [149.5, 166.5], THINK_CHIN, [149.5, 166.5], THINK_CHIN], [0, 0.35, 0.43, 0.51, 0.59, 1]),
      ...reach('L', [[85, 203], [85.4, 202.4], [85, 203]]),
      head: { at: [0, 0.35, 0.65, 0.8, 1], rotate: [7, 11, 11, 4, 7], y: [0, 2, 2, 0, 0] },
      gaze: { at: [0, 0.35, 0.65, 1], x: [2, -2, -2, 2], y: [-1, -0.5, -0.5, -1] },
      browR: { y: [-2.6], rotate: [-6] },
      browL: { at: [0, 0.35, 0.65, 1], y: [-1.8, -1.3, -1.3, -1.8], rotate: [2, 4, 4, 2] },
      tail: { rotate: [0, 6, 0] },
      tuft: { rotate: [4, -4, 4] },
      ties: { rotate: [-4, 4, -4] },
      fx1: { at: [0, 0.35, 0.7, 1], opacity: [0.25, 1, 0.25, 0.25], y: [0, -4, 0, 0] },
      fx2: { at: [0, 0.1, 0.45, 0.8, 1], opacity: [0.25, 0.25, 1, 0.25, 0.25], y: [0, 0, -4, 0, 0] },
      fx3: { at: [0, 0.2, 0.55, 0.9, 1], opacity: [0.25, 0.25, 1, 0.25, 0.25], y: [0, 0, -4, 0, 0] },
    },
  },
  // Flinch: eyes wide, brows worried, ears back, a little head shake.
  oops: {
    ms: 1400,
    loop: false,
    face: { eyes: 'open', mouth: 'wavy' },
    effect: 'sweat',
    tracks: {
      // Paws fly up and out with the flinch, then come together in front of
      // his tummy and fidget sheepishly before dropping back.
      ...reach('L', [REST_L, [68, 172], [94, 184], [116, 194], [117, 192], [116, 195], [117, 193], REST_L], [0, 0.09, 0.17, 0.26, 0.42, 0.56, 0.7, 1]),
      ...reach('R', [REST_R, mx([68, 172]), mx([94, 184]), mx([116, 194]), mx([116.5, 195.5]), mx([117, 192]), mx([116, 194]), REST_R], [0, 0.09, 0.17, 0.26, 0.42, 0.56, 0.7, 1]),
      root: OOPS_ROOT,
      ...feet(OOPS_ROOT),
      shadow: plant(OOPS_ROOT, RIG_PIVOT),
      head: { at: [0, 0.1, 0.28, 0.44, 0.6, 0.76, 1], rotate: [0, -3, -9, 7, -4, 2, 0], y: [0, 2, 1, 0, 0, 0, 0] },
      eyeL: { at: [0, 0.08, 0.7, 1], sx: [1, 1.1, 1.06, 1], sy: [1, 1.1, 1.06, 1] },
      eyeR: { at: [0, 0.08, 0.7, 1], sx: [1, 1.1, 1.06, 1], sy: [1, 1.1, 1.06, 1] },
      browL: { at: [0, 0.08, 0.8, 1], rotate: [0, -16, -14, 0], y: [0, -2, -2, 0] },
      browR: { at: [0, 0.08, 0.8, 1], rotate: [0, 16, 14, 0], y: [0, -2, -2, 0] },
      earL: { at: [0, 0.1, 0.8, 1], rotate: [0, -22, -16, 0] },
      earR: { at: [0, 0.1, 0.8, 1], rotate: [0, 22, 16, 0] },
      crest: { at: [0, 0.16, 0.34, 0.5, 0.66, 1], rotate: [0, 8, -10, 7, -3, 0] },
      ties: { at: [0, 0.16, 0.34, 0.5, 1], rotate: [0, 12, -8, 6, 0] },
      tail: { at: [0, 0.1, 0.4, 1], rotate: [0, 14, 6, 0] },
      fx1: { at: [0, 0.15, 0.7, 1], y: [-4, 0, 9, 13], opacity: [0, 1, 1, 0] },
    },
  },
  // Two quick nods with happy eyes; brows bounce, crest and tail catch up.
  nod: {
    ms: 1000,
    loop: false,
    face: { eyes: 'happy', mouth: 'smile' },
    tracks: {
      head: { at: [0, 0.18, 0.36, 0.54, 0.74, 1], y: [0, 5.5, -1, 4.5, 0, 0], rotate: [0, 3, -1, 2, 0, 0] },
      // Paws give a little bounce a beat after each nod.
      ...reach('L', [REST_L, REST_L, nudge(REST_L, 0.4, 1.4), REST_L, nudge(REST_L, 0.3, 1.1), REST_L], [0, 0.12, 0.26, 0.44, 0.62, 0.86]),
      ...reach('R', [REST_R, REST_R, nudge(REST_R, -0.4, 1.4), REST_R, nudge(REST_R, -0.3, 1.1), REST_R], [0, 0.12, 0.26, 0.44, 0.62, 0.86]),
      root: { at: [0, 0.18, 0.36, 0.54, 0.74, 1], sy: [1, 0.97, 1.01, 0.98, 1, 1] },
      browL: { at: [0, 0.18, 0.36, 0.54, 1], y: [0, -3, 0, -3, 0] },
      browR: { at: [0, 0.18, 0.36, 0.54, 1], y: [0, -3, 0, -3, 0] },
      crest: { at: [0, 0.24, 0.42, 0.6, 0.8, 1], rotate: [0, -7, 9, -5, 3, 0] },
      ties: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, 10, -6, 6, 0] },
      earL: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, 6, -6, 4, 0] },
      earR: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, -6, 6, -4, 0] },
      tail: { at: [0, 0.3, 0.55, 0.8, 1], rotate: [0, 14, -4, 10, 0] },
      tuft: { at: [0, 0.38, 0.62, 0.88, 1], rotate: [0, -12, 6, -8, 0] },
    },
  },
  // Pip's nap: head lowered, relaxed eyes, no brows, a little snore.
  sleep: {
    ms: 4800,
    loop: true,
    face: { eyes: 'closed', mouth: 'o' },
    effect: 'zzz',
    tracks: {
      // Paws folded on his tummy, rising with each slow breath.
      ...reach('L', [[117, 205], [116.6, 203.4], [117, 205]], [0, 0.45, 1]),
      ...reach('R', [[143, 205], [143.4, 203.4], [143, 205]], [0, 0.45, 1]),
      root: { at: [0, 0.45, 0.7, 1], sx: [1, 1.025, 1.005, 1], sy: [1, 1.035, 1.008, 1] },
      head: { at: [0, 0.45, 1], rotate: [8, 6, 8], y: [7, 5, 7] },
      mouthO: { at: [0, 0.45, 1], sx: [0.8, 1.15, 0.8], sy: [0.8, 1.15, 0.8] },
      browL: { opacity: [0] },
      browR: { opacity: [0] },
      crest: { rotate: [7, 9, 7] },
      ties: { rotate: [22, 26, 22] },
      earL: { rotate: [-12] },
      earR: { rotate: [12] },
      tail: { rotate: [10, 12, 10] },
      tuft: { rotate: [-6, -9, -6] },
      fx1: { at: [0, 0.2, 0.75, 1], x: [-6, -2, 16, 22], y: [24, 10, -22, -33], opacity: [0, 0.8, 0.55, 0], sx: [0.85, 0.9, 1.1, 1.15], sy: [0.85, 0.9, 1.1, 1.15] },
      fx2: { at: [0, 0.33, 0.53, 1], x: [10, -6, -2, 16], y: [-20, 24, 10, -22], opacity: [0.55, 0, 0.8, 0.55], sx: [1.1, 0.85, 0.9, 1.1], sy: [1.1, 0.85, 0.9, 1.1] },
      fx3: { at: [0, 0.66, 0.86, 1], x: [-2, -6, -2, 4], y: [10, 24, 10, 0], opacity: [0.8, 0, 0.8, 0.7], sx: [0.9, 0.85, 0.9, 1], sy: [0.9, 0.85, 0.9, 1] },
    },
  },
  // Garba: step and raise a hand, side to side.
  dance: {
    ms: 1400,
    loop: true,
    face: { eyes: 'happy', mouth: 'open' },
    effect: 'notes',
    front: ['armLTop', 'armRTop'],
    tracks: {
      // One paw up and out past the mane, the other low, swapping each beat.
      ...reach('L', DANCE_PAWS, DANCE_AT),
      ...reach('R', shift(DANCE_PAWS, 1).map(mx), DANCE_AT),
      root: DANCE_ROOT,
      head: { rotate: [7, 1, -7, -1, 7] },
      browL: { y: [-2, 0, -2, 0, -2] },
      browR: { y: [0, -2, 0, -2, 0] },
      // He sways over planted feet, kicking one out on each step.
      ...feet(DANCE_ROOT, { rotate: [0, 10, 0, 0, 0], y: [0, -4, 0, 0, 0] }, { rotate: [0, 0, 0, -10, 0], y: [0, 0, 0, -4, 0] }),
      shadow: plant(DANCE_ROOT, RIG_PIVOT),
      // Wagging on the beat, carried low so the left paw sweeps above it.
      tail: { rotate: [-16, -30, -16, -30, -16, -30, -16, -30, -16] },
      tuft: { at: [0, 0.06, 0.185, 0.31, 0.435, 0.56, 0.685, 0.81, 0.935, 1], rotate: [2, 6, -8, 6, -8, 6, -8, 6, -8, 2] },
      ties: { rotate: [-8, 10, -8, 10, -8] },
      crest: { rotate: [-6, -10, 6, 10, -6] },
      fx1: rise(0, 20, -6),
      fx2: rise(1, 20, 6),
    },
  },
  // Pip's heart-hug: lifts up, tilts in, paws to his chest, blushing.
  love: {
    ms: 2800,
    loop: true,
    face: { eyes: 'happy', mouth: 'smile' },
    effect: 'hearts',
    prop: 'heart',
    tracks: {
      // Hugging a big heart to his chest, squeezing it as he rises.
      ...reach('L', [[110, 199], [112.5, 198], [112.5, 198], [110, 199]], [0, 0.3, 0.7, 1]),
      ...reach('R', [mx([110, 199]), mx([112.5, 198]), mx([112.5, 198]), mx([110, 199])], [0, 0.3, 0.7, 1]),
      hug: { at: [0, 0.3, 0.42, 0.58, 0.7, 1], sx: [1, 0.93, 0.96, 0.93, 0.96, 1], sy: [1, 1.05, 1.02, 1.05, 1.02, 1], y: [0, -1, -1, -1, -1, 0] },
      root: LOVE_ROOT,
      ...feet(LOVE_ROOT),
      shadow: plant(LOVE_ROOT, RIG_PIVOT),
      head: { at: [0, 0.25, 0.7, 1], rotate: [0, 9, 9, 0] },
      blushHot: { at: [0, 0.25, 0.7, 1], opacity: [0.3, 1, 1, 0.3] },
      browL: { at: [0, 0.25, 0.7, 1], y: [0, -2.5, -2.5, 0] },
      browR: { at: [0, 0.25, 0.7, 1], y: [0, -2.5, -2.5, 0] },
      tail: { rotate: [-8, 12, -8, 12, -8] },
      tuft: { rotate: [8, -10, 8, -10, 8] },
      ties: { rotate: [-6, 8, -6, 8, -6] },
      fx1: { at: [0, 0.08, 0.24, 0.42, 0.9, 1], y: [22, 22, 0, 0, -36, -36], x: [0, 0, 0, 0, -9, -9], opacity: [0, 0, 0.95, 0.95, 0, 0], sx: [0.3, 0.3, 1, 1, 0.75, 0.75], sy: [0.3, 0.3, 1, 1, 0.75, 0.75] },
      fx2: { at: [0, 0.16, 0.32, 0.5, 0.98, 1], y: [22, 22, 0, 0, -36, -36], x: [0, 0, 0, 0, 9, 9], opacity: [0, 0, 0.95, 0.95, 0, 0], sx: [0.3, 0.3, 1, 1, 0.75, 0.75], sy: [0.3, 0.3, 1, 1, 0.75, 0.75] },
      fx3: { at: [0, 0.24, 0.4, 0.58, 1], y: [22, 22, 0, 0, -30], x: [0, 0, 0, 0, -6], opacity: [0, 0, 0.95, 0.95, 0], sx: [0.3, 0.3, 1, 1, 0.8], sy: [0.3, 0.3, 1, 1, 0.8] },
    },
  },
};

// Sampling ----------------------------------------------------------------------------

const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

// Keyframes eased with a sine in-out between each pair, as dense linear points.
// The app feeds these to Animated.interpolate (which can't take an easing
// function on the native driver); the preview renderer samples them directly.
export function densify(values: number[], at?: number[], steps = 8): { input: number[]; output: number[] } {
  if (values.length === 1) return { input: [0, 1], output: [values[0], values[0]] };
  const times = at && at.length === values.length ? at : values.map((_, i) => i / (values.length - 1));
  const input: number[] = [];
  const output: number[] = [];
  for (let s = 0; s < values.length - 1; s++) {
    const t0 = times[s];
    const t1 = times[s + 1];
    for (let k = 0; k < steps; k++) {
      const u = k / steps;
      const t = t0 + (t1 - t0) * u;
      if (input.length && t <= input[input.length - 1]) continue;
      input.push(t);
      output.push(values[s] + (values[s + 1] - values[s]) * ease(u));
    }
  }
  if (input[input.length - 1] < 1) {
    input.push(1);
    output.push(values[values.length - 1]);
  } else {
    output[output.length - 1] = values[values.length - 1];
  }
  return { input, output };
}

export function sample(values: number[] | undefined, t: number, fallback: number, at?: number[]): number {
  if (!values || !values.length) return fallback;
  const { input, output } = densify(values, at);
  for (let i = 1; i < input.length; i++) {
    if (t <= input[i]) {
      const u = (t - input[i - 1]) / (input[i] - input[i - 1] || 1);
      return output[i - 1] + (output[i] - output[i - 1]) * u;
    }
  }
  return output[output.length - 1];
}

export function visible(node: RigNode, clip: Clip): boolean {
  const w = node.when;
  if (!w) return true;
  if (w.eyes && !w.eyes.includes(clip.face.eyes)) return false;
  if (w.mouth && !w.mouth.includes(clip.face.mouth)) return false;
  if (w.prop && clip.prop !== w.prop) return false;
  if (w.effect && clip.effect !== w.effect) return false;
  if (w.front && !clip.front?.includes(w.front)) return false;
  return true;
}

// Draw order among siblings: normal parts, then parts pulled in front of the
// head, then anything that only shows while they are.
export function rank(node: RigNode, clip: Clip): number {
  if (clip.front?.includes(node.id)) return 1;
  if (node.when?.front && clip.front?.includes(node.when.front)) return 2;
  return 0;
}

export function findNode(id: string, node: RigNode = RIG): RigNode | undefined {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(id, c);
    if (hit) return hit;
  }
  return undefined;
}

// Ambient motion, on top of every clip (Pip breathes at the same pace).
export const BREATH_MS = 3800;
export const BREATH_SY = [1, 1.025, 1];
export const BREATH_SX = [1, 1.012, 1];
