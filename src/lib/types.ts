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

// How sentence practice takes answers: four options, or typed (Gujarati
// script or transliteration).
export type ClozeMode = 'choice' | 'type';

// How writing practice takes answers: letter tiles, or an on-screen
// Gujarati keyboard.
export type WriteMode = 'tiles' | 'keyboard';

export interface Settings {
  retention: number;
  alwaysShowTranslit: boolean;
  // XP a day that fills the goal ring.
  dailyGoal: number;
  clozeMode: ClozeMode;
  // Read words and sentences aloud when the device has a Gujarati voice.
  speak: boolean;
  writeMode: WriteMode;
  // Watch & Listen entries the learner has ticked off.
  watched: string[];
  // When a backup file was last saved on this device. Not synced.
  lastBackup: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  retention: 0.9,
  alwaysShowTranslit: false,
  dailyGoal: 50,
  clozeMode: 'choice',
  speak: true,
  writeMode: 'tiles',
  watched: [],
  lastBackup: null,
};

export interface Snapshot {
  lessonProgress: LessonProgressRow[];
  cards: CardRow[];
  dailyStats: DailyStatRow[];
  settings: Settings;
  // Books the learner made; the built-in ones ship with the app.
  books: Book[];
}

// Sentence practice and books. These mirror content/cloze, content/books
// and content/lexicon.

export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'pron' | 'post' | 'conj' | 'part' | 'num' | 'interj' | 'q';

// One surface form of a word as it appears in a sentence (ઘરે, ઘરમાં and
// ઘર are three entries). `base` points at the dictionary form.
export interface LexEntry {
  gu: string;
  tr: string;
  en: string;
  pos: Pos;
  base?: string;
  note?: string;
}

export interface ClozeSentence {
  id: string;
  gu: string;
  // Word for word with `gu`: the same number of words, in the same order.
  tr: string;
  en: string;
  // The word that gets blanked, exactly as it appears in `gu`.
  cloze: string;
  // Three wrong answers that look like they could fit but don't.
  wrong: string[];
  note?: string;
}

export interface Collection {
  id: string;
  title: string;
  titleGu: string;
  level: 1 | 2 | 3;
  blurb: string;
  sentences: ClozeSentence[];
}

export interface BookSentence {
  id: string;
  gu: string;
  tr?: string;
  en?: string;
  cloze?: string;
  wrong?: string[];
}

export interface Book {
  id: string;
  title: string;
  titleGu?: string;
  level?: 1 | 2 | 3;
  blurb?: string;
  builtIn: boolean;
  createdAt?: string;
  // Set on every save, so the newest copy wins when devices sync.
  updatedAt?: string;
  sentences: BookSentence[];
}

// The grammar guide (content/grammar.json).
export interface GrammarExample {
  gu: string;
  tr: string;
  en: string;
}

export interface GrammarSection {
  heading: string;
  body: string;
  table?: string[][];
  examples?: GrammarExample[];
}

export interface GrammarTopic {
  id: string;
  title: string;
  titleGu: string;
  level: 1 | 2 | 3;
  units: string[];
  summary: string;
  sections: GrammarSection[];
}

// The Watch & Listen guide (content/media.json).
export type MediaType = 'film' | 'series' | 'youtube' | 'music' | 'podcast';

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  titleGu?: string;
  year?: number;
  level: 1 | 2 | 3;
  about: string;
  learn: string;
  tags?: string[];
  link?: string;
}

export interface MediaTips {
  id: string;
  type: 'tips';
  title: string;
  tips: string[];
}
