import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { course } from '../../content/course';
import {
  glyphCatalog,
  letterCardId,
  letterSets,
  lookalikesOf,
  MASTERY_LABEL,
  masteryOf,
  MIX_ID,
  type Glyph,
  type GlyphKind,
  type LetterSet,
  type Mastery,
} from '../../lib/letters';
import { isDue } from '../../lib/srs';
import type { CardRow, Item } from '../../lib/types';
import { Kesar } from '../../mascot/Kesar';
import { useProgress } from '../../state/progress';
import { Button } from '../../ui/Button';
import { Header } from '../../ui/Header';
import { Screen } from '../../ui/Screen';
import { Speak } from '../../ui/Speak';
import { Gu, Text } from '../../ui/Text';
import { colors, maxWidth, shadow } from '../../ui/theme';

const catalog = glyphCatalog(course);
const byId = new Map(catalog.map((g) => [g.id, g]));
const sets = letterSets(catalog);
const words = Object.values(course.items).filter((i) => i.type === 'word');

// Mastery colours, from untouched to gold.
const TINT: Record<Mastery, { bg: string; border: string; fg: string }> = {
  0: { bg: colors.card, border: colors.line, fg: colors.inkSoft },
  1: { bg: colors.primarySoft, border: '#F2CFA0', fg: colors.primaryDark },
  2: { bg: '#F8D6A8', border: colors.primary, fg: colors.primaryDeep },
  3: { bg: colors.greenSoft, border: colors.green, fg: colors.greenDark },
  4: { bg: '#FCEFC2', border: '#D9A520', fg: '#8A6300' },
};

const SECTIONS: { kind: GlyphKind; title: string; titleGu: string }[] = [
  { kind: 'vowel', title: 'Vowels', titleGu: 'સ્વર' },
  { kind: 'consonant', title: 'Consonants', titleGu: 'વ્યંજન' },
  { kind: 'sign', title: 'Vowel signs', titleGu: 'માત્રા' },
  { kind: 'digit', title: 'Digits', titleGu: 'અંક' },
];

export default function Letters() {
  const { snapshot, cardRows, updateSettings } = useProgress();
  const { letterTimed: timed, letterBest } = snapshot.settings;
  const [open, setOpen] = useState<Glyph | null>(null);
  const level = useMemo(() => new Map(catalog.map((g) => [g.id, masteryOf(cardRows.get(letterCardId(g.id)))])), [cardRows]);
  const now = new Date();
  const due = catalog.filter((g) => {
    const r = cardRows.get(letterCardId(g.id));
    return r && isDue(r, now);
  }).length;
  const mastered = catalog.filter((g) => level.get(g.id) === 4).length;
  const drilled = catalog.filter((g) => (level.get(g.id) ?? 0) > 0).length;
  const play = (id: string) => router.push({ pathname: '/letters/[set]', params: { set: id } });

  return (
    <Screen>
      <Header title="Letter challenge" titleGu="અક્ષર પડકાર" />

      <View style={[styles.hero, shadow]}>
        <View style={styles.heroTop}>
          <Kesar size={76} pose={due ? 'think' : 'cheer'} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="black" style={styles.heroTitle}>
              Read it at a glance
            </Text>
            <Text style={styles.muted}>
              {drilled === 0
                ? 'A minute of quick-fire letters. Go for speed: fast answers score more, and five in a row doubles your points.'
                : due
                  ? `${due} ${due === 1 ? 'letter is' : 'letters are'} ready for a refresh.`
                  : `${mastered} of ${catalog.length} mastered. Keep the streak of quick reads going.`}
            </Text>
          </View>
        </View>
        <MasteryBar level={level} />
        <Button label={drilled ? 'Play the daily mix' : 'Start your first sprint'} onPress={() => play(MIX_ID)} />
        {letterBest[MIX_ID] ? (
          <Text style={[styles.small, { textAlign: 'center' }]}>
            Daily mix best: {letterBest[MIX_ID]}
          </Text>
        ) : null}
      </View>

      <View style={styles.modes}>
        <ModeButton label="Sprint: 60s" icon="timer-outline" active={timed} onPress={() => updateSettings({ letterTimed: true })} />
        <ModeButton label="No timer" icon="leaf-outline" active={!timed} onPress={() => updateSettings({ letterTimed: false })} />
      </View>

      <Text weight="black" style={styles.section}>
        Challenges
      </Text>
      <View style={styles.sets}>
        {sets.map((s) => (
          <SetCard key={s.id} set={s} level={level} best={letterBest[s.id]} onPress={() => play(s.id)} />
        ))}
      </View>

      <View style={styles.boardHead}>
        <Text weight="black" style={styles.sectionInline}>
          Your letter board
        </Text>
        <Text style={styles.small}>Tap a letter</Text>
      </View>
      <View style={styles.legend}>
        {([0, 1, 2, 3, 4] as Mastery[]).map((m) => (
          <View key={m} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TINT[m].bg, borderColor: TINT[m].border }]} />
            <Text style={styles.small}>{MASTERY_LABEL[m]}</Text>
          </View>
        ))}
      </View>
      {SECTIONS.map((sec) => (
        <View key={sec.kind} style={styles.board}>
          <View style={styles.boardTitle}>
            <Text weight="bold" style={styles.boardLabel}>
              {sec.title}
            </Text>
            <Gu style={styles.boardGu}>{sec.titleGu}</Gu>
          </View>
          <View style={styles.cells}>
            {catalog
              .filter((g) => g.kind === sec.kind)
              .map((g) => (
                <Cell key={g.id} glyph={g} mastery={level.get(g.id) ?? 0} onPress={() => setOpen(g)} />
              ))}
          </View>
        </View>
      ))}

      <LetterSheet glyph={open} rows={cardRows} onPick={setOpen} onClose={() => setOpen(null)} />
    </Screen>
  );
}

