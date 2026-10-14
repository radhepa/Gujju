// Kesar's rig: vector parts, the joints they turn on, and the clips that move
// them. Plain data with no React, so the app (Kesar.tsx) and the preview
// renderer (scripts/render-kesar.mjs) draw from exactly the same source.
//
// Coordinates are a 260 x 260 design box; the ground line is y = 238.

export const VIEW = 260;
// The drawing box, with headroom above the crest for jumps.
export const BOX = { x: -10, y: -26, w: 280, h: 280 };

type P = [number, number];

// Palette ----------------------------------------------------------------------

const INK = '#5A2A0E'; // silhouette line
const LINE = '#8F4C1C'; // inner detail line
const GOLD = '#FFD36E';
const GOLD_DEEP = '#E2A532';
const PUPIL = '#1E0E04';

// Gradients are added to a part only when it uses them (see withDefs).
const GRADIENTS: Record<string, string> = {
  'k-fur': `<linearGradient id="k-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD877"/><stop offset=".55" stop-color="#F6B847"/><stop offset="1" stop-color="#E49A2E"/></linearGradient>`,
  'k-face': `<radialGradient id="k-face" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#FFDF85"/><stop offset=".6" stop-color="#F7BC4A"/><stop offset="1" stop-color="#E59E31"/></radialGradient>`,
  'k-mane-back': `<radialGradient id="k-mane-back" cx=".5" cy=".55" r=".55"><stop offset=".55" stop-color="#C9731C"/><stop offset="1" stop-color="#A85A12"/></radialGradient>`,
  'k-mane': `<radialGradient id="k-mane" cx=".5" cy=".5" r=".55"><stop offset=".6" stop-color="#EBA23A"/><stop offset="1" stop-color="#D3841F"/></radialGradient>`,
  'k-muzzle': `<linearGradient id="k-muzzle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DD"/><stop offset="1" stop-color="#FFE0A6"/></linearGradient>`,
  'k-iris': `<radialGradient id="k-iris" cx=".5" cy=".72" r=".7"><stop offset="0" stop-color="#B8742E"/><stop offset=".45" stop-color="#6E3A14"/><stop offset="1" stop-color="#2E1606"/></radialGradient>`,
  'k-turban': `<linearGradient id="k-turban" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8F3E"/><stop offset=".6" stop-color="#F0621C"/><stop offset="1" stop-color="#D84B12"/></linearGradient>`,
  'k-fold': `<linearGradient id="k-fold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB066"/><stop offset=".5" stop-color="#FF8A3A"/><stop offset="1" stop-color="#E9611D"/></linearGradient>`,
  'k-band': `<linearGradient id="k-band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2401A"/><stop offset="1" stop-color="#9C280A"/></linearGradient>`,
  'k-gold': `<radialGradient id="k-gold" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFF2B8"/><stop offset=".5" stop-color="#FFD36E"/><stop offset="1" stop-color="#D99A26"/></radialGradient>`,
  'k-ruby': `<radialGradient id="k-ruby" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FF8DA0"/><stop offset=".5" stop-color="#D7263D"/><stop offset="1" stop-color="#8E1023"/></radialGradient>`,
  'k-kurta': `<linearGradient id="k-kurta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E35C17"/><stop offset=".3" stop-color="#F98A38"/><stop offset=".62" stop-color="#F47A2B"/><stop offset="1" stop-color="#D9531A"/></linearGradient>`,
  'k-sleeve': `<linearGradient id="k-sleeve" gradientUnits="userSpaceOnUse" x1="74" y1="174" x2="104" y2="212"><stop offset="0" stop-color="#FC9A4A"/><stop offset=".55" stop-color="#F27A2B"/><stop offset="1" stop-color="#D9561A"/></linearGradient>`,
  'k-paw': `<linearGradient id="k-paw" gradientUnits="userSpaceOnUse" x1="76" y1="205" x2="92" y2="226"><stop offset="0" stop-color="#FFD877"/><stop offset="1" stop-color="#E49A2E"/></linearGradient>`,
  'k-tuft': `<linearGradient id="k-tuft" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#A3561F"/><stop offset="1" stop-color="#6E3410"/></linearGradient>`,
  'k-shadow': `<radialGradient id="k-shadow"><stop offset="0" stop-color="#5A2A0E" stop-opacity=".26"/><stop offset=".7" stop-color="#5A2A0E" stop-opacity=".12"/><stop offset="1" stop-color="#5A2A0E" stop-opacity="0"/></radialGradient>`,
  'k-mouth': `<linearGradient id="k-mouth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E1A0A"/><stop offset="1" stop-color="#9E2E14"/></linearGradient>`,
  'k-glow': `<radialGradient id="k-glow"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".9"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient>`,
};

const DOME = 'M73 108C68 74 98 56 130 56C162 56 192 74 187 108Q130 94 73 108Z';
const KURTA = 'M98 156Q130 146 162 156L174 210Q176 219 167 221Q130 229 93 221Q84 219 86 210Z';
const CLIP_DEFS: Record<string, string> = {
  'k-dome': `<clipPath id="k-dome"><path d="${DOME}"/></clipPath>`,
  'k-kurta-clip': `<clipPath id="k-kurta-clip"><path d="${KURTA}"/></clipPath>`,
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

// Soft petal-shaped tufts round an ellipse, tips leaning by `lean` radians.
function tufts(c: P, inner: P, outer: P, n: number, lean: number, start = 0): string {
  const on = (r: P, ang: number): P => [c[0] + r[0] * Math.cos(ang), c[1] + r[1] * Math.sin(ang)];
  const step = (Math.PI * 2) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = start + i * step;
    const tip = a0 + step / 2 + lean;
    if (i === 0) d += `M${pt(on(inner, a0))}`;
    d += `C${pt(on(outer, tip - step * 0.32))} ${pt(on(outer, tip + step * 0.12))} ${pt(on(inner, a0 + step))}`;
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

function zigzag(a: P, c: P, b: P, n: number, amp: number): string {
  return quadPts(a, c, b, n, 0)
    .map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1] + (i % 2 ? amp : -amp))}`)
    .join('');
}

const dots = (pts: P[], r: number, fill: string) =>
  pts.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}"/>`).join('');

