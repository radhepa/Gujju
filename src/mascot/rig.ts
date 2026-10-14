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
  'k-mane-back': `<linearGradient id="k-mane-back" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#D9781E"/><stop offset="1" stop-color="#93470E"/></linearGradient>`,
  'k-mane': `<linearGradient id="k-mane" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#F3A63D"/><stop offset="1" stop-color="#C76D18"/></linearGradient>`,
  'k-kurta': `<linearGradient id="k-kurta" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#EE5C1E"/><stop offset="1" stop-color="#B2370C"/></linearGradient>`,
  'k-panel': `<linearGradient id="k-panel" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#FFA556"/><stop offset=".5" stop-color="#FB7E33"/><stop offset="1" stop-color="#E55F1E"/></linearGradient>`,
  'k-sleeve': `<linearGradient id="k-sleeve" gradientUnits="userSpaceOnUse" x1="78" y1="160" x2="104" y2="200"><stop stop-color="#FFA556"/><stop offset=".55" stop-color="#F7782C"/><stop offset="1" stop-color="#DC5A1A"/></linearGradient>`,
  'k-paw': `<linearGradient id="k-paw" gradientUnits="userSpaceOnUse" x1="76" y1="192" x2="92" y2="212"><stop stop-color="#AE5A1C"/><stop offset="1" stop-color="#5E2A0A"/></linearGradient>`,
  'k-turban': `<linearGradient id="k-turban" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#FF8A3E"/><stop offset=".55" stop-color="#F0601F"/><stop offset="1" stop-color="#C63E0E"/></linearGradient>`,
  'k-fold': `<linearGradient id="k-fold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFB774"/><stop offset="1" stop-color="#FF8A3E"/></linearGradient>`,
  'k-gold': `<linearGradient id="k-gold" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#FFF1B0"/><stop offset=".5" stop-color="#FFD36E"/><stop offset="1" stop-color="#D9971F"/></linearGradient>`,
  'k-aura': `<radialGradient id="k-aura"><stop stop-color="#FFB347" stop-opacity=".26"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>`,
  'k-glow': `<radialGradient id="k-glow"><stop stop-color="#FFF3B0" stop-opacity=".85"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient>`,
};

const DOME = 'M69 82C63 48 94 27 131.5 27C169 27 200 48 194 82Q131.5 56 69 82Z';
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

