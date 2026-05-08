import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';

const STEPS = [
  {
    icon: 'pricetag-outline' as const,
    iconActive: 'pricetag' as const,
    title: 'Agrega tus servicios',
    desc: 'Define qué ofreces, cuánto dura cada servicio y su precio. Los clientes los verán al reservar.',
    cta: 'Ir a Servicios',
    route: '/barber/services',
    color: Colors.primary,
  },
  {
    icon: 'time-outline' as const,
    iconActive: 'time' as const,
    title: 'Configura tus horarios',
    desc: 'Indica qué días atiendes y en qué horario. Solo se mostrarán turnos dentro de tu disponibilidad.',
    cta: 'Ir a Horarios',
    route: '/barber/schedule',
    color: Colors.primary,
  },
  {
    icon: 'camera-outline' as const,
    iconActive: 'camera' as const,
    title: 'Agrega una foto de portada',
    desc: 'Una buena imagen genera más confianza. Sube la foto de tu negocio para destacar en la búsqueda.',
    cta: 'Ir a Mi negocio',
    route: '/barber/shop',
    color: Colors.primary,
  },
];

export default function BarberWelcomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <GradientView style={styles.hero} direction="top-bottom">
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={36} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle}>¡Tu negocio está listo!</Text>
          <Text style={styles.heroSub}>
            Ya puedes recibir reservas. Completa estos pasos para que tus clientes tengan la mejor experiencia.
          </Text>
        </GradientView>

        {/* Steps */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionLabel}>Próximos pasos</Text>

          {STEPS.map((step, i) => (
            <TouchableOpacity
              key={step.title}
              style={styles.stepCard}
              onPress={() => router.replace(step.route as any)}
              activeOpacity={0.8}
            >
              <View style={styles.stepLeft}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={styles.stepLine} />
              </View>

              <View style={styles.stepBody}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={step.icon} size={22} color={Colors.primary} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                  <View style={styles.stepCta}>
                    <Text style={styles.stepCtaText}>{step.cta}</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
          <Text style={styles.noticeText}>
            Puedes volver a hacer esto en cualquier momento desde las pestañas de abajo.
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.replace('/barber/dashboard')}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.white} />
          <Text style={styles.ctaBtnText}>Ver mi agenda</Text>
        </TouchableOpacity>
        <Text style={styles.ctaHint}>Puedes completar los pasos después</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  scroll: { paddingBottom: 16 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 28,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '800', color: Colors.white,
    letterSpacing: -0.4, textAlign: 'center', marginBottom: 10,
  },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 22,
  },

  // Steps
  stepsSection: { padding: 20, gap: 0 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
  },

  stepCard: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  stepLeft: {
    alignItems: 'center',
    width: 36,
    paddingTop: 2,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  stepLine: {
    width: 2, flex: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 4, marginBottom: -4,
    minHeight: 24,
  },

  stepBody: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginLeft: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  stepIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  stepCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepCtaText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Notice
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.infoBg, borderRadius: 14,
    padding: 14, marginHorizontal: 20,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },

  // Bottom CTA
  cta: {
    padding: 16, paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: 'center', gap: 8,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 15, width: '100%',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  ctaHint: { fontSize: 12, color: Colors.textMuted, paddingBottom: 4 },
});