const stroke = (d: string, color: string, w: number, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// Parts ---------------------------------------------------------------------------

export type Eyes = 'open' | 'happy' | 'closed';
export type Mouth = 'smile' | 'open' | 'o' | 'wavy';
export type Prop = 'book' | 'plate';
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
}

// How far a part slides with his gaze, which reads as the head turning.
export const PARALLAX: Record<string, P> = {
  features: [0.55, 0.35],
  pupils: [1, 0.9],
  turban: [0.22, 0.12],
  crest: [0.3, 0.12],
  maneBack: [-0.25, -0.12],
};

const shadow = `<ellipse cx="130" cy="239" rx="60" ry="9" fill="url(#k-shadow)"/>`;

const TAIL_CURVE: [P, P, P, P] = [[112, 207], [86, 218], [56, 210], [58, 180]];
const tail = `
  <path d="${taper(...TAIL_CURVE, 12, 8)}" fill="${INK}"/>
  <path d="${taper(...TAIL_CURVE, 8, 4.6)}" fill="url(#k-fur)"/>
  ${stroke('M98 214C84 218 70 214 64 204', '#FFE7A3', 1.6, 'opacity=".7"')}`;

const tuft = `<g transform="translate(60 182) scale(.82) translate(-60 -182)">
  <path d="M58 186C46 186 40 176 44 166C46 172 50 172 52 170C48 162 52 152 60 150C58 158 62 160 64 160C64 154 70 150 76 152C70 158 74 166 72 174C70 182 64 186 58 186Z" fill="url(#k-tuft)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  ${stroke('M58 182C56 174 56 166 60 158M62 182C64 174 66 168 70 162', '#C07A3A', 1.4, 'opacity=".85"')}</g>`;

const leg = (x: number) => `
  <path d="${limb([x, 204], 10.5, [x, 225], 10)}" fill="url(#k-fur)" stroke="${INK}" stroke-width="3"/>
  <path d="M${x - 14} 237C${x - 14} 227 ${x - 8} 223 ${x} 223C${x + 8} 223 ${x + 14} 227 ${x + 14} 237Z" fill="url(#k-fur)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  ${stroke(`M${x - 4} 232v4M${x + 4} 232v4`, LINE, 1.8)}
  <path d="M${x - 11} 235Q${x} 238 ${x + 11} 235" fill="none" stroke="#FFE7A3" stroke-width="1.4" opacity=".6"/>`;

// Bandhani: tie-dye dot clusters, the most Gujarati of textiles.
function bandhani(): string {
  const out: string[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 9; col++) {
      const x = 88 + col * 11 + (row % 2) * 5.5;
      const y = 160 + row * 9;
      out.push(dots([[x, y - 1.4], [x - 1.4, y + 1], [x + 1.4, y + 1]], 0.9, '#FFE2B0'));
    }
  }
  return `<g clip-path="url(#k-kurta-clip)" opacity=".75">${out.join('')}</g>`;
}

const body = `
  <path d="${KURTA}" fill="url(#k-kurta)"/>
  ${bandhani()}
  <g clip-path="url(#k-kurta-clip)">
    <path d="M86 150L100 150L96 226L80 226Z" fill="#C7470F" opacity=".35"/>
    <path d="M174 150L158 150L164 226L180 226Z" fill="#C7470F" opacity=".4"/>
    ${stroke('M112 188C110 200 108 210 106 220M150 188C152 200 154 210 156 220', '#C24A12', 1.4, 'opacity=".55"')}
    <path d="M86 209Q130 219 174 209L178 230L82 230Z" fill="url(#k-band)"/>
    ${stroke(zigzag([88, 215], [130, 225], [172, 215], 22, 1.8), GOLD, 1.3)}
    ${stroke('M86 209Q130 219 174 209', GOLD_DEEP, 1.2)}
  </g>
  <rect x="125.5" y="150" width="9" height="76" fill="url(#k-band)"/>
  ${stroke('M125.5 150V222M134.5 150V222', GOLD_DEEP, 1)}
  ${[186, 198, 210].map((y) => `<circle cx="130" cy="${y}" r="2.3" fill="url(#k-gold)" stroke="${INK}" stroke-width=".9"/>`).join('')}
  <path d="${KURTA}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`;

// Arms: short, puffy kurta sleeves set at the sides of the body, right at
// the edge of the mane, so a raised arm swings out clear of the face. The
// upper sleeve turns on the shoulder, the forearm on the elbow, and a patch
// in the forearm hides the seam, so the elbow bends cleanly.
export const SHOULDER: P = [96, 181];
export const ELBOW: P = [88, 197];
export const PAW: P = [84, 215];
const upperArm = `
  <path d="${limb(SHOULDER, 8.6, ELBOW, 9.3)}" fill="url(#k-sleeve)" stroke="${INK}" stroke-width="3"/>
  ${stroke('M90.5 187Q87.5 191 86.5 195', '#FFB36B', 1.6, 'opacity=".8"')}`;
