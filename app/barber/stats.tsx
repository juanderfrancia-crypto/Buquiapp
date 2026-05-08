import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';

interface Stats {
  totalMonth: number;
  confirmedMonth: number;
  cancelledMonth: number;
  revenueMonth: number;
  totalToday: number;
  revenueToday: number;
  topService: string | null;
}

const EMPTY: Stats = {
  totalMonth: 0, confirmedMonth: 0, cancelledMonth: 0,
  revenueMonth: 0, totalToday: 0, revenueToday: 0, topService: null,
};

export default function StatsScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const { data: shop } = await supabase
      .from('barbershops').select('id').eq('owner_id', user.id).single();

    if (!shop) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStart = firstOfMonth.toISOString().split('T')[0];

    const { data: monthBookings } = await supabase
      .from('bookings')
      .select('*, service:services(name, price)')
      .eq('barbershop_id', shop.id)
      .gte('booking_date', monthStart);

    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('*, service:services(price)')
      .eq('barbershop_id', shop.id)
      .eq('booking_date', today)
      .neq('status', 'cancelled');

    const mb = monthBookings ?? [];
    const tb = todayBookings ?? [];

    const confirmed = mb.filter((b: any) => b.status === 'confirmed');
    const cancelled = mb.filter((b: any) => b.status === 'cancelled');
    const revenueMonth = confirmed.reduce((sum: number, b: any) => sum + (b.service?.price ?? 0), 0);
    const revenueToday = tb.reduce((sum: number, b: any) => sum + (b.service?.price ?? 0), 0);

    // Most popular service this month
    const serviceCounts: Record<string, number> = {};
    mb.forEach((b: any) => {
      const name = b.service?.name;
      if (name) serviceCounts[name] = (serviceCounts[name] ?? 0) + 1;
    });
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    setStats({
      totalMonth: mb.length,
      confirmedMonth: confirmed.length,
      cancelledMonth: cancelled.length,
      revenueMonth,
      totalToday: tb.length,
      revenueToday,
      topService,
    });
    setLoading(false);
  };

  const monthName = new Date().toLocaleDateString('es-CO', { month: 'long' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      <GradientView style={styles.header} direction="top-bottom">
        <View>
          <Text style={styles.headerTitle}>Estadísticas</Text>
          <Text style={styles.headerSub}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {new Date().getFullYear()}
          </Text>
        </View>
      </GradientView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hoy */}
          <Text style={styles.sectionLabel}>Hoy</Text>
          <View style={styles.row}>
            <View style={[styles.card, styles.cardHalf]}>
              <View style={styles.cardIcon}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.cardNum}>{stats.totalToday}</Text>
              <Text style={styles.cardLabel}>Citas</Text>
            </View>
            <View style={[styles.card, styles.cardHalf]}>
              <View style={[styles.cardIcon, { backgroundColor: Colors.accentLight }]}>
                <Ionicons name="cash-outline" size={20} color={Colors.accentDark} />
              </View>
              <Text style={[styles.cardNum, { color: Colors.accentDark }]}>
                ${stats.revenueToday.toLocaleString('es-CO')}
              </Text>
              <Text style={styles.cardLabel}>Ingresos</Text>
            </View>
          </View>

          {/* Este mes */}
          <Text style={styles.sectionLabel}>Este mes</Text>
          <View style={styles.row}>
            <View style={[styles.card, styles.cardHalf]}>
              <View style={styles.cardIcon}>
                <Ionicons name="list-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.cardNum}>{stats.totalMonth}</Text>
              <Text style={styles.cardLabel}>Total citas</Text>
            </View>
            <View style={[styles.card, styles.cardHalf]}>
              <View style={[styles.cardIcon, { backgroundColor: Colors.accentLight }]}>
                <Ionicons name="trending-up-outline" size={20} color={Colors.accentDark} />
              </View>
              <Text style={[styles.cardNum, { color: Colors.accentDark }]}>
                ${stats.revenueMonth.toLocaleString('es-CO')}
              </Text>
              <Text style={styles.cardLabel}>Ingresos</Text>
            </View>
          </View>

          {/* Estado */}
          <View style={styles.card}>
            <Text style={styles.cardInnerTitle}>Estado de citas del mes</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.statusLabel}>Confirmadas</Text>
                <Text style={styles.statusNum}>{stats.confirmedMonth}</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
                <Text style={styles.statusLabel}>Pendientes</Text>
                <Text style={styles.statusNum}>
                  {stats.totalMonth - stats.confirmedMonth - stats.cancelledMonth}
                </Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: Colors.textMuted }]} />
                <Text style={styles.statusLabel}>Canceladas</Text>
                <Text style={styles.statusNum}>{stats.cancelledMonth}</Text>
              </View>
            </View>
          </View>

          {/* Servicio más popular */}
          {stats.topService && (
            <>
              <Text style={styles.sectionLabel}>Servicio más solicitado</Text>
              <View style={styles.card}>
                <View style={styles.topServiceRow}>
                  <View style={[styles.cardIcon, { backgroundColor: Colors.accentLight }]}>
                    <Ionicons name="sparkles-outline" size={20} color={Colors.accentDark} />
                  </View>
                  <Text style={styles.topServiceName}>{stats.topService}</Text>
                  <Ionicons name="trophy-outline" size={18} color={Colors.primary} />
                </View>
              </View>
            </>
          )}

          {stats.totalMonth === 0 && (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin datos aún</Text>
              <Text style={styles.emptySub}>Las estadísticas aparecerán cuando tengas citas confirmadas</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'capitalize' },
  scroll: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHalf: { flex: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardNum: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  cardLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  cardInnerTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusItem: { flex: 1, alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  statusNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statusDivider: { width: 1, height: 48, backgroundColor: Colors.border },
  topServiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topServiceName: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
