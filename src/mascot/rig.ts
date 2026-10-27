// Kesar's rig: vector parts, the joints they turn on, and the clips that move
// them. Plain data with no React, so the app (Kesar.tsx) and the preview
// renderer (scripts/render-kesar.mjs) draw from exactly the same source.
//
// He's a Gir lion cub, drawn chibi: a big round head in a puffy saffron mane,
// a small round body, stubby arms and bean feet, and a red bandhani
// neckerchief. No outlines, just soft gradient shapes, big glossy eyes and
// little brows that act.
//
// Coordinates are a 260 x 260 design box; the ground line is y = 234.

export const VIEW = 260;
// The drawing box, with headroom above the mane for jumps.
export const BOX = { x: -10, y: -26, w: 280, h: 280 };

type P = [number, number];

// Palette ----------------------------------------------------------------------

const EYE = '#2B1609';
const BROW = '#B4561E';
const MOUTH = '#6B2E14';
const TOE = '#D08938';

const GRADIENTS: Record<string, string> = {
  'k-coat': `<linearGradient id="k-coat" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#FFEAB2"/><stop offset=".5" stop-color="#FFD47E"/><stop offset="1" stop-color="#F3B256"/></linearGradient>`,
  'k-limb': `<linearGradient id="k-limb" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFE6A6"/><stop offset="1" stop-color="#F2B055"/></linearGradient>`,
  'k-foot': `<linearGradient id="k-foot" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FAC872"/><stop offset="1" stop-color="#E29A42"/></linearGradient>`,
  'k-cream': `<linearGradient id="k-cream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFFDF6"/><stop offset="1" stop-color="#FCE6C2"/></linearGradient>`,
  'k-mane-back': `<linearGradient id="k-mane-back" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="182"><stop stop-color="#F28A36"/><stop offset="1" stop-color="#BC521D"/></linearGradient>`,
  'k-mane': `<linearGradient id="k-mane" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="172"><stop stop-color="#FFBA58"/><stop offset="1" stop-color="#F2802E"/></linearGradient>`,
  'k-tuft': `<linearGradient id="k-tuft" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#FFBE5C"/><stop offset="1" stop-color="#E8702A"/></linearGradient>`,
  'k-ear': `<linearGradient id="k-ear" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#FFDC90"/><stop offset="1" stop-color="#F0A64A"/></linearGradient>`,
  'k-scarf': `<linearGradient id="k-scarf" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#F2506A"/><stop offset="1" stop-color="#C52842"/></linearGradient>`,
  'k-aura': `<radialGradient id="k-aura"><stop stop-color="#FFB347" stop-opacity=".26"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>`,
  'k-glow': `<radialGradient id="k-glow"><stop stop-color="#FFD36B" stop-opacity=".55"/><stop offset="1" stop-color="#FFD36B" stop-opacity="0"/></radialGradient>`,
  'k-page': `<linearGradient id="k-page" gradientUnits="userSpaceOnUse" x1="131" y1="0" x2="161" y2="0"><stop stop-color="#E6CB98"/><stop offset=".45" stop-color="#FAEDCF"/><stop offset="1" stop-color="#FFFBF0"/></linearGradient>`,
  'k-mango': `<linearGradient id="k-mango" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#FFE36A"/><stop offset=".5" stop-color="#FFB838"/><stop offset="1" stop-color="#F2703A"/></linearGradient>`,
};

// The neckerchief: a triangle whose top edge tucks under the mane.
const SCARF = 'M103 168Q130 180 157 168L134.5 202Q130 208 125.5 202Z';
const CLIP_DEFS: Record<string, string> = {
  'k-scarf-clip': `<clipPath id="k-scarf-clip"><path d="${SCARF}"/></clipPath>`,
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

// A puffy ring, like a cloud: n points round a circle joined by arcs that
// bulge outward. `turn` (in lobes) puts a lobe at the top instead of a dip.
function puffs(c: P, r: number, n: number, turn = 0, bulge = 1): string {
  const at = (i: number): P => {
    const a = -Math.PI / 2 + ((i + turn) * 2 * Math.PI) / n;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  };
  const R = f(r * Math.sin(Math.PI / n) * bulge);
  let d = `M${pt(at(0))}`;
  for (let i = 1; i <= n; i++) d += `A${R} ${R} 0 0 1 ${pt(at(i))}`;
  return d + 'Z';
}

const dots = (pts: P[], r: number, fill: string, extra = '') =>
  pts.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}" ${extra}/>`).join('');

const stroke = (d: string, color: string, w: number, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// Parts ---------------------------------------------------------------------------

export type Eyes = 'open' | 'happy' | 'closed';
export type Mouth = 'smile' | 'open' | 'o' | 'wavy';
export type Prop = 'book' | 'plate' | 'heart' | 'mango' | 'kite' | 'chai';
export type Effect = 'sparkles' | 'hearts' | 'zzz' | 'thoughts' | 'sweat' | 'notes' | 'drops' | 'puffs' | 'butterfly';

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
  crest: [0.24, 0.1],
  maneBack: [-0.2, -0.1],
};

const ground = `
  <ellipse cx="130" cy="232" rx="76" ry="16" fill="url(#k-aura)"/>
  <ellipse cx="130" cy="234" rx="44" ry="7.5" fill="#3A1A06" opacity=".18"/>`;

// A thin tail curling up behind him, ending in a puff of mane.
const TAIL_CURVE: [P, P, P, P] = [[108, 218], [82, 231], [55, 221], [59, 193]];
const tail = `<path d="${taper(...TAIL_CURVE, 9, 6)}" fill="url(#k-foot)"/>`;
const tuft = `<path d="${puffs([59, 188], 6.5, 7, 0.5)}" fill="url(#k-tuft)"/>`;

// Bean feet poking out under his tummy, three toe lines each.
export const FOOT_L: P = [113, 222];
export const FOOT_R: P = [mirrorX(FOOT_L[0]), FOOT_L[1]];
const footL = `
  <ellipse cx="113" cy="227" rx="14.5" ry="8.5" fill="url(#k-foot)"/>
  ${stroke('M107.5 229.5v3M113 230v3.2M118.5 229.5v3', TOE, 1.5, 'opacity=".75"')}`;
const footR = mirror(footL);

// Body: a little round tummy, mostly hidden under the mane, with a cream
// belly and the bandhani neckerchief (tie-dye dots, the most Gujarati of
// textiles) peeking out under his chin.
function bandhani(): string {
  const out: string[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 99 + col * 9 + (row % 2) * 4.5;
      const y = 177 + row * 7;
      out.push(dots([[x, y - 1.2], [x - 1.2, y + 0.8], [x + 1.2, y + 0.8]], 0.8, '#FFF1DC'));
    }
  }
  return `<g clip-path="url(#k-scarf-clip)" opacity=".9">${out.join('')}</g>`;
}

const body = `
  <path d="M130 160C152 160 166 176 170 198C174 220 158 231 130 231C102 231 86 220 90 198C94 176 108 160 130 160Z" fill="url(#k-coat)"/>
  <ellipse cx="130" cy="212" rx="23" ry="15" fill="url(#k-cream)"/>
  <path d="${SCARF}" fill="url(#k-scarf)"/>
  ${bandhani()}`;

// Arms: short and chubby, a shoulder and an elbow, a round mitten of a paw.
// A soft shadow under each part keeps the arm apart from the tummy.
export const SHOULDER: P = [102, 184];
export const ELBOW: P = [94, 200];
export const PAW: P = [90, 214];
// Unit vector down the upper arm (the forearm slides along it to stretch).
const UP_LEN = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
const UP_DIR: P = [(ELBOW[0] - SHOULDER[0]) / UP_LEN, (ELBOW[1] - SHOULDER[1]) / UP_LEN];
const shaded = (d: string) => `<path d="${d}" fill="#D9862F" opacity=".3" transform="translate(1.6 1.4)"/><path d="${d}" fill="url(#k-limb)"/>`;
const upperArm = shaded(limb(SHOULDER, 9, ELBOW, 8.5));
const forearm = `
  ${shaded(limb(ELBOW, 8.5, PAW, 8.6))}
  <circle cx="${PAW[0]}" cy="${PAW[1]}" r="9.2" fill="url(#k-limb)"/>
  ${stroke(`M${PAW[0] - 4} ${PAW[1] + 4.6}l.4 2.6M${PAW[0]} ${PAW[1] + 5.6}v2.8M${PAW[0] + 4} ${PAW[1] + 4.6}l-.4 2.6`, TOE, 1.4, 'opacity=".75"')}`;

// Head: two puffy rings of mane, round ears poking out between them, a curl
// on top, and a broad soft face with cheek tufts and a little forelock.
const MANE_C: P = [130, 106];
const maneBack = `<path d="${puffs(MANE_C, 60, 13, 0.5)}" fill="url(#k-mane-back)"/>`;
const maneFront = `<path d="${puffs([130, 107], 52, 13)}" fill="url(#k-mane)"/>`;

const ear = `<g transform="translate(85 56) rotate(-40)">
  <ellipse rx="15" ry="14" fill="url(#k-ear)"/>
  <ellipse cy="-1.5" rx="8.4" ry="7.6" fill="#FFB9A6"/></g>`;

const crest = `<path d="M123 50C117 36 123 22 140 19C134 24 133.5 29.5 136.5 34.5C139 39.5 138 46 135 50Z" fill="url(#k-tuft)"/>`;

const FACE =
  'M130 68C160 68 180 86 180 110C180 120 178.5 128 175 135L182 140L171 143C163 153 148 158 130 158C112 158 97 153 89 143L78 140L85 135C81.5 128 80 120 80 110C80 86 100 68 130 68Z';
const FORELOCK = 'M113 71Q119 72 121.5 81Q125 74 130 84Q135 74 138.5 81Q141 72 147 71Q130 64 113 71Z';
const face = `
  <path d="${FACE}" fill="url(#k-coat)"/>
  <path d="${FORELOCK}" fill="url(#k-mane)"/>`;

// The puffy muzzle, with whisker dots.
const patches = `
  <ellipse cx="122.5" cy="140.5" rx="10" ry="8.5" fill="url(#k-cream)"/>
  <ellipse cx="137.5" cy="140.5" rx="10" ry="8.5" fill="url(#k-cream)"/>
  ${dots([[117, 138.5], [120, 143], [115, 143.5], [143, 138.5], [140, 143], [145, 143.5]], 0.9, '#E2A564')}`;

const blush = `<g fill="#FF8FA6" opacity=".5"><ellipse cx="94" cy="134" rx="8.5" ry="5.5"/><ellipse cx="166" cy="134" rx="8.5" ry="5.5"/></g>`;
const blushHot = `<g fill="#FF8FA6" opacity=".5"><ellipse cx="94" cy="134" rx="11" ry="7"/><ellipse cx="166" cy="134" rx="11" ry="7"/></g>`;

// Little round brows, level at rest; the clips tilt them for every mood.
const BROW_L: P = [108, 96];
const browL = `<path d="${limb([103, 96.2], 2.2, [113, 96.6], 2.2)}" fill="${BROW}"/>`;
const browR = mirror(browL);

// Big glossy eyes: dark, warming toward the bottom, one big highlight and
// one small, both lit from the upper left.
const EYE_Y = 116;
const EYE_L = 108;
const bead = (x: number) => `
  <g transform="translate(${x} ${EYE_Y})">
    <ellipse rx="11.5" ry="13.5" fill="${EYE}"/>
    <ellipse cy="6.2" rx="7.6" ry="5.2" fill="#8E4E1E" opacity=".8"/>
    <circle cx="-3.8" cy="-5.2" r="4.9" fill="#fff"/>
    <circle cx="4.4" cy="4.8" r="2" fill="#fff" opacity=".9"/>
  </g>`;

