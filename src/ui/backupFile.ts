import { Platform, Share } from 'react-native';

// Getting a backup file out of the app and back in.

const isPhone = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// On a phone the share sheet is the easy way to put the file somewhere safe
// (Files, iCloud Drive, Google Drive, an email to yourself). On a computer it
// downloads. Returns false if the learner closed the share sheet.
export async function saveBackupFile(name: string, json: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    const r = await Share.share({ title: name, message: json });
    return r.action !== Share.dismissedAction;
  }
  const file = new File([json], name, { type: 'application/json' });
  if (isPhone() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Gujju backup' });
      return true;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return false;
      // Sharing refused for some other reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export const canPickFile = Platform.OS === 'web';

// Opens the file picker and reads the chosen file. Null if nothing was picked.
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// Whether the app is running from the home screen rather than a browser tab.
export function isInstalled(): boolean {
  if (Platform.OS !== 'web') return true;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export const isIOS = () =>
  Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (Platform.OS === 'web' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
