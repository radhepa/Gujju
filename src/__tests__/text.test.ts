import { bookToText, MAX_BOOK_SENTENCES, newBookId, parseBookText } from '../lib/books';
import { normGu, normTranslit, pieces, sentences, words } from '../lib/text';

describe('words and pieces', () => {
  it('splits on spaces and strips punctuation', () => {
    expect(words('હું ઘરે છું.')).toEqual(['હું', 'ઘરે', 'છું']);
    expect(words('કેસરે કહ્યું, "આભાર!"')).toEqual(['કેસરે', 'કહ્યું', 'આભાર']);
    expect(words('  ')).toEqual([]);
  });

  it('keeps punctuation beside each word for redrawing', () => {
    expect(pieces('હા, આભાર!')).toEqual([
      { word: 'હા', before: '', after: ',' },
      { word: 'આભાર', before: '', after: '!' },
    ]);
  });
});

describe('normalising', () => {
  it('ignores zero-width characters and composes Unicode', () => {
    expect(normGu('ઘ‍ર ')).toBe('ઘર');
  });

  it('forgives case, doubling, aspiration and a final n in transliteration', () => {
    expect(normTranslit('Chhun')).toBe(normTranslit('chun'));
    expect(normTranslit('paaNee')).toBe(normTranslit('pani'));
    expect(normTranslit('ghare')).not.toBe(normTranslit('ghar'));
  });
});

describe('sentences', () => {
  it('splits at full stops, question marks, dandas and new lines', () => {
    expect(sentences('હું ઘરે છું. તમે ક્યાં છો?\nઆજે રજા છે। ચાલો')).toEqual([
      'હું ઘરે છું.',
      'તમે ક્યાં છો?',
      'આજે રજા છે।',
      'ચાલો',
    ]);
  });
});

describe('book text', () => {
  it('reads one sentence per line, with English after a bar', () => {
    const s = parseBookText('હું ઘરે છું. | I am at home.\nઆજે ગરમી છે. બહાર ન જાઓ.\n\nEnglish only line\n');
    expect(s).toEqual([
      { id: 'p1', gu: 'હું ઘરે છું.', en: 'I am at home.' },
      { id: 'p2', gu: 'આજે ગરમી છે.' },
      { id: 'p3', gu: 'બહાર ન જાઓ.' },
    ]);
  });

  it('round-trips through the edit text', () => {
    const text = 'હું ઘરે છું. | I am at home.\nઆજે ગરમી છે.';
    const book = { id: 'b', title: 'B', builtIn: false, sentences: parseBookText(text) };
    expect(bookToText(book)).toBe(text);
  });

  it('caps very long pastes', () => {
    const many = Array.from({ length: MAX_BOOK_SENTENCES + 20 }, (_, i) => `વાક્ય ${i}.`).join('\n');
    expect(parseBookText(many)).toHaveLength(MAX_BOOK_SENTENCES);
  });

  it('makes a different id each moment', () => {
    expect(newBookId(1000)).not.toBe(newBookId(2000));
  });
});
