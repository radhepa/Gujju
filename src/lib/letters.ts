import { Rating, type Grade } from 'ts-fsrs';
import { pick, shuffle, type Rng } from './rng';
import { isDue } from './srs';
import type { CardRow, Course, Item } from './types';

// The letter challenge: quick-fire reading of single letters, vowel signs
// and digits, against the clock. Each one gets its own FSRS card,
// `lt:<item id>`, separate from the course card: meeting ઘ in a lesson and
// telling it from ધ in under two seconds are different skills, and drilling
// here shouldn't pull letters you haven't reached into your lesson reviews.

export const letterCardId = (itemId: string) => `lt:${itemId}`;
export const isLetterCard = (id: string) => id.startsWith('lt:');

export const SPRINT_MS = 60_000;
// Untimed rounds are a fixed length instead.
export const RELAXED_ROUND = 20;
// Answers this fast earn a bonus, and a letter answered this fast on
// average is graded Easy.
export const QUICK_MS = 1500;
export const FAST_MS = 2500;

export type GlyphKind = 'vowel' | 'consonant' | 'sign' | 'digit';

export interface Glyph {
  id: string;
  kind: GlyphKind;
  // What's drawn: ક, ઈ, ૭. A sign is drawn on a dotted circle, ◌ી.
  shape: string;
  // How it's read: ka, ee, 7. For a sign, the vowel it adds ('' for the halant).
  sound: string;
  // Signs only: the sign itself, ી.
  sign?: string;
  item: Item;
}

// Chart order, the way the letters are printed in a school book.
const VOWELS = ['અ', 'આ', 'ઇ', 'ઈ', 'ઉ', 'ઊ', 'ઋ', 'એ', 'ઐ', 'ઓ', 'ઔ', 'અં', 'અઃ'];
const CONSONANTS = [
  'ક', 'ખ', 'ગ', 'ઘ', 'ઙ', 'ચ', 'છ', 'જ', 'ઝ', 'ઞ', 'ટ', 'ઠ', 'ડ', 'ઢ', 'ણ', 'ત', 'થ', 'દ', 'ધ', 'ન',
  'પ', 'ફ', 'બ', 'ભ', 'મ', 'ય', 'ર', 'લ', 'વ', 'શ', 'ષ', 'સ', 'હ', 'ળ', 'ક્ષ', 'જ્ઞ',
];
const SIGNS = ['ા', 'િ', 'ી', 'ુ', 'ૂ', 'ે', 'ૈ', 'ો', 'ૌ', '્'];
const DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
const CHART = [...VOWELS, ...CONSONANTS, ...SIGNS, ...DIGITS];

// Letters that don't take vowel signs on their own, so never get one here.
const NO_SIGNS = new Set(['ઙ', 'ઞ']);
const DOT = '◌';

const isVowel = (s: string) => {
  const cp = s.codePointAt(0)!;
  return cp >= 0x0a85 && cp <= 0x0a94;
};

function glyphOf(it: Item): Glyph | null {
  if (it.type === 'number') {
    const n = it.id.match(/^n-(\d)$/)?.[1];
    return n ? { id: it.id, kind: 'digit', shape: it.gujarati, sound: n, item: it } : null;
  }
  if (it.type !== 'letter') return null;
  // Vowel signs are taught on ક: કી is ક + ી.
  if (it.id.startsWith('s-') && it.gujarati.startsWith('ક')) {
    const sign = it.gujarati.slice(1);
    return { id: it.id, kind: 'sign', shape: DOT + sign, sign, sound: it.translit.replace(/^k/, ''), item: it };
  }
  return { id: it.id, kind: isVowel(it.gujarati) ? 'vowel' : 'consonant', shape: it.gujarati, sound: it.translit, item: it };
}

// Every letter, sign and digit the course teaches, in chart order.
export function glyphCatalog(c: Course): Glyph[] {
  const all = Object.values(c.items)
    .map(glyphOf)
    .filter((g): g is Glyph => !!g);
  const rank = (g: Glyph) => {
    const i = CHART.indexOf(g.sign ?? g.shape);
    return i < 0 ? CHART.length : i;
  };
  return all.sort((a, b) => rank(a) - rank(b));
}