const happyEyes = stroke('M97.5 119Q108 106 118.5 119M141.5 119Q152 106 162.5 119', EYE, 4.6);
const closedEyes = stroke('M98 116Q108 123.5 118 116M142 116Q152 123.5 162 116', EYE, 4.2);
// Squeezed shut with glee: > <
const squeezeEyes = stroke('M101 108L115 116L101 124M159 108L145 116L159 124', EYE, 4.6);
// A happy arc for the winking eye.
const winkR = stroke('M141.5 119Q152 106 162.5 119', EYE, 4.6);

// A small rosy nose and a cat's w of a mouth.
const nose = `
  <path d="M123 129.5C123 126 137 126 137 129.5C137 133 133.5 136 130 137C126.5 136 123 133 123 129.5Z" fill="#9B4A3A"/>
  <ellipse cx="127" cy="129" rx="2.4" ry="1.1" fill="#fff" opacity=".6"/>
  ${stroke('M130 137V140', MOUTH, 2)}`;
const mouthSmile = stroke('M130 140Q127 144.5 122.5 142.5M130 140Q133 144.5 137.5 142.5', MOUTH, 2.2);
const mouthOpen = `
  <path d="M122 142Q130 145 138 142Q137 155 130 155Q123 155 122 142Z" fill="#5A1E0C"/>
  <path d="M125 151.5Q130 148 135 151.5Q133.5 155 130 155Q126.5 155 125 151.5Z" fill="#FF9DB0"/>`;
const mouthO = `<ellipse cx="130" cy="146" rx="3.6" ry="4.2" fill="#5A1E0C"/>`;
const mouthWavy = stroke('M121 146q2.25-2.6 4.5 0t4.5 0t4.5 0t4.5 0', MOUTH, 2.2);

// The book is held open low in front of his tummy, clear of the mane, so
// the pages (and the page he turns) can be seen.
const BOOK_Y = -2;
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
const PLATE: P = [139, 204];
const plate = `
  <ellipse cx="${PLATE[0]}" cy="${PLATE[1] + 2}" rx="20" ry="6" fill="#CFC3B2"/>
  <ellipse cx="${PLATE[0]}" cy="${PLATE[1]}" rx="20" ry="6.6" fill="#FFFFFF"/>
  <ellipse cx="${PLATE[0]}" cy="${PLATE[1] + 0.6}" rx="14.5" ry="4.2" fill="#EFE7DA"/>
  ${dhokla(PLATE[0] + 1, PLATE[1] - 5.5)}${dhokla(PLATE[0] + 10, PLATE[1] - 2.5)}`;
const PLATE_TOP: P = [PLATE[0] - 8, PLATE[1] - 2];
const plateTop = dhokla(PLATE_TOP[0], PLATE_TOP[1]);

// A big soft heart he hugs to his chest.
const hug = `<g transform="translate(130 200) scale(1.1)">
  <path d="M0 15C-27-1-18-23 0-12C18-23 27-1 0 15Z" fill="#FF8DB3"/>
  <path d="M0 12.5C-23-1.5-15.5-20 0-10C15.5-20 23-1.5 0 12.5Z" fill="#FFA6C6"/>
  <ellipse cx="-9" cy="-9" rx="4.2" ry="2.6" transform="rotate(-30 -9 -9)" fill="#FFE0EC" opacity=".85"/></g>`;

// A Gir Kesar mango, his namesake, with a leaf on the stem. Held in both
// paws in front of his tummy.
const MANGO: P = [130, 194];
const mango = `<g transform="translate(${MANGO[0]} ${MANGO[1]})">
  <path d="M-15 1C-17-10-7-17 3-16C13-15 18-6 16 4C14 13 4 17-4 14C-10 12-14 7-15 1Z" fill="url(#k-mango)"/>
  <ellipse cx="-6" cy="-8" rx="5" ry="2.8" transform="rotate(-30 -6 -8)" fill="#fff" opacity=".5"/>
  ${stroke('M2-16Q2.5-19.5 5-21', '#6B4A1E', 2)}
  <path d="M5-21C9-26 17-26 21-21C16-17.5 9-17 5-21Z" fill="#4FA35A"/>
  ${stroke('M7-21Q13-22 18-21', '#3B8446', 1)}</g>`;

// A patang for Uttarayan, high up to his left (clear of the speech bubble),
// on a string from his paw. The string turns on the paw, so swinging it
// keeps the end in his grip.
const KITE_HOLD: P = [86, 170];
const KITE: P = [26, 6];
const kiteString = `<path d="M${pt(KITE_HOLD)}Q${KITE[0] + 10} ${KITE[1] + 96} ${KITE[0]} ${KITE[1] + 20}" fill="none" stroke="#8A5A3A" stroke-width="1.1" opacity=".75"/>`;
const kiteSail = `<g transform="translate(${KITE[0]} ${KITE[1]}) scale(1.25)">
  <path d="M0-18L16 0L0 20L-16 0Z" fill="#E8344E"/>
  <path d="M0-18L16 0H0Z" fill="#FFC93C"/>
  <path d="M0-18V20M-16 0Q0-9 16 0" fill="none" stroke="#7A2230" stroke-width="1.2" opacity=".55"/>
  <path d="M0 18L-6 27H6Z" fill="#FFC93C"/></g>`;

// A cutting-chai glass, steaming, held up from his right paw.
const CHAI_PAW: P = [mirrorX(PAW[0]), PAW[1]];
const chaiGlass = `<g transform="translate(${CHAI_PAW[0]} ${CHAI_PAW[1] - 13})">
  <path d="M-7.5-10H7.5L5.8 9.5H-5.8Z" fill="#EAF6FA" opacity=".95"/>
  <path d="M-6.9-4.5H6.9L5.8 9.5H-5.8Z" fill="#B9672E"/>
  <path d="M-6.9-4.5H6.9L6.7-2.6H-6.7Z" fill="#E2A066"/>
  ${stroke('M-4.6-7.5L-3.6 6.5', '#fff', 1.4, 'opacity=".7"')}</g>`;
const wisp = (x: number) => stroke(`M${x} ${CHAI_PAW[1] - 26}q-3-4 0-7.5t0-7.5`, '#C9A27A', 2, 'opacity=".8"');

// Particles: a star, a heart, a dream squiggle, music notes.
const star = (fill: string) =>
  `<circle r="11" fill="url(#k-glow)"/><path d="m0-9 2.6 6.4L9 0 2.6 2.6 0 9-2.6 2.6-9 0l6.4-2.6Z" fill="${fill}"/>`;
const heart = `<path d="M0 5C-20-7-7-18 0-9 7-18 20-7 0 5Z" fill="#FF98BA"/>`;
const dream = stroke('M-5.5 -6h11L-5.5 6h11', '#C9A27A', 3);
const thought = (r: number) => `<circle r="${r}" fill="#EFD3A8"/>`;
const note = `<path d="M0 0v-19l13-3v17h-3v-12L3-15V0Z" fill="#C9A27A"/><ellipse cx="-2" rx="5" ry="3.5" fill="#C9A27A"/><ellipse cx="8" cy="-5" rx="5" ry="3.5" fill="#C9A27A"/>`;
const sweat = `<path d="M0-9C4.5-2 6.5 2 6.5 5.5A6.5 6.5 0 0 1-6.5 5.5C-6.5 2-4.5-2 0-9Z" fill="#A6DEF8"/><ellipse cx="-2" cy="3" rx="1.6" ry="2.6" fill="#fff" opacity=".8"/>`;
const at = (x: number, y: number, svg: string) => `<g transform="translate(${x} ${y})">${svg}</g>`;
const drop = `<g transform="scale(.7)">${sweat}</g>`;
const puff = `<path d="${puffs([0, 0], 5.5, 6)}" fill="#EAD6B6" opacity=".95"/>`;
// A butterfly: wings that flap (they fold toward the body) over a body.
const BFLY: P = [214, 56];
const wing = `
  <path d="M0-1C-3-11-15-14-15-5C-15 1-7 2 0-1Z" fill="#9B7BF2"/>
  <path d="M0 0C-3 7-11 11-12.5 5.5C-13 1.5-6 .5 0 0Z" fill="#C7AEFF"/>
  <circle cx="-9" cy="-6" r="2.2" fill="#FFE07A"/>`;
const wings = `${wing}<g transform="scale(-1 1)">${wing}</g>`;
const flyBody = `<ellipse rx="1.8" ry="5.5" fill="#3A2550"/>${stroke('M-.5-5Q-2-9-4-10.5M.5-5Q2-9 4-10.5', '#3A2550', 1)}`;

const fx = (effect: Effect, items: [string, number, number, string][]): RigNode[] =>
  items.map(([id, x, y, svg]) => ({ id, pivot: [x, y], svg: at(x, y, svg), when: { effect } }));

// The dhokla he's about to eat, pinched at the tips of his left paw.
const SNACK = dhokla(PAW[0] + 3, PAW[1] + 8.5, 0.95);

// What each paw can be holding: the dhokla on the left, the chai on the right
// (turning on the paw, so a clip can keep it upright).
const HELD: Record<'L' | 'R', RigNode[]> = {
  L: [{ id: 'snack', svg: SNACK, when: { prop: 'plate' } }],
  R: [
    {
      id: 'chai',
      pivot: CHAI_PAW,
      svg: chaiGlass,
      when: { prop: 'chai' },
      children: [
        { id: 'steam1', pivot: [CHAI_PAW[0] - 2.5, CHAI_PAW[1] - 26], svg: wisp(CHAI_PAW[0] - 2.5), opacity: 0 },
        { id: 'steam2', pivot: [CHAI_PAW[0] + 2.5, CHAI_PAW[1] - 26], svg: wisp(CHAI_PAW[0] + 2.5), opacity: 0 },
      ],
    },
  ],
};

// A copy of a part (and its children) that moves exactly like it.
const copy = (n: RigNode): RigNode => ({ id: `${n.id}Top`, follow: n.id, svg: n.svg, when: n.when, opacity: n.opacity, children: n.children?.map(copy) });

