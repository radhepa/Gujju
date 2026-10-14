import { fromBook, fromCollection, wordFrequency, type ClozeContext, type PracticeSource } from '../lib/cloze';
import type { Book } from '../lib/types';
import { course } from './course';
import { allEntries, builtInBooks, collections, lookup } from './practice';

// Where practice rounds and the reader get their sentences from.

// The book that "Save sentence" adds to. Created the first time it's used.
export const SAVED_BOOK_ID = 'saved';

let ctx: ClozeContext | null = null;

export function clozeContext(): ClozeContext {
  if (!ctx) {
    const texts = [
      ...collections.flatMap((c) => c.sentences.map((s) => s.gu)),
      ...builtInBooks.flatMap((b) => b.sentences.map((s) => s.gu)),
      ...Object.values(course.items)
        .filter((i) => i.type === 'sentence')
        .map((i) => i.gujarati),
    ];
    ctx = { lookup, entries: allEntries(), frequency: wordFrequency(texts) };
  }
  return ctx;
}

export function allBooks(userBooks: Book[]): Book[] {
  const mine = [...userBooks].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return [...builtInBooks.filter((b) => b.sentences.length > 0), ...mine];
}

export function findBook(id: string, userBooks: Book[]): Book | undefined {
  return allBooks(userBooks).find((b) => b.id === id);
}

export function practiceSources(userBooks: Book[]): PracticeSource[] {
  return [...collections.filter((c) => c.sentences.length > 0).map(fromCollection), ...allBooks(userBooks).map(fromBook)];
}

export function findSource(id: string, userBooks: Book[]): PracticeSource | undefined {
  return practiceSources(userBooks).find((s) => s.id === id);
}

// Sentence examples for a word, from everything the app ships.
export function examplesFor(word: string, limit = 6): { gu: string; tr?: string; en?: string }[] {
  const out: { gu: string; tr?: string; en?: string }[] = [];
  const has = (gu: string) => gu.split(/[\s.,?!]+/).includes(word);
  for (const c of collections) for (const s of c.sentences) if (has(s.gu)) out.push(s);
  for (const b of builtInBooks) for (const s of b.sentences) if (has(s.gu)) out.push(s);
  for (const i of Object.values(course.items)) {
    if (i.type === 'sentence' && has(i.gujarati)) out.push({ gu: i.gujarati, tr: i.translit, en: i.english });
  }
  return out.slice(0, limit);
}