export interface LetterSet {
  id: string;
  title: string;
  titleGu: string;
  blurb: string;
  glyphs: string[];
  // A few letters to show on the set's card.
  sample: string;
  // Lookalike rounds only ever offer the lookalikes.
  lookalikes?: boolean;
}

const sameSound = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// A glyph's lookalikes that make a fair question: the same kind, and not
// said the same (શ and ષ are both sha, so you can't tell them apart by ear).
export function lookalikesOf(g: Glyph, byId: Map<string, Glyph>): Glyph[] {
  return (g.item.confusables ?? [])
    .map((id) => byId.get(id))
    .filter((o): o is Glyph => !!o && o.kind === g.kind && !sameSound(o.sound, g.sound));
}

export function letterSets(catalog: Glyph[]): LetterSet[] {
  const byId = new Map(catalog.map((g) => [g.id, g]));
  const of = (k: GlyphKind) => catalog.filter((g) => g.kind === k).map((g) => g.id);
  return [
    { id: 'vowels', title: 'Vowels', titleGu: 'સ્વર', blurb: 'અ to ઔ, and the short and long pairs', sample: 'અ આ ઇ ઈ', glyphs: of('vowel') },
    { id: 'consonants', title: 'Consonants', titleGu: 'વ્યંજન', blurb: 'ક to ળ, the whole alphabet', sample: 'ક ખ ગ ઘ', glyphs: of('consonant') },
    { id: 'signs', title: 'Barakhadi', titleGu: 'બારાખડી', blurb: 'Vowel signs on every letter: ગી, ગિ, ગે', sample: 'ગા ગિ ગી ગુ', glyphs: of('sign') },
    {
      id: 'lookalikes',
      title: 'Lookalikes',
      titleGu: 'સરખા અક્ષર',
      blurb: 'ઘ or ધ? ટ or ઠ? Only the tricky pairs',
      sample: 'ઘ ધ ટ ઠ',
      glyphs: catalog.filter((g) => lookalikesOf(g, byId).length > 0).map((g) => g.id),
      lookalikes: true,
    },
    { id: 'digits', title: 'Digits', titleGu: 'અંક', blurb: '૦ to ૯, for prices, dates and phone numbers', sample: '૦ ૧ ૨ ૩', glyphs: of('digit') },
    { id: 'all', title: 'Everything', titleGu: 'બધું', blurb: 'Every letter, sign and digit, mixed', sample: 'અ ક ગી ૭', glyphs: catalog.map((g) => g.id) },
  ];
}

// The daily mix: whatever is due, then the shakiest, then letters met in
// lessons that haven't been drilled yet. Falls back to the first letters.
export const MIX_SIZE = 16;
export const MIX_ID = 'mix';

export function dailyMix(catalog: Glyph[], rows: Map<string, CardRow>, learned: Set<string>, now: Date, size = MIX_SIZE): string[] {
  const row = (g: Glyph) => rows.get(letterCardId(g.id));
  const due = catalog.filter((g) => row(g) && isDue(row(g)!, now));
  const shaky = catalog.filter((g) => row(g) && !due.includes(g)).sort((a, b) => row(a)!.stability - row(b)!.stability);
  const fresh = catalog.filter((g) => !row(g) && learned.has(g.id));
  const ids = [...due, ...fresh, ...shaky].slice(0, size).map((g) => g.id);
  if (ids.length >= 6) return ids;
  // Nothing much to go on yet: the first letters of the course.
  const first = catalog.filter((g) => ['l-a', 'l-aa', 'l-ka', 'l-ma', 'l-na', 'l-ra', 'l-la', 'l-sa', 's-kaa'].includes(g.id));
  return [...new Set([...ids, ...first.map((g) => g.id)])];
}

// Mastery from the challenge card: 0 never drilled, 1 seen, 2 getting
// there, 3 solid, 4 mastered (FSRS expects to keep it three weeks).
export type Mastery = 0 | 1 | 2 | 3 | 4;
export const MASTERY_LABEL = ['New', 'Seen', 'Learning', 'Solid', 'Mastered'] as const;

