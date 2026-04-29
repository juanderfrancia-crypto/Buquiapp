import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: Colors.successBg,  color: Colors.success  },
  warning: { bg: Colors.warningBg,  color: Colors.warning  },
  error:   { bg: Colors.errorBg,    color: Colors.error    },
  info:    { bg: Colors.infoBg,     color: Colors.info     },
  accent:  { bg: Colors.accentLight, color: Colors.accentDark },
  default: { bg: Colors.borderLight, color: Colors.textSecondary },
};

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.text, { color: v.color }, size === 'sm' && styles.textSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  textSm: { fontSize: 11 },
});
