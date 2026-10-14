import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { speak, useGujaratiVoice } from '../lib/speech';
import { useProgress } from '../state/progress';
import { colors } from './theme';

// A speaker button that reads Gujarati aloud. Renders nothing when the
// device has no Gujarati voice or the learner turned speech off.
export function Speak({
  text,
  size = 22,
  color = colors.teal,
  framed,
}: {
  text: string;
  size?: number;
  color?: string;
  // A bordered square button instead of a bare icon.
  framed?: boolean;
}) {
  const { snapshot } = useProgress();
  const voice = useGujaratiVoice(snapshot.settings.speak);
  if (!voice) return null;
  return (
    <Pressable
      onPress={() => speak(text, voice)}
      accessibilityRole="button"
      accessibilityLabel="Listen"
      hitSlop={10}
      style={framed ? frame : undefined}
    >
      <Ionicons name="volume-high" size={size} color={color} />
    </Pressable>
  );
}

const frame = {
  width: 48,
  height: 48,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.line,
  backgroundColor: colors.bg,
  alignItems: 'center',
  justifyContent: 'center',
} as const;