const forearm = `
  <path d="${limb(ELBOW, 9.3, [85.4, 205], 8.3)}" fill="url(#k-sleeve)" stroke="${INK}" stroke-width="3"/>
  <circle cx="${ELBOW[0]}" cy="${ELBOW[1]}" r="7.5" fill="url(#k-sleeve)"/>
  ${stroke('M82 199Q84 202.5 88.5 203.5', '#C24A12', 1.3, 'opacity=".55"')}
  <path d="${limb([85.7, 204.6], 8.9, [84.9, 208.8], 8.6)}" fill="url(#k-band)" stroke="${INK}" stroke-width="2.4"/>
  ${stroke('M76.8 206.8Q85 209.4 93.2 208.2', GOLD, 1.2)}
  <g transform="rotate(12 ${PAW[0]} ${PAW[1]})">
    <ellipse cx="${PAW[0] + 6.4}" cy="${PAW[1] - 1.5}" rx="3.6" ry="4.6" fill="url(#k-paw)" stroke="${INK}" stroke-width="2.4"/>
    <ellipse cx="${PAW[0]}" cy="${PAW[1]}" rx="8.2" ry="9.4" fill="url(#k-paw)" stroke="${INK}" stroke-width="3"/>
    ${stroke(`M${PAW[0] - 3.5} ${PAW[1] + 5.2}v3.2M${PAW[0] + 0.5} ${PAW[1] + 6}v3.2`, LINE, 1.5)}
    <ellipse cx="${PAW[0] - 2.8}" cy="${PAW[1] - 3.5}" rx="2.8" ry="1.9" fill="#FFF0BF" opacity=".75"/>
  </g>`;

const ear = (x: number, flip: boolean) => {
  const s = `
    <path d="M${x - 12} 112C${x - 14} 98 ${x + 6} 92 ${x + 12} 104C${x + 10} 112 ${x + 2} 118 ${x - 12} 112Z" fill="url(#k-fur)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x - 7} 109C${x - 8} 101 ${x + 3} 98 ${x + 7} 105C${x + 5} 110 ${x} 112 ${x - 7} 109Z" fill="#E98A5C"/>`;
  return flip ? mirror(s) : s;
};

const maneBack = `
  <path d="${tufts([130, 128], [50, 44], [68, 62], 13, 0.16, 0.1)}" fill="url(#k-mane-back)" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`;

const maneFront = `
  <path d="${tufts([130, 128], [46, 40], [59, 53], 15, 0.2, 0.32)}" fill="url(#k-mane)" stroke="${LINE}" stroke-width="1.8" stroke-linejoin="round"/>
  ${stroke('M82 150C88 160 96 168 106 172M178 150C172 160 164 168 154 172M80 118C82 108 86 100 92 96M180 118C178 108 174 100 168 96', '#B8691A', 1.5, 'opacity=".7"')}`;

const FACE =
  'M86 120C86 100 106 92 130 92C154 92 174 100 174 120C175 127 181 131 179 137C182 141 177 146 176 149C172 163 154 171 130 171C106 171 88 163 84 149C83 146 78 141 81 137C79 131 85 127 86 120Z';
const faceBase = `
  <path d="${FACE}" fill="url(#k-face)" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="96" cy="148" rx="8.5" ry="5" fill="#FF7E5F" opacity=".32"/>
  <ellipse cx="164" cy="148" rx="8.5" ry="5" fill="#FF7E5F" opacity=".32"/>`;

const muzzle = `
  <path d="M130 141C122 136 108 140 108 150C108 158 117 162 124 160C126 163 134 163 136 160C143 162 152 158 152 150C152 140 138 136 130 141Z" fill="url(#k-muzzle)"/>
  ${dots([[115, 150], [118, 154.5], [113, 155]], 0.95, '#C98A3A')}${dots([[145, 150], [142, 154.5], [147, 155]], 0.95, '#C98A3A')}
  <path d="M122.5 140.5C122.5 136.5 137.5 136.5 137.5 140.5C137.5 144 133 147 130 147.5C127 147 122.5 144 122.5 140.5Z" fill="#4A2410"/>
  <ellipse cx="127" cy="139.2" rx="2.6" ry="1.3" fill="#fff" opacity=".55"/>
  ${stroke('M130 147.5V151', LINE, 2)}`;

const eye = (cx: number, outer: number) => `
  <ellipse cx="${cx}" cy="127" rx="13" ry="14.5" fill="#FFFDF6" stroke="${INK}" stroke-width="2.4"/>
  ${stroke(`M${cx - 12.6} 124A13 14.5 0 0 1 ${cx + 12.6} 124`, INK, 3.8)}
  ${stroke(`M${cx + outer * 12.2} 121.5l${outer * 3.6} -2.6`, INK, 2.4)}`;
// Irises sit a touch toward the nose, which reads as friendly rather than vacant.
const iris = (cx: number, inward: number) => `
  <ellipse cx="${cx + inward}" cy="129" rx="9.6" ry="11" fill="url(#k-iris)"/>
  <ellipse cx="${cx + inward}" cy="129.5" rx="5" ry="6.2" fill="${PUPIL}"/>
  <circle cx="${cx + inward + 3.6}" cy="123.8" r="3.6" fill="#fff"/>
  <circle cx="${cx + inward - 3.4}" cy="134" r="1.6" fill="#fff" opacity=".85"/>`;

const happyEyes =
  stroke('M98 131Q111 115 124 131M136 131Q149 115 162 131', INK, 4) + stroke('M98 131l-3.6-2.4M162 131l3.6-2.4', INK, 2.4);
const closedEyes =
  stroke('M99 128Q111 136 123 128M137 128Q149 136 161 128', INK, 3.6) + stroke('M99 128l-3.4 1.6M161 128l3.4 1.6', INK, 2.2);

const mouthSmile = stroke('M130 151Q126.5 156.5 120.5 153.5M130 151Q133.5 156.5 139.5 153.5', LINE, 2.4);
const mouthOpen = `
  <path d="M120.5 152.5Q130 155 139.5 152.5Q138.5 167 130 167Q121.5 167 120.5 152.5Z" fill="url(#k-mouth)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M124.5 162Q130 158 135.5 162Q133.5 166.2 130 166.2Q126.5 166.2 124.5 162Z" fill="#FF8C7A"/>
  <path d="M123 153.5Q130 155.5 137 153.5L136.5 156Q130 157.5 123.5 156Z" fill="#fff" opacity=".9"/>`;
const mouthO = `<ellipse cx="130" cy="156.5" rx="4.6" ry="5.4" fill="url(#k-mouth)" stroke="${INK}" stroke-width="2.2"/>`;
const mouthWavy = stroke('M120 156q2.5-3 5 0t5 0t5 0t5 0', LINE, 2.4);

