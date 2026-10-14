import { splitAksharas } from '../lib/aksharas';

describe('splitAksharas', () => {
  it('splits plain consonants', () => {
    expect(splitAksharas('કમળ')).toEqual(['ક', 'મ', 'ળ']);
  });

  it('keeps vowel signs on their consonant', () => {
    expect(splitAksharas('ગુલાબ')).toEqual(['ગુ', 'લા', 'બ']);
    // િ is drawn before the consonant but stored after it
    expect(splitAksharas('દિવસ')).toEqual(['દિ', 'વ', 'સ']);
  });

  it('joins consonants across a halant', () => {
    expect(splitAksharas('મિત્ર')).toEqual(['મિ', 'ત્ર']);
    expect(splitAksharas('શિક્ષક')).toEqual(['શિ', 'ક્ષ', 'ક']);
    expect(splitAksharas('જ્ઞાન')).toEqual(['જ્ઞા', 'ન']);
  });

  it('keeps anusvara and nasal marks attached', () => {
    expect(splitAksharas('ક્યાં')).toEqual(['ક્યાં']);
    expect(splitAksharas('અંગ્રેજી')).toEqual(['અં', 'ગ્રે', 'જી']);
  });

  it('skips spaces', () => {
    expect(splitAksharas('કેમ છો')).toEqual(['કે', 'મ', 'છો']);
  });

  it('treats digits as their own units', () => {
    expect(splitAksharas('૧૦૦')).toEqual(['૧', '૦', '૦']);
  });
});
