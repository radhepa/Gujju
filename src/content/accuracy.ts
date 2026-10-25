import { normGu, words } from '../lib/text';
import { checkContent, type Issue } from './check';
import { course } from './course';
import { grammar } from './guides';
import { builtInBooks, collections, courseWords, lexicon } from './practice';
import type { LexEntry } from '../lib/types';

// One hundred accuracy checks over every piece of Gujarati in the app: the
// course, the sentence collections, the books and the word list. Each check
// returns its violations as short keys ("everyday/ev-012: ..."). A violation
// that a person has looked at and judged fine goes in EXCEPTIONS with the
// reason, so the check stays strict for everything else.
//
// They catch what a machine can: broken spelling, transliterations that
// don't match the script, translations that lose a negative or a number,
// agreement slips, wrong answers that are really right. They can't tell you
// a sentence sounds natural. That still needs a native speaker.

export interface Check {
  id: number;
  name: string;
  run(): string[];
}

// ---------------------------------------------------------------- data

interface Text {
  where: string;
  kind: 'letter' | 'word' | 'number' | 'course-sentence' | 'collection' | 'book' | 'grammar';
  gu: string;
  tr?: string;
  en?: string;
  level?: number;
  cloze?: string;
  wrong?: string[];
  prefix?: string;
}

const courseTexts: Text[] = Object.values(course.items).map((it) => ({
  where: `course/${it.id}`,
  kind: it.type === 'sentence' ? 'course-sentence' : it.type,
  gu: it.gujarati,
  tr: it.translit,
  en: it.english,
}));

const PREFIX: Record<string, string> = {
  everyday: 'ev-',
  'out-and-about': 'oa-',
  conversations: 'cv-',
  'kesar-market': 'km-',
  'thirsty-crow': 'tc-',
  navratri: 'nv-',
  'letter-to-ba': 'lb-',
};

const practiceTexts: Text[] = [
  ...collections.flatMap((c) =>
    c.sentences.map((s) => ({ where: `${c.id}/${s.id}`, kind: 'collection' as const, gu: s.gu, tr: s.tr, en: s.en, level: c.level, cloze: s.cloze, wrong: s.wrong, prefix: PREFIX[c.id] })),
  ),
  ...builtInBooks.flatMap((b) =>
    b.sentences.map((s) => ({ where: `${b.id}/${s.id}`, kind: 'book' as const, gu: s.gu, tr: s.tr, en: s.en, level: b.level, cloze: s.cloze, wrong: s.wrong, prefix: PREFIX[b.id] })),
  ),
];

// Every example in the grammar guide gets the same sentence checks.
const grammarTexts: Text[] = grammar.flatMap((t) =>
  t.sections.flatMap((sec, i) => (sec.examples ?? []).map((e, j) => ({ where: `grammar/${t.id}/${i + 1}.${j + 1}`, kind: 'grammar' as const, gu: e.gu, tr: e.tr, en: e.en }))),
);

const sentenceTexts = [...courseTexts.filter((t) => t.kind === 'course-sentence'), ...practiceTexts, ...grammarTexts];
const allTexts = [...courseTexts, ...practiceTexts, ...grammarTexts];

// Every (Gujarati word, transliteration) pair the app shows, with where.
interface WordPair {
  gu: string;
  tr: string;
  where: string;
}

function sentencePairs(): WordPair[] {
  const out: WordPair[] = [];
  for (const t of sentenceTexts) {
    if (!t.tr) continue;
    const g = words(t.gu);
    const r = words(t.tr);
    if (g.length !== r.length) continue;
    g.forEach((w, i) => out.push({ gu: w, tr: r[i], where: t.where }));
  }
  return out;
}

const lexPairs = (): WordPair[] => lexicon.map((e) => ({ gu: e.gu, tr: e.tr, where: `lexicon/${e.gu}` }));
const courseWordPairs = (): WordPair[] =>
  courseTexts
    .filter((t) => (t.kind === 'word' || t.kind === 'number') && words(t.gu).length === 1 && !/[\u0AE6-\u0AEF]/.test(t.gu))
    .map((t) => ({ gu: t.gu, tr: t.tr!, where: t.where }));
const allPairs = () => [...sentencePairs(), ...lexPairs(), ...courseWordPairs()];

const allGuWords = (): string[] => {
  const set = new Set<string>();
  for (const t of allTexts) if (t.kind !== 'letter') for (const w of words(t.gu)) set.add(normGu(w));
  for (const e of lexicon) set.add(normGu(e.gu));
  for (const t of practiceTexts) for (const w of t.wrong ?? []) set.add(normGu(w));
  return [...set];
};

const tokens = (t: Text) => words(t.gu).map(normGu);
const last = (t: Text) => tokens(t)[tokens(t).length - 1];
const endMark = (s: string) => (/\?["'”’]?$/.test(s.trim()) ? '?' : /!["'”’]?$/.test(s.trim()) ? '!' : /\.["'”’]?$/.test(s.trim()) ? '.' : '');
const lexBy = new Map<string, LexEntry[]>();
for (const e of [...lexicon, ...courseWords]) {
  const k = normGu(e.gu);
  lexBy.set(k, [...(lexBy.get(k) ?? []), e]);
}

// ---------------------------------------------------------------- script helpers

