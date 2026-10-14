import { itemsSeenBy, lessonsInUnit, unitItemIds } from '../content/course';
import { splitAksharas } from './aksharas';
import { makeRng, pick, shuffle, type Rng } from './rng';
import type {
  BuildExercise,
  Course,
  Exercise,
  IntroExercise,
  Item,
  MatchExercise,
  PickExercise,
  TranslitMode,
} from './types';

// Exercises are built from a lesson's item list instead of being written out
// by hand. Writing ~450 exercises with three wrong answers each would be
// most of the content work, and mistakes would creep in. Items carry
// `confusables` so the deliberate hard choices (ઇ/ઈ, ઘ/ધ) still come up.

export const LESSON_MIN = 10;
export const LESSON_MAX = 12;

interface Ctx {
  course: Course;
  rng: Rng;
  mode: TranslitMode;
  // Items the learner has met, used for wrong answers and word banks.
  pool: Item[];
  prefix: string;
  n: number;
}

const nextId = (ctx: Ctx) => `${ctx.prefix}:${ctx.n++}`;

// Letters and syllables share a pool; numbers and words have their own.
const family = (it: Item) => (it.type === 'number' ? 'number' : it.type === 'letter' ? 'letter' : it.type);

function translitFor(ctx: Ctx, it: Item): string | undefined {
  return ctx.mode === 'hide' ? undefined : it.translit;
}

function pickDistractors(
  ctx: Ctx,
  target: Item,
  value: (i: Item) => string,
  promptValue: (i: Item) => string,
  count: number,
): string[] {
  const valid = (i: Item) =>
    i.id !== target.id &&
    family(i) === family(target) &&
    value(i) !== value(target) &&
    promptValue(i) !== promptValue(target);

  const inPool = ctx.pool.filter(valid);
  const confusable = inPool.filter((i) => target.confusables?.includes(i.id));
  const rest = shuffle(
    inPool.filter((i) => !confusable.includes(i)),
    ctx.rng,
  );
  // Fall back to the whole course if the learner hasn't seen enough yet.
  const extra = shuffle(
    Object.values(ctx.course.items).filter((i) => valid(i) && !inPool.includes(i)),
    ctx.rng,
  );

  const out: string[] = [];
  for (const i of [...shuffle(confusable, ctx.rng), ...rest, ...extra]) {
    const v = value(i);
    if (!out.includes(v)) out.push(v);
    if (out.length === count) break;
  }
  return out;
}

export function intro(ctx: Ctx, it: Item): IntroExercise {
  return { id: nextId(ctx), kind: 'intro', itemIds: [it.id], item: it };
}

// Sees the Gujarati, picks how it sounds.
export function pickSound(ctx: Ctx, it: Item): PickExercise {
  const wrong = pickDistractors(ctx, it, (i) => i.translit, (i) => i.gujarati, 3);
  return {
    id: nextId(ctx),
    kind: 'pick-sound',
    itemIds: [it.id],
    question: it.type === 'word' ? 'How do you say this word?' : 'Which sound is this?',
    prompt: it.gujarati,
    optionsAreGujarati: false,
    options: shuffle([it.translit, ...wrong], ctx.rng),
    answer: it.translit,
  };
}

// Sees the sound (or the English), picks the Gujarati.
export function pickLetter(ctx: Ctx, it: Item): PickExercise {
  const isWord = it.type === 'word';
  const isNumber = it.type === 'number';
  const promptOf = (i: Item) => (isWord || isNumber ? i.english : i.translit);
  const wrong = pickDistractors(ctx, it, (i) => i.gujarati, promptOf, 3);
  return {
    id: nextId(ctx),
    kind: 'pick-letter',
    itemIds: [it.id],
    question: isWord ? 'Which word means this?' : isNumber ? 'Which is this number?' : 'Which letter makes this sound?',
    prompt: promptOf(it),
    promptTranslit: isWord ? translitFor(ctx, it) : undefined,
    optionsAreGujarati: true,
    options: shuffle([it.gujarati, ...wrong], ctx.rng),
    answer: it.gujarati,
  };
}

export function matchPairs(ctx: Ctx, items: Item[]): MatchExercise {
  return {
    id: nextId(ctx),
    kind: 'match-pairs',
    itemIds: items.map((i) => i.id),
    pairs: items.map((i) => ({
      itemId: i.id,
      left: i.gujarati,
      right: i.type === 'letter' ? i.translit : i.english,
    })),
  };
}

