import { course, unitFiles } from '../content/course';
import { splitAksharas } from '../lib/aksharas';

const GUJARATI = /^[઀-૿\s.,!?]+$/;

describe('content', () => {
  const allItems = unitFiles.flatMap((u) => u.items);

  it('has unique item, lesson and unit ids', () => {
    const ids = allItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lessonIds = course.lessons.map((l) => l.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    const unitIds = course.units.map((u) => u.id);
    expect(new Set(unitIds).size).toBe(unitIds.length);
  });

  it('item ids stay unique ignoring case (audio files are named after them)', () => {
    const lower = allItems.map((i) => i.id.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('lessons only point at items that exist', () => {
    for (const l of course.lessons) {
      for (const id of l.items) expect(course.items[id]).toBeDefined();
    }
  });

  it('confusables point at items that exist', () => {
    for (const it of Object.values(course.items)) {
      for (const id of it.confusables ?? []) {
        expect({ item: it.id, confusable: id, exists: !!course.items[id] }).toEqual({
          item: it.id,
          confusable: id,
          exists: true,
        });
      }
    }
  });

  it('every item is taught by some lesson', () => {
    const taught = new Set(course.lessons.flatMap((l) => l.items));
    const orphans = Object.keys(course.items).filter((id) => !taught.has(id));
    expect(orphans).toEqual([]);
  });

  it('Gujarati fields are Gujarati script', () => {
    for (const it of Object.values(course.items)) {
      expect({ id: it.id, ok: GUJARATI.test(it.gujarati) }).toEqual({ id: it.id, ok: true });
    }
  });

  it('words and letters have a transliteration, words have a meaning', () => {
    for (const it of Object.values(course.items)) {
      expect(it.translit.length).toBeGreaterThan(0);
      if (it.type !== 'letter') expect(it.english.length).toBeGreaterThan(0);
    }
  });

  it('letter items are a single akshara', () => {
    for (const it of Object.values(course.items)) {
      if (it.type === 'letter') expect({ id: it.id, n: splitAksharas(it.gujarati).length }).toEqual({ id: it.id, n: 1 });
    }
  });

  it('no two items in a family share a transliteration or meaning', () => {
    const seen = new Map<string, string>();
    for (const it of Object.values(course.items)) {
      const keys = [`${it.type}:t:${it.translit}`];
      if (it.english) keys.push(`${it.type}:e:${it.english}`);
      for (const k of keys) {
        expect({ key: k, clash: seen.get(k) }).toEqual({ key: k, clash: undefined });
        seen.set(k, it.id);
      }
    }
  });
});
