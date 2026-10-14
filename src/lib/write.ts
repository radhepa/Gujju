import { splitAksharas } from './aksharas';
import { shuffle, type Rng } from './rng';
import { isDue } from './srs';
import type { CardRow, Item } from './types';

// Writing practice: see the meaning, write the Gujarati. Each word gets its
// own FSRS card, `wr:<item id>`, separate from recognising it in lessons:
// knowing ઘર when you see it and spelling it are different skills.

export const WRITE_ROUND = 8;

export const writeCardId = (itemId: string) => `wr:${itemId}`;
export const isWriteCard = (id: string) => id.startsWith('wr:');

// Letters people mix up, so the spare tiles are the tempting ones.
const LOOKALIKE: Record<string, string> = {
  ઘ: 'ધ', ધ: 'ઘ', ટ: 'ઠ', ઠ: 'ટ', ડ: 'ઢ', ઢ: 'ડ', ચ: 'છ', છ: 'ચ', સ: 'શ', શ: 'સ',
  પ: 'ય', ય: 'પ', ણ: 'ન', ન: 'ણ', ળ: 'લ', લ: 'ળ', બ: 'વ', વ: 'બ', દ: 'ડ', ત: 'થ', થ: 'ત',
  ક: 'ખ', ખ: 'ક', ગ: 'ઘ', જ: 'ઝ', ભ: 'બ', મ: 'ભ', ર: 'સ', હ: 'ઙ',
};
const SIGNS = ['', 'ા', 'િ', 'ી', 'ુ', 'ૂ', 'ે', 'ો'];
const SIGN_SWAP: Record<string, string> = { 'િ': 'ી', 'ી': 'િ', 'ુ': 'ૂ', 'ૂ': 'ુ', 'ે': 'ૈ', 'ો': 'ૌ', 'ા': '', '': 'ા' };

const signOf = (a: string) => a.match(/[ા-ૌ]$/)?.[0] ?? '';

// Words that can be practised: single words from the course.
export function writableWords(items: Item[]): Item[] {
  return items.filter((i) => i.type === 'word' && !/\s/.test(i.gujarati) && splitAksharas(i.gujarati).length >= 1);
}

// Due spelling cards first, then words the learner knows but hasn't
// written yet, then the shakiest ones. A brand-new learner gets the first
// words of the course.
export function buildWriteRound(words: Item[], learned: Set<string>, rows: Map<string, CardRow>, now: Date, rng: Rng, size = WRITE_ROUND): Item[] {
  const pool = words.filter((w) => learned.has(w.id));
  const base = pool.length >= 4 ? pool : words.slice(0, Math.max(size, 12));
  const due = base.filter((w) => rows.has(writeCardId(w.id)) && isDue(rows.get(writeCardId(w.id))!, now));
  const fresh = base.filter((w) => !rows.has(writeCardId(w.id)));
  const rest = base
    .filter((w) => rows.has(writeCardId(w.id)) && !due.includes(w))
    .sort((a, b) => rows.get(writeCardId(a.id))!.stability - rows.get(writeCardId(b.id))!.stability);
  return shuffle([...due, ...shuffle(fresh, rng), ...rest].slice(0, size), rng);
}

// The word's own letter tiles plus a few tempting wrong ones: a lookalike
// consonant or a short/long vowel swap.
export function letterTiles(word: string, rng: Rng, spare = 3): string[] {
  const own = splitAksharas(word);
  const taken = new Set(own);
  const extra: string[] = [];
  for (const a of shuffle(own, rng)) {
    if (extra.length >= spare) break;
    const first = [...a][0];
    const sign = signOf(a);
    const options = [
      LOOKALIKE[first] ? LOOKALIKE[first] + a.slice(first.length) : '',
      sign in SIGN_SWAP ? a.slice(0, a.length - sign.length) + SIGN_SWAP[sign] : '',
      first + SIGNS[Math.floor(rng() * SIGNS.length)],
    ].filter((o) => o && !taken.has(o));
    const pick = options[Math.floor(rng() * options.length)];
    if (pick) {
      extra.push(pick);
      taken.add(pick);
    }
  }
  return shuffle([...own, ...extra], rng);
}

// The on-screen keyboard: vowels, consonants in alphabet order, then the
// signs that attach to a consonant.
export const KEYBOARD = {
  vowels: ['અ', 'આ', 'ઇ', 'ઈ', 'ઉ', 'ઊ', 'એ', 'ઐ', 'ઓ', 'ઔ', 'ઋ'],
  consonants: [
    'ક', 'ખ', 'ગ', 'ઘ', 'ઙ', 'ચ', 'છ', 'જ', 'ઝ', 'ઞ', 'ટ', 'ઠ', 'ડ', 'ઢ', 'ણ', 'ત', 'થ',
    'દ', 'ધ', 'ન', 'પ', 'ફ', 'બ', 'ભ', 'મ', 'ય', 'ર', 'લ', 'વ', 'શ', 'ષ', 'સ', 'હ', 'ળ',
  ],
  signs: ['ા', 'િ', 'ી', 'ુ', 'ૂ', 'ૃ', 'ે', 'ૈ', 'ો', 'ૌ', 'ં', 'ઁ', 'ઃ', '્'],
};

// Remove the last thing typed: a sign, or a whole letter.
export function backspace(text: string): string {
  const chars = [...text];
  chars.pop();
  return chars.join('');
}