const CONSONANT = /[\u0A95-\u0AB9]/;
const VOWEL_SIGN = /[\u0ABE-\u0ACCૢૣ]/;
const count = (s: string, re: RegExp) => (s.match(new RegExp(re.source, 'g')) ?? []).length;

// What each Gujarati letter may be written as in the app's transliteration.
const CONS: Record<string, string> = {
  ક: 'k', ખ: 'kh', ગ: 'g', ઘ: 'gh', ઙ: 'n', ચ: 'ch', છ: 'chh', જ: 'j', ઝ: '(?:jh|z)', ઞ: '(?:n|y)',
  ટ: 'T', ઠ: 'Th', ડ: 'D', ઢ: 'Dh', ણ: 'N', ત: 't', થ: 'th', દ: 'd', ધ: 'dh', ન: 'n',
  પ: 'p', ફ: '(?:ph|f)', બ: 'b', ભ: 'bh', મ: 'm', ય: 'y', ર: 'r', લ: 'l', વ: '(?:v|w)',
  શ: 'sh', ષ: 'sh', સ: 's', હ: 'h', ળ: 'L',
};
const V = '(?:[aeiou]|y(?=[aeiou]))*';

// A regex for the consonant skeleton of a Gujarati word: its consonants in
// order with any vowels between them. Retroflex letters must be capitals.
export function skeleton(gu: string): RegExp {
  let re = '^' + V;
  const chars = [...gu.replace(/જ્ઞ/g, '\u0001')];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const d = CONS[ch];
    // A doubled aspirate (ભ્ભ) is written bbh, the way it's said.
    if (d && /^[a-zA-Z]h$/.test(d) && chars[i + 1] === '્' && chars[i + 2] === ch) {
      re += `(?:${d}${d}|${d[0]}${d})` + V;
      i += 2;
      continue;
    }
    if (ch === '\u0001') re += '(?:gn|gy|jn|jny)' + V;
    else if (d) re += d + V;
    else if (ch === 'ં' || ch === 'ઁ') re += '(?:n|m)?' + V;
    else if (ch === 'ઃ') re += 'h?' + V;
    else if (ch === 'ઋ' || ch === 'ૃ') re += 'r' + V;
  }
  return new RegExp(re + '$');
}

function skeletonCheck(pairs: WordPair[]): string[] {
  return pairs.filter((p) => !skeleton(normGu(p.gu)).test(p.tr)).map((p) => `${p.where}: ${p.gu} ≠ ${p.tr}`);
}

const uniquePairs = (pairs: WordPair[]) =>
  [...new Map(pairs.filter((p) => !/[\u0AE6-\u0AEF]/.test(p.gu)).map((p) => [`${normGu(p.gu)}|${p.tr}`, p])).values()];

// ---------------------------------------------------------------- translation helpers

const NEG_GU = new Set(['નથી', 'ન', 'નહીં', 'નહિ', 'નહોતો', 'નહોતી', 'નહોતું', 'નહોતા', 'નહોતાં', 'મત']);
const NEG_EN = /\b(not|no|never|nothing|nobody|none|neither|nor|without|cannot)\b|n't/i;

const NUMBERS: Record<string, RegExp> = {
  બે: /\b(two|2|both|couple|twice)\b/i,
  ત્રણ: /\b(three|3|thrice)\b/i,
  ચાર: /\b(four|4)\b/i,
  પાંચ: /\b(five|5|fifth)\b/i,
  છ: /\b(six|6)\b/i,
  સાત: /\b(seven|7)\b/i,
  આઠ: /\b(eight|8)\b/i,
  નવ: /\b(nine|9)\b/i,
  દસ: /\b(ten|10|tenth)\b/i,
  વીસ: /\b(twenty|20)\b/i,
  ત્રીસ: /\b(thirty|30)\b/i,
  ચાળીસ: /\b(forty|40)\b/i,
  પચાસ: /\b(fifty|50)\b/i,
  સો: /\b(hundred|100)\b/i,
  હજાર: /\b(thousand|1,?000)\b/i,
};

const DAYS: Record<string, RegExp> = {
  સોમવાર: /monday/i, મંગળવાર: /tuesday/i, બુધવાર: /wednesday/i, ગુરુવાર: /thursday/i,
  શુક્રવાર: /friday/i, શનિવાર: /saturday/i, રવિવાર: /sunday/i,
};

const COLOURS: Record<string, RegExp> = {
  લાલ: /\bred\b/i,
  લીલો: /\bgreen\b/i, લીલી: /\bgreen\b/i, લીલું: /\bgreen\b/i, લીલા: /\bgreen\b/i, લીલાં: /\bgreen\b/i,
  પીળો: /\byellow\b/i, પીળી: /\byellow\b/i, પીળું: /\byellow\b/i, પીળા: /\byellow\b/i, પીળાં: /\byellow\b/i,
  કાળો: /\bblack\b/i, કાળી: /\bblack\b/i, કાળું: /\bblack\b/i, કાળા: /\bblack\b/i, કાળાં: /\bblack\b/i,
  સફેદ: /\bwhite\b/i, ગુલાબી: /\bpink\b/i, નારંગી: /\borange\b/i, વાદળી: /\bblue\b/i,
};

