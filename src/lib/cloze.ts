import { shuffle, type Rng } from './rng';
import { isDue } from './srs';
import { normGu, normTranslit, words } from './text';
import type { Book, BookSentence, CardRow, ClozeSentence, Collection, LexEntry } from './types';

// Sentence practice in the style of Clozemaster: a sentence with one word
// blanked, four options (or type it in), then the whole sentence with every
// word glossed. Each sentence is its own FSRS card, kept beside the course
// cards but with a prefix so the two never mix:
//   cz:<sentence id>              a sentence from a collection
//   bk:<book id>:<sentence id>    a sentence from a book

export const ROUND_SIZE = 10;
// A card counts as mastered once FSRS expects to keep it for three weeks.
export const MASTERED_STABILITY = 21;

export interface PracticeSource {
  // The collection id, or `book:<id>`.
  id: string;
  kind: 'collection' | 'book';
  title: string;
  titleGu?: string;
  level?: number;
  sentences: (ClozeSentence | BookSentence)[];
}

export interface ClozeCard {
  cardId: string;
  sourceId: string;
  sentenceId: string;
  gu: string;
  tr?: string;
  en?: string;
  note?: string;
  answer: string;
  // Where the blank is, counting words.
  index: number;
  wrong: string[];
}

export const fromCollection = (c: Collection): PracticeSource => ({
  id: c.id,
  kind: 'collection',
  title: c.title,
  titleGu: c.titleGu,
  level: c.level,
  sentences: c.sentences,
});

export const fromBook = (b: Book): PracticeSource => ({
  id: `book:${b.id}`,
  kind: 'book',
  title: b.title,
  titleGu: b.titleGu,
  level: b.level,
  sentences: b.sentences,
});

export function cardIdFor(source: PracticeSource, sentenceId: string): string {
  return source.kind === 'collection' ? `cz:${sentenceId}` : `bk:${source.id.slice(5)}:${sentenceId}`;
}

// Cards outside the course: sentence practice (cz:, bk:) and spelling (wr:).
export const isPracticeCard = (id: string) => id.startsWith('cz:') || id.startsWith('bk:') || id.startsWith('wr:');
export const isSentenceCard = (id: string) => id.startsWith('cz:') || id.startsWith('bk:');

export interface ClozeContext {
  lookup: (word: string) => LexEntry[];
  // Every glossed word, used for wrong answers when a sentence has none.
  entries: LexEntry[];
  // How often each word turns up across all the content. Rarer words make
  // better blanks than છે and અને.
  frequency: Map<string, number>;
}

export function wordFrequency(texts: string[]): Map<string, number> {
  const f = new Map<string, number>();
  for (const t of texts) for (const w of words(t)) f.set(normGu(w), (f.get(normGu(w)) ?? 0) + 1);
  return f;
}

const BLANKABLE = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'q', 'post', 'num']);
const letters = (w: string) => [...w].length;
// The last vowel sign (or letter) and any nasal mark: what agreement changes.
const ending = (w: string) => normGu(w).match(/[ા-ૌ]?[ઁં]?$/)?.[0] || [...w].pop() || '';

// For a sentence without a hand-picked blank (anything pasted into a book):
// blank its least common glossed word and find three wrong answers of the
// same kind and a similar length. Falls back to the longest word, with
// wrong answers from the same book.
export function autoCloze(
  s: BookSentence,
  ctx: ClozeContext,
  rng: Rng,
  siblings: string[] = [],
): { answer: string; wrong: string[] } | null {
  const ws = words(s.gu);
  if (ws.length < 2) return null;
  const counts = new Map<string, number>();
  for (const w of ws) counts.set(normGu(w), (counts.get(normGu(w)) ?? 0) + 1);
  const once = ws.filter((w) => counts.get(normGu(w)) === 1);
  if (!once.length) return null;

  const glossed = once
    .map((w) => ({ w, e: ctx.lookup(w).find((e) => BLANKABLE.has(e.pos)) }))
    .filter((x): x is { w: string; e: LexEntry } => !!x.e);
  const inSentence = new Set(ws.map(normGu));

  if (glossed.length) {
    glossed.sort((a, b) => (ctx.frequency.get(normGu(a.w)) ?? 0) - (ctx.frequency.get(normGu(b.w)) ?? 0) || letters(b.w) - letters(a.w));
    const { w, e } = glossed[0];
    const pool = ctx.entries.filter((x) => x.pos === e.pos && !inSentence.has(normGu(x.gu)) && normGu(x.gu) !== normGu(w));
    const unique = [...new Map(pool.map((x) => [normGu(x.gu), x.gu])).values()];
    // Same ending first (બનાવે wants લખે and વાંચે, not સમજું), so the answer
    // can't be spotted by its shape alone.
    const near = unique
      .sort((a, b) => Number(ending(b) === ending(w)) - Number(ending(a) === ending(w)) || Math.abs(letters(a) - letters(w)) - Math.abs(letters(b) - letters(w)))
      .slice(0, 8);
    const wrong = shuffle(near, rng).slice(0, 3);
    if (wrong.length === 3) return { answer: w, wrong };
  }

  const longest = [...once].sort((a, b) => letters(b) - letters(a))[0];
  const others = [...new Set(siblings.flatMap(words).map(normGu))].filter(
    (x) => x !== normGu(longest) && !inSentence.has(x) && letters(x) > 1,
  );
  const fill = others.length >= 3 ? others : [...others, ...ctx.entries.map((e) => normGu(e.gu)).filter((x) => !inSentence.has(x))];
  const near = [...new Set(fill)]
    .sort((a, b) => Math.abs(letters(a) - letters(longest)) - Math.abs(letters(b) - letters(longest)))
    .slice(0, 12);
  const wrong = shuffle(near, rng).slice(0, 3);
  return wrong.length === 3 ? { answer: longest, wrong } : null;
}

