import type { Exercise } from '../lib/types';

export interface Result {
  correct: boolean;
  missed?: string[];
  solution?: string;
  solutionIsGujarati?: boolean;
}

export interface ExerciseProps<E extends Exercise> {
  ex: E;
  answered: boolean;
  onAnswered: (r: Result) => void;
}