// The pagdi: a dome wrapped in crossing folds, an embroidered band, a jewel.
function folds(): string {
  const band = (y: number) =>
    `<path d="M62 ${y + 40}C84 ${y + 12} 128 ${y - 2} 196 ${y + 2}L196 ${y + 12}C130 ${y + 8} 90 ${y + 22} 66 ${y + 50}Z" fill="url(#k-fold)"/>` +
    stroke(`M66 ${y + 50}C90 ${y + 22} 130 ${y + 8} 196 ${y + 12}`, '#C44412', 1.6, 'opacity=".8"') +
    stroke(`M64 ${y + 45}C86 ${y + 17} 128 ${y + 3} 196 ${y + 7}`, GOLD, 1.5, 'stroke-dasharray="0.1 5.5" opacity=".95"');
  const right = [44, 58, 72].map(band).join('');
  return `<g clip-path="url(#k-dome)">${mirror(right)}${right}
    <path d="M98 64C114 58 146 58 162 64" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="5" stroke-linecap="round"/></g>`;
}

const turban = `
  <path d="${DOME}" fill="url(#k-turban)"/>
  ${folds()}
  <path d="M73 108C68 74 98 56 130 56C162 56 192 74 187 108" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M69 106Q130 88 191 106L189 118Q130 101 71 118Z" fill="url(#k-band)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  ${stroke(zigzag([74, 111.5], [130, 95], [186, 111.5], 26, 1.9), GOLD, 1.4)}
  ${dots(quadPts([74, 108], [130, 91], [186, 108], 13), 0.9, '#FFE9A8')}
  ${dots(quadPts([75, 115], [130, 98], [185, 115], 13), 0.9, '#FFE9A8')}
  <circle cx="130" cy="84" r="9.5" fill="url(#k-gold)" stroke="${INK}" stroke-width="2.4"/>
  ${dots(Array.from({ length: 8 }, (_, i) => [130 + 6.8 * Math.cos((i * Math.PI) / 4), 84 + 6.8 * Math.sin((i * Math.PI) / 4)] as P), 1.2, '#FFF8E0')}
  <circle cx="130" cy="84" r="4.3" fill="url(#k-ruby)" stroke="#7A1020" stroke-width=".8"/>
  <path d="M130 94C127 97 127 100 130 101.5C133 100 133 97 130 94Z" fill="#FFF8E8" stroke="${INK}" stroke-width="1.2"/>`;

// Pleated fan rising behind the jewel.
function crestSvg(): string {
  const base: P = [130, 66];
  const r = 36;
  const spread = 1.1;
  const a0 = -Math.PI / 2 - spread / 2;
  const on = (ang: number): P => [base[0] + r * Math.cos(ang), base[1] + r * Math.sin(ang)];
  const out: string[] = [];
  const pleats = 6;
  for (let i = 0; i < pleats; i++) {
    const p0 = on(a0 + (i * spread) / pleats);
    const p1 = on(a0 + ((i + 1) * spread) / pleats);
    out.push(
      `<path d="M${pt(base)}L${pt(p0)}Q${f((p0[0] + p1[0]) / 2)} ${f(Math.min(p0[1], p1[1]) - 4)} ${pt(p1)}Z" fill="${i % 2 ? '#F36A1F' : '#FF9A4A'}"/>`,
    );
  }
  const pa = on(a0);
  const pb = on(a0 + spread);
  return (
    out.join('') +
    stroke(`M${pt(pa)}Q130 22 ${pt(pb)}`, GOLD, 3) +
    `<path d="M${pt(base)}L${pt(pa)}Q130 18 ${pt(pb)}Z" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>`
  );
}

const book = `
  <path d="M96 184L130 191L164 184V214L130 221L96 214Z" fill="#8B3E1E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M100 186.5L130 192.5V217L100 211ZM160 186.5L130 192.5V217L160 211Z" fill="#FFF6E0" stroke="#C9A06A" stroke-width="1"/>
  ${stroke('M105 195l20 4M105 200.5l20 4M105 206l14 2.8M155 195l-20 4M155 200.5l-20 4M155 206l-14 2.8', '#C9A06A', 1.3)}
  <path d="M129 192.5h2V217h-2Z" fill="#E4C79A"/>`;
const page = `<path d="M130 192.5L160 186.5V211L130 217Z" fill="#FFFBEE" stroke="#C9A06A" stroke-width="1"/>`;

const dhokla = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-6.5 -2L-1 -5.5L6.5 -3L1 0.5Z" fill="#FFEB8A" stroke="#B88A12" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M-6.5 -2L1 0.5V6L-6.5 3.5Z" fill="#F2C536" stroke="#B88A12" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M1 0.5L6.5 -3V2.5L1 6Z" fill="#E0AE22" stroke="#B88A12" stroke-width="1.1" stroke-linejoin="round"/>
    ${dots([[-2, -3], [1.5, -2], [3.5, -3.5]], 0.75, '#2E1A0A')}
    <path d="M-3 -2.6l2.4 -1.2" stroke="#3E9B4F" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;

const plate = `
  <ellipse cx="173" cy="205" rx="21" ry="7" fill="#FFFFFF" stroke="${INK}" stroke-width="2.6"/>
  <ellipse cx="173" cy="204" rx="15" ry="4.4" fill="#F5EEE2" stroke="#D9CCB8" stroke-width="1"/>
  ${dhokla(165, 199)}${dhokla(180, 199)}${dhokla(172, 193)}`;

const star = (fill: string, s = 1) => `
  <circle r="${11 * s}" fill="url(#k-glow)"/>
  <path d="M0 ${-10 * s}C${1.2 * s} ${-3 * s} ${3 * s} ${-1.2 * s} ${10 * s} 0C${3 * s} ${1.2 * s} ${1.2 * s} ${3 * s} 0 ${10 * s}C${-1.2 * s} ${3 * s} ${-3 * s} ${1.2 * s} ${-10 * s} 0C${-3 * s} ${-1.2 * s} ${-1.2 * s} ${-3 * s} 0 ${-10 * s}Z" fill="${fill}"/>`;