export function masteryOf(row: CardRow | undefined): Mastery {
  if (!row || row.reps === 0) return 0;
  if (row.stability < 2) return 1;
  if (row.stability < 7) return 2;
  if (row.stability < 21) return 3;
  return 4;
}

export interface Question {
  id: string;
  // The card this question is charged to.
  glyphId: string;
  // read: see the shape, pick the sound. find: see the sound, pick the shape.
  kind: 'read' | 'find';
  prompt: string;
  // Under the prompt: a digit's name.
  promptSub?: string;
  options: string[];
  answer: string;
  // What each option means the other way round, for the feedback:
  // "you picked ધ, that's dha".
  other: Record<string, string>;
  // Gujarati to read aloud.
  say: string;
}

const strip = (sound: string) => sound.replace(/a$/, '');

// A consonant with a sign on it, and how it's read: ગ + ી = ગી, gee.
// The bare consonant (no sign) is gaa's and gi's most tempting neighbour, so
// it can be an option too.
export function syllable(c: Glyph, s: Glyph | null): { shape: string; sound: string } {
  if (!s) return { shape: c.shape, sound: c.sound };
  return { shape: c.shape + s.sign, sound: strip(c.sound) + s.sound };
}

export interface QuestionContext {
  catalog: Glyph[];
  byId: Map<string, Glyph>;
  set: LetterSet;
  // Consonants to hang vowel signs on.
  carriers: Glyph[];
  rng: Rng;
}

export function questionContext(catalog: Glyph[], set: LetterSet, rng: Rng, carrierIds?: string[]): QuestionContext {
  const byId = new Map(catalog.map((g) => [g.id, g]));
  const ok = (g: Glyph) => g.kind === 'consonant' && !NO_SIGNS.has(g.shape) && [...g.shape].length === 1;
  const chosen = (carrierIds ?? []).map((id) => byId.get(id)).filter((g): g is Glyph => !!g && ok(g));
  return { catalog, byId, set, carriers: chosen.length >= 3 ? chosen : catalog.filter(ok), rng };
}

const OPTIONS = 4;

function fill(target: Glyph, first: Glyph[], ctx: QuestionContext, max: number): Glyph[] {
  const fair = (g: Glyph) => g.id !== target.id && g.kind === target.kind && !sameSound(g.sound, target.sound);
  const inSet = ctx.catalog.filter((g) => ctx.set.glyphs.includes(g.id));
  const out: Glyph[] = [target];
  for (const g of [...shuffle(first, ctx.rng), ...shuffle(inSet, ctx.rng), ...shuffle(ctx.catalog, ctx.rng)]) {
    if (out.length >= max) break;
    if (fair(g) && !out.some((o) => o.id === g.id || sameSound(o.sound, g.sound) || o.shape === g.shape)) out.push(g);
  }
  return out;
}

export function makeQuestion(g: Glyph, ctx: QuestionContext, n: number): Question {
  const kind: Question['kind'] = ctx.rng() < 0.5 ? 'read' : 'find';
  const look = lookalikesOf(g, ctx.byId);
  const max = ctx.set.lookalikes ? Math.min(OPTIONS, look.length + 1) : OPTIONS;
  const id = `${g.id}:${n}`;

  if (g.kind === 'sign') {
    // The same consonant with different signs, so only the sign can be wrong.
    const c = pick(ctx.carriers, ctx.rng);
    const signs = fill(g, look, ctx, max).slice(1);
    // The bare consonant goes in when there's room: ગ next to ગા and ગ્.
    const rivals: (Glyph | null)[] = !ctx.set.lookalikes && signs.length === OPTIONS - 1 && ctx.rng() < 0.4 ? [...signs.slice(0, -1), null] : signs;
    const own = syllable(c, g);
    const all = [own, ...rivals.map((s) => syllable(c, s))];
    const other = Object.fromEntries(all.flatMap((s) => [[s.shape, s.sound], [s.sound, s.shape]]));
    return kind === 'read'
      ? { id, glyphId: g.id, kind, prompt: own.shape, options: shuffle(all.map((s) => s.sound), ctx.rng), answer: own.sound, other, say: own.shape }
      : { id, glyphId: g.id, kind, prompt: own.sound, options: shuffle(all.map((s) => s.shape), ctx.rng), answer: own.shape, other, say: own.shape };
  }

  const all = fill(g, look, ctx, max);
  const other = Object.fromEntries(all.flatMap((o) => [[o.shape, o.sound], [o.sound, o.shape]]));
  const sub = g.kind === 'digit' ? g.item.translit : undefined;
  return kind === 'read'
    ? { id, glyphId: g.id, kind, prompt: g.shape, options: shuffle(all.map((o) => o.sound), ctx.rng), answer: g.sound, other, say: g.item.gujarati }
    : { id, glyphId: g.id, kind, prompt: g.sound, promptSub: sub, options: shuffle(all.map((o) => o.shape), ctx.rng), answer: g.shape, other, say: g.item.gujarati };
}

