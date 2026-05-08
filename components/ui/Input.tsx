import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, error, style, icon, secureTextEntry, ...props }: InputProps) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, focused && styles.containerFocused, error ? styles.containerError : null]}>
        {icon && (
          <Ionicons name={icon} size={18} color={focused ? Colors.primary : Colors.textMuted} style={styles.iconLeft} />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setSecure(p => !p)} style={styles.iconRight}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={styles.error}> {error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 7, letterSpacing: 0.1 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGrey,
    paddingHorizontal: 14,
  },
  containerFocused: { borderColor: Colors.primary, backgroundColor: Colors.white },
  containerError: { borderColor: Colors.error },
  iconLeft: { marginRight: 10 },
  iconRight: { marginLeft: 10, padding: 2 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  error: { fontSize: 12, color: Colors.error },
});
