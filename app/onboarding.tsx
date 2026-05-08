import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, StatusBar, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@barberly:onboarding_done';

const SLIDES = [
  {
    key: '1',
    icon: null,
    showLogo: true,
    title: 'Bienvenido a Buqui',
    subtitle: 'La app que conecta clientes y negocios. Reserva tu turno en segundos, sin llamadas.',
  },
  {
    key: '2',
    icon: 'calendar-outline' as const,
    showLogo: false,
    title: 'Reserva en segundos',
    subtitle: 'Elige tu servicio, escoge el día y la hora. Confirmación inmediata, sin esperas ni llamadas.',
  },
  {
    key: '3',
    icon: 'trending-up-outline' as const,
    showLogo: false,
    title: 'Haz crecer tu negocio',
    subtitle: 'Gestiona tus citas, horarios y servicios desde un solo lugar. Barberías, salones, spas y más.',
  },
];

async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isLast = activeIndex === SLIDES.length - 1;

  async function handleSkip() {
    await markOnboardingDone();
    router.replace('/auth/login');
  }

  async function handleNext() {
    if (isLast) {
      await markOnboardingDone();
      router.replace('/auth/login');
      return;
    }
    flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  }

  function onMomentumScrollEnd(e: any) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Top bar */}
        <View style={styles.topBar}>
          {!isLast && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides */}
        <Animated.FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              {item.showLogo ? (
                <Image source={require('@/assets/images/logo.png')} style={styles.logoImg} resizeMode="contain" />
              ) : (
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon!} size={52} color={Colors.white} />
                </View>
              )}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <View style={styles.ctaArea}>
          <TouchableOpacity style={styles.mainBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.mainBtnText}>{isLast ? 'Comenzar' : 'Siguiente'}</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>

          {isLast && (
            <TouchableOpacity onPress={handleSkip} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>
                ¿Ya tienes cuenta?{' '}
                <Text style={styles.loginLinkBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.surfaceGrey,
  },
  skipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 20,
  },
  logoImg: {
    width: width * 0.88,
    height: 200,
    marginBottom: 48,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 48,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 30, fontWeight: '800', color: Colors.text,
    textAlign: 'center', letterSpacing: -0.5,
    marginBottom: 16, lineHeight: 36,
  },
  subtitle: {
    fontSize: 16, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 26,
  },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6,
    paddingVertical: 20,
  },
  dot: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  ctaArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 14,
    alignItems: 'center',
  },
  mainBtn: {
    width: '100%', paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: Colors.buttonBg,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 10,
  },
  mainBtnText: { fontSize: 17, fontWeight: '800', color: Colors.white },
  loginLink: { paddingVertical: 4 },
  loginLinkText: { fontSize: 14, color: Colors.textMuted },
  loginLinkBold: { color: Colors.primary, fontWeight: '700' },
});