// What happened to each glyph this round.
export interface GlyphTally {
  right: number;
  wrong: number;
  ms: number[];
  // What was picked instead, for "you mixed these up".
  picked: string[];
}

export interface RoundState {
  asked: number;
  // The last few glyphs asked, so nothing comes straight back.
  recent: string[];
  // Missed glyphs come back after a few questions.
  retry: { id: string; at: number }[];
  tally: Record<string, GlyphTally>;
}

export const newRound = (): RoundState => ({ asked: 0, recent: [], retry: [], tally: {} });

// Which glyph to ask next: a missed one whose turn has come, otherwise a
// weighted pick that favours the ones you know least.
export function nextGlyph(pool: string[], state: RoundState, rows: Map<string, CardRow>, rng: Rng): string {
  const back = state.retry.find((r) => r.at <= state.asked && !state.recent.slice(-1).includes(r.id));
  if (back) return back.id;
  if (pool.length <= 1) return pool[0];
  const avoid = new Set(state.recent.slice(-Math.min(3, pool.length - 1)));
  const options = pool.filter((id) => !avoid.has(id));
  const weight = (id: string) => {
    const m = masteryOf(rows.get(letterCardId(id)));
    const seen = (state.tally[id]?.right ?? 0) + (state.tally[id]?.wrong ?? 0);
    return [3, 3, 2, 1.5, 0.7][m] / (1 + seen);
  };
  const total = options.reduce((n, id) => n + weight(id), 0);
  let r = rng() * total;
  for (const id of options) {
    r -= weight(id);
    if (r <= 0) return id;
  }
  return options[options.length - 1] ?? pool[0];
}

export function record(state: RoundState, glyphId: string, correct: boolean, ms: number, picked?: string): RoundState {
  const t = state.tally[glyphId] ?? { right: 0, wrong: 0, ms: [], picked: [] };
  const tally = {
    ...state.tally,
    [glyphId]: {
      right: t.right + (correct ? 1 : 0),
      wrong: t.wrong + (correct ? 0 : 1),
      ms: correct ? [...t.ms, ms] : t.ms,
      picked: !correct && picked ? [...t.picked, picked] : t.picked,
    },
  };
  const retry = state.retry.filter((r) => r.id !== glyphId);
  if (!correct) retry.push({ id: glyphId, at: state.asked + 3 });
  return { asked: state.asked + 1, recent: [...state.recent, glyphId].slice(-4), retry, tally };
}

// Combo multiplier: five in a row doubles the points, ten triples, twenty
// quadruples.
export function multiplier(combo: number): number {
  return combo >= 20 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
}

export function points(combo: number, ms: number): number {
  return 10 * multiplier(combo) + (ms <= QUICK_MS ? 5 : 0);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : Infinity;
};

// Missed twice = Again, missed once = Hard, always right and quick = Easy,
// otherwise Good.
export function gradeGlyph(t: GlyphTally): Grade {
  if (t.wrong >= 2) return Rating.Again;
  if (t.wrong === 1) return Rating.Hard;
  return median(t.ms) <= FAST_MS ? Rating.Easy : Rating.Good;
}

export const averageMs = (tally: Record<string, GlyphTally>) => {
  const all = Object.values(tally).flatMap((t) => t.ms);
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
};
