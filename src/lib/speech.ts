import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

// Read Gujarati aloud with the device's own text-to-speech, when it has a
// Gujarati voice (most Android phones and Chrome do; many iPhones don't).
// The speaker buttons only appear when one is found, so nobody gets a
// button that reads Gujarati in an English accent. Recorded audio can
// replace this later.

let cached: Promise<string | null> | null = null;

const gujarati = () =>
  Speech.getAvailableVoicesAsync()
    .then((voices) => voices.find((v) => v.language?.toLowerCase().replace('_', '-').startsWith('gu'))?.identifier ?? null)
    .catch(() => null);

function findVoice(): Promise<string | null> {
  if (!cached) {
    // Browsers load their voice list lazily, so an empty first answer gets
    // one more try.
    cached = gujarati().then((v) => v ?? new Promise<string | null>((r) => setTimeout(() => gujarati().then(r), 1200)));
  }
  return cached;
}

export function useGujaratiVoice(enabled = true): string | null {
  const [voice, setVoice] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return setVoice(null);
    let alive = true;
    findVoice().then((v) => alive && setVoice(v));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return voice;
}

export function speak(text: string, voice: string) {
  Speech.stop();
  Speech.speak(text, { voice, language: 'gu-IN', rate: 0.85 });
}