const FAMILY: Record<string, RegExp> = {
  મમ્મી: /\b(mom|mum|mother|mummy|mommy)\b/i,
  પપ્પા: /\b(dad|father|papa|daddy)\b/i,
  બા: /\b(ba|grandma|grandmother|granny)\b/i,
  દાદા: /\b(grandpa|grandfather|dada)\b/i,
  દાદી: /\b(grandma|grandmother|dadi)\b/i,
  બહેન: /\bsisters?\b/i,
  દીકરો: /\bsons?\b/i,
  દીકરી: /\bdaughters?\b/i,
  કાકા: /\buncle\b/i,
  મામા: /\buncle\b/i,
  માસી: /\baunt\b/i,
  ફોઈ: /\baunt\b/i,
};

const TIME: Record<string, RegExp> = {
  આજે: /\btoday|tonight|this (morning|evening|afternoon)\b/i,
  કાલે: /\b(yesterday|tomorrow|last night)\b/i,
  સવારે: /\bmorning|breakfast|a\.m\.|am\b/i,
  સાંજે: /\bevenings?\b/i,
  રાત્રે: /\bnight|tonight\b/i,
  બપોરે: /\b(afternoon|noon|lunch|midday)\b/i,
};

const QUESTION: Record<string, RegExp> = {
  ક્યાં: /\bwhere\b/i,
  કોણ: /\b(who|whom|whose)\b/i,
  ક્યારે: /\bwhen\b/i,
  કેમ: /\b(why|how)\b/i,
  કેટલું: /\bhow (much|many|long|far|old)\b|\bwhat time\b/i,
  કેટલા: /\bhow (much|many|long|far|old)\b|\bwhat time\b/i,
  કેટલી: /\bhow (much|many|long|far|old)\b|\bwhat time\b/i,
  કેટલો: /\bhow (much|many|long|far|old)\b|\bwhat time\b/i,
  કયું: /\b(which|what)\b/i,
  કયો: /\b(which|what)\b/i,
  કઈ: /\b(which|what)\b/i,
  કયા: /\b(which|what)\b/i,
};

function vocabCheck(map: Record<string, RegExp>, onlyQuestions = false): string[] {
  const out: string[] = [];
  for (const t of sentenceTexts) {
    if (!t.en || (onlyQuestions && endMark(t.gu) !== '?')) continue;
    for (const w of tokens(t)) if (map[w] && !map[w].test(t.en)) out.push(`${t.where}: ${w} but "${t.en}"`);
  }
  return out;
}

// One clause, no joining words: the subject's verb is the last word.
const JOINERS = new Set(['કે', 'અને', 'પણ', 'કારણ', 'જો', 'ત્યારે', 'જ્યારે', 'એટલે', 'તો', 'પછી', 'ને']);
const simple = (t: Text) => !tokens(t).some((w) => JOINERS.has(w)) && !t.gu.includes(',');

function agreement(subject: string, bad: string[]): string[] {
  return sentenceTexts
    .filter((t) => tokens(t)[0] === subject && simple(t) && bad.includes(last(t)))
    .map((t) => `${t.where}: ${t.gu}`);
}

// Pairs of words that differ only by `fold` and mean the same thing: one
// word spelled two ways. (ગયા and ગયાં differ the same way but are two
// forms with two meanings, and their glosses say so.)
function variants(fold: (w: string) => string): string[] {
  const groups = new Map<string, Set<string>>();
  for (const w of allGuWords()) {
    const k = fold(w);
    groups.set(k, (groups.get(k) ?? new Set()).add(w));
  }
  const glosses = (w: string) => new Set((lexBy.get(w) ?? []).map((e) => e.en.toLowerCase().trim()));
  const out: string[] = [];
  for (const g of groups.values()) {
    const list = [...g].sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = glosses(list[i]);
        const b = glosses(list[j]);
        if (!a.size || !b.size || [...a].some((x) => b.has(x))) out.push(`${list[i]} / ${list[j]}`);
      }
    }
  }
  return out;
}

const REDUPLICATED = new Set(['ગોળ', 'થોડું', 'ધીમે', 'જલદી', 'ઘરે', 'રોજ', 'સાથે', 'ક્યાં', 'કોણ', 'શું', 'હા', 'ના', 'બરાબર', 'જરા', 'વારે', 'ચાલો', 'આવો', 'ધીરે', 'મોટા', 'નાના']);

// ---------------------------------------------------------------- the checks

const issuesByRule = (() => {
  let cache: Issue[] | null = null;
  return (rule: string) => {
    cache ??= checkContent({ collections, books: builtInBooks, lexicon, courseWords: courseWords.map((w) => w.gu) });
    return cache.filter((i) => i.rule === rule).map((i) => `${i.where}: ${i.message}`);
  };
})();

const each = (pred: (t: Text) => boolean, texts: Text[] = allTexts) => texts.filter(pred).map((t) => `${t.where}: ${t.gu}`);