// Straight-edged spikes round an ellipse, like the fluff on Pip's cheeks.
function spikes(c: P, inner: P, outer: P, n: number, lean: number, start = 0): string {
  const on = (r: P, ang: number): P => [c[0] + r[0] * Math.cos(ang), c[1] + r[1] * Math.sin(ang)];
  const step = (Math.PI * 2) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = start + i * step;
    d += `${i ? 'L' : 'M'}${pt(on(inner, a0))}L${pt(on(outer, a0 + step / 2 + lean))}`;
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

// Arms: puffy sleeves on a shoulder and an elbow, Pip's dark paws.
export const SHOULDER: P = [97, 166];
export const ELBOW: P = [88, 183];
export const PAW: P = [84, 201];
const upperArm = `
  <path d="${limb(SHOULDER, 8.4, ELBOW, 9.2)}" fill="url(#k-sleeve)"/>
  ${stroke('M92.5 171Q89 176 87.5 181', '#FFC98C', 1.8, 'opacity=".7"')}`;
const forearm = `
  <path d="${limb(ELBOW, 9.2, [85.4, 192], 8.3)}" fill="url(#k-sleeve)"/>
  <path d="${limb([85.6, 191.6], 8.8, [85, 195], 8.5)}" fill="${BAND}"/>
  <g transform="rotate(12 ${PAW[0]} ${PAW[1]})">
    <ellipse cx="${PAW[0] + 6.6}" cy="${PAW[1] - 1.2}" rx="3.8" ry="4.8" fill="url(#k-paw)"/>
    <ellipse cx="${PAW[0]}" cy="${PAW[1]}" rx="8.6" ry="9.6" fill="url(#k-paw)"/>
    ${stroke(`M${PAW[0] - 3.6} ${PAW[1] + 5.4}v2.8M${PAW[0] + 0.6} ${PAW[1] + 6.2}v2.8`, '#E6A15A', 1.6)}
    <ellipse cx="${PAW[0] - 2.6}" cy="${PAW[1] - 3.6}" rx="2.8" ry="1.8" fill="#D9874A" opacity=".55"/>
  </g>`;

// Head: a spiky mane behind Pip's face shape, round lion ears, the pagdi.
const maneBack = `<path d="${spikes([130, 118], [62, 50], [82, 66], 16, 0.12, 0.1)}" fill="url(#k-mane-back)"/>`;
const maneFront = `
  <path d="${spikes([130, 120], [58, 46], [72, 58], 18, 0.14, 0.28)}" fill="url(#k-mane)"/>
  ${stroke('M70 140L80 150M190 140L180 150M84 166L96 170M176 166L164 170', '#FFC062', 2.2, 'opacity=".55"')}`;

const ear = `
  <circle cx="64" cy="86" r="13" fill="url(#k-dark)"/>
  <circle cx="67" cy="87" r="7" fill="#F2B977"/>
  <circle cx="60" cy="80" r="2.2" fill="#FFE3B0" opacity=".8"/>`;

// His own face, drawn in Pip's manner: a broad lion head with soft cheek
// fluff, round amber bead eyes, tufted brows, a two-lobed muzzle.
const faceCoat = `
  <path d="M72 92C72 62 98 46 130 46C162 46 188 62 188 92C190 100 197 104 195 112C200 116 196 124 192 127C194 133 189 139 184 140C176 160 156 170 130 170C104 170 84 160 76 140C71 139 66 133 68 127C64 124 60 116 65 112C63 104 70 100 72 92Z" fill="url(#k-coat)"/>
  ${stroke('M70 118C72 124 74 128 77 131M190 118C188 124 186 128 183 131', '#FFE6A0', 2, 'opacity=".55"')}`;

// Light fur under the eyes, a lion's tear lines, the puffy whisker pads.
const patches = `
  <path d="M86 119Q100 129 114 119Q112 132 100 134Q88 132 86 119ZM146 119Q160 129 174 119Q172 132 160 134Q148 132 146 119Z" fill="url(#k-cream)"/>
  ${stroke('M110.5 121Q114 129 118.5 134M149.5 121Q146 129 141.5 134', '#B5601E', 2, 'opacity=".5"')}
  <path d="M130 132C124 128 108 130 106 141C104 151 114 157 123 154C126 158 134 158 137 154C146 157 156 151 154 141C152 130 136 128 130 132Z" fill="url(#k-cream)"/>
  ${dots([[114, 142], [117, 146.5], [112, 147.5], [146, 142], [143, 146.5], [148, 147.5]], 1, '#D39552')}`;

const blush = `<g fill="#F09BB0" opacity=".55"><circle cx="86" cy="134" r="6.5"/><circle cx="174" cy="134" r="6.5"/></g>`;
const blushHot = `<g fill="#F09BB0" opacity=".5"><circle cx="86" cy="134" r="8"/><circle cx="174" cy="134" r="8"/></g>`;

// Tufted brows: thick at the inner end, tapering out.
const browL = `<path d="${taper([107.5, 95], [102, 91], [95.5, 91], [89, 96], 5.4, 1.8)}" fill="${BROW}"/>`;
const browR = mirror(browL);

// Round bead eyes with bright amber, highlight on the right, a lash flick.
const bead = (x: number, outer: number) => `
  <g transform="translate(${x} 111)">
    <ellipse rx="10.5" ry="11.5" fill="${EYE}"/>
    <ellipse cy="4.5" rx="7" ry="5.6" fill="#C9812E"/>
    <circle cx="3.6" cy="-4.2" r="3.4" fill="#fff"/>
    <circle cx="-3.6" cy="4" r="1.5" fill="#FFE2B0"/>
    ${stroke(`M${outer * 9.6} -5.5l${outer * 3.6} -2.6`, EYE, 2.4)}
  </g>`;

const happyEyes =
  stroke('M90 115Q100 102 110 115M150 115Q160 102 170 115', EYE, 4.4) + stroke('M90 115l-3.4-2.2M170 115l3.4-2.2', EYE, 2.2);
const closedEyes =
  stroke('M91 112Q100 119 109 112M151 112Q160 119 169 112', EYE, 4) + stroke('M91 112l-3.2 1.4M169 112l3.2 1.4', EYE, 2);

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

// The pagdi: a wrapped dome above Pip's band, a diamond jewel, ties behind.
function folds(): string {
  const band = (y: number) =>
    `<path d="M58 ${y + 36}C82 ${y + 8} 128 ${y - 4} 200 ${y}L200 ${y + 13}C130 ${y + 9} 88 ${y + 21} 62 ${y + 49}Z" fill="url(#k-fold)" opacity=".7"/>`;
  const right = [26, 46].map(band).join('');
  return `<g clip-path="url(#k-dome)">${mirror(right)}${right}</g>`;
}

const turban = `
  <path d="${DOME}" fill="url(#k-turban)"/>
  ${folds()}
  ${pip(stroke('M103 47q24-13 43-8', '#FFE2C0', 5, 'opacity=".5"'))}
  ${pip(`<path d="M74 81q60-25 125 0l1 13q-63-23-128 0Z" fill="${BAND}"/>`)}
  ${pip(stroke('M75 83q60-24 122 0', '#FFF8E2', 2))}
  ${dots(quadPts([70, 87.5], [130.5, 63.5], [193, 87.5], 15), 1.1, GOLD_DEEP)}
  <path d="M130 64l9 11-9 11-9-11Z" fill="url(#k-gold)"/>
  <path d="M130 69.5l4.6 5.5-4.6 5.5-4.6-5.5Z" fill="#D7263D"/>
  <path d="M128.6 71.5l2-2.4" stroke="#FF9AAE" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M130 88C128 90.5 128 92.5 130 93.5C132 92.5 132 90.5 130 88Z" fill="#FFFBEF"/>`;

// The kalgi: a pleated fan rising behind the dome.
function crestSvg(): string {
  const base: P = [130, 36];
  const r = 32;
  const spread = 1.05;
  const a0 = -Math.PI / 2 - spread / 2;
  const on = (ang: number): P => [base[0] + r * Math.cos(ang), base[1] + r * Math.sin(ang)];
  const pleats = 6;
  const out: string[] = [];
  for (let i = 0; i < pleats; i++) {
    const p0 = on(a0 + (i * spread) / pleats);
    const p1 = on(a0 + ((i + 1) * spread) / pleats);
    out.push(
      `<path d="M${pt(base)}L${pt(p0)}Q${f((p0[0] + p1[0]) / 2)} ${f(Math.min(p0[1], p1[1]) - 3.5)} ${pt(p1)}Z" fill="${i % 2 ? '#F0601F' : '#FF9A4A'}"/>`,
    );
  }
  const pa = on(a0);
  const pb = on(a0 + spread);
  return out.join('') + stroke(`M${pt(pa)}Q130 -2 ${pt(pb)}`, GOLD, 3);
}

// Pip's band ties, as the loose tail of the pagdi.
const ties = pip(`
  <path d="m196 86 33 9-9 9-22-8Z" fill="#FF9A4A"/>
  <path d="m198 89 22 24-12 3-15-20Z" fill="#FFC27A"/>
  <path d="m225 94-5 5" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>`);

const book = `<g transform="translate(0 -10)">
  <path d="M96 184L130 191L164 184V214L130 221L96 214Z" fill="#8B3E1E"/>
  <path d="M100 186.5L130 192.5V217L100 211ZM160 186.5L130 192.5V217L160 211Z" fill="#FFF6E0"/>
  ${stroke('M105 195l20 4M105 200.5l20 4M105 206l14 2.8M155 195l-20 4M155 200.5l-20 4M155 206l-14 2.8', '#D9B98A', 1.3)}
  <path d="M129 192.5h2V217h-2Z" fill="#E4C79A"/></g>`;
const page = `<path d="M130 182.5L160 176.5V201L130 207Z" fill="#FFFBEE"/>`;

const dhokla = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-6.5 -2L-1 -5.5L6.5 -3L1 0.5Z" fill="#FFEB8A"/>
    <path d="M-6.5 -2L1 0.5V6L-6.5 3.5Z" fill="#F2C536"/>
    <path d="M1 0.5L6.5 -3V2.5L1 6Z" fill="#DCA61E"/>
    ${dots([[-2, -3], [1.5, -2], [3.5, -3.5]], 0.75, '#2E1A0A')}
    <path d="M-3 -2.6l2.4 -1.2" stroke="#3E9B4F" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;

const plate = `
  <ellipse cx="173" cy="196" rx="21" ry="7" fill="#FFFFFF"/>
  <ellipse cx="173" cy="198" rx="21" ry="5" fill="#E9DFD0"/>
  <ellipse cx="173" cy="195" rx="15" ry="4.4" fill="#F7F1E6"/>
  ${dhokla(165, 190)}${dhokla(180, 190)}${dhokla(172, 184)}`;

// Pip's particles: the same star, heart, dream squiggle and music notes.
const star = (fill: string) =>
  `<circle r="11" fill="url(#k-glow)"/><path d="m0-9 2.6 6.4L9 0 2.6 2.6 0 9-2.6 2.6-9 0l6.4-2.6Z" fill="${fill}"/>`;
const heart = `<path d="M0 5C-20-7-7-18 0-9 7-18 20-7 0 5Z" fill="#FF98BA"/>`;
const dream = stroke('M-5.5 -6h11L-5.5 6h11', '#C9A27A', 3);
const thought = (r: number) => `<circle r="${r}" fill="#F7E3C6"/>`;
const note = `<path d="M0 0v-19l13-3v17h-3v-12L3-15V0Z" fill="#C9A27A"/><ellipse cx="-2" rx="5" ry="3.5" fill="#C9A27A"/><ellipse cx="8" cy="-5" rx="5" ry="3.5" fill="#C9A27A"/>`;
const sweat = `<path d="M0-9C4.5-2 6.5 2 6.5 5.5A6.5 6.5 0 0 1-6.5 5.5C-6.5 2-4.5-2 0-9Z" fill="#A6DEF8"/><ellipse cx="-2" cy="3" rx="1.6" ry="2.6" fill="#fff" opacity=".8"/>`;
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
        children: side === 'L' ? [{ id: 'snack', svg: dhokla(86, 193, 0.95), when: { prop: 'plate' } }] : [],
      },
    ],
  };
};

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
        { id: 'book', svg: book, when: { prop: 'book' }, children: [{ id: 'page', pivot: [130, 190], svg: page }] },
        { id: 'plate', svg: plate, when: { prop: 'plate' } },
        arm('L'),
        arm('R'),
        {
          id: 'head',
          pivot: [130, 153],
          children: [
            { id: 'maneBack', svg: maneBack },
            { id: 'mane', svg: maneFront },
            { id: 'earL', pivot: [70, 94], svg: ear },
            { id: 'earR', pivot: [190, 94], svg: mirror(ear) },
            { id: 'face', svg: faceCoat },
            {
              id: 'features',
              children: [
                { id: 'patches', svg: patches },
                { id: 'blush', svg: blush },
                { id: 'blushHot', svg: blushHot, when: { effect: 'hearts' } },
                { id: 'browL', pivot: [98, 93], svg: browL },
                { id: 'browR', pivot: [162, 93], svg: browR },
                {
                  id: 'gaze',
                  when: { eyes: ['open'] },
                  children: [
                    { id: 'eyeL', pivot: [100, 111], svg: bead(100, -1) },
                    { id: 'eyeR', pivot: [160, 111], svg: bead(160, 1) },
                  ],
                },
                { id: 'eyesHappy', svg: happyEyes, when: { eyes: ['happy'] } },
                { id: 'eyesClosed', svg: closedEyes, when: { eyes: ['closed'] } },
                { id: 'nose', svg: nose },
                { id: 'mouthSmile', svg: mouthSmile, when: { mouth: ['smile'] } },
                { id: 'mouthOpen', pivot: [130, 151], svg: mouthOpen, when: { mouth: ['open'] } },
                { id: 'mouthO', pivot: [130, 151], svg: mouthO, when: { mouth: ['o'] } },
                { id: 'mouthWavy', svg: mouthWavy, when: { mouth: ['wavy'] } },
              ],
            },
            { id: 'ties', pivot: [190, 90], svg: ties },
            { id: 'crest', pivot: [130, 36], svg: crestSvg() },
            { id: 'turban', pivot: [130, 84], svg: turban },
          ],
        },
      ],
    },
    ...fx('sparkles', [
      ['fx1', 49, 104, star('#FFE5A0')],
      ['fx2', 213, 104, star('#FFC98C')],
      ['fx3', 76, 53, star('#FFC98C')],
      ['fx4', 192, 48, star('#FFE5A0')],
    ]),
    ...fx('hearts', [
      ['fx1', 49, 104, heart],
      ['fx2', 213, 104, heart],
      ['fx3', 76, 53, heart],
    ]),
    ...fx('zzz', [
      ['fx1', 186, 92, dream],
      ['fx2', 200, 72, dream],
      ['fx3', 214, 52, dream],
    ]),
    ...fx('thoughts', [
      ['fx1', 203, 65, thought(3)],
      ['fx2', 212, 51, thought(4)],
      ['fx3', 221, 37, thought(5)],
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
  const fa = Math.atan2(target[1] - e[1], target[0] - e[0]);
  const upper = wrap(toDeg(u - defU));
  return [upper, wrap(toDeg(fa - defF) - upper)];
}

// Tracks for one arm through a list of paw targets (optionally timed).
function reach(side: 'L' | 'R', targets: P[], at?: number[]): Record<string, Track> {
  const upper: number[] = [];
  const fore: number[] = [];
  for (const t of targets) {
    let [u, fo] = solveArm(side, t);
    if (upper.length) {
      while (u - upper[upper.length - 1] > 180) u -= 360;
      while (u - upper[upper.length - 1] < -180) u += 360;
      while (fo - fore[fore.length - 1] > 180) fo -= 360;
      while (fo - fore[fore.length - 1] < -180) fo += 360;
    }
    upper.push(+u.toFixed(2));
    fore.push(+fo.toFixed(2));
  }
  return { [`arm${side}`]: { at, rotate: upper }, [`fore${side}`]: { at, rotate: fore } };
}

const REST_L: P = PAW;
const REST_R: P = [mirrorX(PAW[0]), PAW[1]];
const mx = (p: P): P => [mirrorX(p[0]), p[1]];

// Particle helpers, offset so they don't move in lockstep.
const shift = (values: number[], by: number) => {
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

// Pip's idle: a curious head tilt that holds, a glance, a weight shift.
const IDLE_AT = [0, 0.2, 0.29, 0.39, 0.48, 0.57, 0.66, 0.76, 1];

export const CLIPS: Record<Pose, Clip> = {
  idle: {
    ms: 12000,
    loop: true,
    face: { eyes: 'open', mouth: 'smile' },
    tracks: {
      ...reach('L', [REST_L, [82.6, 202], REST_L, [83.4, 201.6], REST_L]),
      ...reach('R', [REST_R, [176.6, 201.6], REST_R, [177.4, 202], REST_R]),
      root: { at: [0, 0.22, 0.3, 0.4, 0.49, 0.58, 0.66, 0.76, 1], x: [0, 0, 2, 2, 0, -1, -1, 0, 0], rotate: [0, 0, 1.8, 1.8, 0, -1, -1, 0, 0] },
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
    front: ['armR'],
    tracks: {
      ...reach(
        'R',
        [REST_R, [190, 146], [193, 153], [183, 140], [193, 153], [183, 140], [193, 153], [183, 140], [186, 158], REST_R],
        [0, 0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71, 0.85, 1],
      ),
      root: { at: [0, 0.18, 0.78, 0.88, 1], y: [0, -3, -3, 1, 0], rotate: [0, -3, -3, 1, 0] },
      head: { at: [0, 0.24, 0.76, 1], rotate: [0, -7, -7, 0] },
      eyeR: { at: [0, 0.28, 0.34, 0.46, 0.52, 1], sy: [1, 1, 0.08, 0.08, 1, 1] },
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
    front: ['armL', 'armR'],
    tracks: {
      ...reach('L', [REST_L, REST_L, [86, 206], [70, 146], [74, 156], [70, 146], [78, 182], REST_L, REST_L], [0, 0.08, 0.15, 0.28, 0.39, 0.49, 0.59, 0.66, 1]),
      ...reach('R', [REST_R, REST_R, [174, 206], [190, 146], [186, 156], [190, 146], [182, 182], REST_R, REST_R], [0, 0.08, 0.15, 0.28, 0.39, 0.49, 0.59, 0.66, 1]),
      root: {
        at: [0, 0.08, 0.15, 0.28, 0.39, 0.49, 0.59, 0.66, 1],
        y: [0, 0, 3, -19, 2, -12, 1, 0, 0],
        sx: [1, 1, 1.09, 0.97, 1.07, 0.98, 1.04, 1, 1],
        sy: [1, 1, 0.9, 1.025, 0.93, 1.03, 0.96, 1, 1],
        rotate: [0, 0, 0, -4, 0, 3, 0, 0, 0],
      },
      shadow: { at: [0, 0.08, 0.15, 0.28, 0.39, 0.49, 0.59, 0.66, 1], sx: [1, 1, 1.15, 0.66, 1.15, 0.8, 1.15, 1, 1], opacity: [1, 1, 1, 0.5, 1, 0.7, 1, 1, 1] },
      head: { at: [0, 0.12, 0.28, 0.39, 0.49, 0.59, 0.7, 1], rotate: [0, 0, 6, -4, -6, 0, 0, 0], y: [0, 0, -2, 3, 0, 2, 0, 0] },
      legL: { at: [0, 0.15, 0.28, 0.4, 0.49, 0.66, 1], rotate: [0, 0, 18, 0, -10, 0, 0], y: [0, 0, -3, 0, 0, 0, 0] },
      legR: { at: [0, 0.15, 0.28, 0.4, 0.49, 0.66, 1], rotate: [0, 0, -18, 0, 10, 0, 0], y: [0, 0, -3, 0, 0, 0, 0] },
      browL: { at: [0, 0.15, 0.28, 0.66, 1], y: [0, 0, -3, -3, 0] },
      browR: { at: [0, 0.15, 0.28, 0.66, 1], y: [0, 0, -3, -3, 0] },
      tail: { rotate: [-8, 12, -8, 12, -8, 12, -8] },
      tuft: { rotate: [10, -12, 10, -12, 10, -12, 10] },
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
      ...reach('L', [[110, 188]]),
      ...reach('R', [[150, 188], [150, 188], [144, 185], [136, 183], [150, 188], [150, 188]], [0, 0.56, 0.62, 0.72, 0.8, 1]),
      page: { at: [0, 0.6, 0.72, 0.76, 1], sx: [1, 1, -0.2, -1, -1], opacity: [0, 0, 1, 1, 0] },
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
    front: ['plate', 'armL'],
    tracks: {
      ...reach('R', [[175, 200]]),
      ...reach('L', [REST_L, [83, 205], [123, 142], [123, 142], [106, 174], REST_L, REST_L], [0, 0.14, 0.34, 0.46, 0.62, 0.8, 1]),
      snack: { at: [0, 0.4, 0.41, 0.9, 0.91, 1], opacity: [1, 1, 0, 0, 1, 1] },
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
    front: ['armR'],
    tracks: {
      ...reach('R', [[158, 142], [158, 142], [160, 146], [158, 142], [160, 146], [158, 142]], [0, 0.35, 0.45, 0.55, 0.65, 1]),
      head: { at: [0, 0.35, 0.65, 0.8, 1], rotate: [7, 11, 11, 4, 7], y: [0, 2, 2, 0, 0] },
      gaze: { at: [0, 0.35, 0.65, 1], x: [2, -2, -2, 2], y: [-3, -2, -2, -3] },
      browR: { y: [-5], rotate: [2] },
      browL: { at: [0, 0.35, 0.65, 1], y: [0, 1, 1, 0], rotate: [0, 4, 4, 0] },
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
      ...reach('L', [REST_L, [70, 176], [72, 180], [82, 196], REST_L], [0, 0.1, 0.3, 0.8, 1]),
      ...reach('R', [REST_R, mx([70, 176]), mx([72, 180]), mx([82, 196]), REST_R], [0, 0.1, 0.3, 0.8, 1]),
      root: { at: [0, 0.1, 0.3, 1], y: [0, 3, 0, 0], sx: [1, 1.05, 1, 1], sy: [1, 0.94, 1, 1] },
      head: { at: [0, 0.1, 0.28, 0.44, 0.6, 0.76, 1], rotate: [0, -3, -9, 7, -4, 2, 0], y: [0, 2, 1, 0, 0, 0, 0] },
      eyeL: { at: [0, 0.08, 0.7, 1], sx: [1, 1.14, 1.08, 1], sy: [1, 1.14, 1.08, 1] },
      eyeR: { at: [0, 0.08, 0.7, 1], sx: [1, 1.14, 1.08, 1], sy: [1, 1.14, 1.08, 1] },
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
      ...reach('L', [[86, 200]]),
      ...reach('R', [[174, 200]]),
      root: { at: [0, 0.45, 0.7, 1], sx: [1, 1.025, 1.005, 1], sy: [1, 1.035, 1.008, 1] },
      head: { at: [0, 0.45, 1], rotate: [8, 6, 8], y: [7, 5, 7] },
      mouthO: { at: [0, 0.45, 1], sx: [0.8, 1.15, 0.8], sy: [0.8, 1.15, 0.8] },
      browL: { opacity: [0] },
      browR: { opacity: [0] },
      crest: { rotate: [14, 16, 14] },
      ties: { rotate: [8, 12, 8] },
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
    front: ['armL', 'armR'],
    tracks: {
      ...reach('L', [[70, 146], [80, 196], [70, 146], [80, 196], [70, 146]]),
      ...reach('R', [mx([80, 196]), mx([70, 146]), mx([80, 196]), mx([70, 146]), mx([80, 196])]),
      root: { x: [-6, 0, 6, 0, -6], rotate: [-5, 0, 5, 0, -5], y: [0, -5, 0, -5, 0] },
      head: { rotate: [7, 1, -7, -1, 7] },
      browL: { y: [-2, 0, -2, 0, -2] },
      browR: { y: [0, -2, 0, -2, 0] },
      legL: { rotate: [0, -14, 0, 0, 0] },
      legR: { rotate: [0, 0, 0, 14, 0] },
      tail: { rotate: [-12, -2, 12, 2, -12] },
      tuft: { rotate: [10, 12, -10, -12, 10] },
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
    tracks: {
      ...reach('L', [[126, 186], [124, 188.5], [126, 186]]),
      ...reach('R', [mx([126, 186]), mx([124, 188.5]), mx([126, 186])]),
      root: { at: [0, 0.22, 0.4, 0.7, 1], y: [0, -4, -6, -4, 0], sx: [1, 1.025, 1.04, 1.025, 1], sy: [1, 1.025, 1.04, 1.025, 1] },
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
