import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import { backupFileName, parseBackup } from '../lib/backup';
import { useProgress } from '../state/progress';
import { signIn, signOut, syncNow, useSyncStatus, type SyncStatus } from '../sync/engine';
import { canPickFile, isInstalled, isIOS, pickBackupFile, saveBackupFile } from '../ui/backupFile';
import { Button } from '../ui/Button';
import { Header } from '../ui/Header';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { colors, fonts } from '../ui/theme';

function tell(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function ask(message: string, yes: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('Are you sure?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}

function ago(iso: string | number | null | undefined): string {
  if (iso == null) return 'never';
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return `today at ${then.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function syncLine(s: SyncStatus): string {
  switch (s.state) {
    case 'syncing':
      return 'Syncing…';
    case 'synced':
      return `Up to date · synced ${ago(s.lastSyncAt)}`;
    case 'offline':
      return 'No connection right now. It will sync when you’re back online.';
    case 'signed-out':
      return 'Your sign-in has ended. Sign in again to keep syncing; nothing here was lost.';
    case 'error':
      return `Couldn’t sync: ${s.error}`;
    default:
      return '';
  }
}

function SignIn({ email: initial }: { email?: string }) {
  const [email, setEmail] = useState(initial ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      setError(/invalid login/i.test(msg) ? 'That email and password don’t match.' : msg);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.locked}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        style={styles.input}
        accessibilityLabel="Email"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.locked}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
        style={styles.input}
        accessibilityLabel="Password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={busy ? 'Signing in…' : 'Sign in'} variant="green" onPress={submit} disabled={busy || !email || !password} />
    </View>
  );
}

export default function DataScreen() {
  const { snapshot, exportBackup, restoreBackup, updateSettings } = useProgress();
  const sync = useSyncStatus();
  const [busy, setBusy] = useState<'save' | 'restore' | null>(null);
  const installed = isInstalled();

  const save = async () => {
    setBusy('save');
    try {
      const backup = await exportBackup();
      const now = new Date();
      if (await saveBackupFile(backupFileName(now), JSON.stringify(backup))) {
        await updateSettings({ lastBackup: now.toISOString() });
      }
    } catch (e) {
      tell('Couldn’t save the backup', (e as Error)?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    const text = await pickBackupFile();
    if (!text) return;
    let backup;
    try {
      backup = parseBackup(text);
    } catch (e) {
      tell('Couldn’t read that file', (e as Error).message);
      return;
    }
    const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString() : 'an unknown date';
    ask(
      `Replace what’s on this device with the backup from ${when}? It has ${backup.lessonProgress.length} lessons, ${backup.cards.length} review cards and ${backup.books.length} books.` +
        (sync.state !== 'off' ? ' Anything newer in your synced copy is kept.' : ''),
      'Restore',
      async () => {
        setBusy('restore');
        try {
          await restoreBackup(backup);
          tell('Restored', 'Your backup is back on this device.');
        } catch (e) {
          tell('Couldn’t restore', (e as Error)?.message ?? String(e));
        } finally {
          setBusy(null);
        }
      },
    );
  };

  return (
    <Screen>
      <Header title="Sync & backup" />

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="lock-closed" size={20} color={colors.green} />
          <Text weight="black" style={styles.label}>
            Private by design
          </Text>
        </View>
        <Text style={styles.help}>
          Your progress lives on this device. Nothing about you is sent anywhere unless you sign in to sync, and then it goes
          only to your own private table that no other account can read. No ads, no tracking.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="sync" size={20} color={colors.teal} />
          <Text weight="black" style={styles.label}>
            Sync between devices
          </Text>
        </View>
        {sync.state === 'off' ? (
          <>
            <Text style={styles.help}>
              Sign in with your FitPip account to keep a copy in the cloud and pick up where you left off on any device.
              It merges with what’s already here; nothing is lost.
            </Text>
            <SignIn />
          </>
        ) : (
          <>
            <Text style={styles.help}>
              Signed in as <Text weight="bold">{sync.email}</Text>
            </Text>
            <View style={styles.row}>
              {sync.state === 'syncing' ? <ActivityIndicator color={colors.teal} /> : null}
              <Text style={[styles.help, { flex: 1 }, sync.state === 'error' && styles.error]}>{syncLine(sync)}</Text>
            </View>
            {sync.state === 'signed-out' ? (
              <SignIn email={sync.email} />
            ) : (
              <View style={styles.buttons}>
                <Button label="Sync now" variant="plain" onPress={() => void syncNow()} disabled={sync.state === 'syncing'} style={{ flex: 1 }} />
                <Button
                  label="Sign out"
                  variant="plain"
                  style={{ flex: 1 }}
                  onPress={() =>
                    ask('Stop syncing on this device? Everything stays here, and your cloud copy is kept.', 'Sign out', () => void signOut())
                  }
                />
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="document-text" size={20} color={colors.primaryDark} />
          <Text weight="black" style={styles.label}>
            Backup file
          </Text>
        </View>
        <Text style={styles.help}>
          A copy of everything (lessons, reviews, streak, your books and settings) in one file you keep, in Files, iCloud
          Drive or Google Drive. Last saved on this device: <Text weight="bold">{ago(snapshot.settings.lastBackup)}</Text>.
        </Text>
        <Button label={busy === 'save' ? 'Saving…' : 'Save a backup'} onPress={save} disabled={busy !== null} />
        {canPickFile ? (
          <Button
            label={busy === 'restore' ? 'Restoring…' : 'Restore from a backup'}
            variant="plain"
            onPress={restore}
            disabled={busy !== null}
            style={{ marginTop: 4 }}
          />
        ) : null}
      </View>

      {!installed ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="phone-portrait" size={20} color={colors.primary} />
            <Text weight="black" style={styles.label}>
              Put Gujju on your home screen
            </Text>
          </View>
          <Text style={styles.help}>
            {isIOS()
              ? 'In Safari, tap the Share button, then Add to Home Screen. It opens like an app and works offline, and iOS won’t clear its data the way it can for a website.'
              : 'In Chrome, open the ⋮ menu and choose Add to Home screen (or Install app). It opens like an app, works offline, and the phone won’t clear its data the way it can for a website.'}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  label: { fontSize: 17 },
  help: { fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  error: { color: colors.redDark },
  input: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
});