export const CHECKS: Check[] = [
  // Script and encoding
  { id: 1, name: 'Gujarati text uses only Gujarati script and punctuation', run: () => each((t) => !/^[\u0A80-\u0AFF\s.,?!"'“”‘’:;\-–—…]+$/.test(t.gu)) },
  { id: 2, name: 'No Hindi (Devanagari) letters mixed into Gujarati', run: () => each((t) => /[\u0900-\u097F]/.test(t.gu)) },
  { id: 3, name: 'No Latin letters or digits inside Gujarati', run: () => each((t) => /[A-Za-z0-9]/.test(t.gu)) },
  { id: 4, name: 'Gujarati is in Unicode NFC form', run: () => [...each((t) => t.gu !== t.gu.normalize('NFC')), ...lexicon.filter((e) => e.gu !== e.gu.normalize('NFC')).map((e) => `lexicon/${e.gu}`)] },
  { id: 5, name: 'No zero-width or invisible characters', run: () => [...each((t) => /[\u200B-\u200D\uFEFF\u00A0]/.test(t.gu)), ...lexicon.filter((e) => /[\u200B-\u200D\uFEFF\u00A0]/.test(e.gu)).map((e) => `lexicon/${e.gu}`)] },
  {
    id: 6,
    name: 'Every vowel sign follows a consonant',
    run: () => allGuWords().filter((w) => [...w].some((ch, i, a) => VOWEL_SIGN.test(ch) && !(i > 0 && (CONSONANT.test(a[i - 1]) || a[i - 1] === '઼')))),
  },
  { id: 7, name: 'No two vowel signs in a row', run: () => allGuWords().filter((w) => /[\u0ABE-\u0ACC][\u0ABE-\u0ACC]/.test(w)) },
  { id: 8, name: 'Nasal marks (ં ઁ) sit on a letter, never alone', run: () => allGuWords().filter((w) => /^[ઁં]/.test(w) || /[ઁં]{2}/.test(w)) },
  { id: 9, name: 'No word ends in a halant (્)', run: () => allGuWords().filter((w) => w.endsWith('્')) },
  { id: 10, name: 'No nukta (Gujarati spelling does not use it)', run: () => allGuWords().filter((w) => w.includes('઼')) },
  { id: 11, name: 'No double, leading or trailing spaces', run: () => each((t) => /\s{2,}/.test(t.gu) || t.gu !== t.gu.trim()) },
  { id: 12, name: 'No space before punctuation', run: () => each((t) => /\s[.,?!]/.test(t.gu)) },
  { id: 13, name: 'Sentences end with . ? or !', run: () => each((t) => !endMark(t.gu), sentenceTexts) },
  { id: 14, name: 'No doubled punctuation', run: () => each((t) => /[.,?!]{2,}/.test(t.gu.replace(/\.\.\./g, '…'))) },
  { id: 15, name: 'Full stops are . not the Hindi danda (।)', run: () => each((t) => /[।॥]/.test(t.gu)) },

  // Transliteration
  { id: 16, name: 'Transliteration uses only Latin letters and punctuation', run: () => allTexts.filter((t) => t.tr && !/^[A-Za-z\s.,?!'’:;\-…]+$/.test(t.tr)).map((t) => `${t.where}: ${t.tr}`) },
  {
    id: 17,
    name: 'Transliteration is lower case except the retroflex capitals T D N L',
    run: () => uniquePairs(allPairs()).filter((p) => /[A-CE-KMO-SU-Z]/.test(p.tr)).map((p) => `${p.where}: ${p.tr}`),
  },
  { id: 18, name: 'Sentence transliterations have one word per Gujarati word', run: () => sentenceTexts.filter((t) => t.tr && words(t.tr).length !== words(t.gu).length).map((t) => `${t.where}`) },
  { id: 19, name: 'Sentence transliterations end like the Gujarati', run: () => sentenceTexts.filter((t) => t.tr && endMark(t.tr) !== endMark(t.gu)).map((t) => t.where) },
  { id: 20, name: 'Course words: consonants in the transliteration match the spelling', run: () => skeletonCheck(courseWordPairs()) },
  { id: 21, name: 'Course sentences: every word transliterated letter for letter', run: () => skeletonCheck(sentencePairs().filter((p) => p.where.startsWith('course/'))) },
  { id: 22, name: 'Collections: every word transliterated letter for letter', run: () => skeletonCheck(sentencePairs().filter((p) => collections.some((c) => p.where.startsWith(`${c.id}/`)))) },
  { id: 23, name: 'Books: every word transliterated letter for letter', run: () => skeletonCheck(sentencePairs().filter((p) => builtInBooks.some((b) => p.where.startsWith(`${b.id}/`)))) },
  { id: 24, name: 'Word list: every entry transliterated letter for letter', run: () => skeletonCheck(lexPairs()) },
  {
    id: 25,
    name: 'Long ા / આ is written aa',
    run: () => uniquePairs(allPairs()).filter((p) => count(p.gu, /[ાઆ]/) !== count(p.tr, /aa/)).map((p) => `${p.gu} ${p.tr}`),
  },
  {
    id: 26,
    name: 'Long ી is written ee, and ઈ after a vowel is i',
    // Before એ the long ી is said, and written, as i plus a glide: છીએ =
    // chhiye. ઈ after another vowel is a plain i: ભાઈ = bhaai, રસોઈ = rasoi.
    run: () =>
      uniquePairs(allPairs())
        .filter((p) => count(p.tr, /ee/) !== count(p.gu, /ી/) - count(p.gu, /ીએ/) + (p.gu.startsWith('ઈ') ? 1 : 0))
        .map((p) => `${p.gu} ${p.tr}`),
  },
  {
    id: 27,
    name: 'Long ૂ is written oo',
    run: () => uniquePairs(allPairs()).filter((p) => { const n = count(p.tr, /oo/); return n < count(p.gu, /ૂ/) || n > count(p.gu, /[ૂઊ]/); }).map((p) => `${p.gu} ${p.tr}`),
  },
  {
    id: 28,
    name: 'Short િ is written i, not ee',
    run: () => uniquePairs(allPairs()).filter((p) => count(p.tr.replace(/ai/g, ''), /(?<!e)i/) < count(p.gu, /િ/)).map((p) => `${p.gu} ${p.tr}`),
  },
  {
    id: 29,
    name: 'Short ુ is written u, not oo',
    run: () => uniquePairs(allPairs()).filter((p) => count(p.tr.replace(/au/g, '').replace(/oo/g, ''), /u/) < count(p.gu, /ુ/)).map((p) => `${p.gu} ${p.tr}`),
  },
  { id: 30, name: 'Retroflex ટ ઠ ડ ઢ ણ ળ are capitals', run: () => uniquePairs(allPairs()).filter((p) => count(p.gu, /[ટઠડઢણળ]/) !== count(p.tr, /[TDNL]/)).map((p) => `${p.gu} ${p.tr}`) },
  { id: 31, name: 'Dental ત થ દ ધ are lower case t d', run: () => uniquePairs(allPairs()).filter((p) => count(p.gu, /[તથદધ]/) !== count(p.tr, /[td]/)).map((p) => `${p.gu} ${p.tr}`) },
  {
    id: 32,
    name: 'છ is chh and ચ is ch',
    run: () => uniquePairs(allPairs()).filter((p) => count(p.gu, /છ/) !== count(p.tr, /chh/) || count(p.gu, /ચ/) !== count(p.tr, /ch/) - count(p.tr, /chh/)).map((p) => `${p.gu} ${p.tr}`),
  },
  { id: 33, name: 'શ and ષ are sh', run: () => uniquePairs(allPairs()).filter((p) => count(p.gu, /[શષ]/) !== count(p.tr, /sh/)).map((p) => `${p.gu} ${p.tr}`) },
  {
    id: 34,
    name: 'ફ is written ph everywhere, like the other aspirates',
    run: () => uniquePairs(allPairs()).filter((p) => /f/.test(p.tr) || count(p.tr, /ph/) !== count(p.gu, /ફ/)).map((p) => `${p.gu} ${p.tr}`),
  },
  { id: 35, name: 'વ is v, never w', run: () => uniquePairs(allPairs()).filter((p) => count(p.gu, /વ/) !== count(p.tr, /v/) || /w/.test(p.tr)).map((p) => `${p.gu} ${p.tr}`) },
  {
    id: 36,
    name: 'Every nasal mark (ં ઁ) is written as n or m',
    run: () => uniquePairs(allPairs()).filter((p) => count(p.tr, /[nm]/) !== count(p.gu, /[નમંઁઙઞ]/)).map((p) => `${p.gu} ${p.tr}`),
  },
  {
    id: 37,
    name: 'The same word is transliterated the same way in every sentence',
    run: () => {
      const m = new Map<string, Set<string>>();
      for (const p of sentencePairs()) m.set(normGu(p.gu), (m.get(normGu(p.gu)) ?? new Set()).add(p.tr.toLowerCase() === p.tr ? p.tr : p.tr));
      return [...m].filter(([, s]) => s.size > 1).map(([g, s]) => `${g}: ${[...s].join(' / ')}`);
    },
  },
  {
    id: 38,
    name: 'The word list matches how sentences transliterate each word',
    run: () => {
      const inSentences = new Map<string, string>();
      for (const p of sentencePairs()) inSentences.set(normGu(p.gu), p.tr);
      return lexicon.filter((e) => inSentences.has(normGu(e.gu)) && inSentences.get(normGu(e.gu)) !== e.tr).map((e) => `${e.gu}: ${e.tr} vs ${inSentences.get(normGu(e.gu))}`);
    },
  },
  {
    id: 39,
    name: 'Course and word list agree on shared words',
    run: () => {
      const c = new Map(courseWordPairs().map((p) => [normGu(p.gu), p.tr]));
      return lexicon.filter((e) => c.has(normGu(e.gu)) && c.get(normGu(e.gu)) !== e.tr).map((e) => `${e.gu}: course ${c.get(normGu(e.gu))}, list ${e.tr}`);
    },
  },
  { id: 40, name: 'No word list entry has two transliterations', run: () => issuesByRule('lex-conflict') },

  // Sentence practice structure
  {
    id: 41,
    name: 'Every sentence id is unique across the app',
    run: () => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const t of practiceTexts) {
        const id = t.where.split('/')[1];
        if (seen.has(id)) out.push(t.where);
        seen.add(id);
      }
      return out;
    },
  },
  { id: 42, name: 'No sentence appears twice', run: () => issuesByRule('gu-duplicate') },
  { id: 43, name: 'Every word in every sentence has a gloss', run: () => issuesByRule('gloss') },
  { id: 44, name: 'Each blank is a word that appears exactly once', run: () => issuesByRule('cloze-word') },
  { id: 45, name: 'Each blank has exactly three wrong answers', run: () => issuesByRule('wrong-count') },
  { id: 46, name: 'Wrong answers are all different', run: () => issuesByRule('wrong-unique') },
  { id: 47, name: 'A wrong answer is never the right one', run: () => issuesByRule('wrong-is-answer') },
  { id: 48, name: 'Wrong answers are single Gujarati words', run: () => issuesByRule('wrong-script') },
  { id: 49, name: 'Wrong answers have glosses', run: () => issuesByRule('wrong-gloss') },
  {
    id: 50,
    name: 'At least one wrong answer is the same kind of word as the answer',
    run: () =>
      practiceTexts.flatMap((t) => {
        if (!t.cloze || !t.wrong) return [];
        const pos = new Set((lexBy.get(normGu(t.cloze)) ?? []).map((e) => e.pos));
        if (!pos.size) return [];
        const same = t.wrong.filter((w) => (lexBy.get(normGu(w)) ?? []).some((e) => pos.has(e.pos)));
        return same.length ? [] : [`${t.where}: ${t.cloze} vs ${t.wrong.join(', ')}`];
      }),
  },
  {
    id: 51,
    name: 'No wrong answer means the same as the answer',
    run: () =>
      practiceTexts.flatMap((t) => {
        if (!t.cloze || !t.wrong) return [];
        const ans = new Set((lexBy.get(normGu(t.cloze)) ?? []).map((e) => e.en.toLowerCase().trim()));
        // Forms of one word (મારો, મારી, મારું) share a gloss on purpose:
        // agreement is exactly what those blanks test.
        const stem = (w: string) => normGu(w).replace(/[\u0ABE-\u0ACCઁં]+$/, '');
        const base = (w: string) => (lexBy.get(normGu(w)) ?? []).map((e) => normGu(e.base ?? e.gu));
        const related = (w: string) => stem(w) === stem(t.cloze!) || base(w).some((b) => base(t.cloze!).includes(b));
        return t.wrong
          .filter((w) => !related(w) && (lexBy.get(normGu(w)) ?? []).some((e) => ans.has(e.en.toLowerCase().trim())))
          .map((w) => `${t.where}: ${t.cloze} ≈ ${w}`);
      }),
  },
  { id: 52, name: 'Names are never blanked', run: () => practiceTexts.filter((t) => t.cloze && (lexBy.get(normGu(t.cloze)) ?? []).some((e) => /\(name\)/i.test(e.en))).map((t) => `${t.where}: ${t.cloze}`) },
  { id: 53, name: 'Wrong answers are not elsewhere in the same sentence', run: () => practiceTexts.flatMap((t) => (t.wrong ?? []).filter((w) => tokens(t).includes(normGu(w))).map((w) => `${t.where}: ${w}`)) },
  { id: 54, name: 'Wrong answers differ from the answer in more than invisible ways', run: () => practiceTexts.flatMap((t) => (t.wrong ?? []).filter((w) => t.cloze && normGu(w).replace(/[ઁ-ઃ]/g, '') === normGu(t.cloze).replace(/[ઁ-ઃ]/g, '') ).map((w) => `${t.where}: ${w}`)) },
  { id: 55, name: 'Each collection has at least 100 sentences and its details', run: () => collections.filter((c) => c.sentences.length < 100 || !c.title || !c.titleGu || !c.blurb || ![1, 2, 3].includes(c.level)).map((c) => c.id) },
  {
    id: 56,
    name: 'Sentence length suits the level',
    run: () => practiceTexts.filter((t) => t.kind === 'collection' && words(t.gu).length > [0, 8, 10, 14][t.level ?? 3]).map((t) => `${t.where}: ${words(t.gu).length} words`),
  },
  { id: 57, name: 'Built-in book sentences all have transliteration and English', run: () => issuesByRule('book-translation') },
  { id: 58, name: 'Each book tells its story in 12 to 18 sentences', run: () => builtInBooks.filter((b) => b.sentences.length < 12 || b.sentences.length > 18).map((b) => `${b.id}: ${b.sentences.length}`) },
  { id: 59, name: 'Sentence ids use their file’s prefix', run: () => practiceTexts.filter((t) => t.prefix && !t.where.split('/')[1].startsWith(t.prefix)).map((t) => t.where) },
  {
    id: 60,
    name: 'Learner notes are complete sentences',
    run: () => collections.flatMap((c) => c.sentences.filter((s) => s.note !== undefined && (!s.note.trim() || !/[.?!)"'”’]$/.test(s.note.trim()))).map((s) => `${c.id}/${s.id}`)),
  },

  // English translations
  { id: 61, name: 'Every sentence has an English translation', run: () => sentenceTexts.filter((t) => !t.en?.trim()).map((t) => t.where) },
  { id: 62, name: 'English sentences start with a capital letter', run: () => sentenceTexts.filter((t) => t.en && !/^["'“‘(]?[A-Z0-9]/.test(t.en)).map((t) => `${t.where}: ${t.en}`) },
  { id: 63, name: 'English sentences end with punctuation', run: () => sentenceTexts.filter((t) => t.en && !/[.?!)"'”’]$/.test(t.en.trim())).map((t) => `${t.where}: ${t.en}`) },
  {
    id: 64,
    name: 'Questions stay questions in English, and only questions',
    run: () => sentenceTexts.filter((t) => t.en && (endMark(t.gu) === '?') !== (endMark(t.en) === '?')).map((t) => `${t.where}: ${t.gu} / ${t.en}`),
  },
  {
    id: 65,
    name: 'A negative in Gujarati is a negative in English',
    run: () =>
      sentenceTexts
        .filter((t) => {
          // "નહીં તો" is "otherwise" and a closing "કે નહીં?" is "…or not?": neither is a negative.
          const gu = t.gu.replace(/નહીં તો/g, '').replace(/કે નહીં\?$/, '?');
          // A sentence that starts "ના," is answering "no".
          const neg = gu.startsWith('ના,') || words(gu).map(normGu).some((w) => NEG_GU.has(w) || /^ન(થી|હીં|હોત)/.test(w));
          return t.en && neg !== NEG_EN.test(t.en);
        })
        .map((t) => `${t.where}: ${t.gu} / ${t.en}`),
  },
  { id: 66, name: 'Numbers match between Gujarati and English', run: () => vocabCheck(NUMBERS) },
  { id: 67, name: 'હું sentences are about "I" in English', run: () => sentenceTexts.filter((t) => t.en && tokens(t)[0] === 'હું' && !/\b(I|I'm|I've|I'll|I'd|me|my)\b/.test(t.en)).map((t) => `${t.where}: ${t.en}`) },
  { id: 68, name: 'અમે sentences use "we" in English', run: () => sentenceTexts.filter((t) => t.en && tokens(t)[0] === 'અમે' && !/\b(we|we're|we've|we'll|us|our)\b/i.test(t.en)).map((t) => `${t.where}: ${t.en}`) },
  { id: 69, name: 'તમે sentences use "you" in English', run: () => sentenceTexts.filter((t) => t.en && tokens(t)[0] === 'તમે' && !/\byou/i.test(t.en)).map((t) => `${t.where}: ${t.en}`) },
  {
    id: 70,
    name: 'Future-tense verbs are future in English',
    run: () =>
      sentenceTexts
        .filter((t) => t.en && simple(t) && /(શે|ીશ|ીશું|શો)$/.test(last(t)) && !/\b(will|'ll|shall|going to|gonna|tomorrow|next|could|can|would|must)\b|'ll/i.test(t.en))
        .map((t) => `${t.where}: ${t.gu} / ${t.en}`),
  },
  {
    id: 71,
    name: 'હતો / હતી / હતું / હતા is past in English',
    run: () =>
      sentenceTexts
        .filter((t) => t.en && simple(t) && /^(હતો|હતી|હતું|હતા|હતાં)$/.test(last(t)) && !/\b(was|were|had|did|used to|ago|yesterday|went|came|\w+ed)\b/i.test(t.en))
        .map((t) => `${t.where}: ${t.gu} / ${t.en}`),
  },
  { id: 72, name: 'Days of the week match', run: () => vocabCheck(DAYS) },
  { id: 73, name: 'Colours match', run: () => vocabCheck(COLOURS) },
  { id: 74, name: 'Family words match', run: () => vocabCheck(FAMILY) },
  { id: 75, name: 'Time words (today, morning, night…) match', run: () => vocabCheck(TIME) },
  { id: 76, name: 'Question words match (where, who, when, why, how much, which)', run: () => vocabCheck(QUESTION, true) },
  { id: 77, name: 'No Gujarati left in the English', run: () => sentenceTexts.filter((t) => t.en && /[\u0A80-\u0AFF]/.test(t.en)).map((t) => t.where) },
  { id: 78, name: 'No double spaces in the English', run: () => sentenceTexts.filter((t) => t.en && /\s{2,}/.test(t.en)).map((t) => t.where) },

  // Grammar
  { id: 79, name: 'હું takes છું, not છે / છો / છીએ', run: () => agreement('હું', ['છે', 'છો', 'છીએ']) },
  { id: 80, name: 'અમે takes છીએ', run: () => agreement('અમે', ['છું', 'છે', 'છો']) },
  { id: 81, name: 'તમે takes છો', run: () => agreement('તમે', ['છું', 'છે', 'છીએ']) },
  { id: 82, name: 'તું and તે take છે', run: () => [...agreement('તું', ['છું', 'છો', 'છીએ']), ...agreement('તે', ['છું', 'છો', 'છીએ'])] },
  { id: 83, name: 'મેં (ergative "I") never takes છું', run: () => sentenceTexts.filter((t) => tokens(t)[0] === 'મેં' && simple(t) && tokens(t).includes('છું')).map((t) => t.where) },
  { id: 84, name: 'મને (dative "to me") never takes છું', run: () => sentenceTexts.filter((t) => tokens(t)[0] === 'મને' && simple(t) && last(t) === 'છું').map((t) => t.where) },
  {
    id: 85,
    name: 'No doubled copula like "નથી છે"',
    run: () => sentenceTexts.filter((t) => tokens(t).some((w, i, a) => i > 0 && ['છે', 'છું', 'છો', 'છીએ'].includes(w) && ['નથી', 'છે', 'છું', 'છો', 'છીએ'].includes(a[i - 1]))).map((t) => t.where),
  },
  {
    id: 86,
    name: 'No accidentally repeated words',
    run: () => sentenceTexts.flatMap((t) => tokens(t).filter((w, i, a) => i > 0 && a[i - 1] === w && !REDUPLICATED.has(w)).map((w) => `${t.where}: ${w} ${w}`)),
  },
  {
    id: 87,
    name: 'Postpositions માં, થી, નું, ની, નો are joined to their word',
    run: () => sentenceTexts.flatMap((t) => tokens(t).filter((w) => ['માં', 'થી', 'નું', 'ની', 'નો', 'નાં'].includes(w)).map((w) => `${t.where}: ${w}`)),
  },
  { id: 88, name: 'No word spelled two ways with short and long vowels', run: () => variants((w) => w.replace(/ી/g, 'િ').replace(/ૂ/g, 'ુ').replace(/ઈ/g, 'ઇ').replace(/ઊ/g, 'ઉ')) },
  { id: 89, name: 'No word spelled both with and without a nasal mark', run: () => variants((w) => w.replace(/[ંઁ]/g, '')) },
  { id: 90, name: 'No word spelled two ways with ન/ણ or લ/ળ', run: () => variants((w) => w.replace(/ણ/g, 'ન').replace(/ળ/g, 'લ')) },
  { id: 91, name: 'Borrowed words use ઑ / ૉ consistently', run: () => variants((w) => w.replace(/ૉ/g, 'ો').replace(/ઑ/g, 'ઓ')) },

  // Word list
  {
    id: 92,
    name: 'Every dictionary form points at a real entry',
    run: () => {
      const known = new Set([...lexicon, ...courseWords].map((e) => normGu(e.gu)));
      return lexicon.filter((e) => e.base && !known.has(normGu(e.base))).map((e) => `${e.gu} → ${e.base}`);
    },
  },
  { id: 93, name: 'Every entry has a part of speech from the list', run: () => issuesByRule('lex-pos') },
  // A gloss may add a Gujarati usage hint, "knowledge (મને ખબર છે, I know)", but starts in English.
  { id: 94, name: 'Glosses are in English', run: () => lexicon.filter((e) => !/^[("'‘“]?[A-Za-z0-9]/.test(e.en.trim())).map((e) => `${e.gu}: ${e.en}`) },
  {
    id: 95,
    name: 'Every word list entry is used somewhere',
    run: () => {
      const used = new Set<string>();
      for (const t of sentenceTexts) {
        for (const w of tokens(t)) used.add(w);
        for (const w of t.wrong ?? []) used.add(normGu(w));
      }
      for (const e of lexicon) if (e.base) used.add(normGu(e.base));
      return lexicon.filter((e) => !used.has(normGu(e.gu))).map((e) => e.gu);
    },
  },
  { id: 96, name: 'Verb dictionary forms end in વું', run: () => lexicon.filter((e) => e.pos === 'verb' && e.base && !e.base.endsWith('વું')).map((e) => `${e.gu} → ${e.base}`) },

  // Course
  { id: 97, name: 'Course sentences: Gujarati and English punctuation agree', run: () => courseTexts.filter((t) => t.kind === 'course-sentence' && endMark(t.gu) !== endMark(t.en ?? '')).map((t) => `${t.where}: ${t.gu} / ${t.en}`) },
  {
    id: 98,
    name: 'Course numbers: the Gujarati and the English are the same number',
    run: () => {
      const digits = '૦૧૨૩૪૫૬૭૮૯';
      return courseTexts
        .filter((t) => t.kind === 'number' && /^[\u0AE6-\u0AEF]+$/.test(t.gu))
        .filter((t) => !new RegExp(`\\b${[...t.gu].map((d) => digits.indexOf(d)).join('')}\\b`).test(`${t.en} ${t.tr}`))
        .map((t) => `${t.where}: ${t.gu} / ${t.en}`);
    },
  },
  {
    id: 99,
    name: 'Course confusables exist and are a different item',
    run: () => Object.values(course.items).flatMap((it) => (it.confusables ?? []).filter((c) => !course.items[c] || c === it.id || course.items[c].gujarati === it.gujarati).map((c) => `${it.id} → ${c}`)),
  },
  {
    id: 100,
    name: 'Every course item is taught in a lesson',
    run: () => {
      const taught = new Set(course.lessons.flatMap((l) => l.items));
      return Object.keys(course.items).filter((id) => !taught.has(id));
    },
  },
];

// Violations a person has checked and judged correct, with why. Keyed by
// check id, then by the violation string the check produces.
export const EXCEPTIONS: Record<number, Record<string, string>> = {
  65: {
    'conversations/cv-020: તમે પણ અમારી સાથે આવો ને, મજા આવશે. / Why don\'t you come with us too, it\'ll be fun.':
      'ને here is the coaxing particle ("do come"), and "why don\'t you" is the natural English for it.',
    'conversations/cv-042: દાળમાં મીઠું ઓછું છે, થોડું નાખી દો. / There isn\'t enough salt in the dal, add a little.':
      'ઓછું છે is "is too little"; "isn\'t enough" says the same thing in natural English.',
  },
  69: {
    'grammar/compound-verbs/2.2: Go ahead and eat.': 'A friendly imperative (તમે ખાઈ લો); English drops "you".',
    'everyday/ev-093: Please sit here.': 'A polite imperative. તમે is said for politeness and English drops "you".',
    'out-and-about/oa-073: Please sit here.': 'A polite imperative. તમે is said for politeness and English drops "you".',
  },
  96: {
    'જોઈતી → જોઈએ': 'જોઈએ ("is needed") has no -વું infinitive in use; જોઈએ is its dictionary form.',
    'જોઈતો → જોઈએ': 'જોઈએ ("is needed") has no -વું infinitive in use; જોઈએ is its dictionary form.',
    'જોઈતું → જોઈએ': 'જોઈએ ("is needed") has no -વું infinitive in use; જોઈએ is its dictionary form.',
    'જોઈતા → જોઈએ': 'જોઈએ ("is needed") has no -વું infinitive in use; જોઈએ is its dictionary form.',
  },
};

export function runCheck(c: Check): { violations: string[]; excused: number } {
  const ok = EXCEPTIONS[c.id] ?? {};
  const all = c.run();
  const violations = all.filter((v) => !(v in ok));
  return { violations, excused: all.length - violations.length };
}