const heart = `<path d="M0 7C-20-5-9-19 0-9C9-19 20-5 0 7Z" fill="#FF6F94" stroke="#D9456F" stroke-width="1.3"/><ellipse cx="-5.5" cy="-8" rx="3" ry="1.8" fill="#fff" opacity=".6" transform="rotate(-30 -5.5 -8)"/>`;
const zee = (s: number) => stroke(`M${-5 * s} ${-5 * s}h${10 * s}L${-5 * s} ${5 * s}h${10 * s}`, '#7F95B8', 3);
const note = `<path d="M0 0v-19l13-3v17" fill="none" stroke="${INK}" stroke-width="2.4"/><ellipse cx="-3" rx="5" ry="3.6" fill="${INK}"/><ellipse cx="10" cy="-5" rx="5" ry="3.6" fill="${INK}"/>`;
const bubbleDot = (r: number) => `<circle r="${r}" fill="#FFFAF0" stroke="${INK}" stroke-width="1.8"/>`;
const at = (x: number, y: number, svg: string) => `<g transform="translate(${x} ${y})">${svg}</g>`;

const fx = (effect: Effect, items: [string, number, number, string][]): RigNode[] =>
  items.map(([id, x, y, svg]) => ({ id, pivot: [x, y], svg: at(x, y, svg), when: { effect } }));

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
        children: side === 'L' ? [{ id: 'snack', svg: dhokla(86, 208, 0.95), when: { prop: 'plate' } }] : [],
      },
    ],
  };
};

