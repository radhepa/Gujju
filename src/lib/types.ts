// Content types. These mirror the JSON files in /content.

export type ItemType = 'letter' | 'number' | 'word' | 'sentence';

export interface Item {
  id: string;
  type: ItemType;
  gujarati: string;
  translit: string;
  english: string;
  notes?: string;
  // Items a learner tends to mix this one up with. Used first when picking
  // wrong answers, so the hard choices come up on purpose.
  confusables?: string[];
  // Other accepted English answers for build-the-sentence.
  alts?: string[];
  // Filled in at the audio milestone as `<id>.m4a`.
  audioFile: string | null;
}

// show: transliteration under every Gujarati prompt
// hint: hidden until tapped
// hide: never shown
export type TranslitMode = 'show' | 'hint' | 'hide';

export interface Lesson {
  id: string;
  unitId: string;
  order: number;
  title: string;
  items: string[];
  // A lesson with no new items practises the whole unit.
  review?: boolean;
  translit?: TranslitMode;
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  tip: string;
}

export interface Course {
  units: Unit[];
  lessons: Lesson[];
  items: Record<string, Item>;
}

// Exercises are generated from lessons at runtime (see exercises.ts).

export type ExerciseKind =
  | 'intro'
  | 'pick-sound'
  | 'pick-letter'
  | 'match-pairs'
  | 'build-word'
  | 'build-sentence';

interface ExerciseBase {
  id: string;
  kind: ExerciseKind;
  // Every item this exercise tests. Misses are charged to these.
  itemIds: string[];
}

export interface IntroExercise extends ExerciseBase {
  kind: 'intro';
  item: Item;
}

export interface PickExercise extends ExerciseBase {
  kind: 'pick-sound' | 'pick-letter';
  prompt: string;
  // Shown under the prompt when transliteration is allowed.
  promptTranslit?: string;
  // Transliteration is there but hidden until tapped.
  translitHint?: boolean;
  // Whether options are Gujarati script (needs the Gujarati font).
  optionsAreGujarati: boolean;
  options: string[];
  answer: string;
  question: string;
}

export interface MatchExercise extends ExerciseBase {
  kind: 'match-pairs';
  pairs: { itemId: string; left: string; right: string }[];
}

export interface BuildExercise extends ExerciseBase {
  kind: 'build-word' | 'build-sentence';
  prompt: string;
  promptTranslit?: string;
  translitHint?: boolean;
  promptIsGujarati: boolean;
  tilesAreGujarati: boolean;
  tiles: string[];
  answer: string[];
  // Other accepted answers (build-sentence only).
  alts?: string[][];
  question: string;
}

export type Exercise = IntroExercise | PickExercise | MatchExercise | BuildExercise;

// Progress rows. These mirror the database tables.

export const LOCAL_USER = 'local';

export interface LessonProgressRow {
  userId: string;
  lessonId: string;
  completedAt: string;
  bestAccuracy: number;
}

export interface CardRow {
  userId: string;
  itemId: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}

export interface ReviewLogRow {
  userId: string;
  itemId: string;
  rating: number;
  reviewedAt: string;
}

export interface DailyStatRow {
  userId: string;
  date: string;
  xp: number;
  lessonsDone: number;
  reviewsDone: number;
  newItems: number;
}

export interface Settings {
  retention: number;
  alwaysShowTranslit: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  retention: 0.9,
  alwaysShowTranslit: false,
};

export interface Snapshot {
  lessonProgress: LessonProgressRow[];
  cards: CardRow[];
  dailyStats: DailyStatRow[];
  settings: Settings;
}
