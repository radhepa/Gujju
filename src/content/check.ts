import { normGu, words } from '../lib/text';
import type { Book, Collection, LexEntry } from '../lib/types';

// Structural checks on the practice content: the things a machine can be
// sure about. Whether the Gujarati is *right* still needs a reader.
// Used by the content tests and by `npm run check:content`.

export interface Issue {
  rule: string;
  where: string;
  message: string;
}

export interface ContentSet {
  collections: Collection[];
  books: Book[];
  lexicon: LexEntry[];
  // Gujarati words the course itself teaches; they count as glossed.
  courseWords: string[];
}

const GU_TEXT = /^[\u0A80-\u0AFF\s.,?!"'“”‘’:;\-–—…]+$/;
const TR_TEXT = /^[A-Za-z\s.,?!"'“”‘’:;\-–—…]+$/;
const POS = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'post', 'conj', 'part', 'num', 'interj', 'q']);
const endMark = (s: string) => (/[?]["'”’]?$/.test(s.trim()) ? '?' : /[!]["'”’]?$/.test(s.trim()) ? '!' : /[.]["'”’]?$/.test(s.trim()) ? '.' : '');

export function lexiconIndex(lexicon: LexEntry[], courseWords: string[]): Set<string> {
  return new Set([...lexicon.map((e) => normGu(e.gu)), ...courseWords.map(normGu)]);
}

export function checkContent(set: ContentSet): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, where: string, message: string) => issues.push({ rule, where, message });
  const known = lexiconIndex(set.lexicon, set.courseWords);

  // Lexicon
  const byGu = new Map<string, LexEntry[]>();
  for (const e of set.lexicon) {
    const where = `lexicon ${e.gu}`;
    if (!e.gu || !e.tr || !e.en) add('lex-fields', where, 'gu, tr and en are all required');
    if (e.gu && !/^[\u0A80-\u0AFF]+$/.test(e.gu)) add('lex-script', where, 'gu must be one Gujarati word, no spaces or punctuation');
    if (e.tr && !/^[A-Za-z]+$/.test(e.tr)) add('lex-translit', where, `tr "${e.tr}" must be plain letters`);
    if (!POS.has(e.pos)) add('lex-pos', where, `unknown pos "${e.pos}"`);
    if (e.gu !== normGu(e.gu)) add('lex-normal', where, 'not in NFC form or has zero-width characters');
    const list = byGu.get(normGu(e.gu)) ?? [];
    list.push(e);
    byGu.set(normGu(e.gu), list);
  }
  for (const [gu, list] of byGu) {
    const trs = new Set(list.map((e) => e.tr.toLowerCase()));
    if (trs.size > 1) add('lex-conflict', `lexicon ${gu}`, `spelled the same but transliterated differently: ${[...trs].join(', ')}`);
  }

  // Sentences, from collections and books alike
  const ids = new Set<string>();
  const seenGu = new Map<string, string>();
  const sentenceChecks = (where: string, s: { id: string; gu: string; tr?: string; en?: string; cloze?: string; wrong?: string[] }, needsCloze: boolean) => {
    if (ids.has(s.id)) add('id-unique', where, `duplicate id ${s.id}`);
    ids.add(s.id);
    if (!GU_TEXT.test(s.gu)) add('gu-script', where, 'gu has characters that are not Gujarati script or punctuation');
    if (s.gu !== normGu(s.gu)) add('gu-normal', where, 'gu not in NFC form or has zero-width characters');
    if (/\s{2,}/.test(s.gu)) add('gu-spaces', where, 'double space in gu');
    const dup = seenGu.get(normGu(s.gu));
    if (dup) add('gu-duplicate', where, `same sentence as ${dup}`);
    seenGu.set(normGu(s.gu), s.id);
    const gw = words(s.gu);
    if (s.tr !== undefined) {
      if (!TR_TEXT.test(s.tr)) add('tr-script', where, 'tr must be Latin letters and punctuation only');
      const tw = words(s.tr);
      if (tw.length !== gw.length) add('tr-align', where, `gu has ${gw.length} words but tr has ${tw.length}`);
      if (endMark(s.tr) !== endMark(s.gu)) add('tr-end', where, 'tr and gu end with different punctuation');
    }
    if (s.en !== undefined) {
      if (!s.en.trim()) add('en-empty', where, 'en is empty');
      if (endMark(s.gu) === '?' && endMark(s.en) !== '?') add('en-question', where, 'gu is a question but en is not');
      if (endMark(s.gu) !== '?' && endMark(s.en) === '?') add('en-question', where, 'en is a question but gu is not');
    }
    if (!endMark(s.gu)) add('gu-end', where, 'gu should end with . ? or !');
    for (const w of gw) if (!known.has(normGu(w))) add('gloss', where, `"${w}" is not in the lexicon`);
    if (needsCloze || s.cloze !== undefined) {
      const c = s.cloze ?? '';
      const hits = gw.filter((w) => normGu(w) === normGu(c)).length;
      if (hits !== 1) add('cloze-word', where, `cloze "${c}" must appear exactly once as a whole word (found ${hits})`);
      const wrong = s.wrong ?? [];
      if (wrong.length !== 3) add('wrong-count', where, `needs exactly 3 wrong answers, has ${wrong.length}`);
      if (new Set(wrong.map(normGu)).size !== wrong.length) add('wrong-unique', where, 'wrong answers repeat');
      for (const w of wrong) {
        if (normGu(w) === normGu(c)) add('wrong-is-answer', where, `wrong answer "${w}" is the answer`);
        if (!known.has(normGu(w))) add('wrong-gloss', where, `wrong answer "${w}" is not in the lexicon`);
        if (!/^[\u0A80-\u0AFF]+$/.test(w)) add('wrong-script', where, `wrong answer "${w}" must be one Gujarati word`);
      }
    }
  };

  for (const col of set.collections) {
    if (!col.title || !col.titleGu || !col.blurb) add('collection-fields', `collection ${col.id}`, 'title, titleGu and blurb are required');
    col.sentences.forEach((s) => sentenceChecks(`${col.id}/${s.id}`, s, true));
  }
  for (const b of set.books) {
    if (!b.title) add('book-fields', `book ${b.id}`, 'title is required');
    b.sentences.forEach((s) => {
      sentenceChecks(`${b.id}/${s.id}`, s, false);
      if (b.builtIn && (!s.tr || !s.en)) add('book-translation', `${b.id}/${s.id}`, 'built-in book sentences need tr and en');
    });
  }
  return issues;
}
