import { Pressable, StyleSheet, Text } from 'react-native';

export function SharedButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export const styles = StyleSheet.create({
  panel: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 10, marginVertical: 16 },
  section: { gap: 10, marginVertical: 6 },
  heading: { fontSize: 19, fontWeight: '700', color: '#26323e' },
  subheading: { fontSize: 16, fontWeight: '700', color: '#26323e', marginTop: 6 },
  copy: { color: '#42534d', lineHeight: 21 },
  error: { color: '#9a342b', lineHeight: 21 },
  input: { borderWidth: 1, borderColor: '#a9b7b1', borderRadius: 10, minHeight: 48, padding: 10, color: '#26323e' },
  button: { backgroundColor: '#edf3ef', borderRadius: 10, minHeight: 44, justifyContent: 'center', padding: 10 },
  buttonText: { color: '#274f41', fontWeight: '600' },
  disabled: { opacity: .5 },
});