export const RIG: RigNode = {
  id: 'root',
  pivot: [130, 238],
  children: [
    { id: 'shadow', pivot: [130, 239], svg: shadow },
    {
      id: 'breath',
      pivot: [130, 238],
      children: [
        { id: 'tail', pivot: [112, 207], svg: tail, children: [{ id: 'tuft', pivot: [60, 182], svg: tuft }] },
        { id: 'legL', pivot: [114, 206], svg: leg(114) },
        { id: 'legR', pivot: [146, 206], svg: leg(146) },
        { id: 'body', pivot: [130, 222], svg: body },
        { id: 'book', svg: book, when: { prop: 'book' }, children: [{ id: 'page', pivot: [130, 200], svg: page }] },
        { id: 'plate', svg: plate, when: { prop: 'plate' } },
        arm('L'),
        arm('R'),
        {
          id: 'head',
          pivot: [130, 168],
          children: [
            { id: 'maneBack', svg: maneBack },
            { id: 'earL', pivot: [80, 110], svg: ear(76, false) },
            { id: 'earR', pivot: [180, 110], svg: ear(76, true) },
            { id: 'mane', svg: maneFront },
            { id: 'face', svg: faceBase },
            {
              id: 'features',
              children: [
                { id: 'muzzle', svg: muzzle },
                {
                  id: 'eyes',
                  pivot: [130, 127],
                  when: { eyes: ['open'] },
                  children: [
                    { id: 'eyeWhites', svg: eye(111, -1) + eye(149, 1) },
                    { id: 'pupils', svg: iris(111, 1.6) + iris(149, -1.6) },
                  ],
                },
                { id: 'eyesHappy', svg: happyEyes, when: { eyes: ['happy'] } },
                { id: 'eyesClosed', svg: closedEyes, when: { eyes: ['closed'] } },
                { id: 'mouthSmile', svg: mouthSmile, when: { mouth: ['smile'] } },
                { id: 'mouthOpen', pivot: [130, 153], svg: mouthOpen, when: { mouth: ['open'] } },
                { id: 'mouthO', pivot: [130, 156], svg: mouthO, when: { mouth: ['o'] } },
                { id: 'mouthWavy', svg: mouthWavy, when: { mouth: ['wavy'] } },
              ],
            },
            { id: 'crest', pivot: [130, 66], svg: crestSvg() },
            { id: 'turban', pivot: [130, 108], svg: turban },
          ],
        },
      ],
    },
    ...fx('sparkles', [
      ['fx1', 56, 100, star(GOLD)],
      ['fx2', 206, 94, star('#FFB347', 0.85)],
      ['fx3', 74, 46, star('#FFB347', 0.75)],
      ['fx4', 192, 36, star(GOLD, 1.1)],
    ]),
    ...fx('hearts', [
      ['fx1', 60, 112, heart],
      ['fx2', 202, 102, heart],
      ['fx3', 82, 58, heart],
    ]),
    ...fx('zzz', [
      ['fx1', 184, 84, zee(0.7)],
      ['fx2', 198, 64, zee(0.9)],
      ['fx3', 214, 42, zee(1.1)],
    ]),
    ...fx('thoughts', [
      ['fx1', 184, 86, bubbleDot(3.5)],
      ['fx2', 196, 70, bubbleDot(5)],
      ['fx3', 210, 50, bubbleDot(7)],
    ]),
    ...fx('sweat', [
      [
        'fx1',
        178,
        98,
        `<path d="M0-9C4.5-2 6.5 2 6.5 5.5A6.5 6.5 0 0 1-6.5 5.5C-6.5 2-4.5-2 0-9Z" fill="#A6DEF8" stroke="#3E8FC0" stroke-width="1.5"/><ellipse cx="-2" cy="3" rx="1.6" ry="2.6" fill="#fff" opacity=".8"/>`,
      ],
    ]),
    ...fx('notes', [
      ['fx1', 50, 84, note],
      ['fx2', 208, 76, note],
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

// Particle helpers, offset so they don't move in lockstep.
const shift = (values: number[], by: number) => {
  const core = values.slice(0, -1);
  const k = ((by % core.length) + core.length) % core.length;
  const out = [...core.slice(k), ...core.slice(0, k)];
  return [...out, out[0]];
};
const twinkle = (i: number): Track => ({
  sx: shift([0.2, 1.15, 0.85, 0.2, 0.2, 0.2], i),
  sy: shift([0.2, 1.15, 0.85, 0.2, 0.2, 0.2], i),
  opacity: shift([0, 1, 0.8, 0, 0, 0], i),
  rotate: [0, 45],
});
const rise = (i: number, dist = 26): Track => ({
  y: shift([0, -dist / 3, -(2 * dist) / 3, -dist, 0, 0], i * 2),
  x: shift([0, 3, -2, 3, 0, 0], i * 2),
  opacity: shift([0, 1, 1, 0, 0, 0], i * 2),
  sx: shift([0.6, 1, 1, 0.9, 0.6, 0.6], i * 2),
  sy: shift([0.6, 1, 1, 0.9, 0.6, 0.6], i * 2),
});

// Arm posing by target: say where the paw should be and the shoulder and
// elbow angles are solved (two-bone IK), always bending the elbow outward.
const ARM_L1 = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
const ARM_L2 = Math.hypot(PAW[0] - ELBOW[0], PAW[1] - ELBOW[1]);
const DEF_UPPER = Math.atan2(ELBOW[1] - SHOULDER[1], ELBOW[0] - SHOULDER[0]);
const DEF_FORE = Math.atan2(PAW[1] - ELBOW[1], PAW[0] - ELBOW[0]);
const toDeg = (r: number) => (r * 180) / Math.PI;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

function solveArm(side: 'L' | 'R', target: P): [number, number] {
  const S: P = side === 'L' ? SHOULDER : [mirrorX(SHOULDER[0]), SHOULDER[1]];
  const defU = side === 'L' ? DEF_UPPER : Math.PI - DEF_UPPER;
  const defF = side === 'L' ? DEF_FORE : Math.PI - DEF_FORE;
  const dx = target[0] - S[0];
  const dy = target[1] - S[1];
  const d = Math.max(Math.abs(ARM_L1 - ARM_L2) + 0.01, Math.min(ARM_L1 + ARM_L2 - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const bend = Math.acos((ARM_L1 ** 2 + d ** 2 - ARM_L2 ** 2) / (2 * ARM_L1 * d));
  const options = [base + bend, base - bend].map((u) => {
    const e: P = [S[0] + ARM_L1 * Math.cos(u), S[1] + ARM_L1 * Math.sin(u)];
    return { u, e };
  });
  options.sort((a, b) => Math.abs(b.e[0] - 130) - Math.abs(a.e[0] - 130) || b.e[1] - a.e[1]);
  const { u, e } = options[0];
  const f = Math.atan2(target[1] - e[1], target[0] - e[0]);
  const upper = wrap(toDeg(u - defU));
  return [upper, wrap(toDeg(f - defF) - upper)];
}

// Tracks for one arm through a list of paw targets (optionally timed).
function reach(side: 'L' | 'R', targets: P[], at?: number[]): Record<string, Track> {
  const upper: number[] = [];
  const fore: number[] = [];
  for (const t of targets) {
    let [u, f] = solveArm(side, t);
    if (upper.length) {
      while (u - upper[upper.length - 1] > 180) u -= 360;
      while (u - upper[upper.length - 1] < -180) u += 360;
      while (f - fore[fore.length - 1] > 180) f -= 360;
      while (f - fore[fore.length - 1] < -180) f += 360;
    }
    upper.push(+u.toFixed(2));
    fore.push(+f.toFixed(2));
  }
  return { [`arm${side}`]: { at, rotate: upper }, [`fore${side}`]: { at, rotate: fore } };
}

const REST_L: P = PAW;
const REST_R: P = [mirrorX(PAW[0]), PAW[1]];

export const CLIPS: Record<Pose, Clip> = {
  // Weight shifts side to side; the head, tail, tuft and crest each follow a
  // beat later (overlapping action), and an ear flicks now and then.
  idle: {
    ms: 4800,
    loop: true,
    face: { eyes: 'open', mouth: 'smile' },
    tracks: {
      ...reach('L', [REST_L, [82.4, 216.2], REST_L, [83.2, 215.6], REST_L]),
      ...reach('R', [REST_R, [176.8, 215.6], REST_R, [177.6, 216.2], REST_R]),
      root: { x: [0, 1.2, 0, -1.2, 0], rotate: [0, 0.6, 0, -0.6, 0] },
      head: { rotate: [0.6, 2.4, 0.4, -2, 0.6] },
      tail: { rotate: [-2, 6, 3, -6, -2] },
      tuft: { rotate: [6, -4, -9, 4, 6] },
      crest: { rotate: [1, -3, -1, 4, 1] },
      earL: { at: [0, 0.58, 0.61, 0.64, 0.67, 1], rotate: [0, 0, -16, 4, 0, 0] },
      earR: { at: [0, 0.2, 0.23, 0.26, 0.29, 1], rotate: [0, 0, 16, -4, 0, 0] },
    },
  },
  // A little dip (anticipation), arm up, wave from the elbow, settle.
  wave: {
    ms: 2200,
    loop: true,
    face: { eyes: 'happy', mouth: 'open' },
    bubble: 'કેમ છો!',
    front: ['armR'],
    tracks: {
      ...reach('R', [REST_R, [178, 218], [190, 159], [183, 152], [192, 165], [183, 152], [190, 159], [186, 168], REST_R], [0, 0.1, 0.24, 0.36, 0.48, 0.6, 0.72, 0.85, 1]),
      root: { at: [0, 0.1, 0.24, 0.85, 1], y: [0, 2.5, -2, -1, 0], rotate: [0, -1, 2.5, 2, 0] },
      head: { at: [0, 0.14, 0.3, 0.6, 0.88, 1], rotate: [0, -3, 8, 6, 7, 0] },
      tail: { at: [0, 0.2, 0.4, 0.6, 0.8, 1], rotate: [0, 12, -4, 12, -4, 0] },
      tuft: { at: [0, 0.26, 0.46, 0.66, 0.86, 1], rotate: [0, -12, 8, -12, 8, 0] },
      crest: { at: [0, 0.16, 0.34, 0.5, 0.66, 1], rotate: [0, 6, -9, 5, -6, 0] },
      earR: { at: [0, 0.24, 0.32, 1], rotate: [0, 0, 10, 0] },
    },
  },
  // Crouch, spring up with a stretch, land with a squash.
  cheer: {
    ms: 1050,
    loop: true,
    face: { eyes: 'happy', mouth: 'open' },
    effect: 'sparkles',
    front: ['armL', 'armR'],
    tracks: {
      ...reach('L', [REST_L, [86, 219], [78, 154], [79, 162], [80, 196], REST_L], [0, 0.16, 0.44, 0.62, 0.8, 1]),
      ...reach('R', [REST_R, [174, 219], [182, 154], [181, 162], [180, 196], REST_R], [0, 0.16, 0.44, 0.62, 0.8, 1]),
      root: {
        at: [0, 0.16, 0.44, 0.62, 0.8, 1],
        y: [0, 3.5, -21, -10, 0.5, 0],
        sx: [1, 1.08, 0.94, 0.98, 1.09, 1],
        sy: [1, 0.9, 1.08, 1.03, 0.9, 1],
      },
      shadow: { at: [0, 0.16, 0.44, 0.62, 0.8, 1], sx: [1, 1.08, 0.62, 0.78, 1.1, 1], opacity: [1, 1, 0.5, 0.7, 1, 1] },
      head: { at: [0, 0.16, 0.44, 0.62, 0.8, 1], y: [0, 2, -2, -1, 2.5, 0], rotate: [0, 1, -2, 1, 0, 0] },
      crest: { at: [0, 0.22, 0.5, 0.7, 0.86, 1], rotate: [0, 7, -12, 4, 10, 0] },
      earL: { at: [0, 0.22, 0.5, 0.7, 0.86, 1], rotate: [0, 6, -14, 4, 8, 0] },
      earR: { at: [0, 0.22, 0.5, 0.7, 0.86, 1], rotate: [0, -6, 14, -4, -8, 0] },
      tail: { at: [0, 0.2, 0.48, 0.66, 0.84, 1], rotate: [0, -8, 16, 8, -10, 0] },
      tuft: { at: [0, 0.26, 0.54, 0.72, 0.9, 1], rotate: [0, 10, -16, -4, 12, 0] },
      legL: { at: [0, 0.16, 0.44, 0.62, 0.8, 1], rotate: [0, 0, 12, 6, 0, 0] },
      legR: { at: [0, 0.16, 0.44, 0.62, 0.8, 1], rotate: [0, 0, -12, -6, 0, 0] },
      fx1: twinkle(0),
      fx2: twinkle(2),
      fx3: twinkle(4),
      fx4: twinkle(1),
    },
  },
  // Reading, nodding along, and turning a page.
  read: {
    ms: 4600,
    loop: true,
    face: { eyes: 'open', mouth: 'smile', look: [0, 3.5] },
    prop: 'book',
    tracks: {
      ...reach('L', [[110, 208]]),
      ...reach('R', [[150, 208], [150, 208], [144, 205], [136, 203], [150, 208], [150, 208]], [0, 0.56, 0.62, 0.72, 0.8, 1]),
      page: { at: [0, 0.6, 0.72, 0.76, 1], sx: [1, 1, -0.2, -1, -1], opacity: [0, 0, 1, 1, 0] },
      head: { at: [0, 0.25, 0.5, 0.62, 0.8, 1], rotate: [1, 2.5, 1, -2, 1, 1], y: [3, 4, 3, 2, 3, 3] },
      tail: { rotate: [0, 5, 0, -4, 0] },
      tuft: { rotate: [4, -3, -6, 3, 4] },
      crest: { rotate: [0, 2, 0, -2, 0] },
    },
  },
  // Holding a plate of dhokla, popping a piece in, chewing happily.
  eat: {
    ms: 2600,
    loop: true,
    face: { eyes: 'open', mouth: 'o' },
    prop: 'plate',
    front: ['plate', 'armL'],
    tracks: {
      ...reach('R', [[175, 213]]),
      ...reach('L', [REST_L, [83, 218], [124, 161], [124, 161], [106, 194], REST_L, REST_L], [0, 0.14, 0.34, 0.46, 0.62, 0.8, 1]),
      snack: { at: [0, 0.4, 0.41, 0.9, 0.91, 1], opacity: [1, 1, 0, 0, 1, 1] },
      mouthO: {
        at: [0, 0.34, 0.42, 0.52, 0.62, 0.72, 0.82, 1],
        sy: [1, 1.2, 0.35, 0.8, 0.35, 0.8, 0.35, 1],
        sx: [1, 1, 1.25, 1, 1.25, 1, 1.25, 1],
      },
      head: { at: [0, 0.34, 0.42, 0.52, 0.62, 0.72, 1], rotate: [0, -6, -2, -1, 1, -1, 0], y: [0, 3, 2, 0, 1, 0, 0] },
      tail: { rotate: [0, 9, 0, 9, 0] },
      tuft: { rotate: [0, -8, 4, -8, 0] },
    },
  },
  // Paw to chin, head tilted, eyes up.
  think: {
    ms: 3600,
    loop: true,
    face: { eyes: 'open', mouth: 'smile', look: [-2.5, -3] },
    effect: 'thoughts',
    front: ['armR'],
    tracks: {
      ...reach('R', [[162, 160], [162, 160], [163, 163], [162, 160], [163, 163], [162, 160]], [0, 0.3, 0.36, 0.42, 0.48, 1]),
      head: { rotate: [-6, -8, -6] },
      tail: { rotate: [0, 6, 0] },
      tuft: { rotate: [4, -4, 4] },
      fx1: { opacity: [0, 1, 1, 1, 0], sx: [0.6, 1, 1, 1, 0.6], sy: [0.6, 1, 1, 1, 0.6] },
      fx2: { opacity: [0, 0, 1, 1, 0], sx: [0.6, 0.6, 1, 1, 0.6], sy: [0.6, 0.6, 1, 1, 0.6] },
      fx3: { opacity: [0, 0, 0, 1, 0], sx: [0.6, 0.6, 0.6, 1, 0.6], sy: [0.6, 0.6, 0.6, 1, 0.6] },
    },
  },
  // Flinch, little head shake, ears back.
  oops: {
    ms: 1250,
    loop: false,
    face: { eyes: 'open', mouth: 'wavy' },
    effect: 'sweat',
    tracks: {
      ...reach('L', [REST_L, [70, 188], [72, 192], [82, 208], REST_L], [0, 0.1, 0.3, 0.8, 1]),
      ...reach('R', [REST_R, [190, 188], [188, 192], [178, 208], REST_R], [0, 0.1, 0.3, 0.8, 1]),
      root: { at: [0, 0.1, 0.3, 1], y: [0, 3, 0, 0], sx: [1, 1.05, 1, 1], sy: [1, 0.94, 1, 1] },
      head: { at: [0, 0.1, 0.28, 0.44, 0.6, 0.76, 1], rotate: [0, -3, -10, 8, -5, 2, 0], y: [0, 2, 1, 0, 0, 0, 0] },
      earL: { at: [0, 0.1, 0.8, 1], rotate: [0, -22, -16, 0] },
      earR: { at: [0, 0.1, 0.8, 1], rotate: [0, 22, 16, 0] },
      crest: { at: [0, 0.16, 0.34, 0.5, 0.66, 1], rotate: [0, 8, -10, 7, -3, 0] },
      tail: { at: [0, 0.1, 0.4, 1], rotate: [0, 14, 6, 0] },
      fx1: { at: [0, 0.15, 0.7, 1], y: [-4, 0, 9, 13], opacity: [0, 1, 1, 0] },
    },
  },
  // Two quick nods; the crest and tail catch up after.
  nod: {
    ms: 1000,
    loop: false,
    face: { eyes: 'happy', mouth: 'smile' },
    tracks: {
      head: { at: [0, 0.18, 0.36, 0.54, 0.74, 1], y: [0, 5.5, -1, 4.5, 0, 0], rotate: [0, 3, -1, 2, 0, 0] },
      root: { at: [0, 0.18, 0.36, 0.54, 0.74, 1], sy: [1, 0.97, 1.01, 0.98, 1, 1] },
      crest: { at: [0, 0.24, 0.42, 0.6, 0.8, 1], rotate: [0, -7, 9, -5, 3, 0] },
      earL: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, 6, -6, 4, 0] },
      earR: { at: [0, 0.24, 0.42, 0.6, 1], rotate: [0, -6, 6, -4, 0] },
      tail: { at: [0, 0.3, 0.55, 0.8, 1], rotate: [0, 14, -4, 10, 0] },
      tuft: { at: [0, 0.38, 0.62, 0.88, 1], rotate: [0, -12, 6, -8, 0] },
    },
  },
  // Dozing: head drooped, slow deep breaths, snoring a little.
  sleep: {
    ms: 5200,
    loop: true,
    face: { eyes: 'closed', mouth: 'o' },
    effect: 'zzz',
    tracks: {
      ...reach('L', [[86, 214]]),
      ...reach('R', [[174, 214]]),
      root: { sy: [1, 1.03, 1], sx: [1, 0.99, 1] },
      head: { rotate: [9, 11, 9], y: [6, 8, 6] },
      mouthO: { sy: [0.45, 0.95, 0.45], sx: [0.8, 1, 0.8] },
      crest: { rotate: [14, 17, 14] },
      earL: { rotate: [-10] },
      earR: { rotate: [10] },
      tail: { rotate: [10, 12, 10] },
      tuft: { rotate: [-6, -9, -6] },
      fx1: rise(0, 16),
      fx2: rise(1, 16),
      fx3: rise(2, 16),
    },
  },
  // Garba: step and clap, side to side.
  dance: {
    ms: 1400,
    loop: true,
    face: { eyes: 'happy', mouth: 'open' },
    effect: 'notes',
    front: ['armL', 'armR'],
    tracks: {
      ...reach('L', [[78, 154], [80, 210], [78, 154], [80, 210], [78, 154]]),
      ...reach('R', [[180, 210], [182, 154], [180, 210], [182, 154], [180, 210]]),
      root: { x: [-6, 0, 6, 0, -6], rotate: [-5, 0, 5, 0, -5], y: [0, -5, 0, -5, 0] },
      head: { rotate: [7, 1, -7, -1, 7] },
      legL: { rotate: [0, -14, 0, 0, 0] },
      legR: { rotate: [0, 0, 0, 14, 0] },
      tail: { rotate: [-12, -2, 12, 2, -12] },
      tuft: { rotate: [10, 12, -10, -12, 10] },
      crest: { rotate: [-6, -10, 6, 10, -6] },
      fx1: rise(0, 18),
      fx2: rise(1, 18),
    },
  },
  // A big hug for you.
  love: {
    ms: 2600,
    loop: true,
    face: { eyes: 'happy', mouth: 'smile' },
    effect: 'hearts',
    tracks: {
      ...reach('L', [[126, 197], [124, 199.5], [126, 197]]),
      ...reach('R', [[134, 197], [136, 199.5], [134, 197]]),
      root: { rotate: [0, 2.5, 0, -2.5, 0], sy: [1, 1.02, 1, 1.02, 1] },
      head: { rotate: [4, 7, 4, 1, 4] },
      tail: { rotate: [0, 10, 0, 10, 0] },
      tuft: { rotate: [0, -8, 0, -8, 0] },
      fx1: rise(0),
      fx2: rise(1),
      fx3: rise(2),
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
// head, then the shoulder tufts that cover them.
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
export const BREATH_MS = 3400;
export const BREATH_SY = [1, 1.016, 1];
