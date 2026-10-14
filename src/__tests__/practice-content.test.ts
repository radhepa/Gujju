import { checkContent } from '../content/check';
import { builtInBooks, collections, courseWords, lexicon } from '../content/practice';

// The structural rules for sentence practice and books. Run on its own with
// `npm run check:content` while writing content.
describe('practice content', () => {
  it('passes every structural check', () => {
    const issues = checkContent({ collections, books: builtInBooks, lexicon, courseWords: courseWords.map((w) => w.gu) });
    const report = issues.map((i) => `[${i.rule}] ${i.where}: ${i.message}`);
    expect(report).toEqual([]);
  });
});
