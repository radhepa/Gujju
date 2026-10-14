// Small text helpers shared by the sentence practice, books and the
// content checks.

// Punctuation that can sit on either side of a word. The danda (।) is
// included because pasted text often uses it as a full stop.
const EDGE = /^[\s.,?!।॥:;"'“”‘’()[\]{}…\-–—]+|[\s.,?!।॥:;"'“”‘’()[\]{}…\-–—]+$/g;

export const GU_LETTERS = /[\u0A80-\u0AFF]/;

// "હું ઘરે છું." -> ["હું", "ઘરે", "છું"]
export function words(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(EDGE, ''))
    .filter((w) => w.length > 0);
}

// The same split, but keeping each word's surrounding punctuation so a
// sentence can be redrawn word by word.
export function pieces(text: string): { word: string; before: string; after: string }[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const before = raw.match(/^[.,?!।॥:;"'“”‘’()[\]{}…\-–—]+/)?.[0] ?? '';
      const after = raw.match(/[.,?!।॥:;"'“”‘’()[\]{}…\-–—]+$/)?.[0] ?? '';
      const word = raw.slice(before.length, raw.length - after.length);
      return { word, before, after };
    })
    .filter((p) => p.word.length > 0);
}

// Unicode can spell the same Gujarati word more than one way (composed vs
// decomposed nukta, stray zero-width joiners). Compare on this form.
export function normGu(s: string): string {
  return s.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

// Loose form for typed transliteration: case, long vowels, h after stops
// and the retroflex capitals are all forgiven, so "Ghare" matches "ghare",
// "chun" matches "chhun" and "pani" matches "paaNee".
export function normTranslit(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/([kgcjtdpb])h/g, '$1')
    .replace(/w/g, 'v')
    .replace(/n$/, '');
}

// Split pasted text into sentences on full stops, question and exclamation
// marks, dandas and line breaks.
export function sentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((line) => line.match(/[^.?!।॥]+[.?!।॥]*/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}
