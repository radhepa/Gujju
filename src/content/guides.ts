import type { GrammarTopic, MediaItem, MediaTips } from '../lib/types';
import grammarFile from '../../content/grammar.json';
import mediaFile from '../../content/media.json';

// The grammar guide and the Watch & Listen list.

export const grammar = grammarFile as GrammarTopic[];

const media = mediaFile as (MediaItem | MediaTips)[];
export const mediaTips = media.find((m): m is MediaTips => m.type === 'tips');
export const mediaItems = media.filter((m): m is MediaItem => m.type !== 'tips');

export const grammarForUnit = (unitId: string) => grammar.filter((t) => t.units.includes(unitId));
export const findTopic = (id: string) => grammar.find((t) => t.id === id);
