import type { Course, Item, Lesson, TranslitMode, Unit } from '../lib/types';

import u01 from '../../content/01-vowels.json';
import u02 from '../../content/02-consonants-1.json';
import u03 from '../../content/03-consonants-2.json';
import u04 from '../../content/04-matras.json';
import u05 from '../../content/05-conjuncts.json';
import u06 from '../../content/06-numbers.json';
import u07 from '../../content/07-greetings.json';
import u08 from '../../content/08-family.json';
import u09 from '../../content/09-sentences.json';
import u10 from '../../content/10-daily-life.json';
import u11 from '../../content/11-past.json';
import u12 from '../../content/12-future.json';
import u13 from '../../content/13-places.json';
import u14 from '../../content/14-shopping.json';
import u15 from '../../content/15-health.json';
import u16 from '../../content/16-requests.json';
import u17 from '../../content/17-describing.json';
import u18 from '../../content/18-can-must.json';

// One JSON file per unit, so a unit can be checked and edited on its own.
// Units, lessons and items are flattened into separate tables here.

interface UnitFile {
  id: string;
  order: number;
  title: string;
  tip: string;
  lessons: {
    id: string;
    title: string;
    items: string[];
    review?: boolean;
    translit?: string;
  }[];
  items: (Omit<Item, 'audioFile' | 'type'> & { type: string; audioFile?: string | null })[];
}

export const unitFiles: UnitFile[] = [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14, u15, u16, u17, u18];

export function buildCourse(files: UnitFile[]): Course {
  const units: Unit[] = [];
  const lessons: Lesson[] = [];
  const items: Record<string, Item> = {};

  for (const f of [...files].sort((a, b) => a.order - b.order)) {
    units.push({ id: f.id, order: f.order, title: f.title, tip: f.tip });
    f.lessons.forEach((l, i) =>
      lessons.push({
        id: l.id,
        unitId: f.id,
        order: i + 1,
        title: l.title,
        items: l.items,
        review: l.review,
        translit: l.translit as TranslitMode | undefined,
      }),
    );
    for (const it of f.items) {
      items[it.id] = { ...it, type: it.type as Item['type'], audioFile: it.audioFile ?? null };
    }
  }
  return { units, lessons, items };
}

export const course = buildCourse(unitFiles);

export function lessonsInUnit(c: Course, unitId: string): Lesson[] {
  return c.lessons.filter((l) => l.unitId === unitId);
}

// Items a unit teaches, in lesson order.
export function unitItemIds(c: Course, unitId: string): string[] {
  const ids: string[] = [];
  for (const l of lessonsInUnit(c, unitId)) {
    for (const id of l.items) if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

// Items taught in every lesson up to and including this one.
export function itemsSeenBy(c: Course, lessonId: string): string[] {
  const ids: string[] = [];
  for (const l of c.lessons) {
    for (const id of l.items) if (!ids.includes(id)) ids.push(id);
    if (l.id === lessonId) break;
  }
  return ids;
}
