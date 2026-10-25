import { course } from '../content/course';

// A rough CEFR estimate from what the learner has finished. CEFR describes
// what you can do (A1: introduce yourself and handle very simple exchanges;
// A2: everyday errands and routines; B1: get by in most situations and
// follow the main points of clear speech). The app can only see reading and
// recognition, so this is "where the app's material puts you", not a test.

export interface LevelInput {
  // Unit id -> finished.
  unitsDone: Set<string>;
  // Collection or book id -> share of its sentences seen.
  practiceSeen: Map<string, number>;
  // Watch & Listen entries ticked off.
  watched: number;
}

export interface Milestone {
  label: string;
  done: boolean;
}

export interface LevelStage {
  code: 'Pre-A1' | 'A1' | 'A2' | 'B1';
  name: string;
  canDo: string;
  milestones: Milestone[];
}

// Units by their place on the path (unit ids are permanent progress keys and
// don't follow the order).
const units = (from: number, to: number) => course.units.filter((u) => u.order >= from && u.order <= to).map((u) => u.id);

export function stages(input: LevelInput): LevelStage[] {
  const all = (ids: string[]) => ids.every((id) => input.unitsDone.has(id));
  const seen = (id: string, share: number) => (input.practiceSeen.get(id) ?? 0) >= share;
  return [
    {
      code: 'A1',
      name: 'Beginner',
      canDo: 'Read the script, introduce yourself, talk about family, food, home and your week in the present tense.',
      milestones: [
        { label: 'Units 1 to 7: the script and numbers', done: all(units(1, 7)) },
        { label: 'Units 8 to 15: greetings, family, saying no, about me, days', done: all(units(8, 15)) },
        { label: 'Half of Everyday Gujarati', done: seen('everyday', 0.5) },
      ],
    },
    {
      code: 'A2',
      name: 'Elementary',
      canDo: 'Talk about yesterday and tomorrow and the whole family, shop, ask the way, cook, say how you feel, ask for things politely.',
      milestones: [
        { label: 'Units 16 to 21: past, future, places, family, shopping, numbers', done: all(units(16, 21)) },
        { label: 'Units 22 to 26: feelings, requests, cooking, describing, can and must', done: all(units(22, 26)) },
        { label: 'Half of Out and about', done: seen('out-and-about', 0.5) },
        { label: 'Practise two stories', done: ['book:kesar-market', 'book:thirsty-crow', 'book:navratri'].filter((b) => seen(b, 0.5)).length >= 2 },
      ],
    },
    {
      code: 'B1',
      name: 'Intermediate',
      canDo: 'Follow family conversations and simple films, talk about the past, give reasons and opinions, phone home, read a letter from home.',
      milestones: [
        { label: 'Units 27 to 32: ongoing and past habits, helper verbs, reasons, phone calls, festivals', done: all(units(27, 32)) },
        { label: 'Half of Real conversations', done: seen('conversations', 0.5) },
        { label: 'All of Out and about', done: seen('out-and-about', 0.9) },
        { label: 'Practise A letter to Ba', done: seen('book:letter-to-ba', 0.5) },
        { label: 'Watch three Gujarati films or shows (Watch & Listen)', done: input.watched >= 3 },
      ],
    },
  ];
}

// The level reached (every milestone of a stage done) and the next one.
export function currentLevel(input: LevelInput): { reached: LevelStage['code']; next?: LevelStage; progress: number } {
  const list = stages(input);
  let reached: LevelStage['code'] = 'Pre-A1';
  for (const s of list) {
    if (s.milestones.every((m) => m.done)) reached = s.code;
    else break;
  }
  const next = list.find((s) => !s.milestones.every((m) => m.done));
  const progress = next ? next.milestones.filter((m) => m.done).length / next.milestones.length : 1;
  return { reached, next, progress };
}
