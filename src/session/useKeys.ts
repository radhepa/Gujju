import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Keyboard shortcuts on the web: 1-4 to pick, Enter to check / continue.
export function useKeys(handler: (key: string) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      ref.current(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