export function canBuildWord(it: Item): boolean {
  return it.type === 'word' && splitAksharas(it.gujarati).length >= 2;
}

// Taps akshara tiles in order to spell the word.
export function buildWord(ctx: Ctx, it: Item): BuildExercise {
  const answer = splitAksharas(it.gujarati);
  const candidates = new Set<string>();
  for (const i of shuffle(ctx.pool, ctx.rng)) {
    if (i.type === 'sentence') continue;
    for (const a of splitAksharas(i.gujarati)) if (!answer.includes(a)) candidates.add(a);
  }
  const extras = [...candidates].slice(0, answer.length >= 4 ? 2 : 3);
  return {
    id: nextId(ctx),
    kind: 'build-word',
    itemIds: [it.id],
    question: 'Spell this word',
    prompt: it.english,
    promptTranslit: translitFor(ctx, it),
    promptIsGujarati: false,
    tilesAreGujarati: true,
    tiles: shuffle([...answer, ...extras], ctx.rng),
    answer,
  };
}

export const tokensGu = (s: string) => s.replace(/[.,!?।]/g, '').split(/\s+/).filter(Boolean);
export const tokensEn = (s: string) => s.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);

// Taps words from a bank to translate a sentence, either direction.
export function buildSentence(ctx: Ctx, it: Item, toEnglish: boolean): BuildExercise {
  const tok = toEnglish ? tokensEn : tokensGu;
  const answer = tok(toEnglish ? it.english : it.gujarati);
  const lower = answer.map((t) => t.toLowerCase());
  const bank = new Set<string>();
  for (const i of shuffle(ctx.pool, ctx.rng)) {
    if (i.id === it.id) continue;
    const words = i.type === 'sentence' ? tok(toEnglish ? i.english : i.gujarati) : [toEnglish ? i.english : i.gujarati];
    for (const w of words) {
      if (w.includes(' ') || w.includes('(')) continue;
      if (!lower.includes(w.toLowerCase())) bank.add(w);
    }
  }
  const extras = [...bank].slice(0, 3);
  return {
    id: nextId(ctx),
    kind: 'build-sentence',
    itemIds: [it.id],
    question: toEnglish ? 'Translate into English' : 'Translate into Gujarati',
    prompt: toEnglish ? it.gujarati : it.english,
    promptTranslit: toEnglish ? translitFor(ctx, it) : undefined,
    promptIsGujarati: toEnglish,
    tilesAreGujarati: !toEnglish,
    tiles: shuffle([...answer, ...extras], ctx.rng),
    answer,
    alts: toEnglish ? (it.alts ?? []).map(tokensEn) : undefined,
  };
}

const norm = (t: string) => t.toLowerCase().replace(/[.,!?।]/g, '');

export function isBuildCorrect(ex: BuildExercise, chosen: string[]): boolean {
  const got = chosen.map(norm).join(' ');
  return [ex.answer, ...(ex.alts ?? [])].some((a) => a.map(norm).join(' ') === got);
}

// One exercise testing an item, for reviews and practice lessons.
function anyExercise(ctx: Ctx, it: Item): Exercise {
  if (it.type === 'sentence') return buildSentence(ctx, it, ctx.rng() < 0.5);
  const options: ((c: Ctx, i: Item) => Exercise)[] = [pickSound, pickLetter];
  if (canBuildWord(it)) options.push(buildWord);
  return pick(options, ctx.rng)(ctx, it);
}

function matchable(items: Item[]): Item[] | null {
  // Match pairs needs one family, at least four items, and no repeated
  // answers on the right-hand side.
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    if (it.type === 'sentence') continue;
    const g = groups.get(family(it)) ?? [];
    const right = it.type === 'letter' ? it.translit : it.english;
    if (!g.some((o) => (o.type === 'letter' ? o.translit : o.english) === right)) g.push(it);
    groups.set(family(it), g);
  }
  const best = [...groups.values()].sort((a, b) => b.length - a.length)[0];
  return best && best.length >= 4 ? best.slice(0, 5) : null;
}

function modeFor(lessonMode: TranslitMode | undefined, alwaysShow: boolean): TranslitMode {
  return alwaysShow ? 'show' : lessonMode ?? 'show';
}

export interface BuildOptions {
  seed?: number | string;
  alwaysShowTranslit?: boolean;
}