const arm = (side: 'L' | 'R'): RigNode => {
  const m = (svg: string) => (side === 'R' ? mirror(svg) : svg);
  const px = (p: P): P => (side === 'R' ? [mirrorX(p[0]), p[1]] : p);
  return {
    id: `arm${side}`,
    pivot: px(SHOULDER),
    svg: m(upperArm),
    children: [{ id: `fore${side}`, pivot: px(ELBOW), svg: m(forearm), children: HELD[side] }],
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
      children: HELD[side].map(copy),
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
        { id: 'tail', pivot: TAIL_CURVE[0], svg: tail, children: [{ id: 'tuft', pivot: [59, 195], svg: tuft }] },
        { id: 'body', pivot: [130, 222], svg: body },
        { id: 'legL', pivot: FOOT_L, svg: footL },
        { id: 'legR', pivot: FOOT_R, svg: footR },
        { id: 'book', svg: book, when: { prop: 'book' }, children: [{ id: 'page', pivot: PAGE_PIVOT, svg: page }] },
        { id: 'plate', svg: plate, when: { prop: 'plate' }, children: [{ id: 'plateTop', pivot: PLATE_TOP, svg: plateTop }] },
        { id: 'hug', pivot: [130, 202], svg: hug, when: { prop: 'heart' } },
        { id: 'mango', pivot: MANGO, svg: mango, when: { prop: 'mango' } },
        arm('L'),
        arm('R'),
        {
          id: 'head',
          pivot: [130, 170],
          children: [
            { id: 'maneBack', pivot: MANE_C, svg: maneBack },
            { id: 'earL', pivot: [95, 68], svg: ear },
            { id: 'earR', pivot: [165, 68], svg: mirror(ear) },
            { id: 'mane', pivot: MANE_C, svg: maneFront },
            { id: 'crest', pivot: [129, 50], svg: crest },
            { id: 'face', svg: face },
            {
              id: 'features',
              children: [
                { id: 'patches', svg: patches },
                { id: 'blush', svg: blush },
                { id: 'blushHot', svg: blushHot, opacity: 0 },
                { id: 'browL', pivot: BROW_L, svg: browL },
                { id: 'browR', pivot: [mirrorX(BROW_L[0]), BROW_L[1]], svg: browR },
                {
                  id: 'gaze',
                  when: { eyes: ['open'] },
                  children: [
                    { id: 'eyeL', pivot: [EYE_L, EYE_Y], svg: bead(EYE_L) },
                    { id: 'eyeR', pivot: [mirrorX(EYE_L), EYE_Y], svg: bead(mirrorX(EYE_L)) },
                    { id: 'winkR', pivot: [mirrorX(EYE_L), EYE_Y], svg: winkR, opacity: 0 },
                    // Other eyes a clip can cut to and back (see eyesTo).
                    { id: 'shutEyes', svg: closedEyes, opacity: 0 },
                    { id: 'joyEyes', svg: happyEyes, opacity: 0 },
                    { id: 'squint', svg: squeezeEyes, opacity: 0 },
                  ],
                },
                { id: 'eyesHappy', svg: happyEyes, when: { eyes: ['happy'] } },
                { id: 'eyesSqueeze', svg: squeezeEyes, when: { eyes: ['happy'] }, opacity: 0 },
                { id: 'eyesClosed', svg: closedEyes, when: { eyes: ['closed'] } },
                { id: 'nose', svg: nose },
                { id: 'mouthSmile', svg: mouthSmile, when: { mouth: ['smile'] } },
                { id: 'mouthOpen', pivot: [130, 143], svg: mouthOpen, when: { mouth: ['open'] } },
                { id: 'mouthO', pivot: [130, 146], svg: mouthO, when: { mouth: ['o'] } },
                { id: 'mouthWavy', svg: mouthWavy, when: { mouth: ['wavy'] } },
                // Other mouths a clip can cut to from a smile (see mouthTo);
                // the inner part takes the clip's scaling.
                { id: 'gape', opacity: 0, when: { mouth: ['smile'] }, children: [{ id: 'gapeIn', pivot: [130, 143], svg: mouthOpen }] },
                { id: 'ooh', opacity: 0, when: { mouth: ['smile'] }, children: [{ id: 'oohIn', pivot: [130, 146], svg: mouthO }] },
              ],
            },
          ],
        },
        armTop('L'),
        armTop('R'),
      ],
    },
    {
      id: 'kite',
      pivot: KITE_HOLD,
      svg: kiteString,
      when: { prop: 'kite' },
      children: [{ id: 'kiteSail', pivot: KITE, svg: kiteSail }],
    },
    ...fx('sparkles', [
      ['fx1', 38, 112, star('#F5B127')],
      ['fx2', 222, 128, star('#F08A2A')],
      ['fx3', 52, 40, star('#F08A2A')],
      ['fx4', 208, 34, star('#F5B127')],
    ]),
    ...fx('hearts', [
      ['fx1', 38, 112, heart],
      ['fx2', 222, 128, heart],
      ['fx3', 52, 40, heart],
    ]),
    ...fx('zzz', [
      ['fx1', 216, 72, dream],
      ['fx2', 230, 52, dream],
      ['fx3', 244, 32, dream],
    ]),
    ...fx('thoughts', [
      ['fx1', 212, 74, thought(3)],
      ['fx2', 222, 58, thought(4.2)],
      ['fx3', 233, 40, thought(5.4)],
    ]),
    ...fx('sweat', [['fx1', 212, 100, sweat]]),
    ...fx('notes', [
      ['fx1', 36, 70, note],
      ['fx2', 220, 104, note],
    ]),
    ...fx('drops', [
      ['fx1', 58, 100, drop],
      ['fx2', 202, 100, drop],
      ['fx3', 76, 50, drop],
      ['fx4', 184, 50, drop],
    ]),
    ...fx('puffs', [
      ['fx1', 114, 148, puff],
      ['fx2', 146, 148, puff],
      ['fx3', 130, 160, puff],
    ]),
    {
      id: 'fly',
      pivot: BFLY,
      when: { effect: 'butterfly' },
      children: [
        { id: 'wings', pivot: BFLY, svg: at(...BFLY, wings) },
        { id: 'flyBody', svg: at(...BFLY, flyBody) },
      ],
    },
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

export type Pose =
  | 'idle' | 'wave' | 'cheer' | 'read' | 'eat' | 'think' | 'oops' | 'nod' | 'sleep' | 'dance' | 'love'
  | 'shy' | 'giggle' | 'stretch' | 'roar' | 'spin' | 'pounce' | 'groom' | 'sneeze' | 'shake' | 'clap'
  | 'namaste' | 'flex' | 'wink' | 'sing' | 'hiccup' | 'mango' | 'kite' | 'chai' | 'butterfly' | 'pout';

// Arm posing by target: say where the paw should be and the shoulder and
// elbow angles are solved (two-bone IK), always bending the elbow outward.
const ARM_L1 = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
const ARM_L2 = Math.hypot(PAW[0] - ELBOW[0], PAW[1] - ELBOW[1]);
const DEF_UPPER = Math.atan2(ELBOW[1] - SHOULDER[1], ELBOW[0] - SHOULDER[0]);
const DEF_FORE = Math.atan2(PAW[1] - ELBOW[1], PAW[0] - ELBOW[0]);
const toDeg = (r: number) => (r * 180) / Math.PI;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

// A paw just out of reach stretches the arm a little: the forearm slides
// down the upper arm, up to this far.
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
  const onFace = (e: P) => ((e[0] - 130) / 52) ** 2 + ((e[1] - 113) / 47) ** 2 < 1;
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
const REST_L: P = [87, 212.6];
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
// A sparkle: pops in, drifts up, fades.
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
const CHEER_PAWS: P[] = [REST_L, REST_L, [84, 219], [68, 150], [74, 168], [69, 154], [82, 200], REST_L, REST_L];

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

// Change his eyes partway through a clip whose face has them open, cutting
// straight from one to the next: shut (content), joy (^ ^), squint (> <), or
// a wink with the right eye.
type EyeState = 'open' | 'shut' | 'joy' | 'squint' | 'wink';
const EYE_PARTS: Record<string, (s: EyeState) => number> = {
  eyeL: (s) => +(s === 'open' || s === 'wink'),
  eyeR: (s) => +(s === 'open'),
  winkR: (s) => +(s === 'wink'),
  shutEyes: (s) => +(s === 'shut'),
  joyEyes: (s) => +(s === 'joy'),
  squint: (s) => +(s === 'squint'),
};
function eyesTo(steps: [number, EyeState][]): Record<string, Track> {
  return Object.fromEntries(
    Object.entries(EYE_PARTS).map(([id, on]) => [id, cut(on('open'), steps.map(([t, s]) => [t, on(s)]))]),
  );
}
// The same for the mouth, from a smile: gape (wide open) or ooh (a small o).
type MouthState = 'smile' | 'gape' | 'ooh';
function mouthTo(steps: [number, MouthState][]): Record<string, Track> {
  const parts: [string, MouthState][] = [['mouthSmile', 'smile'], ['gape', 'gape'], ['ooh', 'ooh']];
  return Object.fromEntries(parts.map(([id, m]) => [id, cut(+(m === 'smile'), steps.map(([t, s]) => [t, +(s === m)]))]));
}
const clamp = (v: number, lo: number, hi: number) => +Math.max(lo, Math.min(hi, v)).toFixed(2);
const neg = (v: number[]) => v.map((n) => -n);

// Idle: a curious head tilt that holds, a glance, a weight shift.
const IDLE_AT = [0, 0.2, 0.29, 0.39, 0.48, 0.57, 0.66, 0.76, 1];
// Wave: the elbow parked out by his side (a little stretched so the paw
// reaches past his cheek), the paw on a circle round it.
const WAVE_ELBOW: P = [178, 171];
const WAVE = (deg: number): Target => [
  WAVE_ELBOW[0] + ARM_L2 * Math.cos((deg * Math.PI) / 180),
  WAVE_ELBOW[1] + ARM_L2 * Math.sin((deg * Math.PI) / 180),
  Math.hypot(WAVE_ELBOW[0] - mirrorX(SHOULDER[0]), WAVE_ELBOW[1] - SHOULDER[1]) - ARM_L1,
];
const WAVE_ROOT: Track = { at: [0, 0.07, 0.18, 0.78, 0.88, 1], y: [0, 1, -3, -3, 1, 0], rotate: [0, 0.5, -3, -3, 1, 0] };
const THINK_CHIN: P = [146, 161];
// Each paw rolls round a loop twice per bar: up and out, down across his
// chest, low by his side, back up the outside. The paws are half a loop apart.
const DANCE_AT = [0, 0.25, 0.5, 0.75, 1];
const DANCE_PAWS: P[] = [[70, 153], [110, 208], [70, 153], [110, 208], [70, 153]];
const DANCE_ROOT: Track = { x: [-4, 0, 4, 0, -4], rotate: [-5, 0, 5, 0, -5], y: [0, -4, 0, -4, 0] };
const LOVE_ROOT: Track = { at: [0, 0.22, 0.4, 0.7, 1], y: [0, -3, -4.5, -3, 0], sx: [1, 1.02, 1.035, 1.02, 1], sy: [1, 1.025, 1.04, 1.025, 1] };
const OOPS_ROOT: Track = { at: [0, 0.1, 0.3, 1], y: [0, 3, 0, 0], sx: [1, 1.05, 1, 1], sy: [1, 0.94, 1, 1] };
const EAT_PICK: P = [127, 192];
const EAT_MOUTH: P = [125, 154];
const IDLE_ROOT: Track = { at: [0, 0.22, 0.3, 0.4, 0.49, 0.58, 0.66, 0.76, 1], x: [0, 0, 2, 2, 0, -1, -1, 0, 0], rotate: [0, 0, 1.8, 1.8, 0, -1, -1, 0, 0] };

const SHY_AT = [0, 0.12, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9, 1];
const SHY_ROOT: Track = { at: SHY_AT, x: [0, -1.5, -2, -1.5, -2, -1.5, -2, -1, 0], rotate: [0, -2, -2.5, -2, -2.5, -2, -2.5, -1, 0] };
const SHY_PAWS: P[] = [REST_L, [117, 205], [119, 203], [117, 205], [119, 203], [117, 205], [119, 203], [110, 208], REST_L];
const SHY_LOOK = [0, 0.14, 0.42, 0.48, 0.58, 0.64, 0.86, 1];

const GIG_AT = [0, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.84, 1];
const GIG_ROOT: Track = { at: GIG_AT, y: [0, 1, -1.5, 0.5, -1.5, 0.5, -1.5, 0.5, -1, 0, 0], rotate: [0, 0, -1.5, 1.5, -1.5, 1.5, -1.5, 1.5, -1, 0, 0] };
const GIG_PAWS: P[] = [REST_L, [124, 155], [124, 152], [124, 155], [124, 152], [124, 155], [124, 152], [124, 155], [124, 154], [108, 190], REST_L];
const GIG_SQ: [number, number][] = [[0.22, 1], [0.3, 0], [0.38, 1], [0.46, 0], [0.54, 1], [0.62, 0]];

const STR_AT = [0, 0.12, 0.3, 0.5, 0.62, 0.7, 0.76, 0.82, 0.88, 1];
const STR_ROOT: Track = {
  at: STR_AT,
  y: [0, 2, -3, -4, -3, 0, 0, 0, 0, 0],
  sx: [1, 1.04, 0.96, 0.95, 0.96, 1.02, 1, 1, 1, 1],
  sy: [1, 0.95, 1.06, 1.07, 1.06, 0.98, 1, 1, 1, 1],
  rotate: [0, 0, 0, 0, 0, 0, 2, -2, 1, 0],
};
const STR_PAWS: P[] = [REST_L, [86, 216], [68, 168], [66, 163], [68, 168], [84, 204], nudge(REST_L, -1, 0), nudge(REST_L, 1, 0), REST_L, REST_L];