export function cardsFor(source: PracticeSource, ctx: ClozeContext, rng: Rng): ClozeCard[] {
  const siblings = source.sentences.map((s) => s.gu);
  const out: ClozeCard[] = [];
  for (const s of source.sentences) {
    const picked =
      s.cloze && s.wrong?.length === 3 ? { answer: s.cloze, wrong: s.wrong } : autoCloze(s, ctx, rng, siblings);
    if (!picked) continue;
    const ws = words(s.gu);
    const index = ws.findIndex((w) => normGu(w) === normGu(picked.answer));
    if (index < 0) continue;
    out.push({
      cardId: cardIdFor(source, s.id),
      sourceId: source.id,
      sentenceId: s.id,
      gu: s.gu,
      tr: s.tr,
      en: s.en,
      note: 'note' in s ? s.note : undefined,
      answer: ws[index],
      index,
      wrong: picked.wrong,
    });
  }
  return out;
}

export function optionsFor(card: ClozeCard, rng: Rng): string[] {
  return shuffle([card.answer, ...card.wrong], rng);
}

// Due cards first (oldest first), then new ones in the order they're
// written, so a collection builds from its easiest sentences.
export function buildRound(cards: ClozeCard[], rows: Map<string, CardRow>, now: Date, rng: Rng, size = ROUND_SIZE): ClozeCard[] {
  const due = cards
    .filter((c) => rows.has(c.cardId) && isDue(rows.get(c.cardId)!, now))
    .sort((a, b) => rows.get(a.cardId)!.due.localeCompare(rows.get(b.cardId)!.due));
  const fresh = cards.filter((c) => !rows.has(c.cardId));
  const chosen = [...due.slice(0, size), ...fresh.slice(0, Math.max(0, size - due.length))];
  // Nothing due and nothing new: practise the ones most likely to slip.
  if (!chosen.length) {
    const seen = cards.filter((c) => rows.has(c.cardId));
    seen.sort((a, b) => rows.get(a.cardId)!.stability - rows.get(b.cardId)!.stability);
    return shuffle(seen.slice(0, size), rng);
  }
  return shuffle(chosen, rng);
}

export interface SourceStats {
  total: number;
  seen: number;
  mastered: number;
  due: number;
}

export function sourceStats(cards: ClozeCard[], rows: Map<string, CardRow>, now: Date): SourceStats {
  let seen = 0;
  let mastered = 0;
  let due = 0;
  for (const c of cards) {
    const r = rows.get(c.cardId);
    if (!r) continue;
    seen++;
    if (r.stability >= MASTERED_STABILITY) mastered++;
    if (isDue(r, now)) due++;
  }
  return { total: cards.length, seen, mastered, due };
}

// The transliteration of the blanked word, from the sentence's own
// transliteration if it has one, otherwise from the word list.
export function answerTranslit(card: ClozeCard, lookup: (w: string) => LexEntry[]): string | undefined {
  if (card.tr) {
    const tw = words(card.tr);
    if (tw.length === words(card.gu).length) return tw[card.index];
  }
  return lookup(card.answer)[0]?.tr;
}

// A typed answer counts if it matches the word in Gujarati script, or its
// transliteration loosely (see normTranslit).
export function checkTyped(input: string, card: ClozeCard, lookup: (w: string) => LexEntry[]): boolean {
  const typed = input.trim();
  if (!typed) return false;
  if (/[\u0A80-\u0AFF]/.test(typed)) return normGu(typed) === normGu(card.answer);
  const tr = answerTranslit(card, lookup);
  return !!tr && normTranslit(typed) === normTranslit(tr);
}