export function buildLesson(course: Course, lessonId: string, opts: BuildOptions = {}): Exercise[] {
  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`No lesson ${lessonId}`);
  const items = (ids: string[]) => ids.map((id) => course.items[id]);
  const seen = items(itemsSeenBy(course, lessonId));
  const ctx: Ctx = {
    course,
    rng: makeRng(opts.seed ?? lessonId),
    mode: modeFor(lesson.translit, !!opts.alwaysShowTranslit),
    pool: seen,
    prefix: lessonId,
    n: 0,
  };

  // Practice lessons: everything the unit has taught so far.
  if (lesson.review || lesson.items.length === 0) {
    const unitIds = unitItemIds(course, lesson.unitId).filter((id) => seen.some((s) => s.id === id));
    return practice(ctx, items(unitIds), LESSON_MAX);
  }

  const fresh = items(lesson.items);
  const first: Exercise[] = [];
  const second: Exercise[] = [];

  for (const it of fresh) {
    if (it.type === 'sentence') {
      first.push(buildSentence(ctx, it, true));
      second.push(buildSentence(ctx, it, false));
      continue;
    }
    first.push(intro(ctx, it), pickSound(ctx, it));
    second.push(canBuildWord(it) ? buildWord(ctx, it) : pickLetter(ctx, it));
  }

  // Earlier items from this unit (or the one before) to fill out short lessons.
  const unitLessons = lessonsInUnit(course, lesson.unitId);
  const before = unitLessons.filter((l) => l.order < lesson.order).flatMap((l) => l.items);
  const prevUnit = course.units.find((u) => u.order === course.units.find((x) => x.id === lesson.unitId)!.order - 1);
  const backfill = items(before.length ? before : prevUnit ? unitItemIds(course, prevUnit.id) : []);

  const match = matchable([...fresh, ...shuffle(backfill, ctx.rng)]);
  const matchEx = match ? [matchPairs(ctx, match)] : [];

  const counted = (list: Exercise[]) => list.filter((e) => e.kind !== 'intro').length;
  let rest = shuffle(second, ctx.rng);
  const fill: Exercise[] = [];
  // The very first lesson has nothing earlier to review, so it repeats its own items.
  const fillFrom = [...shuffle(backfill, ctx.rng), ...shuffle(fresh, ctx.rng), ...shuffle(fresh, ctx.rng)];
  for (const it of fillFrom) {
    if (counted(first) + matchEx.length + rest.length + fill.length >= LESSON_MIN) break;
    fill.push(anyExercise(ctx, it));
  }
  rest = shuffle([...rest, ...fill], ctx.rng);
  while (counted(first) + matchEx.length + rest.length > LESSON_MAX && rest.length) rest.pop();

  return [...first, ...matchEx, ...rest];
}

function practice(ctx: Ctx, items: Item[], count: number): Exercise[] {
  const out: Exercise[] = [];
  const match = matchable(shuffle(items, ctx.rng));
  if (match) out.push(matchPairs(ctx, match));
  let bag: Item[] = [];
  while (out.length < count && items.length) {
    if (!bag.length) bag = shuffle(items, ctx.rng);
    out.push(anyExercise(ctx, bag.pop()!));
  }
  return shuffle(out, ctx.rng);
}

// Quiz to skip a unit: the whole unit, no intros.
export function buildTestOut(course: Course, unitId: string, opts: BuildOptions = {}): Exercise[] {
  const ids = unitItemIds(course, unitId);
  const last = lessonsInUnit(course, unitId).slice(-1)[0];
  const ctx: Ctx = {
    course,
    rng: makeRng(opts.seed ?? `test-${unitId}`),
    mode: opts.alwaysShowTranslit ? 'show' : 'hint',
    pool: itemsSeenBy(course, last.id).map((id) => course.items[id]),
    prefix: `test-${unitId}`,
    n: 0,
  };
  return practice(ctx, ids.map((id) => course.items[id]), LESSON_MAX);
}

// One exercise per due item.
export function buildReview(
  course: Course,
  dueIds: string[],
  learnedIds: string[],
  opts: BuildOptions = {},
): Exercise[] {
  const ctx: Ctx = {
    course,
    rng: makeRng(opts.seed ?? Date.now()),
    mode: opts.alwaysShowTranslit ? 'show' : 'hint',
    pool: learnedIds.map((id) => course.items[id]).filter(Boolean),
    prefix: 'review',
    n: 0,
  };
  return shuffle(
    dueIds.map((id) => anyExercise(ctx, course.items[id])),
    ctx.rng,
  );
}
