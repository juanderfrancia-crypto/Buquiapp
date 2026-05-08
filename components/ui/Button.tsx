import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { Colors } from '@/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'accent' | 'blue';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, textStyle, icon }: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = (variant === 'primary' || variant === 'accent' || variant === 'blue') ? Colors.white : Colors.buttonBg;
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, styles[`${variant}Text`] as TextStyle, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: 8 },
  // Negro — botón principal
  primary: { backgroundColor: Colors.buttonBg },
  // Azul — botón de marca secundario
  blue: { backgroundColor: Colors.primary },
  accent: { backgroundColor: Colors.accent },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
  text: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  primaryText: { color: Colors.white },
  blueText: { color: Colors.white },
  accentText: { color: Colors.white },
  outlineText: { color: Colors.text },
  ghostText: { color: Colors.text },
});
