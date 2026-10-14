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

const units = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `u${String(from + i).padStart(2, '0')}`);

export function stages(input: LevelInput): LevelStage[] {
  const all = (ids: string[]) => ids.every((id) => input.unitsDone.has(id));
  const seen = (id: string, share: number) => (input.practiceSeen.get(id) ?? 0) >= share;
  return [
    {
      code: 'A1',
      name: 'Beginner',
      canDo: 'Read the script, greet people, talk about family, food and home in simple present-tense sentences.',
      milestones: [
        { label: 'Units 1 to 6: the script and numbers', done: all(units(1, 6)) },
        { label: 'Units 7 to 10: first words and sentences', done: all(units(7, 10)) },
        { label: 'Half of Everyday Gujarati', done: seen('everyday', 0.5) },
      ],
    },
    {
      code: 'A2',
      name: 'Elementary',
      canDo: 'Talk about yesterday and tomorrow, shop, ask the way, say how you feel, ask for things politely.',
      milestones: [
        { label: 'Units 11 to 14: past, future, places, shopping', done: all(units(11, 14)) },
        { label: 'Units 15 to 18: feelings, requests, describing, can and must', done: all(units(15, 18)) },
        { label: 'Half of Out and about', done: seen('out-and-about', 0.5) },
        { label: 'Practise two stories', done: ['book:kesar-market', 'book:thirsty-crow', 'book:navratri'].filter((b) => seen(b, 0.5)).length >= 2 },
      ],
    },
    {
      code: 'B1',
      name: 'Intermediate',
      canDo: 'Follow family conversations and simple films, give reasons and opinions, read a letter from home.',
      milestones: [
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