const ROAR_AT = [0, 0.14, 0.24, 0.3, 0.38, 0.46, 0.54, 0.62, 0.74, 0.88, 1];
const ROAR_ROOT: Track = {
  at: ROAR_AT,
  y: [0, 3, -3, -3, -3, -3, -2, 0, 0, 0, 0],
  sx: [1, 1.06, 0.97, 0.97, 0.97, 0.97, 0.98, 1, 1, 1, 1],
  sy: [1, 0.92, 1.06, 1.05, 1.06, 1.05, 1.04, 1, 1, 1, 1],
};
const ROAR_PAWS: P[] = [REST_L, [82, 198], [72, 168], [70, 165], [72, 168], [70, 165], [74, 172], [98, 202], [116, 205], [117, 203], REST_L];
const ROAR_BIG = [1, 1, 1.06, 1.06, 1.06, 1.06, 1.04, 1, 1, 1, 1];
const ROAR_MANE = [1, 0.98, 1.06, 1.05, 1.06, 1.05, 1.03, 1, 1, 1, 1];

const SPIN_AT = [0, 0.12, 0.22, 0.4, 0.58, 0.68, 0.8, 1];
const SPIN_ROOT: Track = { at: SPIN_AT, y: [0, 3, -14, -18, -14, 2, 0, 0], sx: [1, 1.07, 0.97, 0.98, 0.97, 1.07, 1, 1], sy: [1, 0.92, 1.05, 1.03, 1.05, 0.93, 1, 1] };
const SPIN_PAWS: P[] = [REST_L, [84, 218], [72, 186], [70, 182], [72, 186], [84, 216], REST_L, REST_L];
const SPIN_LEG = [0, 0, 14, 16, 14, 0, 0, 0];

// Pounce: crouch, wiggle, leap at you, pin it.
const POUNCE_AT = [0, 0.1, 0.17, 0.24, 0.31, 0.38, 0.44, 0.52, 0.6, 0.67, 0.76, 0.88, 1];
const POUNCE_ROOT: Track = {
  at: POUNCE_AT,
  y: [0, 3, 3, 3, 3, 3, 4, -22, -16, 3, 0, 0, 0],
  rotate: [0, 0, 3, -3, 3, -3, 0, 0, 0, 0, 0, 0, 0],
  sx: [1, 1.06, 1.06, 1.06, 1.06, 1.06, 1.08, 1.06, 1.1, 1.14, 1.04, 1, 1],
  sy: [1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.87, 1.12, 1.1, 0.96, 1.02, 1, 1],
};
const POUNCE_PAWS: P[] = [REST_L, [97, 222], [97, 222], [97, 222], [97, 222], [97, 222], [98, 223], [72, 168], [74, 170], [94, 224], [96, 222], REST_L, REST_L];
const POUNCE_EYES = [1, 1.14, 1.14, 1.14, 1.14, 1.14, 1.16, 1.1, 1.1, 1, 1, 1, 1];
// Feet planted through the crouch, off the ground in the leap.
const POUNCE_FEET = feet(POUNCE_ROOT);
for (const leg of Object.values(POUNCE_FEET)) for (const i of [7, 8]) [leg.x![i], leg.y![i], leg.rotate![i]] = [0, 0, 0];

const GROOM_AT = [0, 0.1, 0.16, 0.22, 0.28, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74, 0.84, 1];

const SNZ_AT = [0, 0.12, 0.24, 0.34, 0.41, 0.45, 0.5, 0.6, 0.68, 0.76, 0.84, 1];
const SNZ_ROOT: Track = {
  at: SNZ_AT,
  y: [0, 0, -1, -2, -2.5, 3, 1, 0, 0, 0, 0, 0],
  sx: [1, 1, 0.99, 0.98, 0.98, 1.06, 1, 1, 1, 1, 1, 1],
  sy: [1, 1, 1.02, 1.03, 1.03, 0.92, 1, 1, 1, 1, 1, 1],
};
const SNZ_PAWS: P[] = [REST_L, REST_L, [96, 202], [100, 197], [101, 196], [80, 192], [86, 206], REST_L, REST_L, REST_L, REST_L, REST_L];
const SNZ_BROW = [0, -4, -8, -12, -14, 10, 6, 0, 0, 0, 0, 0];
const SNZ_EAR = [0, 0, -4, -6, -8, -24, -10, 6, -4, 0, 0, 0];
// A puff of sneeze: bursts out of his mouth and spreads.
const snzPuff = (dx: number, dy: number): Track => ({
  at: [0, 0.44, 0.48, 0.72, 1],
  opacity: [0, 0, 0.95, 0, 0],
  sx: [0.2, 0.2, 0.7, 1.5, 1.5],
  sy: [0.2, 0.2, 0.7, 1.5, 1.5],
  x: [0, 0, dx / 4, dx, dx],
  y: [0, 0, dy / 4, dy, dy],
});

const SHAKE_AT = [0, 0.1, 0.16, 0.22, 0.28, 0.34, 0.4, 0.46, 0.52, 0.58, 0.66, 0.76, 0.88, 1];
const SHAKE_ROOT: Track = { at: SHAKE_AT, rotate: [0, 0, -2.5, 2.5, -2.5, 2.5, -2, 2, -1.5, 1, 0, 0, 0, 0] };
const SHAKE_EARS = [0, 2, -16, 16, -16, 16, -14, 12, -8, 4, 0, 0, 0, 0];
const SHAKE_PAWS = SHAKE_AT.map((_, i): P => (i > 1 && i < 10 ? nudge(REST_L, i % 2 ? -1.6 : 1.6, 0) : REST_L));
// The mane springs out once he's done, and settles.
const FLUFF = (k: number) => [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 + 0.09 * k, 1 - 0.03 * k, 1 + 0.02 * k, 1];
// A drop flung off his mane: out, up, then falling.
const fling = (start: number, dx: number): Track => ({
  at: [0, start, start + 0.06, start + 0.3, 1],
  opacity: [0, 0, 1, 0, 0],
  x: [0, 0, dx / 5, dx, dx],
  y: [0, 0, -5, 9, 9],
});

const CLAP_AT = [0, 0.1, 0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74, 0.86, 1];
const CLAP_PAWS: P[] = [REST_L, [106, 186], [121, 188], [106, 184], [121, 188], [106, 184], [121, 188], [106, 184], [121, 188], [110, 192], REST_L, REST_L];
const CLAP_ROOT: Track = { at: CLAP_AT, y: [0, -1, 1, -2, 1, -2, 1, -2, 1, 0, 0, 0], sy: [1, 1, 0.97, 1.01, 0.97, 1.01, 0.97, 1.01, 0.97, 1, 1, 1] };
const CLAP_SQ: [number, number][] = [[0.18, 1], [0.22, 0], [0.34, 1], [0.38, 0], [0.5, 1], [0.54, 0], [0.66, 1], [0.7, 0]];

const NAM_AT = [0, 0.14, 0.26, 0.36, 0.5, 0.62, 0.72, 0.86, 1];
const NAM_PAWS: P[] = [REST_L, [110, 198], [124, 182], [124, 182], [124, 183], [124, 182], [124, 182], [110, 198], REST_L];
const NAM_ROOT: Track = { at: NAM_AT, y: [0, 0, 0, 1, 1, 1, 0, 0, 0], sy: [1, 1, 1, 0.97, 0.97, 0.97, 1, 1, 1] };

// Flex: elbow out at his side as in a wave, the paw curling up by his ear.
const FLEX_AT = [0, 0.14, 0.26, 0.36, 0.46, 0.56, 0.66, 0.8, 1];
const FLEX_R: Target[] = [REST_R, [176, 200], WAVE(-90), WAVE(-125), WAVE(-90), WAVE(-125), WAVE(-90), [176, 200], REST_R];
const FLEX_L: P[] = [REST_L, [96, 203], [96, 202], [96, 202], [96, 202], [96, 202], [96, 202], [96, 203], REST_L];
const twinkle = (times: number[], x: number, y: number): Track => ({
  at: [0, ...times.flatMap((t) => [t, t + 0.04, t + 0.1]), 1],
  x: [x],
  y: [y],
  opacity: [0, ...times.flatMap(() => [0, 1, 0]), 0],
  sx: [0.3, ...times.flatMap(() => [0.3, 1.1, 0.5]), 0.5],
  sy: [0.3, ...times.flatMap(() => [0.3, 1.1, 0.5]), 0.5],
  rotate: [0, ...times.flatMap(() => [0, 20, 60]), 60],
});
const NO_FX = { fx1: { opacity: [0] }, fx2: { opacity: [0] }, fx3: { opacity: [0] }, fx4: { opacity: [0] } };

// Wink: a finger-gun paw that comes at you (scaled up, as if nearer).
const WINK_AT = [0, 0.16, 0.3, 0.44, 0.6, 0.74, 1];
const WINK_ARM = reach('R', [REST_R, [170, 196], [180, 182], [180, 182], [180, 182], [170, 198], REST_R], WINK_AT);
WINK_ARM.foreR = { ...WINK_ARM.foreR, sx: [1, 1, 1.15, 1.18, 1.15, 1, 1], sy: [1, 1, 1.15, 1.18, 1.15, 1, 1] };

const SING_AT = [0, 0.25, 0.5, 0.75, 1];
const SING_ROOT: Track = { at: SING_AT, rotate: [-2.5, 0, 2.5, 0, -2.5], x: [-1, 0, 1, 0, -1], y: [0, -1.5, 0, -1.5, 0] };

const HIC_AT = [0, 0.16, 0.2, 0.26, 0.42, 0.5, 0.54, 0.6, 0.72, 0.78, 0.82, 0.88, 1];
const HIC_ROOT: Track = {
  at: HIC_AT,
  y: [0, 0, -9, 0, 0, 0, -9, 0, 0, 0, -10, 0, 0],
  sx: [1, 1, 0.96, 1.04, 1, 1, 0.96, 1.04, 1, 1, 0.95, 1.05, 1],
  sy: [1, 1, 1.06, 0.95, 1, 1, 1.06, 0.95, 1, 1, 1.07, 0.94, 1],
};
const HIC_PAWS: P[] = [REST_L, [116, 207], [114, 200], [116, 207], [116, 207], [116, 207], [114, 200], [116, 207], [116, 207], [116, 207], [114, 199], [116, 207], REST_L];
const HIC_EYES = [1, 1, 1.16, 1.05, 1, 1, 1.16, 1.05, 1, 1, 1.18, 1.05, 1];
const HIC_BROW = [0, 0, -6, -4, -8, -8, -6, -4, -8, -8, -6, -4, 0];
const HIC_EAR = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0];

const MANGO_AT = [0, 0.12, 0.24, 0.36, 0.48, 0.58, 0.68, 0.78, 0.9, 1];
const MANGO_Y = [0, -14, -16, -14, 0, 0, 0, 0, 0, 0];
const MANGO_PAWS: P[] = MANGO_Y.map((y, i) => [114 + (i > 4 && i < 9 ? i % 2 : 0), 196 + y]);

const KITE_AT = [0, 0.14, 0.26, 0.4, 0.52, 0.62, 0.72, 0.84, 1];
const KITE_TUG = [0, 1, 0, 1, 0, 0, 0, 0, 0];

