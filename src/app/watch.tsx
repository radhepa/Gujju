import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { mediaItems, mediaTips } from '../content/guides';
import type { MediaItem, MediaType } from '../lib/types';
import { useProgress } from '../state/progress';
import { Header } from '../ui/Header';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors, shadow } from '../ui/theme';

const TYPES: { key: MediaType | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'film', label: 'Films', icon: 'film' },
  { key: 'series', label: 'Shows', icon: 'tv' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'podcast', label: 'Podcasts', icon: 'mic' },
];
const LEVEL = ['', 'Easy to follow', 'Intermediate', 'Advanced'];
const LEVEL_COLOR = ['', colors.green, colors.primary, colors.redDark];

// Gujarati films, shows, channels and music, easiest first, with what each
// is good for. Ticking one off counts toward the B1 milestone.
export default function Watch() {
  const { snapshot, updateSettings } = useProgress();
  const [type, setType] = useState<MediaType | 'all'>('all');
  const [level, setLevel] = useState<number>(0);
  const [allTips, setAllTips] = useState(false);
  const watched = new Set(snapshot.settings.watched);
  const list = mediaItems
    .filter((m) => (type === 'all' || m.type === type) && (!level || m.level === level))
    .sort((a, b) => a.level - b.level || (b.year ?? 0) - (a.year ?? 0));
  const present = new Set(mediaItems.map((m) => m.type));

  const toggle = (id: string) =>
    updateSettings({ watched: watched.has(id) ? snapshot.settings.watched.filter((w) => w !== id) : [...snapshot.settings.watched, id] });

  return (
    <Screen>
      <Header title="Watch & listen" titleGu="જુઓ અને સાંભળો" />
      <Text style={styles.muted}>
        Real Gujarati, the way people talk. Start with songs and kids’ shows, then comedies, then the films with fast talk.
        {watched.size ? `  You’ve ticked off ${watched.size}.` : ''}
      </Text>

      {mediaTips ? (
        <View style={[styles.tips, shadow]}>
          <Text weight="black" style={styles.tipsTitle}>
            {mediaTips.title}
          </Text>
          {(allTips ? mediaTips.tips : mediaTips.tips.slice(0, 3)).map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tip}>{t}</Text>
            </View>
          ))}
          {mediaTips.tips.length > 3 ? (
            <Pressable onPress={() => setAllTips((v) => !v)} accessibilityRole="button">
              <Text weight="bold" style={styles.more}>
                {allTips ? 'Fewer tips' : `${mediaTips.tips.length - 3} more tips`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.chips}>
        {TYPES.filter((t) => t.key === 'all' || present.has(t.key)).map((t) => (
          <Chip key={t.key} label={t.label} icon={t.icon} active={type === t.key} onPress={() => setType(t.key)} />
        ))}
      </View>
      <View style={styles.chips}>
        {[0, 1, 2, 3].map((l) => (
          <Chip key={l} label={l ? LEVEL[l] : 'Any level'} active={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>

      {list.map((m) => (
        <MediaCard key={m.id} m={m} watched={watched.has(m.id)} onToggle={() => toggle(m.id)} />
      ))}
      {!list.length ? <Text style={styles.muted}>Nothing here for that filter yet.</Text> : null}
    </Screen>
  );
}

function Chip({ label, icon, active, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.primaryDark : colors.muted} /> : null}
      <Text weight="bold" style={{ fontSize: 13, color: active ? colors.primaryDark : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}

const TYPE_ICON: Record<MediaType, keyof typeof Ionicons.glyphMap> = {
  film: 'film',
  series: 'tv',
  youtube: 'logo-youtube',
  music: 'musical-notes',
  podcast: 'mic',
};

function MediaCard({ m, watched, onToggle }: { m: MediaItem; watched: boolean; onToggle: () => void }) {
  return (
    <View style={[styles.card, shadow, watched && styles.cardDone]}>
      <View style={styles.cardTop}>
        <View style={styles.icon}>
          <Ionicons name={TYPE_ICON[m.type]} size={20} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="black" style={styles.title}>
            {m.title}
            {m.year ? <Text style={styles.year}>  {m.year}</Text> : null}
          </Text>
          {m.titleGu ? <Gu style={styles.gu}>{m.titleGu}</Gu> : null}
        </View>
        <Pressable onPress={onToggle} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: watched }} accessibilityLabel={`Watched ${m.title}`}>
          <Ionicons name={watched ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={watched ? colors.green : colors.locked} />
        </Pressable>
      </View>
      <View style={styles.badges}>
        <View style={[styles.badge, { borderColor: LEVEL_COLOR[m.level] }]}>
          <Text weight="bold" style={[styles.badgeText, { color: LEVEL_COLOR[m.level] }]}>
            {LEVEL[m.level]}
          </Text>
        </View>
        {m.tags?.slice(0, 3).map((t) => (
          <View key={t} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.about}>{m.about}</Text>
      <View style={styles.learn}>
        <Ionicons name="school-outline" size={16} color={colors.teal} />
        <Text style={styles.learnText}>{m.learn}</Text>
      </View>
      {m.link ? (
        <Pressable onPress={() => Linking.openURL(m.link!)} style={styles.link} accessibilityRole="link">
          <Text weight="bold" style={styles.linkText}>
            Learn more
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.teal} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  tips: { backgroundColor: colors.tealSoft, borderRadius: 18, padding: 14, marginTop: 14, gap: 6 },
  tipsTitle: { fontSize: 16, color: colors.teal },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipDot: { color: colors.teal, fontSize: 15, lineHeight: 21 },
  tip: { flex: 1, fontSize: 14, lineHeight: 21 },
  more: { color: colors.teal, fontSize: 14, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  cardDone: { borderColor: colors.green },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17 },
  year: { fontSize: 14, color: colors.muted, fontFamily: undefined },
  gu: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12 },
  tag: { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.muted },
  about: { fontSize: 15, lineHeight: 22 },
  learn: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  learnText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.teal },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  linkText: { fontSize: 14, color: colors.teal },
});
