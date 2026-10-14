// Render Kesar's rig outside the app: stills, the README gif and app icons.
//
//   node scripts/render-kesar.mjs poses      # docs/kesar-poses.png, one frame of every pose
//   node scripts/render-kesar.mjs gif        # docs/kesar.gif
//   node scripts/render-kesar.mjs icons      # app icon, splash, adaptive icon, favicon
//
// Reads the same rig data as the app (src/mascot/rig.ts), so what you see
// here is what the app draws.

import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { BOX, BREATH_MS, BREATH_SY, CLIPS, PARALLAX, RIG, findNode, rank, sample, visible, withDefs } from '../src/mascot/rig.ts';

const VB = `${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`;
const VIEW = BOX.w;

const { GIFEncoder, applyPalette, quantize } = gifenc;
const require = createRequire(import.meta.url);
const GU_FONT = require.resolve('@expo-google-fonts/noto-sans-gujarati/400Regular/NotoSansGujarati_400Regular.ttf');

function transform(node, clip, t, ambient, gaze) {
  if (node.follow) node = { ...findNode(node.follow), id: node.follow };
  const tr = clip.tracks[node.id] ?? {};
  const at = tr.at;
  let x = sample(tr.x, t, 0, at);
  let y = sample(tr.y, t, 0, at);
  const r = sample(tr.rotate, t, 0, at);
  const sx = sample(tr.sx, t, 1, at);
  let sy = sample(tr.sy, t, 1, at);
  if (node.id === 'breath') sy *= sample(BREATH_SY, ambient, 1);
  const para = PARALLAX[node.id];
  if (para) {
    x += (gaze[0] + (clip.face.look?.[0] ?? 0)) * para[0];
    y += (gaze[1] + (clip.face.look?.[1] ?? 0)) * para[1];
  }
  const [px, py] = node.pivot ?? [0, 0];
  return {
    attr: `translate(${px + x} ${py + y}) rotate(${r}) scale(${sx} ${sy}) translate(${-px} ${-py})`,
    opacity: sample(tr.opacity, t, 1, at),
  };
}

function draw(node, clip, t, ambient, gaze) {
  if (!visible(node, clip)) return '';
  const { attr, opacity } = transform(node, clip, t, ambient, gaze);
  const kids = [...(node.children ?? [])].sort((a, b) => rank(a, clip) - rank(b, clip));
  return `<g transform="${attr}" opacity="${opacity}">${node.svg ? withDefs(node.svg) : ''}${kids.map((k) => draw(k, clip, t, ambient, gaze)).join('')}</g>`;
}

function bubble(text) {
  return `<g transform="translate(150 6)">
    <rect width="104" height="44" rx="20" fill="#fff" stroke="#7A3D14" stroke-width="3"/>
    <path d="M18 42l-8 14 20-12" fill="#fff" stroke="#7A3D14" stroke-width="3" stroke-linejoin="round"/>
    <rect x="12" y="38" width="22" height="5" fill="#fff"/>
    <text x="52" y="30" font-family="Noto Sans Gujarati" font-size="21" text-anchor="middle" fill="#2A2420">${text}</text>
  </g>`;
}

export function svgFor(pose, t, { ambient = 0, background, showBubble = true, gaze = [0, 0] } = {}) {
  const clip = CLIPS[pose];
  const bg = background ? `<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" fill="${background}"/>` : '';
  const b = showBubble && clip.bubble ? bubble(clip.bubble) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}">${bg}${draw(RIG, clip, t, ambient, gaze)}${b}</svg>`;
}

function render(svg, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [GU_FONT], loadSystemFonts: false, defaultFontFamily: 'Noto Sans Gujarati' },
  }).render();
  return { png: r.asPng(), pixels: r.pixels, width: r.width, height: r.height };
}

// Lay out several renders side by side on one canvas.
function sheet(svgs, cell, cols, background) {
  const rows = Math.ceil(svgs.length / cols);
  const inner = svgs
    .map((s, i) => {
      const body = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      return `<svg x="${(i % cols) * VIEW}" y="${Math.floor(i / cols) * VIEW}" width="${VIEW}" height="${VIEW}" viewBox="${VB}">${body}</svg>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * VIEW} ${rows * VIEW}"><rect width="100%" height="100%" fill="${background}"/>${inner}</svg>`;
  return render(svg, cell * cols);
}

const CREAM = '#FBF6EE';
const cmd = process.argv[2] ?? 'poses';

if (cmd === 'poses') {
  const poses = Object.keys(CLIPS);
  const pick = { cheer: 0.5, wave: 0.18, eat: 0.3, oops: 0.25, nod: 0.25, dance: 0.25 };
  const out = sheet(poses.map((p) => svgFor(p, pick[p] ?? 0.3)), 260, 4, CREAM);
  writeFileSync('docs/kesar-poses.png', out.png);
  console.log('docs/kesar-poses.png', poses.join(', '));
}

if (cmd === 'gif') {
  const poses = ['wave', 'cheer', 'read', 'eat'];
  const fps = 16;
  const seconds = 4.4;
  const gif = GIFEncoder();
  for (let i = 0; i < fps * seconds; i++) {
    const ms = (i / fps) * 1000;
    const frames = poses.map((p) => svgFor(p, (ms % CLIPS[p].ms) / CLIPS[p].ms, { ambient: (ms % BREATH_MS) / BREATH_MS }));
    const { pixels, width, height } = sheet(frames, 180, 4, CREAM);
    const palette = quantize(pixels, 96);
    gif.writeFrame(applyPalette(pixels, palette), width, height, { palette, delay: 1000 / fps });
  }
  gif.finish();
  writeFileSync('docs/kesar.gif', gif.bytes());
  console.log('docs/kesar.gif');
}

if (cmd === 'icons') {
  const still = (opts) => svgFor('idle', 0, { showBubble: false, ...opts });
  // Zoom in so he fills the icon.
  const zoom = (svg, box) => svg.replace(`viewBox="${VB}"`, `viewBox="${box}"`);
  writeFileSync('assets/icon.png', render(zoom(still({ background: '#FCEBD3' }), '20 6 220 220'), 1024).png);
  writeFileSync('assets/splash-icon.png', render(zoom(still(), '10 0 240 240'), 1024).png);
  writeFileSync('assets/android-icon-foreground.png', render(zoom(still(), '-30 -40 320 320'), 512).png);
  writeFileSync('assets/favicon.png', render(zoom(still(), '64 14 132 132'), 48).png);
  console.log('icons written');
}
