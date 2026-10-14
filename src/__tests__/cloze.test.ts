import { Rating } from 'ts-fsrs';
import {
  answerTranslit,
  autoCloze,
  buildRound,
  cardIdFor,
  cardsFor,
  checkTyped,
  fromBook,
  fromCollection,
  isPracticeCard,
  MASTERED_STABILITY,
  optionsFor,
  sourceStats,
  wordFrequency,
  type ClozeContext,
} from '../lib/cloze';
import { makeRng } from '../lib/rng';
import { review, scheduler } from '../lib/srs';
import type { Book, CardRow, Collection, LexEntry } from '../lib/types';

const lex: LexEntry[] = [
  { gu: 'હું', tr: 'hun', en: 'I', pos: 'pron' },
  { gu: 'ઘરે', tr: 'ghare', en: 'at home', pos: 'noun', base: 'ઘર' },
  { gu: 'છું', tr: 'chhun', en: 'am', pos: 'verb' },
  { gu: 'છે', tr: 'chhe', en: 'is', pos: 'verb' },
  { gu: 'છો', tr: 'chho', en: 'are', pos: 'verb' },
  { gu: 'છીએ', tr: 'chhiye', en: 'are (we)', pos: 'verb' },
  { gu: 'બજારે', tr: 'bajaare', en: 'at the market', pos: 'noun' },
  { gu: 'શાળાએ', tr: 'shaaLaae', en: 'at school', pos: 'noun' },
  { gu: 'મંદિરે', tr: 'mandire', en: 'at the temple', pos: 'noun' },
  { gu: 'કામે', tr: 'kaame', en: 'at work', pos: 'noun' },
];
const index = new Map(lex.map((e) => [e.gu, [e]]));
const ctx: ClozeContext = {
  lookup: (w) => index.get(w) ?? [],
  entries: lex,
  frequency: wordFrequency(['હું ઘરે છું.', 'તે ઘરે છે.', 'હું છું.', 'હું છું.']),
};

const collection: Collection = {
  id: 'test',
  title: 'Test',
  titleGu: 'ટેસ્ટ',
  level: 1,
  blurb: 'Test sentences.',
  sentences: [
    { id: 't-1', gu: 'હું ઘરે છું.', tr: 'hun ghare chhun.', en: 'I am at home.', cloze: 'છું', wrong: ['છે', 'છો', 'છીએ'] },
    { id: 't-2', gu: 'તે ઘરે છે.', tr: 'te ghare chhe.', en: 'He is at home.', cloze: 'છે', wrong: ['છું', 'છો', 'છીએ'] },
  ],
};

const book: Book = {
  id: 'mine',
  title: 'Mine',
  builtIn: false,
  sentences: [
    { id: 'p1', gu: 'હું ઘરે છું.' },
    { id: 'p2', gu: 'એકલું' },
  ],
};

describe('card ids', () => {
  it('prefixes collection and book cards differently', () => {
    expect(cardIdFor(fromCollection(collection), 't-1')).toBe('cz:t-1');
    expect(cardIdFor(fromBook(book), 'p1')).toBe('bk:mine:p1');
    expect(isPracticeCard('cz:t-1')).toBe(true);
    expect(isPracticeCard('bk:mine:p1')).toBe(true);
    expect(isPracticeCard('w-ghar')).toBe(false);
  });
});

describe('cardsFor', () => {
  it('uses the hand-picked blank and wrong answers', () => {
    const cards = cardsFor(fromCollection(collection), ctx, makeRng(1));
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ cardId: 'cz:t-1', answer: 'છું', index: 2, wrong: ['છે', 'છો', 'છીએ'] });
  });

  it('makes a blank for pasted sentences and skips one-word lines', () => {
    const cards = cardsFor(fromBook(book), ctx, makeRng(1));
    expect(cards.map((c) => c.sentenceId)).toEqual(['p1']);
  });

  it('options are the answer plus the three wrong ones, shuffled', () => {
    const [card] = cardsFor(fromCollection(collection), ctx, makeRng(1));
    const options = optionsFor(card, makeRng(2));
    expect([...options].sort()).toEqual([...card.wrong, card.answer].sort());
  });
});

