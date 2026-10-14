// Split Gujarati text into aksharas (the units a reader actually sees:
// a consonant cluster plus its vowel sign). "મિત્ર" -> ["મિ", "ત્ર"].
// These become the tiles in build-the-word.

const HALANT = 0x0acd;

function isCombining(cp: number): boolean {
  return (
    (cp >= 0x0a81 && cp <= 0x0a83) || // candrabindu, anusvara, visarga
    cp === 0x0abc || // nukta
    (cp >= 0x0abe && cp <= 0x0acd) || // vowel signs + halant
    (cp >= 0x0ae2 && cp <= 0x0ae3)
  );
}

function isConsonant(cp: number): boolean {
  return cp >= 0x0a95 && cp <= 0x0ab9;
}

export function splitAksharas(text: string): string[] {
  const out: string[] = [];
  let prev = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const joinsPrev =
      out.length > 0 && (isCombining(cp) || (prev === HALANT && isConsonant(cp)));
    if (joinsPrev) {
      out[out.length - 1] += ch;
    } else if (ch.trim() !== '') {
      out.push(ch);
    }
    prev = cp;
  }
  return out;
}