// Chai: blow on it, sip, aah. The glass turns against the arm to stay
// upright, tipping only toward his mouth.
const CHAI_AT = [0, 0.08, 0.2, 0.3, 0.4, 0.5, 0.6, 0.72, 0.86, 1];
const CHAI_ARM = reach('R', [[156, 200], [156, 200], [156, 200], [140, 160], [138, 157], [138, 158], [152, 190], [156, 200], [156, 200], [156, 200]], CHAI_AT);
const CHAI_TILT = [0, 0, 0, -18, -26, -22, -6, 0, 0, 0].map((t, i) => +(t - CHAI_ARM.armR.rotate![i] - CHAI_ARM.foreR.rotate![i]).toFixed(2));

// Butterfly: it loops over his head, lands on his nose (he goes cross-eyed)
// and flies off. His eyes and head follow it the whole way.
const FLY_AT = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.56, 0.62, 0.78, 0.86, 0.94, 1];
const FLY_X = [0, -50, -120, -168, -150, -100, -84, -84, -84, -60, -20, 0];
const FLY_Y = [0, -40, -50, -10, 40, 50, 72, 74, 74, 40, -10, 0];
const FLY_DX = FLY_X.map((x) => BFLY[0] + x - 130);
const FLY_DY = FLY_Y.map((y) => BFLY[1] + y - 116);
// Wings beat fast in the air and slowly while it rests on his nose.
const FLAP: Track = (() => {
  const at = [0];
  const sx = [1];
  for (let t = 0; t < 1; ) {
    t = Math.min(1, +(t + (t >= 0.62 && t < 0.78 ? 0.04 : 0.0125)).toFixed(4));
    at.push(t);
    sx.push(sx.length % 2 ? 0.25 : 1);
  }
  sx[sx.length - 1] = 1;
  return { at, sx };
})();
const CROSS = [0, 0, 0, 0, 0, 0, 1, 2.6, 2.6, 0, 0, 0];