// The whole catalogue as one bar, a segment per mastery level.
function MasteryBar({ level }: { level: Map<string, Mastery> }) {
  const counts = [0, 0, 0, 0, 0];
  for (const m of level.values()) counts[m]++;
  return (
    <View style={styles.bar} accessibilityLabel={`${counts[4]} mastered, ${counts[3]} solid, ${counts[1] + counts[2]} learning`}>
      {([4, 3, 2, 1] as Mastery[]).map((m) =>
        counts[m] ? <View key={m} style={{ flex: counts[m], backgroundColor: TINT[m].border }} /> : null,
      )}
      {counts[0] ? <View style={{ flex: counts[0] }} /> : null}
    </View>
  );
}

function ModeButton({ label, icon, active, onPress }: { label: string; icon: 'timer-outline' | 'leaf-outline'; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.mode, active && styles.modeActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Ionicons name={icon} size={18} color={active ? colors.primaryDark : colors.muted} />
      <Text weight="bold" style={{ color: active ? colors.primaryDark : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SetCard({ set, level, best, onPress }: { set: LetterSet; level: Map<string, Mastery>; best?: number; onPress: () => void }) {
  const solid = set.glyphs.filter((id) => (level.get(id) ?? 0) >= 3).length;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.set, shadow, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={set.title}>
      <View style={styles.setTop}>
        <Gu style={styles.setSample} numberOfLines={1}>
          {set.sample}
        </Gu>
        {best ? (
          <View style={styles.best}>
            <Ionicons name="trophy" size={12} color={colors.primaryDark} />
            <Text weight="black" style={styles.bestText}>
              {best}
            </Text>
          </View>
        ) : null}
      </View>
      <Text weight="black" style={styles.setTitle}>
        {set.title}
      </Text>
      <Gu style={styles.setGu}>{set.titleGu}</Gu>
      <Text style={styles.setBlurb} numberOfLines={2}>
        {set.blurb}
      </Text>
      <View style={styles.setTrack}>
        <View style={[styles.setFill, { width: `${(solid / Math.max(1, set.glyphs.length)) * 100}%` }]} />
      </View>
      <Text style={styles.small}>
        {solid}/{set.glyphs.length} solid
      </Text>
    </Pressable>
  );
}

function Cell({ glyph, mastery, onPress }: { glyph: Glyph; mastery: Mastery; onPress: () => void }) {
  const t = TINT[mastery];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, { backgroundColor: t.bg, borderColor: t.border }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${glyph.shape}, ${glyph.sound || 'no vowel'}, ${MASTERY_LABEL[mastery]}`}
    >
      {mastery === 4 ? <Ionicons name="star" size={10} color="#D9A520" style={styles.star} /> : null}
      <Gu style={[styles.cellGu, { color: t.fg }]}>{glyph.shape}</Gu>
      <Text weight="bold" style={[styles.cellSound, { color: t.fg }]} numberOfLines={1}>
        {glyph.sound || '–'}
      </Text>
    </Pressable>
  );
}

// Words from the course that use this letter or sign, shortest first.
function examplesFor(g: Glyph): Item[] {
  if (g.kind === 'digit') return [];
  const mark = g.kind === 'sign' ? g.sign! : g.shape;
  return words
    .filter((w) => w.gujarati.includes(mark) && !/\s/.test(w.gujarati))
    .sort((a, b) => [...a.gujarati].length - [...b.gujarati].length)
    .slice(0, 4);
}

function LetterSheet({ glyph, rows, onPick, onClose }: { glyph: Glyph | null; rows: Map<string, CardRow>; onPick: (g: Glyph) => void; onClose: () => void }) {
  const mastery = glyph ? masteryOf(rows.get(letterCardId(glyph.id))) : 0;
  const look = glyph ? lookalikesOf(glyph, byId) : [];
  const examples = glyph ? examplesFor(glyph) : [];
  const say = glyph ? glyph.item.gujarati : '';
  return (
    <Modal visible={!!glyph} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      {glyph ? (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.inner}>
            <View style={styles.sheetTop}>
              <View style={[styles.bigCell, { backgroundColor: TINT[mastery].bg, borderColor: TINT[mastery].border }]}>
                <Gu style={styles.bigGu}>{glyph.shape}</Gu>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text weight="black" style={styles.sheetSound}>
                  {glyph.kind === 'digit' ? `${glyph.sound} · ${glyph.item.translit}` : glyph.sound || 'no vowel'}
                </Text>
                <Text style={styles.muted}>
                  {glyph.kind === 'sign' ? `On ક: ${glyph.item.gujarati} (${glyph.item.translit})` : SECTIONS.find((s) => s.kind === glyph.kind)?.title.replace(/s$/, '')}
                </Text>
                <Text weight="bold" style={{ color: TINT[mastery].fg, fontSize: 14 }}>
                  {MASTERY_LABEL[mastery]}
                </Text>
              </View>
              <Speak text={say} framed />
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} style={styles.close}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>
            {glyph.item.notes ? <Text style={styles.note}>{glyph.item.notes}</Text> : null}
            {look.length ? (
              <>
                <Text weight="black" style={styles.sheetLabel}>
                  Don’t mix it up with
                </Text>
                <View style={styles.chips}>
                  {look.map((o) => (
                    <Pressable key={o.id} onPress={() => onPick(o)} style={styles.lookChip} accessibilityRole="button" accessibilityLabel={`${o.shape}, ${o.sound}`}>
                      <Gu style={styles.lookGu}>{o.shape}</Gu>
                      <Text weight="bold" style={styles.small}>
                        {o.sound || 'no vowel'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            {examples.length ? (
              <>
                <Text weight="black" style={styles.sheetLabel}>
                  In words you’ll meet
                </Text>
                {examples.map((w) => (
                  <View key={w.id} style={styles.example}>
                    <Gu style={styles.exampleGu}>{w.gujarati}</Gu>
                    <Text style={styles.exampleTr}>{w.translit}</Text>
                    <Text style={styles.exampleEn} numberOfLines={1}>
                      {w.english}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  hero: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.line, padding: 14, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroTitle: { fontSize: 18 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' },
  modes: { flexDirection: 'row', gap: 10, marginTop: 14 },
  mode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  modeActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  section: { fontSize: 18, marginTop: 22, marginBottom: 10 },
  sectionInline: { fontSize: 18 },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  set: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 12,
    gap: 2,
  },
  setTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setSample: { flex: 1, fontSize: 22, lineHeight: 36, color: colors.primaryDark },
  best: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bestText: { fontSize: 12, color: colors.primaryDark },
  setTitle: { fontSize: 16 },
  setGu: { fontSize: 14, lineHeight: 22, color: colors.muted },
  setBlurb: { fontSize: 12, lineHeight: 17, color: colors.muted, minHeight: 34 },
  setTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 6 },
  setFill: { height: '100%', backgroundColor: colors.green },
  boardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 24, marginBottom: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 4, borderWidth: 1.5 },
  board: { marginTop: 10 },
  boardTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  boardLabel: { fontSize: 14, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8 },
  boardGu: { fontSize: 14, lineHeight: 22, color: colors.muted },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 58, height: 64, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', top: 3, right: 4 },
  cellGu: { fontSize: 24, lineHeight: 36 },
  cellSound: { fontSize: 11, marginTop: -4 },
  scrim: { flex: 1, backgroundColor: 'rgba(42,36,32,0.35)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderColor: colors.line,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineDark, alignSelf: 'center', marginBottom: 8 },
  inner: { width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: 20, gap: 6 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigCell: { width: 96, height: 96, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bigGu: { fontSize: 54, lineHeight: 80 },
  sheetSound: { fontSize: 24 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 15, color: colors.ink, lineHeight: 21, marginTop: 4 },
  sheetLabel: { fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lookChip: { alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: colors.line, paddingHorizontal: 14, paddingBottom: 4 },
  lookGu: { fontSize: 28, lineHeight: 44 },
  example: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  exampleGu: { fontSize: 22, lineHeight: 36 },
  exampleTr: { fontSize: 14, color: colors.muted },
  exampleEn: { flex: 1, fontSize: 14, color: colors.ink, textAlign: 'right' },
});