describe('autoCloze', () => {
  it('blanks the least common glossed word, with same-kind wrong answers', () => {
    const picked = autoCloze({ id: 'x', gu: 'હું ઘરે છું.' }, ctx, makeRng(3))!;
    // ઘરે is rarer than હું and છું in the frequency table.
    expect(picked.answer).toBe('ઘરે');
    expect(picked.wrong).toHaveLength(3);
    for (const w of picked.wrong) expect(index.get(w)?.[0].pos).toBe('noun');
    expect(picked.wrong).not.toContain('ઘરે');
  });

  it('falls back to the longest word when nothing is glossed', () => {
    const picked = autoCloze({ id: 'x', gu: 'ક ખગઘ ચછ.' }, ctx, makeRng(3), ['જઝ ટઠડ', 'તથદ ધન']);
    expect(picked?.answer).toBe('ખગઘ');
    expect(picked?.wrong).toHaveLength(3);
  });

  it('never blanks a word that appears twice', () => {
    expect(autoCloze({ id: 'x', gu: 'છું છું.' }, ctx, makeRng(3))).toBeNull();
  });
});

describe('typed answers', () => {
  const [card] = cardsFor(fromCollection(collection), ctx, makeRng(1));

  it('accepts the Gujarati word', () => {
    expect(checkTyped('છું', card, ctx.lookup)).toBe(true);
    expect(checkTyped(' છું ', card, ctx.lookup)).toBe(true);
    expect(checkTyped('છે', card, ctx.lookup)).toBe(false);
  });

  it('accepts a loose transliteration', () => {
    expect(answerTranslit(card, ctx.lookup)).toBe('chhun');
    expect(checkTyped('chhun', card, ctx.lookup)).toBe(true);
    expect(checkTyped('Chhun', card, ctx.lookup)).toBe(true);
    expect(checkTyped('chun', card, ctx.lookup)).toBe(true);
    expect(checkTyped('chhe', card, ctx.lookup)).toBe(false);
    expect(checkTyped('', card, ctx.lookup)).toBe(false);
  });
});

describe('rounds and stats', () => {
  const cards = cardsFor(fromCollection(collection), ctx, makeRng(1));
  const now = new Date(2026, 9, 14, 9);
  const f = scheduler(0.9);

  it('a fresh collection gives new cards in order', () => {
    const round = buildRound(cards, new Map(), now, makeRng(1));
    expect(round.map((c) => c.cardId).sort()).toEqual(['cz:t-1', 'cz:t-2']);
  });

  it('puts due cards first and counts seen, due and mastered', () => {
    const seen = review(f, 'cz:t-1', undefined, Rating.Good, new Date(2026, 8, 1));
    const strong: CardRow = { ...review(f, 'cz:t-2', undefined, Rating.Good, now), stability: MASTERED_STABILITY + 1, due: new Date(2027, 0, 1).toISOString() };
    const rows = new Map([
      ['cz:t-1', seen],
      ['cz:t-2', strong],
    ]);
    const round = buildRound(cards, rows, now, makeRng(1), 1);
    expect(round.map((c) => c.cardId)).toEqual(['cz:t-1']);
    expect(sourceStats(cards, rows, now)).toEqual({ total: 2, seen: 2, mastered: 1, due: 1 });
  });

  it('with nothing due or new, practises the weakest cards', () => {
    const later = new Date(2027, 5, 1).toISOString();
    const rows = new Map(cards.map((c, i) => [c.cardId, { ...review(f, c.cardId, undefined, Rating.Good, now), due: later, stability: i + 1 }]));
    const round = buildRound(cards, rows, now, makeRng(1), 1);
    expect(round.map((c) => c.cardId)).toEqual(['cz:t-1']);
  });
});