const POUT_AT = [0, 0.12, 0.22, 0.4, 0.48, 0.56, 0.66, 0.76, 0.86, 1];
// Arms folded: each paw tucks in on the other side of his chest.
const POUT_PAWS: P[] = [REST_L, [120, 200], [138, 197], [138, 197], [138, 197], [138, 197], [138, 197], [112, 204], REST_L, REST_L];
const POUT_BROW = [0, 12, 14, 14, 8, 14, 0, -4, 0, 0];
const POUT_EAR = [0, -8, -10, -10, -4, -10, 0, 4, 0, 0];

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
      crest: { at: IDLE_AT, rotate: [0, 0, 4, 3, 0, -3, -2, 0, 0] },
      earL: { at: [0, 0.62, 0.65, 0.68, 0.71, 1], rotate: [0, 0, -14, 5, 0, 0] },
      earR: { at: [0, 0.65, 0.68, 0.71, 0.74, 1], rotate: [0, 0, 11, -4, 0, 0] },
    },
  },
  // Hello: arm up, wave three times, a wink in the middle.
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
        [REST_R, [172, 213], WAVE(-80), WAVE(-44), WAVE(-92), WAVE(-46), WAVE(-92), WAVE(-46), WAVE(-86), REST_R],
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
      earR: { at: [0, 0.24, 0.32, 1], rotate: [0, 0, 10, 0] },
    },
  },
  // Cheer: crouch, launch, hang, land, a smaller rebound.
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
      ...reach('L', [[98.5, 199], [98.5, 199], [98, 200], [98.5, 199]], [0, 0.6, 0.72, 1]),
      ...reach('R', [[161.5, 199], [161.5, 199], [159, 200], [150, 191], [140, 190], [161.5, 199], [161.5, 199]], [0, 0.5, 0.56, 0.62, 0.68, 0.84, 1]),
      page: { at: [0, 0.57, 0.6, 0.69, 0.78, 0.83, 1], sx: [1, 1, 1, 0, -1, -1, -1], y: [0, 0, 0, -3, 0, 0, 0], opacity: [0, 0, 1, 1, 1, 0, 0] },
      head: { at: [0, 0.25, 0.5, 0.62, 0.8, 1], rotate: [1, 2.5, 1, -2, 1, 1], y: [3, 4, 3, 2, 3, 3] },
      gaze: { at: [0, 0.3, 0.45, 0.6, 1], x: [-2, 1, 2, -2, -2] },
      browL: { at: [0, 0.3, 0.38, 0.5, 1], y: [0, 0, -3, 0, 0] },
      browR: { at: [0, 0.3, 0.38, 0.5, 1], y: [0, 0, -3, 0, 0] },
      tail: { rotate: [0, 5, 0, -4, 0] },
      tuft: { rotate: [4, -3, -6, 3, 4] },
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
      ...reach('L', [REST_L, [84, 215], EAT_PICK, [123, 184], EAT_MOUTH, EAT_MOUTH, [110, 182], REST_L, REST_L], [0, 0.07, 0.19, 0.25, 0.34, 0.42, 0.52, 0.66, 1]),
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
    },
  },
  // Ponder: paw to chin, head tilted, one brow up, eyes searching.
  think: {
    ms: 5600,
    loop: true,
    face: { eyes: 'open', mouth: 'smile', look: [0, -2] },
    effect: 'thoughts',
    front: ['armRTop'],
    tracks: {
      // Paw under his chin, elbow out, tapping twice while he ponders.
      ...reach('R', [THINK_CHIN, THINK_CHIN, [147.5, 164.5], THINK_CHIN, [147.5, 164.5], THINK_CHIN], [0, 0.35, 0.43, 0.51, 0.59, 1]),
      ...reach('L', [[87, 213], [87.4, 212.4], [87, 213]]),
      head: { at: [0, 0.35, 0.65, 0.8, 1], rotate: [7, 11, 11, 4, 7], y: [0, 2, 2, 0, 0] },
      gaze: { at: [0, 0.35, 0.65, 1], x: [2, -2, -2, 2], y: [-1, -0.5, -0.5, -1] },
      browR: { y: [-2.6], rotate: [-6] },
      browL: { at: [0, 0.35, 0.65, 1], y: [-1.8, -1.3, -1.3, -1.8], rotate: [2, 4, 4, 2] },
      tail: { rotate: [0, 6, 0] },
      tuft: { rotate: [4, -4, 4] },
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
      tail: { at: [0, 0.1, 0.4, 1], rotate: [0, 14, 6, 0] },
      fx1: { at: [0, 0.15, 0.7, 1], y: [-4, 0, 9, 13], opacity: [0, 1, 1, 0] },
    },
  },
  // Two quick nods with happy eyes; brows bounce, the curl and tail catch up.
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
      earL: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, 6, -6, 4, 0] },
      earR: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, -6, 6, -4, 0] },
      tail: { at: [0, 0.3, 0.55, 0.8, 1], rotate: [0, 14, -4, 10, 0] },
      tuft: { at: [0, 0.38, 0.62, 0.88, 1], rotate: [0, -12, 6, -8, 0] },
    },
  },
  // Nap: head lowered, relaxed eyes, no brows, a little snore.
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
      crest: { rotate: [-6, -10, 6, 10, -6] },
      fx1: rise(0, 20, -6),
      fx2: rise(1, 20, 6),
    },
  },
  // Heart-hug: lifts up, tilts in, paws to his chest, blushing.
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
      fx1: { at: [0, 0.08, 0.24, 0.42, 0.9, 1], y: [22, 22, 0, 0, -36, -36], x: [0, 0, 0, 0, -9, -9], opacity: [0, 0, 0.95, 0.95, 0, 0], sx: [0.3, 0.3, 1, 1, 0.75, 0.75], sy: [0.3, 0.3, 1, 1, 0.75, 0.75] },
      fx2: { at: [0, 0.16, 0.32, 0.5, 0.98, 1], y: [22, 22, 0, 0, -36, -36], x: [0, 0, 0, 0, 9, 9], opacity: [0, 0, 0.95, 0.95, 0, 0], sx: [0.3, 0.3, 1, 1, 0.75, 0.75], sy: [0.3, 0.3, 1, 1, 0.75, 0.75] },
      fx3: { at: [0, 0.24, 0.4, 0.58, 1], y: [22, 22, 0, 0, -30], x: [0, 0, 0, 0, -6], opacity: [0, 0, 0.95, 0.95, 0], sx: [0.3, 0.3, 1, 1, 0.8], sy: [0.3, 0.3, 1, 1, 0.8] },
    },
  },

  // Just for fun -------------------------------------------------------------------

  // Shy: looks down and away, blushing, scuffing a foot; one peek up at you.
  shy: {
    ms: 2800,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    tracks: {
      ...reach('L', SHY_PAWS, SHY_AT),
      ...reach('R', SHY_PAWS.map(mx), SHY_AT),
      root: SHY_ROOT,
      ...feet(SHY_ROOT, {}, { rotate: [0, 0, -14, 6, -14, 6, -10, 0, 0], y: [0, 0, -2, 0, -2, 0, -1.5, 0, 0] }),
      shadow: plant(SHY_ROOT, RIG_PIVOT),
      head: { at: SHY_LOOK, rotate: [0, -9, -9, -3, -3, -9, -9, 0], y: [0, 3, 3, 1, 1, 3, 3, 0] },
      gaze: { at: SHY_LOOK, x: [0, -3, -3, 0.5, 0.5, -3, -3, 0], y: [0, 3, 3, -0.5, -0.5, 3, 3, 0] },
      blushHot: { at: [0, 0.14, 0.86, 1], opacity: [0, 1, 1, 0] },
      browL: { at: [0, 0.14, 0.86, 1], rotate: [0, -10, -10, 0], y: [0, -1.5, -1.5, 0] },
      browR: { at: [0, 0.14, 0.86, 1], rotate: [0, 10, 10, 0], y: [0, -1.5, -1.5, 0] },
      earL: { at: [0, 0.14, 0.86, 1], rotate: [0, -10, -10, 0] },
      earR: { at: [0, 0.14, 0.86, 1], rotate: [0, 10, 10, 0] },
      tail: { at: SHY_AT, rotate: [0, 12, 16, 12, 16, 12, 16, 8, 0] },
      tuft: { at: SHY_AT, rotate: [0, -6, 4, -6, 4, -6, 4, 0, 0] },
    },
  },
  // Giggle: paws over his mouth, shoulders shaking, eyes squeezed.
  giggle: {
    ms: 1900,
    loop: false,
    face: { eyes: 'happy', mouth: 'open' },
    front: ['armLTop', 'armRTop'],
    tracks: {
      ...reach('L', GIG_PAWS, GIG_AT),
      ...reach('R', GIG_PAWS.map(mx), GIG_AT),
      root: GIG_ROOT,
      ...feet(GIG_ROOT),
      shadow: plant(GIG_ROOT, RIG_PIVOT),
      head: { at: GIG_AT, rotate: [0, -4, -6, -2, -6, -2, -6, -2, -4, 0, 0], y: [0, 2, 3, 2, 3, 2, 3, 2, 2, 0, 0] },
      eyesHappy: cut(1, flip(GIG_SQ)),
      eyesSqueeze: cut(0, GIG_SQ),
      blushHot: { at: [0, 0.14, 0.84, 1], opacity: [0, 1, 1, 0] },
      browL: { at: [0, 0.14, 0.84, 1], y: [0, -2.5, -2.5, 0] },
      browR: { at: [0, 0.14, 0.84, 1], y: [0, -2.5, -2.5, 0] },
      crest: { at: GIG_AT, rotate: [0, 2, -5, 5, -5, 5, -5, 5, -2, 0, 0] },
      tail: { at: GIG_AT, rotate: [0, 6, 14, 2, 14, 2, 14, 2, 8, 0, 0] },
      tuft: { at: GIG_AT, rotate: [0, -4, 6, -8, 6, -8, 6, -8, 2, 0, 0] },
    },
  },
  // A big stretch: arms out wide, up on his toes, a huge yawn, a shiver.
  stretch: {
    ms: 3200,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    front: ['armLTop', 'armRTop'],
    tracks: {
      ...reach('L', STR_PAWS, STR_AT),
      ...reach('R', STR_PAWS.map(mx), STR_AT),
      root: STR_ROOT,
      ...feet(STR_ROOT),
      shadow: plant(STR_ROOT, RIG_PIVOT),
      head: { at: STR_AT, y: [0, 2, -3, -4, -3, 0, 0, 0, 0, 0], rotate: [0, 0, -3, -4, -3, 0, 3, -3, 1, 0] },
      ...eyesTo([[0.16, 'shut'], [0.7, 'joy'], [0.92, 'open']]),
      ...mouthTo([[0.2, 'gape'], [0.64, 'smile']]),
      gapeIn: { at: [0, 0.2, 0.34, 0.5, 0.6, 0.64, 1], sx: [0.7, 0.7, 1, 1.1, 1, 0.7, 0.7], sy: [0.4, 0.4, 1.2, 1.5, 1.2, 0.4, 0.4] },
      browL: { at: STR_AT, y: [0, 0, -3, -3.5, -3, 0, 0, 0, 0, 0] },
      browR: { at: STR_AT, y: [0, 0, -3, -3.5, -3, 0, 0, 0, 0, 0] },
      earL: { at: STR_AT, rotate: [0, 0, -14, -16, -14, 0, 6, -6, 2, 0] },
      earR: { at: STR_AT, rotate: [0, 0, 14, 16, 14, 0, -6, 6, -2, 0] },
      crest: { at: STR_AT, rotate: [0, -4, 8, 10, 8, -4, 6, -6, 2, 0] },
      tail: { at: STR_AT, rotate: [0, 4, 20, 24, 20, 0, 8, -6, 2, 0] },
      tuft: { at: STR_AT, rotate: [0, 0, -8, 6, -6, 4, -6, 6, 0, 0] },
    },
  },
  // A mighty roar (a small one): claws up, mane puffed... then a bashful grin.
  roar: {
    ms: 2600,
    loop: false,
    face: { eyes: 'open', mouth: 'open' },
    bubble: 'ગરરર!',
    front: ['armLTop', 'armRTop'],
    tracks: {
      ...reach('L', ROAR_PAWS, ROAR_AT),
      ...reach('R', ROAR_PAWS.map(mx), ROAR_AT),
      root: ROAR_ROOT,
      ...feet(ROAR_ROOT),
      shadow: plant(ROAR_ROOT, RIG_PIVOT),
      head: { at: ROAR_AT, rotate: [0, 0, -2, 2, -2, 2, -1, 0, 8, 8, 0], y: [0, 4, -3, -3, -3, -3, -2, 0, 1, 1, 0], sx: ROAR_BIG, sy: ROAR_BIG },
      mouthOpen: { at: ROAR_AT, sx: [0.7, 0.6, 1.3, 1.35, 1.3, 1.35, 1.2, 0.6, 0.55, 0.55, 0.7], sy: [0.5, 0.4, 1.55, 1.6, 1.55, 1.6, 1.4, 0.5, 0.4, 0.4, 0.5] },
      browL: { at: ROAR_AT, rotate: [0, 16, 18, 18, 18, 18, 16, 0, -10, -10, 0], y: [0, 2, 1, 1, 1, 1, 1, 0, -2, -2, 0] },
      browR: { at: ROAR_AT, rotate: [0, -16, -18, -18, -18, -18, -16, 0, 10, 10, 0], y: [0, 2, 1, 1, 1, 1, 1, 0, -2, -2, 0] },
      earL: { at: ROAR_AT, rotate: [0, -10, -24, -22, -24, -22, -18, 0, -8, -8, 0] },
      earR: { at: ROAR_AT, rotate: [0, 10, 24, 22, 24, 22, 18, 0, 8, 8, 0] },
      crest: { at: ROAR_AT, rotate: [0, -6, 12, 8, 12, 8, 6, 0, -4, -4, 0] },
      mane: { at: ROAR_AT, sx: ROAR_MANE, sy: ROAR_MANE },
      maneBack: { at: ROAR_AT, sx: ROAR_MANE.map((v) => 1 + (v - 1) * 1.4), sy: ROAR_MANE.map((v) => 1 + (v - 1) * 1.4) },
      blushHot: { at: ROAR_AT, opacity: [0, 0, 0, 0, 0, 0, 0, 0.6, 1, 1, 0] },
      tail: { at: ROAR_AT, rotate: [0, -6, 20, 18, 20, 18, 14, 0, 8, 8, 0] },
      tuft: { at: ROAR_AT, rotate: [0, 4, -10, 8, -10, 8, -4, 4, -6, 6, 0] },
    },
  },
  // A twirl: a hop and a full turn in the air (he flips edge-on and back).
  spin: {
    ms: 1700,
    loop: false,
    face: { eyes: 'happy', mouth: 'open' },
    effect: 'sparkles',
    tracks: {
      ...reach('L', SPIN_PAWS, SPIN_AT),
      ...reach('R', SPIN_PAWS.map(mx), SPIN_AT),
      root: SPIN_ROOT,
      breath: { at: SPIN_AT, sx: [1, 1, 1, -1, 1, 1, 1, 1] },
      shadow: plant(SPIN_ROOT, RIG_PIVOT, { sx: [1, 1.12, 0.7, 0.62, 0.7, 1.12, 1, 1], opacity: [1, 1, 0.6, 0.5, 0.6, 1, 1, 1] }),
      head: { at: SPIN_AT, rotate: [0, 0, -4, 0, 4, 0, 0, 0], y: [0, 2, -2, -1, -2, 3, 0, 0] },
      legL: { at: SPIN_AT, rotate: SPIN_LEG, y: [0, -3, -3, -3, -3, -2, 0, 0] },
      legR: { at: SPIN_AT, rotate: neg(SPIN_LEG), y: [0, -3, -3, -3, -3, -2, 0, 0] },
      blushHot: { at: SPIN_AT, opacity: [0, 0.4, 1, 1, 1, 0.6, 0.2, 0] },
      crest: { at: SPIN_AT, rotate: [0, 6, -10, 8, -8, 6, -2, 0] },
      earL: { at: SPIN_AT, rotate: [0, 6, -12, 6, -10, 6, 0, 0] },
      earR: { at: SPIN_AT, rotate: [0, -6, 12, -6, 10, -6, 0, 0] },
      tail: { at: SPIN_AT, rotate: [0, 4, -10, 14, -10, 8, -3, 0] },
      fx1: sparkle(0),
      fx2: sparkle(1),
      fx3: sparkle(2),
      fx4: sparkle(3),
    },
  },
  // Pounce: crouch with big eyes, wiggle, leap toward you, pin it.
  pounce: {
    ms: 2600,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    front: ['armLTop', 'armRTop'],
    tracks: {
      ...reach('L', POUNCE_PAWS, POUNCE_AT),
      ...reach('R', POUNCE_PAWS.map(mx), POUNCE_AT),
      root: POUNCE_ROOT,
      ...POUNCE_FEET,
      shadow: plant(POUNCE_ROOT, RIG_PIVOT, { sx: [1, 1, 1, 1, 1, 1, 1, 0.7, 0.8, 1.05, 1, 1, 1], opacity: [1, 1, 1, 1, 1, 1, 1, 0.55, 0.65, 1, 1, 1, 1] }),
      head: { at: POUNCE_AT, y: [0, 5, 5, 5, 5, 5, 6, -2, -1, 4, 1, 0, 0], rotate: [0, 0, -2, 2, -2, 2, 0, 0, 0, 0, 0, 0, 0] },
      gaze: { at: POUNCE_AT, y: [0, 2, 2, 2, 2, 2, 2, 0, 1, 3, 3, 0, 0] },
      eyeL: { at: POUNCE_AT, sx: POUNCE_EYES, sy: POUNCE_EYES },
      eyeR: { at: POUNCE_AT, sx: POUNCE_EYES, sy: POUNCE_EYES },
      ...mouthTo([[0.48, 'gape'], [0.74, 'smile']]),
      earL: { at: POUNCE_AT, rotate: [0, 8, 8, 8, 8, 8, 10, -12, -10, 4, 0, 0, 0] },
      earR: { at: POUNCE_AT, rotate: [0, -8, -8, -8, -8, -8, -10, 12, 10, -4, 0, 0, 0] },
      crest: { at: POUNCE_AT, rotate: [0, -4, 4, -4, 4, -4, 0, 12, 8, -8, 3, 0, 0] },
      tail: { at: POUNCE_AT, rotate: [0, 10, -14, 16, -14, 16, -4, 22, 18, -6, 6, 0, 0] },
      tuft: { at: POUNCE_AT, rotate: [0, -6, 10, -12, 10, -12, 6, -14, -6, 10, -4, 0, 0] },
    },
  },
  // Washing up like a cat: licks a paw, then rubs it over his cheek and ear.
  groom: {
    ms: 3400,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    front: ['armLTop'],
    tracks: {
      ...reach('L', [REST_L, [124, 156], [124, 152], [124, 156], [124, 152], [124, 156], [98, 158], [88, 148], [92, 160], [88, 148], [92, 160], [102, 192], REST_L], GROOM_AT),
      ...reach('R', [REST_R, nudge(REST_R, 1, -0.5), nudge(REST_R, 1, -0.5), REST_R], [0, 0.2, 0.8, 1]),
      head: { at: GROOM_AT, rotate: [0, -2, -3, -2, -3, -2, -12, -18, -16, -18, -16, -4, 0], y: [0, 2, 3, 2, 3, 2, 2, 3, 3, 3, 3, 1, 0] },
      ...eyesTo([[0.12, 'shut'], [0.86, 'joy'], [0.96, 'open']]),
      ...mouthTo([[0.12, 'gape'], [0.36, 'smile']]),
      gapeIn: { at: GROOM_AT, sx: [0.8, 0.8, 0.85, 0.8, 0.85, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8], sy: [0.7, 0.7, 0.9, 0.6, 0.9, 0.6, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7] },
      earL: { at: GROOM_AT, rotate: [0, 0, 0, 0, 0, 0, -6, -14, -4, -14, -4, 0, 0] },
      crest: { at: GROOM_AT, rotate: [0, 0, 2, 0, 2, 0, -4, -8, -4, -8, -4, 2, 0] },
      tail: { at: [0, 0.3, 0.6, 0.9, 1], rotate: [0, 8, -2, 8, 0] },
      tuft: { at: [0, 0.36, 0.66, 0.96, 1], rotate: [0, -8, 4, -8, 0] },
    },
  },
  // Aah... aah... CHOO! Then a dazed blink and a smile.
  sneeze: {
    ms: 2600,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    effect: 'puffs',
    bubble: 'આ…છીં!',
    tracks: {
      ...reach('L', SNZ_PAWS, SNZ_AT),
      ...reach('R', SNZ_PAWS.map(mx), SNZ_AT),
      root: SNZ_ROOT,
      ...feet(SNZ_ROOT),
      shadow: plant(SNZ_ROOT, RIG_PIVOT),
      head: { at: SNZ_AT, rotate: [0, -2, -4, -6, -7, 6, 3, -6, 5, -2, 0, 0], y: [0, -1, -3, -4, -5, 6, 3, 1, 1, 0, 0, 0] },
      ...mouthTo([[0.12, 'ooh'], [0.44, 'gape'], [0.56, 'smile']]),
      oohIn: { at: [0, 0.12, 0.24, 0.34, 0.42, 1], sx: [0.6, 0.6, 0.9, 1.1, 1.2, 1.2], sy: [0.6, 0.6, 1, 1.3, 1.4, 1.4] },
      gapeIn: { at: [0, 0.44, 0.5, 0.56, 1], sx: [1.2, 1.2, 1, 0.8, 0.8], sy: [1.3, 1.3, 1, 0.6, 0.6] },
      ...eyesTo([[0.26, 'shut'], [0.44, 'squint'], [0.58, 'open'], [0.84, 'joy'], [0.96, 'open']]),
      browL: { at: SNZ_AT, rotate: SNZ_BROW, y: [0, -1, -2, -3, -4, 2, 1, 0, 0, 0, 0, 0] },
      browR: { at: SNZ_AT, rotate: neg(SNZ_BROW), y: [0, -1, -2, -3, -4, 2, 1, 0, 0, 0, 0, 0] },
      earL: { at: SNZ_AT, rotate: SNZ_EAR },
      earR: { at: SNZ_AT, rotate: neg(SNZ_EAR) },
      crest: { at: SNZ_AT, rotate: [0, -2, -4, -6, -8, 16, -8, 6, -3, 0, 0, 0] },
      tail: { at: SNZ_AT, rotate: [0, 0, 4, 8, 10, -14, 6, -4, 2, 0, 0, 0] },
      fx1: snzPuff(-18, -6),
      fx2: snzPuff(18, -6),
      fx3: snzPuff(0, 10),
    },
  },
  // Fluff up: a wet-dog shake of the head, then his mane springs out.
  shake: {
    ms: 2200,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    effect: 'drops',
    tracks: {
      ...reach('L', SHAKE_PAWS, SHAKE_AT),
      ...reach('R', SHAKE_PAWS.map(mx), SHAKE_AT),
      root: SHAKE_ROOT,
      ...feet(SHAKE_ROOT),
      shadow: plant(SHAKE_ROOT, RIG_PIVOT),
      head: { at: SHAKE_AT, rotate: [0, -3, 14, -14, 14, -14, 13, -12, 9, -5, 2, 0, 0, 0] },
      crest: { at: SHAKE_AT, rotate: [0, 4, -18, 18, -18, 18, -16, 14, -10, 6, -2, 0, 0, 0] },
      earL: { at: SHAKE_AT, rotate: SHAKE_EARS },
      earR: { at: SHAKE_AT, rotate: SHAKE_EARS },
      mane: { at: SHAKE_AT, sx: FLUFF(1), sy: FLUFF(0.8) },
      maneBack: { at: SHAKE_AT, sx: FLUFF(1.3), sy: FLUFF(1.1) },
      ...eyesTo([[0.12, 'squint'], [0.62, 'shut'], [0.7, 'joy'], [0.92, 'open']]),
      tail: { at: SHAKE_AT, rotate: [0, 0, 10, -8, 10, -8, 10, -8, 6, -4, 2, 0, 0, 0] },
      fx1: fling(0.18, -20),
      fx2: fling(0.22, 20),
      fx3: fling(0.3, -16),
      fx4: fling(0.34, 16),
    },
  },
  // Shabash! Four claps, a squeeze of the eyes on each.
  clap: {
    ms: 2000,
    loop: false,
    face: { eyes: 'happy', mouth: 'open' },
    effect: 'sparkles',
    bubble: 'શાબાશ!',
    tracks: {
      ...reach('L', CLAP_PAWS, CLAP_AT),
      ...reach('R', CLAP_PAWS.map(mx), CLAP_AT),
      root: CLAP_ROOT,
      ...feet(CLAP_ROOT),
      shadow: plant(CLAP_ROOT, RIG_PIVOT),
      head: { at: CLAP_AT, rotate: [0, 2, 0, -3, 0, 3, 0, -3, 0, 0, 0, 0] },
      eyesHappy: cut(1, flip(CLAP_SQ)),
      eyesSqueeze: cut(0, CLAP_SQ),
      mouthOpen: { at: CLAP_AT, sx: [1, 1, 1.1, 1, 1.1, 1, 1.1, 1, 1.1, 1, 1, 1], sy: [1, 1, 1.25, 1, 1.25, 1, 1.25, 1, 1.25, 1, 1, 1] },
      blushHot: { at: [0, 0.15, 0.8, 1], opacity: [0, 0.8, 0.8, 0] },
      browL: { at: [0, 0.15, 0.8, 1], y: [0, -2.5, -2.5, 0] },
      browR: { at: [0, 0.15, 0.8, 1], y: [0, -2.5, -2.5, 0] },
      tail: { at: CLAP_AT, rotate: [0, 6, -4, 10, -4, 10, -4, 10, -4, 6, 0, 0] },
      fx1: sparkle(0),
      fx2: sparkle(1),
      fx3: sparkle(2),
      fx4: sparkle(3),
    },
  },
  // Namaste: palms together at his chest, a bow with eyes closed.
  namaste: {
    ms: 2800,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    bubble: 'નમસ્તે',
    front: ['armLTop', 'armRTop'],
    tracks: {
      ...reach('L', NAM_PAWS, NAM_AT),
      ...reach('R', NAM_PAWS.map(mx), NAM_AT),
      root: NAM_ROOT,
      ...feet(NAM_ROOT),
      head: { at: NAM_AT, y: [0, 0, 0, 7, 8, 7, 0, 0, 0], rotate: [0, 0, 0, 0, 0, 0, 5, 5, 0] },
      ...eyesTo([[0.3, 'shut'], [0.64, 'joy'], [0.9, 'open']]),
      earL: { at: NAM_AT, rotate: [0, 0, 0, -8, -8, -8, 0, 0, 0] },
      earR: { at: NAM_AT, rotate: [0, 0, 0, 8, 8, 8, 0, 0, 0] },
      crest: { at: NAM_AT, rotate: [0, 0, 0, -6, -8, -6, 4, 0, 0] },
      tail: { at: NAM_AT, rotate: [0, 0, 0, 4, 4, 4, 10, -4, 0] },
    },
  },
  // So strong: one paw on his hip, the other flexing, chin up, a wink.
  flex: {
    ms: 2600,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    effect: 'sparkles',
    front: ['armRTop'],
    tracks: {
      ...reach('R', FLEX_R, FLEX_AT),
      ...reach('L', FLEX_L, FLEX_AT),
      body: { at: FLEX_AT, sx: [1, 1, 1.04, 1.04, 1.04, 1.04, 1.04, 1, 1], sy: [1, 1, 1.02, 1.02, 1.02, 1.02, 1.02, 1, 1] },
      head: { at: FLEX_AT, rotate: [0, -2, -4, -4, -4, -4, -4, -2, 0], y: [0, -1, -2, -2, -2, -2, -2, -1, 0] },
      gaze: { at: FLEX_AT, y: [0, -1, -1.5, -1.5, -1.5, -1.5, -1.5, -1, 0] },
      ...eyesTo([[0.28, 'joy'], [0.64, 'wink'], [0.84, 'open']]),
      browL: { at: FLEX_AT, y: [0, -1, -3, -3, -3, -3, -3, -1, 0] },
      browR: { at: FLEX_AT, y: [0, 0, -1, -1, -1, -1, 2, 0, 0], rotate: [0, 0, 0, 0, 0, 0, 6, 0, 0] },
      tail: { at: FLEX_AT, rotate: [0, 6, 14, 12, 14, 12, 14, 6, 0] },
      crest: { at: FLEX_AT, rotate: [0, 0, 4, -2, 4, -2, 4, 0, 0] },
      ...NO_FX,
      fx2: twinkle([0.33, 0.53], -34, 22),
    },
  },
  // A wink and a finger-gun paw, with a twinkle by his eye.
  wink: {
    ms: 1700,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    effect: 'sparkles',
    front: ['armRTop'],
    tracks: {
      ...WINK_ARM,
      ...reach('L', [REST_L, REST_L, nudge(REST_L, -1, 0.5), nudge(REST_L, -1, 0.5), REST_L, REST_L, REST_L], WINK_AT),
      head: { at: WINK_AT, rotate: [0, 2, 8, 8, 8, 2, 0], y: [0, 0, -1, -1, -1, 0, 0] },
      ...eyesTo([[0.3, 'wink'], [0.62, 'open']]),
      ...mouthTo([[0.3, 'gape'], [0.62, 'smile']]),
      gapeIn: { sx: [0.75], sy: [0.6] },
      browR: { at: [0, 0.28, 0.32, 0.6, 0.64, 1], y: [0, 0, 2.5, 2.5, 0, 0], rotate: [0, 0, 6, 6, 0, 0] },
      browL: { at: WINK_AT, y: [0, -1, -3, -3, -3, -1, 0] },
      earR: { at: [0, 0.28, 0.34, 0.42, 1], rotate: [0, 0, 10, 0, 0] },
      tail: { at: WINK_AT, rotate: [0, 4, 12, 4, 12, 0, 0] },
      ...NO_FX,
      fx2: twinkle([0.32], -46, -24),
    },
  },
  // Singing his heart out, eyes closed, one paw out like an opera star.
  sing: {
    ms: 3600,
    loop: true,
    face: { eyes: 'closed', mouth: 'o' },
    effect: 'notes',
    front: ['armRTop'],
    tracks: {
      ...reach('L', [[116, 199], [116.5, 198], [116, 199], [116.5, 198], [116, 199]], SING_AT),
      ...reach('R', [[178, 188], [184, 176], [178, 188], [184, 176], [178, 188]], SING_AT),
      root: SING_ROOT,
      ...feet(SING_ROOT),
      shadow: plant(SING_ROOT, RIG_PIVOT),
      head: { at: SING_AT, rotate: [-5, -1, 5, 1, -5], y: [-2, -3, -2, -3, -2] },
      mouthO: { at: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.87, 1], sx: [1, 1.2, 1, 1.25, 1, 1.2, 1, 1.25, 1], sy: [1, 1.5, 1.1, 1.6, 1, 1.5, 1.1, 1.6, 1] },
      browL: { rotate: [-8], y: [-2] },
      browR: { rotate: [8], y: [-2] },
      earL: { at: SING_AT, rotate: [-4, 0, 4, 0, -4] },
      earR: { at: SING_AT, rotate: [-4, 0, 4, 0, -4] },
      crest: { at: SING_AT, rotate: [6, 0, -6, 0, 6] },
      tail: { at: SING_AT, rotate: [-8, 6, -8, 6, -8] },
      tuft: { at: [0, 0.1, 0.35, 0.6, 0.85, 1], rotate: [4, 8, -6, 8, -6, 4] },
      fx1: rise(0, 24, -6),
      fx2: rise(1, 24, 6),
    },
  },
  // Hiccups: three little hops he can't help, and a puzzled look at his tummy.
  hiccup: {
    ms: 2800,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    bubble: 'હિક!',
    tracks: {
      ...reach('L', HIC_PAWS, HIC_AT),
      ...reach('R', HIC_PAWS.map(mx), HIC_AT),
      root: HIC_ROOT,
      shadow: plant(HIC_ROOT, RIG_PIVOT, { sx: [1, 1, 0.8, 1.05, 1, 1, 0.8, 1.05, 1, 1, 0.78, 1.05, 1] }),
      ...mouthTo([[0.18, 'ooh'], [0.3, 'smile'], [0.52, 'ooh'], [0.64, 'smile'], [0.8, 'ooh'], [0.92, 'smile']]),
      eyeL: { at: HIC_AT, sx: HIC_EYES, sy: HIC_EYES },
      eyeR: { at: HIC_AT, sx: HIC_EYES, sy: HIC_EYES },
      browL: { at: HIC_AT, y: [0, 0, -4, -2, -1, -1, -4, -2, -1, -1, -4.5, -2, 0], rotate: HIC_BROW },
      browR: { at: HIC_AT, y: [0, 0, -4, -2, -1, -1, -4, -2, -1, -1, -4.5, -2, 0], rotate: neg(HIC_BROW) },
      earL: { at: HIC_AT, rotate: HIC_EAR },
      earR: { at: HIC_AT, rotate: neg(HIC_EAR) },
      crest: { at: HIC_AT, rotate: [0, 0, -12, 6, 0, 0, -12, 6, 0, 0, -14, 6, 0] },
      head: { at: HIC_AT, rotate: [0, 0, 0, 0, 7, 7, 0, 0, -7, -7, 0, 0, 0], y: [0, 0, -2, 1, 1, 1, -2, 1, 1, 1, -2, 1, 0] },
      gaze: { at: HIC_AT, y: [0, 0, -1, 0, 2.5, 2.5, -1, 0, 2.5, 2.5, -1, 0, 0] },
      tail: { at: HIC_AT, rotate: [0, 0, 16, -4, 0, 0, 16, -4, 0, 0, 18, -4, 0] },
    },
  },
  // A Kesar mango: he lifts it up to admire it, then hugs it to his cheek.
  mango: {
    ms: 4000,
    loop: true,
    face: { eyes: 'open', mouth: 'smile' },
    prop: 'mango',
    effect: 'sparkles',
    bubble: 'કેરી!',
    front: ['mango', 'armLTop', 'armRTop'],
    tracks: {
      ...reach('L', MANGO_PAWS, MANGO_AT),
      ...reach('R', MANGO_PAWS.map(mx), MANGO_AT),
      mango: { at: MANGO_AT, y: MANGO_Y, rotate: [0, -8, 8, -6, 0, 0, 0, 0, 0, 0] },
      head: { at: MANGO_AT, rotate: [0, 0, 0, 0, 0, -8, 6, -8, 0, 0], y: [0, 0, 0, 0, 2, 5, 5, 5, 2, 0] },
      gaze: { at: MANGO_AT, x: [0, -1.5, 1.5, -1, 0, 0, 0, 0, 0, 0], y: [1, 3, 3, 3, 2, 2, 2, 2, 1, 1] },
      ...eyesTo([[0.5, 'joy'], [0.92, 'open']]),
      ...mouthTo([[0.14, 'gape'], [0.4, 'smile']]),
      gapeIn: { sx: [0.8], sy: [0.8] },
      blushHot: { at: [0, 0.48, 0.58, 0.88, 1], opacity: [0, 0, 1, 1, 0] },
      browL: { at: MANGO_AT, y: [0, -3, -3, -3, 0, 0, 0, 0, 0, 0] },
      browR: { at: MANGO_AT, y: [0, -3, -3, -3, 0, 0, 0, 0, 0, 0] },
      tail: { at: MANGO_AT, rotate: [0, 8, -4, 8, 0, 10, -4, 10, -4, 0] },
      tuft: { at: MANGO_AT, rotate: [0, -6, 6, -6, 2, -8, 6, -8, 4, 0] },
      fx1: sparkle(0),
      fx2: sparkle(1),
      fx3: sparkle(2),
      fx4: sparkle(3),
    },
  },
  // Uttarayan: flying a patang, two tugs on the string, then a cheer.
  kite: {
    ms: 4400,
    loop: true,
    face: { eyes: 'open', mouth: 'smile', look: [-3, -3] },
    prop: 'kite',
    bubble: 'કાઇપો છે!',
    front: ['armLTop', 'armRTop'],
    tracks: {
      ...reach('L', KITE_TUG.map((k) => nudge(KITE_HOLD, -2 * k, 7 * k)), KITE_AT),
      ...reach('R', [REST_R, REST_R, REST_R, REST_R, [180, 184], [190, 160], [188, 166], [190, 160], REST_R], KITE_AT),
      kite: { at: KITE_AT, x: KITE_TUG.map((k) => -2 * k), y: KITE_TUG.map((k) => 7 * k), rotate: [0, 2, -2, 2, -2, -3, 2, -2, 0] },
      kiteSail: { rotate: [-6, 6, -6, 6, -6, 6, -6, 6, -6] },
      head: { at: KITE_AT, rotate: [-5, -6, -5, -6, -5, -2, 0, -2, -5], y: [-1, 0, -1, 0, -1, -2, -2, -2, -1] },
      ...eyesTo([[0.6, 'joy'], [0.88, 'open']]),
      ...mouthTo([[0.6, 'gape'], [0.88, 'smile']]),
      browL: { at: KITE_AT, y: [-1, 0, -1, 0, -1, -3, -3, -3, -1] },
      browR: { at: KITE_AT, y: [-1, 0, -1, 0, -1, -3, -3, -3, -1] },
      tail: { at: KITE_AT, rotate: [0, 6, 0, 6, 0, 12, -4, 12, 0] },
      tuft: { at: KITE_AT, rotate: [0, -6, 2, -6, 2, -10, 6, -10, 0] },
    },
  },
  // Chai time: blows on the glass, sips with his eyes shut, aah.
  chai: {
    ms: 4200,
    loop: true,
    face: { eyes: 'open', mouth: 'smile' },
    prop: 'chai',
    bubble: 'ચા!',
    front: ['armRTop'],
    tracks: {
      ...CHAI_ARM,
      ...reach('L', [[116, 206]]),
      chai: { at: CHAI_AT, rotate: CHAI_TILT },
      steam1: { at: [0, 0.2, 0.45, 0.46, 1], y: [0, -6, -12, 0, 0], x: [0, 1.5, -1, 0, 0], opacity: [0, 0.8, 0, 0, 0] },
      steam2: { at: [0, 0.5, 0.7, 0.95, 1], y: [0, 0, -6, -12, -12], x: [0, 0, -1.5, 1, 1], opacity: [0, 0, 0.8, 0, 0] },
      head: { at: CHAI_AT, rotate: [0, 0, 0, 3, 4, 3, -6, -8, -8, 0], y: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0] },
      gaze: { at: CHAI_AT, x: [1.5, 1.5, 1.5, 0, 0, 0, 0, 0, 0, 1.5], y: [2.5, 2.5, 2.5, 0, 0, 0, 0, 0, 0, 2.5] },
      ...eyesTo([[0.3, 'shut'], [0.62, 'joy'], [0.94, 'open']]),
      ...mouthTo([[0.06, 'ooh'], [0.22, 'smile']]),
      oohIn: { sx: [0.8], sy: [0.8] },
      blushHot: { at: [0, 0.6, 0.66, 0.9, 1], opacity: [0, 0, 1, 1, 0] },
      tail: { at: CHAI_AT, rotate: [0, 0, 0, 4, 6, 4, 10, -2, 6, 0] },
      tuft: { at: CHAI_AT, rotate: [0, 0, 0, -4, -6, -4, -10, 4, -4, 0] },
      earL: { at: CHAI_AT, rotate: [0, 0, 0, -4, -6, -4, 0, 6, 0, 0] },
      earR: { at: CHAI_AT, rotate: [0, 0, 0, 4, 6, 4, 0, -6, 0, 0] },
    },
  },
  // A butterfly loops round him and lands on his nose; he goes cross-eyed.
  butterfly: {
    ms: 6400,
    loop: true,
    face: { eyes: 'open', mouth: 'smile' },
    effect: 'butterfly',
    tracks: {
      fly: { at: FLY_AT, x: FLY_X, y: FLY_Y, rotate: [0, -15, -10, -25, 10, 25, 10, 0, 0, -20, -10, 0] },
      wings: FLAP,
      gaze: { at: FLY_AT, x: FLY_DX.map((d) => clamp(d / 22, -4, 4)), y: FLY_DY.map((d) => clamp(d / 22, -3, 3)) },
      head: { at: FLY_AT, rotate: FLY_DX.map((d, i) => (CROSS[i] ? 0 : clamp(d / 14, -7, 7))), y: [0, 0, -1, 0, 1, 1, 1, 1, 1, 0, -1, 0] },
      eyeL: { at: FLY_AT, x: CROSS },
      eyeR: { at: FLY_AT, x: neg(CROSS) },
      ...mouthTo([[0.58, 'ooh'], [0.8, 'smile']]),
      ...reach('L', [REST_L, REST_L, REST_L, REST_L, REST_L, REST_L, [112, 198], [116, 195], [116, 195], [112, 200], REST_L, REST_L], FLY_AT),
      ...reach('R', [REST_R, REST_R, REST_R, REST_R, REST_R, REST_R, mx([112, 198]), mx([116, 195]), mx([116, 195]), mx([112, 200]), REST_R, REST_R], FLY_AT),
      blushHot: { at: FLY_AT, opacity: [0, 0, 0, 0, 0, 0, 0.6, 1, 1, 0.4, 0, 0] },
      browL: { at: FLY_AT, y: [0, -1, -1, 0, 0, -1, -2, -3.5, -3.5, -1, 0, 0] },
      browR: { at: FLY_AT, y: [0, -1, -1, 0, 0, -1, -2, -3.5, -3.5, -1, 0, 0] },
      earL: { at: FLY_AT, rotate: [0, 4, 8, 4, -4, 0, 4, 8, 8, 0, 4, 0] },
      earR: { at: FLY_AT, rotate: [0, -4, -8, -4, 4, 0, -4, -8, -8, 0, -4, 0] },
      tail: { at: FLY_AT, rotate: [0, 6, -4, 6, -4, 6, 4, 12, 12, -4, 6, 0] },
      tuft: { at: FLY_AT, rotate: [0, -6, 4, -6, 4, -6, -2, -8, -8, 6, -4, 0] },
    },
  },
  // Sulking: arms folded, nose in the air, a pout... which can't last.
  pout: {
    ms: 3000,
    loop: false,
    face: { eyes: 'open', mouth: 'smile' },
    tracks: {
      ...reach('L', POUT_PAWS, POUT_AT),
      ...reach('R', POUT_PAWS.map(mx), POUT_AT),
      legR: { at: POUT_AT, y: [0, -5, 0, 0, 0, 0, 0, 0, 0, 0] },
      head: { at: POUT_AT, rotate: [0, -6, -10, -10, -5, -10, -4, 0, 0, 0], y: [0, -2, -3, -3, -2, -3, -1, 0, 0, 0] },
      gaze: { at: POUT_AT, x: [0, -3, -4, -4, 1.5, -4, 0, 0, 0, 0], y: [0, -2, -2.5, -2.5, 0, -2.5, 0, 0, 0, 0] },
      browL: { at: POUT_AT, rotate: POUT_BROW, y: [0, 1.5, 2, 2, 1, 2, 0, -2, 0, 0] },
      browR: { at: POUT_AT, rotate: neg(POUT_BROW), y: [0, 1.5, 2, 2, 1, 2, 0, -2, 0, 0] },
      ...mouthTo([[0.14, 'ooh'], [0.64, 'smile']]),
      oohIn: { sx: [1.25], sy: [0.6] },
      ...eyesTo([[0.68, 'joy'], [0.92, 'open']]),
      blushHot: { at: POUT_AT, opacity: [0, 0.6, 0.8, 0.8, 1, 0.8, 1, 0.6, 0, 0] },
      earL: { at: POUT_AT, rotate: POUT_EAR },
      earR: { at: POUT_AT, rotate: neg(POUT_EAR) },
      tail: { at: POUT_AT, rotate: [0, 10, -6, 10, -6, 10, 4, 12, 0, 0] },
      tuft: { at: POUT_AT, rotate: [0, -8, 6, -8, 6, -8, 0, -10, 0, 0] },
    },
  },
};

// Little things he does by himself when he's been idle a while, and the
// tricks a tap can set off.
export const FIDGETS: Pose[] = ['stretch', 'groom', 'shake', 'sneeze', 'wink', 'hiccup'];
export const TRICKS: Pose[] = ['wave', 'giggle', 'wink', 'spin', 'clap', 'roar', 'pounce', 'namaste', 'flex', 'shy', 'shake', 'sneeze', 'pout'];

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

// Ambient motion, on top of every clip.
export const BREATH_MS = 3800;
export const BREATH_SY = [1, 1.025, 1];
export const BREATH_SX = [1, 1.012, 1];
