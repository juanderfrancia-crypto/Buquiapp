import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'flat' | 'elevated';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  default: {
    shadowColor: '#0D0D1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  flat: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    shadowColor: '#0D0D1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
});
