import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { speak, useGujaratiVoice } from '../lib/speech';
import { useProgress } from '../state/progress';
import { colors } from './theme';

// A speaker button that reads Gujarati aloud. Renders nothing when the
// device has no Gujarati voice or the learner turned speech off.
export function Speak({ text, size = 22, color = colors.teal }: { text: string; size?: number; color?: string }) {
  const { snapshot } = useProgress();
  const voice = useGujaratiVoice(snapshot.settings.speak);
  if (!voice) return null;
  return (
    <Pressable onPress={() => speak(text, voice)} accessibilityLabel="Listen" hitSlop={10}>
      <Ionicons name="volume-high" size={size} color={color} />
    </Pressable>
  );
}
