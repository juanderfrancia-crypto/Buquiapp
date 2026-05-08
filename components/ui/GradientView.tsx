import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 'diagonal' (135deg) | 'top-bottom' | 'bottom-top' */
  direction?: 'diagonal' | 'top-bottom' | 'bottom-top';
}

const DIRECTIONS = {
  diagonal:      { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  'top-bottom':  { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  'bottom-top':  { start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
};

export function GradientView({ children, style, direction = 'diagonal' }: Props) {
  const { start, end } = DIRECTIONS[direction];
  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
