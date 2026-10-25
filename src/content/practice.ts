import type { Book, Collection, LexEntry } from '../lib/types';
import { normGu } from '../lib/text';
import { course } from './course';

import cEveryday from '../../content/cloze/everyday.json';
import cOutAndAbout from '../../content/cloze/out-and-about.json';
import cConversations from '../../content/cloze/conversations.json';
import bKesarMarket from '../../content/books/kesar-market.json';
import bThirstyCrow from '../../content/books/thirsty-crow.json';
import bNavratri from '../../content/books/navratri.json';
import bLetterToBa from '../../content/books/letter-to-ba.json';
import lEveryday from '../../content/lexicon/everyday.json';
import lOutAndAbout from '../../content/lexicon/out-and-about.json';
import lConversations from '../../content/lexicon/conversations.json';
import lBooks from '../../content/lexicon/books.json';
import lBaseForms from '../../content/lexicon/base-forms.json';
import lCourse from '../../content/lexicon/course.json';

// Sentence practice collections, the built-in books and the word list that
// glosses them. Each content file can be checked and edited on its own.

export const collections = [cEveryday, cOutAndAbout, cConversations] as Collection[];
export const builtInBooks = [bKesarMarket, bThirstyCrow, bNavratri, bLetterToBa] as Book[];
export const lexicon = [...lEveryday, ...lOutAndAbout, ...lConversations, ...lBooks, ...lBaseForms, ...lCourse] as LexEntry[];

// Course words as dictionary entries, so a word taught in a lesson is
// glossed everywhere else too.
export const courseWords: LexEntry[] = Object.values(course.items)
  .filter((it) => it.type === 'word' || it.type === 'number')
  .flatMap((it) =>
    it.gujarati
      .split(/\s+/)
      .length === 1
      ? [{ gu: it.gujarati, tr: it.translit, en: it.english, pos: 'noun' as const, note: it.notes }]
      : [],
  );

const index = new Map<string, LexEntry[]>();
for (const e of [...lexicon, ...courseWords]) {
  const k = normGu(e.gu);
  const list = index.get(k) ?? [];
  if (!list.some((x) => x.en === e.en)) list.push(e);
  index.set(k, list);
}

// Every meaning recorded for a word as written.
export function lookup(word: string): LexEntry[] {
  return index.get(normGu(word)) ?? [];
}

export function allEntries(): LexEntry[] {
  return [...index.values()].flat();
}
