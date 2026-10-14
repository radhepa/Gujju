import { GU_LETTERS, sentences } from './text';
import type { Book, BookSentence } from './types';

// Turning pasted text into a book. Each line is split into sentences; a
// line can carry its English after a "|", in which case the whole line is
// kept as one sentence so the translation stays with it:
//
//   હું ઘરે છું. | I am at home.
//   આજે ગરમી છે. બહાર ન જાઓ.

export const MAX_BOOK_SENTENCES = 400;

export function parseBookText(text: string): BookSentence[] {
  const out: { gu: string; en?: string }[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bar = line.indexOf('|');
    if (bar >= 0) {
      const gu = line.slice(0, bar).trim();
      const en = line.slice(bar + 1).trim();
      if (GU_LETTERS.test(gu)) out.push({ gu, en: en || undefined });
      continue;
    }
    for (const s of sentences(line)) if (GU_LETTERS.test(s)) out.push({ gu: s });
  }
  return out.slice(0, MAX_BOOK_SENTENCES).map((s, i) => ({ id: `p${i + 1}`, ...s }));
}

// The text a book was made from, for editing it again.
export function bookToText(book: Book): string {
  return book.sentences.map((s) => (s.en ? `${s.gu} | ${s.en}` : s.gu)).join('\n');
}

export function newBookId(now = Date.now()): string {
  return `b${now.toString(36)}`;
}
