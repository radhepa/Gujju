import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { goBack } from './nav';
import { Screen } from './Screen';
import { Text } from './Text';
import { colors } from './theme';

export function Notice({ title, body }: { title: string; body?: string }) {
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Text weight="black" style={styles.title}>
          {title}
        </Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      <Button label="Back" variant="plain" onPress={goBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, textAlign: 'center' },
  body: { color: colors.muted, textAlign: 'center' },
});
